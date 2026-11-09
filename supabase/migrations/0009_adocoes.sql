-- =============================================================================
-- 0009 — Formulário de adoção (Sprint 3, RF0013)
--
-- O morador pede para adotar um animal DISPONÍVEL; o admin avalia numa fila.
-- Status: enviada → em_analise → aprovada | recusada.
--
-- Aprovar o pedido não muda a situação do animal: a adoção continua sendo
-- registrada pelo fluxo de status (guard_animal_status_change), que já grava o
-- histórico. O pedido é a avaliação; o status é o fato.
--
-- Um pedido aberto (enviada ou em_analise) por pessoa e animal.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'adocao_status') then
    create type public.adocao_status as enum ('enviada', 'em_analise', 'aprovada', 'recusada');
  end if;
end;
$$;

create table if not exists public.adocoes (
  id             uuid primary key default gen_random_uuid(),
  animal_id      uuid not null references public.animals (id) on delete cascade,
  requester_id   uuid not null references public.profiles (id) on delete cascade,
  housing        text not null check (housing in ('casa', 'apartamento', 'sitio')),
  has_yard       boolean not null,
  other_animals  text check (other_animals is null or char_length(other_animals) <= 300),
  has_children   boolean not null,
  experience     text check (experience is null or char_length(experience) <= 500),
  reason         text not null check (char_length(trim(reason)) between 10 and 1000),
  status         public.adocao_status not null default 'enviada',
  review_note    text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_adocoes_status on public.adocoes (status, created_at);
create index if not exists idx_adocoes_requester on public.adocoes (requester_id, created_at desc);

create unique index if not exists adocoes_um_aberto on public.adocoes (animal_id, requester_id)
  where status in ('enviada', 'em_analise');

drop trigger if exists adocoes_set_updated_at on public.adocoes;
create trigger adocoes_set_updated_at before update on public.adocoes
  for each row execute function public.set_updated_at();

-- Espelho de domain/rules/adocaoStatus.ts. Mudou lá, mude aqui.
create or replace function public.can_transition_adocao(from_status public.adocao_status, to_status public.adocao_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (from_status, to_status) in (
    ('enviada'::public.adocao_status, 'em_analise'::public.adocao_status),
    ('em_analise'::public.adocao_status, 'aprovada'::public.adocao_status),
    ('em_analise'::public.adocao_status, 'recusada'::public.adocao_status)
  )
$$;

create or replace function public.guard_adocao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.animals a where a.id = new.animal_id and a.status = 'disponivel') then
      raise exception 'Este animal não está disponível para adoção.';
    end if;
    new.status := 'enviada';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- UPDATE: o pedido em si não muda depois de enviado; só a avaliação.
  if (new.animal_id, new.requester_id, new.housing, new.has_yard, new.other_animals,
      new.has_children, new.experience, new.reason, new.created_at)
     is distinct from
     (old.animal_id, old.requester_id, old.housing, old.has_yard, old.other_animals,
      old.has_children, old.experience, old.reason, old.created_at) then
    raise exception 'O pedido de adoção não pode ser alterado depois de enviado.';
  end if;

  if new.status is distinct from old.status then
    if public.auth_role() <> 'admin' then
      raise exception 'Apenas administradores avaliam pedidos de adoção.';
    end if;
    if not public.can_transition_adocao(old.status, new.status) then
      raise exception 'Mudança inválida no pedido de adoção: % para %.', old.status, new.status;
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists adocoes_guard on public.adocoes;
create trigger adocoes_guard before insert or update on public.adocoes
  for each row execute function public.guard_adocao();

alter table public.adocoes enable row level security;

drop policy if exists "adocoes_select" on public.adocoes;
drop policy if exists "adocoes_insert" on public.adocoes;
drop policy if exists "adocoes_update" on public.adocoes;

create policy "adocoes_select" on public.adocoes for select to authenticated
  using (requester_id = (select auth.uid()) or public.auth_role() = 'admin');

-- Convidado não pede adoção: o pedido precisa de alguém com quem a ONG fale.
create policy "adocoes_insert" on public.adocoes for insert to authenticated
  with check (requester_id = (select auth.uid()) and not public.is_guest());

create policy "adocoes_update" on public.adocoes for update to authenticated
  using      (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- Sem DELETE: o pedido é registro da avaliação, mesmo recusado.

-- Nome e telefone de quem pediu, para o admin entrar em contato. O admin já lê
-- profiles pela RLS; a view só evita duas consultas na fila. security_invoker:
-- a RLS de cada tabela vale para quem consulta, então o morador vê só o dele.
create or replace view public.adocoes_detalhe
with (security_invoker = true)
as
select ad.*, p.name as requester_name, p.phone as requester_phone, p.email as requester_email,
       p.avatar_url as requester_avatar, a.name as animal_name, a.photo_uri as animal_photo
from public.adocoes ad
left join public.profiles p on p.id = ad.requester_id
left join public.animals a on a.id = ad.animal_id;

grant select on public.adocoes_detalhe to authenticated;
