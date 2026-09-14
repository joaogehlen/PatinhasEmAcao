-- =============================================================================
-- 0002 — Dois perfis, modo convidado e vaquinhas
--
-- Três mudanças de produto, decididas em 14/09/2026:
--
--   1. Perfis passam de três para dois: admin e morador. Tudo o que era do
--      voluntário vira do admin — inclusive alterar status e editar animal.
--   2. Existe convidado: quem não fez login pode registrar uma denúncia e
--      acompanhar as próprias, e nada além disso. Usa o login anônimo do
--      Supabase, então tem auth.uid() real e a RLS continua coerente.
--   3. Vaquinhas entram como entidade. São informativas: a ONG publica meta,
--      chave PIX e quanto já arrecadou. Nenhum dinheiro passa pelo app.
--
-- Corrige também um defeito do 0001: guard_profile_update recusava QUALQUER
-- troca de e-mail, incluindo a sincronização feita pelo próprio trigger de
-- auth. Na prática, trocar e-mail falhava sempre.
--
-- ORDEM IMPORTA: um tipo enum não pode ser removido enquanto policies e
-- funções dependerem dele. Por isso tudo o que referencia user_role cai
-- primeiro, o tipo é trocado, e só então os dependentes voltam.
--
-- Seguro para rodar mais de uma vez.
--
-- ATENÇÃO: habilite "Anonymous sign-ins" em Authentication > Sign In / Providers
-- antes de usar o modo convidado, senão o app não consegue criar a sessão.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Derrubar tudo o que depende do tipo user_role
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

drop policy if exists "animals_select" on public.animals;
drop policy if exists "animals_insert" on public.animals;
drop policy if exists "animals_update" on public.animals;
drop policy if exists "animals_delete" on public.animals;

drop policy if exists "history_select" on public.animal_status_history;
drop policy if exists "history_insert" on public.animal_status_history;

drop function if exists public.auth_role();

-- -----------------------------------------------------------------------------
-- 2. Trocar o enum de perfis
--
-- Postgres não remove valor de enum: cria-se o tipo novo, converte a coluna e
-- descarta o antigo. Voluntários existentes viram admin — eles já exerciam as
-- permissões que agora só o admin tem, e rebaixá-los a morador tiraria acesso
-- de quem trabalha na ONG.
-- -----------------------------------------------------------------------------
do $$
begin
  -- Só age se a coluna ainda estiver no tipo antigo, para poder rodar de novo.
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'role'
      and t.typname = 'user_role'
      and exists (select 1 from pg_enum e where e.enumtypid = t.oid and e.enumlabel = 'voluntario')
  ) then
    create type public.user_role_new as enum ('morador', 'admin');

    alter table public.profiles alter column role drop default;

    alter table public.profiles
      alter column role type public.user_role_new
      using case role::text when 'voluntario' then 'admin' else role::text end::public.user_role_new;

    alter table public.profiles alter column role set default 'morador';

    drop type public.user_role;
    alter type public.user_role_new rename to user_role;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. Recriar as funções auxiliares sobre o tipo novo
-- -----------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

/**
 * Identifica a sessão anônima pelo próprio token.
 *
 * É o convidado: registra denúncia e vê as próprias, e nada mais. Ler isso do
 * JWT evita uma consulta por linha dentro da RLS.
 */
create or replace function public.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- -----------------------------------------------------------------------------
-- 4. Convidado: perfil sem e-mail
--
-- Sessão anônima não tem e-mail nem nome. A coluna deixa de ser obrigatória
-- (o unique continua valendo: o Postgres permite vários NULL).
-- -----------------------------------------------------------------------------
alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Visitante'
    ),
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), ''),
    'morador'
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Correção: sincronização de e-mail vinda do auth
--
-- O trigger de auth atualiza profiles.email, e guard_profile_update recusava.
-- Agora o trigger marca a sessão, e só esse caminho passa.
-- -----------------------------------------------------------------------------
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    perform set_config('app.syncing_email', 'on', true);
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'O id do perfil não pode ser alterado.';
  end if;

  -- Só a sincronização vinda de auth.users pode mexer no e-mail.
  if new.email is distinct from old.email
     and coalesce(current_setting('app.syncing_email', true), 'off') <> 'on' then
    raise exception 'Troque o e-mail pela autenticação, não pelo perfil.';
  end if;

  if new.role is distinct from old.role then
    if public.auth_role() <> 'admin' then
      raise exception 'Apenas administradores podem alterar perfis.';
    end if;
    if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'O sistema precisa de pelo menos um administrador.';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Máquina de estados: só admin altera status
