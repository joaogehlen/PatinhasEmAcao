-- =============================================================================
-- 0005 — Exclusão de usuário vira RPC
--
-- Corrige um defeito introduzido pelo 0004.
--
-- O 0004 fez profiles_select exigir `deleted_at is null`. Consequência não
-- prevista: ao gravar deleted_at, a linha resultante deixa de ser visível para
-- quem acabou de escrevê-la. Como o PostgREST usa RETURNING, o Postgres aplica
-- a policy de SELECT à linha nova e aborta com 42501 — o admin recebia
-- "permissão negada" numa operação que ele tinha permissão para fazer.
--
-- Vale registrar a diferença, porque ela engana: num UPDATE, USING que não
-- casa afeta zero linhas SEM erro; quem devolve 42501 é o WITH CHECK ou a
-- policy de SELECT sobre o RETURNING.
--
-- A correção não é afrouxar a policy. Excluir usuário é operação privilegiada,
-- e espalhar essa decisão entre policy, dois triggers e uma checagem no
-- cliente foi o erro de origem. Aqui ela passa a morar num lugar só: uma
-- função SECURITY DEFINER que faz a própria verificação e não depende de RLS
-- para escrever.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

create or replace function public.soft_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id   uuid := (select auth.uid());
  target_role public.user_role;
begin
  if public.auth_role() <> 'admin' then
    raise exception 'Apenas administradores podem excluir usuários.';
  end if;

  if target_id = caller_id then
    raise exception 'Você não pode excluir a própria conta.';
  end if;

  select role into target_role
  from public.profiles
  where id = target_id and deleted_at is null;

  if target_role is null then
    raise exception 'Usuário não encontrado ou já excluído.';
  end if;

  if target_role = 'admin'
     and (select count(*) from public.profiles where role = 'admin' and deleted_at is null) <= 1 then
    raise exception 'O sistema precisa de pelo menos um administrador.';
  end if;

  update public.profiles set deleted_at = now() where id = target_id;
end;
$$;

-- Só quem está autenticado chama; a função decide se pode.
revoke all on function public.soft_delete_user(uuid) from public, anon;
grant execute on function public.soft_delete_user(uuid) to authenticated;
