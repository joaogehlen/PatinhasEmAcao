-- =============================================================================
-- 0006 — Vaquinhas completas e observação na mudança de status (Sprint 2)
--
-- 1. Vaquinha ganha capa, texto longo de detalhes e galeria de fotos.
-- 2. O arrecadado deixa de ser um número digitado por cima do anterior e passa
--    a ser a soma das ENTRADAS que o admin registra (valor, observação, data).
--    É o que mostra a progressão da campanha e permite corrigir um lançamento
--    errado sem perder o rastro dos outros. raised_cents continua na tabela
--    como cache, mantido por trigger — nenhum cliente consegue gravá-lo.
-- 3. A mudança de status do animal aceita uma observação, gravada pelo mesmo
--    trigger que já registrava o histórico.
--
-- As fotos das vaquinhas usam o bucket animal-photos (pasta vaquinhas/): ele já
-- é público para leitura e aceita upload de quem tem sessão.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Capa, detalhes e galeria
-- -----------------------------------------------------------------------------
alter table public.vaquinhas add column if not exists cover_uri text;
alter table public.vaquinhas add column if not exists details text;
alter table public.vaquinhas add column if not exists photo_uris text[] not null default '{}';

alter table public.vaquinhas drop constraint if exists vaquinhas_details_check;
alter table public.vaquinhas add constraint vaquinhas_details_check
  check (details is null or char_length(details) <= 5000);

alter table public.vaquinhas drop constraint if exists vaquinhas_photo_uris_check;
alter table public.vaquinhas add constraint vaquinhas_photo_uris_check
  check (cardinality(photo_uris) <= 10);

-- A soma de várias entradas pode passar do limite de integer.
alter table public.vaquinhas alter column raised_cents type bigint;

-- -----------------------------------------------------------------------------
-- 2. Entradas de arrecadação
-- -----------------------------------------------------------------------------
create table if not exists public.vaquinha_entradas (
  id            uuid primary key default gen_random_uuid(),
  vaquinha_id   uuid not null references public.vaquinhas (id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  note          text check (note is null or char_length(note) <= 200),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_vaquinha_entradas_vaquinha
  on public.vaquinha_entradas (vaquinha_id, created_at desc);

-- O que já estava digitado vira a primeira entrada, para a soma bater.
-- Roda antes dos triggers e só para vaquinha que ainda não tem entrada.
insert into public.vaquinha_entradas (vaquinha_id, amount_cents, note, created_by, created_at)
select v.id, v.raised_cents, 'Saldo anterior ao registro de entradas', v.created_by, v.created_at
from public.vaquinhas v
where v.raised_cents > 0
  and not exists (select 1 from public.vaquinha_entradas e where e.vaquinha_id = v.id);

-- raised_cents é sempre a soma das entradas, venha o update de onde vier.
create or replace function public.vaquinha_sync_raised()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.raised_cents := coalesce(
    (select sum(e.amount_cents) from public.vaquinha_entradas e where e.vaquinha_id = new.id),
    0
  );
  return new;
end;
$$;

drop trigger if exists vaquinhas_sync_raised on public.vaquinhas;
create trigger vaquinhas_sync_raised before insert or update on public.vaquinhas
  for each row execute function public.vaquinha_sync_raised();

-- Entrada nova ou removida: toca a vaquinha para o trigger acima recalcular.
create or replace function public.vaquinha_entrada_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.vaquinhas
  set raised_cents = 0  -- valor ignorado: vaquinha_sync_raised recalcula
  where id = coalesce(new.vaquinha_id, old.vaquinha_id);
  return null;
end;
$$;

drop trigger if exists vaquinha_entradas_changed on public.vaquinha_entradas;
create trigger vaquinha_entradas_changed after insert or delete on public.vaquinha_entradas
  for each row execute function public.vaquinha_entrada_changed();

-- Recalcula as existentes uma vez (cobre a conversão acima).
update public.vaquinhas set raised_cents = 0;

-- RLS: quem vê a vaquinha vê as entradas dela (transparência); só admin lança
-- e remove. Sem UPDATE: lançamento errado se remove e se lança de novo.
alter table public.vaquinha_entradas enable row level security;

drop policy if exists "vaquinha_entradas_select" on public.vaquinha_entradas;
drop policy if exists "vaquinha_entradas_insert" on public.vaquinha_entradas;
drop policy if exists "vaquinha_entradas_delete" on public.vaquinha_entradas;

-- A subconsulta passa pela RLS de vaquinhas: convidado e encerradas (para
-- morador) já ficam de fora lá.
create policy "vaquinha_entradas_select" on public.vaquinha_entradas for select to authenticated
  using (exists (select 1 from public.vaquinhas v where v.id = vaquinha_id));

create policy "vaquinha_entradas_insert" on public.vaquinha_entradas for insert to authenticated
  with check (public.auth_role() = 'admin' and created_by = (select auth.uid()));

create policy "vaquinha_entradas_delete" on public.vaquinha_entradas for delete to authenticated
  using (public.auth_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 3. Observação na mudança de status
--
-- status_note é um campo de passagem: o cliente o envia junto com o novo
-- status, o trigger copia para o histórico e o zera antes de gravar a linha.
-- -----------------------------------------------------------------------------
alter table public.animals add column if not exists status_note text;

create or replace function public.guard_animal_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if public.auth_role() <> 'admin' then
      raise exception 'Apenas administradores alteram o status do animal.';
    end if;
    if not public.can_transition(old.status, new.status) then
      raise exception 'Transição de status inválida: % para %.', old.status, new.status;
    end if;
    insert into public.animal_status_history (animal_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, nullif(trim(left(new.status_note, 300)), ''), (select auth.uid()));
  end if;
  new.status_note := null;
  return new;
end;
$$;
