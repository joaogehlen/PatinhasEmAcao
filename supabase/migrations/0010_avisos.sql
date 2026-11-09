-- =============================================================================
-- 0010 — Central de avisos (Sprint 3, RF0012)
--
-- Lista de avisos dentro do app, com contador de não lidos. Quem escreve são os
-- triggers abaixo (SECURITY DEFINER); o cliente só lê e marca como lido.
--
--   denúncia nova            → cada admin
--   mudança de status        → quem denunciou (convidado incluído)
--   pedido de adoção novo    → cada admin
--   pedido avaliado          → quem pediu
--
-- Quem fez a ação não recebe aviso dela. Push fica de fora: o Expo Go não
-- entrega notificações, e isso exige build própria.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

create table if not exists public.avisos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('denuncia_nova', 'status_animal', 'adocao_nova', 'adocao_status')),
  title       text not null,
  body        text not null,
  animal_id   uuid references public.animals (id) on delete cascade,
  adocao_id   uuid references public.adocoes (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_avisos_user on public.avisos (user_id, created_at desc);
create index if not exists idx_avisos_unread on public.avisos (user_id) where read_at is null;

alter table public.avisos enable row level security;

drop policy if exists "avisos_select" on public.avisos;
drop policy if exists "avisos_update" on public.avisos;

create policy "avisos_select" on public.avisos for select to authenticated
  using (user_id = (select auth.uid()));

create policy "avisos_update" on public.avisos for update to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Sem INSERT nem DELETE pelo cliente.

-- Rótulos dos status, espelho de STATUS_LABELS e ADOCAO_STATUS_LABELS.
create or replace function public.animal_status_label(s public.animal_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'denunciado' then 'Denunciado'
    when 'resgatado' then 'Resgatado'
    when 'em_tratamento' then 'Em tratamento'
    when 'disponivel' then 'Disponível para adoção'
    when 'adotado' then 'Adotado'
  end
$$;

create or replace function public.adocao_status_label(s public.adocao_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'enviada' then 'Enviado'
    when 'em_analise' then 'Em análise'
    when 'aprovada' then 'Aprovado'
    when 'recusada' then 'Recusado'
  end
$$;

-- Admins ativos, menos quem causou o evento.
create or replace function public.notify_admins(
  p_kind text, p_title text, p_body text, p_animal uuid, p_adocao uuid, p_actor uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.avisos (user_id, kind, title, body, animal_id, adocao_id)
  select p.id, p_kind, p_title, p_body, p_animal, p_adocao
  from public.profiles p
  where p.role = 'admin' and p.deleted_at is null and p.id is distinct from p_actor
$$;

revoke execute on function public.notify_admins(text, text, text, uuid, uuid, uuid) from public, anon, authenticated;

-- Denúncia nova ------------------------------------------------------------------
create or replace function public.aviso_denuncia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_admins(
    'denuncia_nova', 'Nova denúncia', new.name || ' precisa de ajuda.', new.id, null, new.created_by
  );
  return null;
end;
$$;

drop trigger if exists animals_aviso_denuncia on public.animals;
create trigger animals_aviso_denuncia after insert on public.animals
  for each row execute function public.aviso_denuncia_nova();

-- Mudança de status ----------------------------------------------------------------
-- A primeira linha do histórico (from_status null) é a própria denúncia: sem aviso.
create or replace function public.aviso_status_animal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_animal public.animals;
begin
  if new.from_status is null then return null; end if;
  select * into v_animal from public.animals where id = new.animal_id;
  if v_animal.created_by is null or v_animal.created_by is not distinct from new.changed_by then
    return null;
  end if;
  insert into public.avisos (user_id, kind, title, body, animal_id)
  values (
    v_animal.created_by, 'status_animal', 'Novidade sobre ' || v_animal.name,
    'Agora: ' || public.animal_status_label(new.to_status) || '.', v_animal.id
  );
  return null;
end;
$$;

drop trigger if exists history_aviso_status on public.animal_status_history;
create trigger history_aviso_status after insert on public.animal_status_history
  for each row execute function public.aviso_status_animal();

-- Pedido de adoção novo -----------------------------------------------------------
create or replace function public.aviso_adocao_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester text;
  v_animal text;
begin
  select name into v_requester from public.profiles where id = new.requester_id;
  select name into v_animal from public.animals where id = new.animal_id;
  perform public.notify_admins(
    'adocao_nova', 'Novo pedido de adoção',
    coalesce(v_requester, 'Alguém') || ' quer adotar ' || coalesce(v_animal, 'um animal') || '.',
    new.animal_id, new.id, new.requester_id
  );
  return null;
end;
$$;

drop trigger if exists adocoes_aviso_nova on public.adocoes;
create trigger adocoes_aviso_nova after insert on public.adocoes
  for each row execute function public.aviso_adocao_nova();

-- Pedido avaliado ------------------------------------------------------------------
create or replace function public.aviso_adocao_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_animal text;
begin
  if new.status is not distinct from old.status then return null; end if;
  select name into v_animal from public.animals where id = new.animal_id;
  insert into public.avisos (user_id, kind, title, body, animal_id, adocao_id)
  values (
    new.requester_id, 'adocao_status', 'Pedido de adoção: ' || public.adocao_status_label(new.status),
    'Seu pedido para adotar ' || coalesce(v_animal, 'o animal') || ' foi atualizado.'
      || coalesce(' ' || new.review_note, ''),
    new.animal_id, new.id
  );
  return null;
end;
$$;

drop trigger if exists adocoes_aviso_status on public.adocoes;
create trigger adocoes_aviso_status after update of status on public.adocoes
  for each row execute function public.aviso_adocao_status();
