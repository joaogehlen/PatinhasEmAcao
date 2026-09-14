-- =============================================================================
-- Patinhas em Ação — esquema inicial (migração do SQLite local para o Supabase)
--
-- Espelha src/infrastructure/database/migrations.ts, com três diferenças que
-- só fazem sentido quando o banco passa a ser remoto e compartilhado:
--
--   1. As senhas saem daqui. Quem guarda credencial é o auth.users do Supabase;
--      public.profiles carrega apenas o dado de perfil.
--   2. As regras de src/domain/rules/ passam a valer também no servidor (RLS e
--      triggers). No app elas continuam valendo para esconder botão; aqui elas
--      viram a regra que de fato não pode ser burlada.
--   3. O que era transação no SQLite vira trigger. O cliente não consegue
--      garantir atomicidade entre dois requests.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums — espelham as const arrays de src/domain/entities/
-- -----------------------------------------------------------------------------
create type public.user_role          as enum ('morador', 'voluntario', 'admin');
create type public.animal_species     as enum ('cachorro', 'gato', 'outro');
create type public.animal_size        as enum ('pequeno', 'medio', 'grande');
create type public.animal_sex         as enum ('macho', 'femea', 'desconhecido');
create type public.animal_temperament as enum ('docil', 'brincalhao', 'timido', 'agitado', 'protetor');
create type public.animal_status      as enum ('denunciado', 'resgatado', 'em_tratamento', 'disponivel', 'adotado');

-- -----------------------------------------------------------------------------
-- profiles — dados de perfil ligados 1:1 a auth.users
--
-- O e-mail é espelho de auth.users, mantido por trigger, para permitir busca e
-- listagem sem chamar a Admin API. Trocar e-mail é operação de autenticação
-- (supabase.auth.updateUser), nunca um update direto nesta tabela.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 3 and 80),
  email      text not null unique,
  phone      text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  role       public.user_role not null default 'morador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles (role);

-- -----------------------------------------------------------------------------
-- animals
--
-- created_by é ON DELETE SET NULL: o registro do animal sobrevive à exclusão de
-- quem o cadastrou. O histórico de um resgate vale mais que o vínculo com a
-- conta, e bloquear a exclusão do usuário para sempre seria pior.
-- -----------------------------------------------------------------------------
create table public.animals (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(trim(name)) between 2 and 60),
  species      public.animal_species not null,
  size         public.animal_size not null,
  sex          public.animal_sex not null,
  age_months   integer check (age_months is null or age_months between 0 and 360),
  temperament  public.animal_temperament,
  description  text not null check (char_length(trim(description)) between 10 and 1000),
  health_notes text check (health_notes is null or char_length(health_notes) <= 500),
  status       public.animal_status not null default 'denunciado',
  photo_uri    text,
  latitude     double precision check (latitude is null or latitude between -90 and 90),
  longitude    double precision check (longitude is null or longitude between -180 and 180),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_animals_status       on public.animals (status);
create index idx_animals_species_size on public.animals (species, size);
create index idx_animals_created_by   on public.animals (created_by);

-- -----------------------------------------------------------------------------
-- animal_status_history — trilha de auditoria da jornada do animal.
-- Sem policy de UPDATE ou DELETE: uma vez escrita, a linha não muda mais.
-- -----------------------------------------------------------------------------
create table public.animal_status_history (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid not null references public.animals (id) on delete cascade,
  from_status public.animal_status,
  to_status   public.animal_status not null,
  note        text check (note is null or char_length(note) <= 500),
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index idx_status_history_animal on public.animal_status_history (animal_id, changed_at);

-- =============================================================================
-- Funções auxiliares
-- =============================================================================

-- Lê o perfil do usuário autenticado. SECURITY DEFINER para não recursar na RLS
-- de profiles quando as policies a chamarem.
-- NOTA: não pode se chamar current_role() — colide com a função interna do Postgres.
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger animals_set_updated_at before update on public.animals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Criação automática do perfil no cadastro.
-- Substitui AuthService.register: o app chama supabase.auth.signUp e o perfil
-- nasce aqui. Autocadastro é sempre 'morador', como na regra original.
-- -----------------------------------------------------------------------------
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
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), ''),
    'morador'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém profiles.email em sincronia quando o usuário troca o e-mail pelo auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update on auth.users
  for each row execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Guardas de profiles — espelham UserService.update e UserService.delete.
-- No SQLite essas checagens eram seguras porque só havia um processo. Com rede,
-- dois admins se rebaixando ao mesmo tempo passariam os dois pela checagem do
-- app; por isso a regra desce para o banco.
-- -----------------------------------------------------------------------------
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

  -- O e-mail é espelho de auth.users; só o trigger de auth pode mudá-lo.
  if new.email is distinct from old.email then
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

create trigger profiles_guard_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.id = (select auth.uid()) then
    raise exception 'Você não pode excluir a própria conta.';
  end if;
  if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'O sistema precisa de pelo menos um administrador.';
  end if;
  return old;
