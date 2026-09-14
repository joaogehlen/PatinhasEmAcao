-- =============================================================================
-- 0004 — Exclusão lógica de usuário
--
-- Excluir de verdade uma conta exige a service_role key, que só existe dentro
-- de uma Edge Function. Enquanto ela não estiver publicada, a exclusão
-- simplesmente falhava.
--
-- A exclusão lógica resolve isso e é melhor de qualquer forma:
--
--   - o histórico sobrevive: animais e mudanças de status continuam
--     apontando para quem os registrou;
--   - é reversível, e excluir pessoa por engano acontece;
--   - não precisa de privilégio de servidor.
--
-- A armadilha é que a conta de autenticação continua existindo. Sem cuidado,
-- alguém "excluído" continuaria entrando normalmente. Por isso:
--
--   1. profiles_select passa a esconder linhas excluídas — e sem perfil o app
--      não completa o login;
--   2. auth_role() ignora perfil excluído, então um admin excluído perde os
--      poderes na mesma hora, mesmo com token válido na mão.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

alter table public.profiles add column if not exists deleted_at timestamptz;

create index if not exists idx_profiles_deleted on public.profiles (deleted_at);

-- -----------------------------------------------------------------------------
-- Perfil excluído não tem papel: o token continua válido, o acesso não.
-- -----------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and deleted_at is null
$$;

-- -----------------------------------------------------------------------------
-- As mesmas regras da exclusão física, agora aplicadas à lógica.
-- Sem isso, o último admin poderia se excluir e deixar o sistema sem ninguém
-- capaz de gerenciar nada.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    if public.auth_role() <> 'admin' then
      raise exception 'Apenas administradores podem excluir usuários.';
    end if;
    if new.id = (select auth.uid()) then
      raise exception 'Você não pode excluir a própria conta.';
    end if;
    if old.role = 'admin'
       and (select count(*) from public.profiles where role = 'admin' and deleted_at is null) <= 1 then
      raise exception 'O sistema precisa de pelo menos um administrador.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_soft_delete on public.profiles;
create trigger profiles_guard_soft_delete before update on public.profiles
  for each row execute function public.guard_profile_soft_delete();

-- -----------------------------------------------------------------------------
-- Excluído some das consultas. É isso que impede o login de continuar
-- funcionando: sem linha de perfil, o app não monta o usuário.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles for select to authenticated
  using (
    deleted_at is null
    and (id = (select auth.uid()) or public.auth_role() = 'admin')
  );
