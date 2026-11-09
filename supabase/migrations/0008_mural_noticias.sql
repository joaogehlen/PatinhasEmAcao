-- =============================================================================
-- 0008 — Mural de notícias da ONG (Sprint 3, RF0017)
--
-- Posts curtos da ONG: resgates concluídos, campanhas, mutirões. Título, texto,
-- capa, até seis fotos e vínculo opcional com UM animal OU UMA vaquinha.
-- Uma notícia pode ficar fixada no topo; fixar outra desafixa a anterior.
--
-- Quem tem conta lê; o convidado não vê. Só o admin publica, edita e exclui.
-- As fotos usam o bucket animal-photos, pasta noticias/.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

create table if not exists public.noticias (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) between 3 and 100),
  body        text not null check (char_length(trim(body)) between 10 and 5000),
  cover_uri   text,
  photo_uris  text[] not null default '{}' check (cardinality(photo_uris) <= 6),
  animal_id   uuid references public.animals (id) on delete set null,
  vaquinha_id uuid references public.vaquinhas (id) on delete set null,
  pinned      boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint noticias_um_vinculo check (animal_id is null or vaquinha_id is null)
);

create index if not exists idx_noticias_created on public.noticias (created_at desc);

-- No máximo uma fixada. O trigger abaixo desafixa a anterior antes; o índice é
-- a garantia caso duas fixações cheguem ao mesmo tempo.
create unique index if not exists noticias_uma_fixada on public.noticias (pinned) where pinned;

drop trigger if exists noticias_set_updated_at on public.noticias;
create trigger noticias_set_updated_at before update on public.noticias
  for each row execute function public.set_updated_at();

create or replace function public.noticias_unpin_others()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pinned then
    update public.noticias set pinned = false where pinned and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists noticias_unpin_others on public.noticias;
create trigger noticias_unpin_others before insert or update of pinned on public.noticias
  for each row execute function public.noticias_unpin_others();

alter table public.noticias enable row level security;

drop policy if exists "noticias_select" on public.noticias;
drop policy if exists "noticias_insert" on public.noticias;
drop policy if exists "noticias_update" on public.noticias;
drop policy if exists "noticias_delete" on public.noticias;

create policy "noticias_select" on public.noticias for select to authenticated
  using (not public.is_guest());

create policy "noticias_insert" on public.noticias for insert to authenticated
  with check (public.auth_role() = 'admin' and created_by = (select auth.uid()));

create policy "noticias_update" on public.noticias for update to authenticated
  using      (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

create policy "noticias_delete" on public.noticias for delete to authenticated
  using (public.auth_role() = 'admin');