end;
$$;

create trigger profiles_guard_delete before delete on public.profiles
  for each row execute function public.guard_profile_delete();

-- -----------------------------------------------------------------------------
-- Primeira entrada da timeline.
-- Era a transação de AnimalRepository.create(animal, initialStatus). Do cliente
-- seriam dois requests independentes: se o segundo falhasse, o animal ficaria
-- sem timeline. Como trigger, volta a ser atômico.
-- -----------------------------------------------------------------------------
create or replace function public.create_initial_status_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.animal_status_history (animal_id, from_status, to_status, note, changed_by)
  values (new.id, null, new.status, 'Cadastro inicial', new.created_by);
  return new;
end;
$$;

create trigger animals_create_initial_status after insert on public.animals
  for each row execute function public.create_initial_status_entry();

-- -----------------------------------------------------------------------------
-- Máquina de estados do resgate — espelho de src/domain/rules/animalStatus.ts.
-- Além de validar, registra a mudança na timeline automaticamente, para que
-- nenhum caminho de escrita consiga alterar o status sem deixar rastro.
-- -----------------------------------------------------------------------------
create or replace function public.can_transition(from_status public.animal_status, to_status public.animal_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case from_status
    when 'denunciado'    then to_status = 'resgatado'
    when 'resgatado'     then to_status in ('em_tratamento', 'disponivel')
    when 'em_tratamento' then to_status = 'disponivel'
    when 'disponivel'    then to_status in ('adotado', 'em_tratamento')
    when 'adotado'       then to_status = 'disponivel'
  end
$$;

create or replace function public.guard_animal_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if public.auth_role() not in ('voluntario', 'admin') then
      raise exception 'Apenas voluntários e administradores alteram o status do animal.';
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

create trigger animals_guard_status_change before update on public.animals
  for each row execute function public.guard_animal_status_change();

-- =============================================================================
-- Row Level Security
--
-- Espelha a matriz de src/domain/rules/permissions.ts. Se aquele arquivo mudar,
-- estas policies mudam junto — divergência entre os dois é bug silencioso:
-- o botão aparece e a operação falha, ou o contrário.
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.animals               enable row level security;
alter table public.animal_status_history enable row level security;

-- profiles ---------------------------------------------------------------------
-- Ver o próprio perfil, ou todos se for admin ('user:list').
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.auth_role() = 'admin');

-- Editar o próprio perfil, ou qualquer um se for admin ('user:manage').
-- O que pode mudar dentro da linha é problema do guard_profile_update.
create policy "profiles_update" on public.profiles for update to authenticated
  using      (id = (select auth.uid()) or public.auth_role() = 'admin')
  with check (id = (select auth.uid()) or public.auth_role() = 'admin');

create policy "profiles_delete" on public.profiles for delete to authenticated
  using (public.auth_role() = 'admin');

-- Sem policy de INSERT: perfil só nasce pelo trigger de auth.users.

-- animals ----------------------------------------------------------------------
-- Catálogo é visível a qualquer usuário logado.
create policy "animals_select" on public.animals for select to authenticated
  using (true);

-- 'animal:create' vale para todos os perfis. Definir status inicial diferente
-- de 'denunciado' exige 'animal:changeStatus' (AnimalService.create).
create policy "animals_insert" on public.animals for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (status = 'denunciado' or public.auth_role() in ('voluntario', 'admin'))
  );

-- 'animal:update' para voluntário/admin; o denunciante edita a própria denúncia
-- enquanto não houver resgate (AnimalService.canEdit).
create policy "animals_update" on public.animals for update to authenticated
  using (
    public.auth_role() in ('voluntario', 'admin')
    or (created_by = (select auth.uid()) and status = 'denunciado')
  )
  with check (
    public.auth_role() in ('voluntario', 'admin')
    or (created_by = (select auth.uid()) and status = 'denunciado')
  );

-- 'animal:delete' é só do admin, e animais adotados ficam no histórico.
create policy "animals_delete" on public.animals for delete to authenticated
  using (public.auth_role() = 'admin' and status <> 'adotado');

-- animal_status_history --------------------------------------------------------
create policy "history_select" on public.animal_status_history for select to authenticated
  using (true);

-- Escrita normal vem dos triggers (SECURITY DEFINER, ignoram RLS). Esta policy
-- cobre apenas anotações manuais feitas por voluntário/admin.
create policy "history_insert" on public.animal_status_history for insert to authenticated
  with check (
    changed_by = (select auth.uid())
    and public.auth_role() in ('voluntario', 'admin')
  );

-- Sem policy de UPDATE/DELETE: a trilha de auditoria é imutável.

-- =============================================================================
-- Storage — fotos dos animais
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('animal-photos', 'animal-photos', true)
on conflict (id) do nothing;

create policy "animal_photos_public_read" on storage.objects for select to public
  using (bucket_id = 'animal-photos');

create policy "animal_photos_authenticated_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos');

create policy "animal_photos_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos' and owner = (select auth.uid()));