-- -----------------------------------------------------------------------------
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
    insert into public.animal_status_history (animal_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Vaquinhas
--
-- Valores em centavos, como inteiro: dinheiro em ponto flutuante acumula erro
-- de arredondamento e não tem lugar aqui.
--
-- raised_cents é digitado pela ONG. Nenhum pagamento é confirmado pelo app —
-- ele informa a chave PIX e o progresso, e nada mais.
-- -----------------------------------------------------------------------------
create table if not exists public.vaquinhas (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(trim(title)) between 3 and 80),
  description   text not null check (char_length(trim(description)) between 10 and 1000),
  goal_cents    integer not null check (goal_cents > 0),
  raised_cents  integer not null default 0 check (raised_cents >= 0),
  pix_key       text check (pix_key is null or char_length(trim(pix_key)) between 1 and 140),
  -- Vaquinha pode ser de um animal específico ou da ONG em geral.
  animal_id     uuid references public.animals (id) on delete set null,
  active        boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_vaquinhas_active on public.vaquinhas (active, created_at desc);
create index if not exists idx_vaquinhas_animal on public.vaquinhas (animal_id);

drop trigger if exists vaquinhas_set_updated_at on public.vaquinhas;
create trigger vaquinhas_set_updated_at before update on public.vaquinhas
  for each row execute function public.set_updated_at();

alter table public.vaquinhas enable row level security;

-- =============================================================================
-- 8. RLS reescrita
--
-- Espelha a matriz nova de src/domain/rules/permissions.ts:
--
--   convidado : registra denúncia, vê só as próprias
--   morador   : registra, vê todas, vê vaquinhas, edita o próprio cadastro
--   admin     : tudo
-- =============================================================================

-- profiles ---------------------------------------------------------------------
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.auth_role() = 'admin');

create policy "profiles_update" on public.profiles for update to authenticated
  using      (id = (select auth.uid()) or public.auth_role() = 'admin')
  with check (id = (select auth.uid()) or public.auth_role() = 'admin');

create policy "profiles_delete" on public.profiles for delete to authenticated
  using (public.auth_role() = 'admin');

-- Sem policy de INSERT: perfil só nasce pelo trigger de auth.users.

-- animals ----------------------------------------------------------------------
-- Convidado enxerga só o que ele mesmo registrou; quem tem conta vê o catálogo.
create policy "animals_select" on public.animals for select to authenticated
  using (not public.is_guest() or created_by = (select auth.uid()));

-- Registrar denúncia é de todos, convidado incluído, sempre como 'denunciado'.
-- Cadastrar já em outro status é do admin.
create policy "animals_insert" on public.animals for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (status = 'denunciado' or public.auth_role() = 'admin')
  );

-- Editar animal é só do admin. O morador perdeu a edição da própria denúncia
-- por decisão de produto: o trabalho de campo ficou concentrado no admin.
create policy "animals_update" on public.animals for update to authenticated
  using      (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

create policy "animals_delete" on public.animals for delete to authenticated
  using (public.auth_role() = 'admin' and status <> 'adotado');

-- animal_status_history --------------------------------------------------------
-- O convidado acompanha a jornada das denúncias que ele abriu.
create policy "history_select" on public.animal_status_history for select to authenticated
  using (
    not public.is_guest()
    or exists (
      select 1 from public.animals a
      where a.id = animal_id and a.created_by = (select auth.uid())
    )
  );

create policy "history_insert" on public.animal_status_history for insert to authenticated
  with check (changed_by = (select auth.uid()) and public.auth_role() = 'admin');

-- Sem policy de UPDATE/DELETE: a trilha de auditoria é imutável.

-- vaquinhas --------------------------------------------------------------------
-- Vaquinha é conteúdo de quem tem conta: o convidado veio denunciar, não doar.
drop policy if exists "vaquinhas_select" on public.vaquinhas;
drop policy if exists "vaquinhas_insert" on public.vaquinhas;
drop policy if exists "vaquinhas_update" on public.vaquinhas;
drop policy if exists "vaquinhas_delete" on public.vaquinhas;

create policy "vaquinhas_select" on public.vaquinhas for select to authenticated
  using (not public.is_guest() and (active or public.auth_role() = 'admin'));

create policy "vaquinhas_insert" on public.vaquinhas for insert to authenticated
  with check (public.auth_role() = 'admin' and created_by = (select auth.uid()));

create policy "vaquinhas_update" on public.vaquinhas for update to authenticated
  using      (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

create policy "vaquinhas_delete" on public.vaquinhas for delete to authenticated
  using (public.auth_role() = 'admin');
