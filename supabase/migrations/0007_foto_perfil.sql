-- =============================================================================
-- 0007 — Foto de perfil (Sprint 3, RF0016)
--
-- 1. profiles ganha avatar_url: URL pública no bucket animal-photos, pasta
--    avatars/. O bucket já é público para leitura e aceita upload de quem tem
--    sessão; a policy profiles_update já deixa a pessoa editar a própria linha.
-- 2. animal_history(): o histórico do animal com nome e foto de quem agiu.
--    A RLS de profiles só mostra ao morador a própria linha, então um join
--    direto pelo cliente voltaria sem nome. A função é SECURITY DEFINER, expõe
--    só nome e foto e repete a regra de history_select (o convidado só vê o
--    histórico das denúncias dele).
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or char_length(avatar_url) <= 500);

drop function if exists public.animal_history(uuid);

create function public.animal_history(target_animal uuid)
returns table (
  id                uuid,
  animal_id         uuid,
  from_status       public.animal_status,
  to_status         public.animal_status,
  note              text,
  changed_by        uuid,
  changed_at        timestamptz,
  changed_by_name   text,
  changed_by_avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.animal_id, h.from_status, h.to_status, h.note, h.changed_by, h.changed_at,
         p.name, p.avatar_url
  from public.animal_status_history h
  join public.animals a on a.id = h.animal_id
  -- Convidado (perfil sem e-mail) não tem nome a mostrar: fica anônimo.
  left join public.profiles p on p.id = h.changed_by and p.email is not null
  where h.animal_id = target_animal
    and (select auth.uid()) is not null
    and (not public.is_guest() or a.created_by = (select auth.uid()))
  order by h.changed_at;
$$;

revoke execute on function public.animal_history(uuid) from public, anon;
grant execute on function public.animal_history(uuid) to authenticated;
