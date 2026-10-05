-- =============================================================================
-- Cria (ou atualiza) um usuário admin e um morador direto pelo SQL Editor.
--
-- Preencha os valores em `contas` e rode. Se o e-mail já existir, a senha e o
-- nome são trocados e o perfil é ajustado; nada é duplicado.
--
-- O login sai igual a uma conta criada pelo app: e-mail confirmado, identidade
-- "email" e perfil criado pelo trigger on_auth_user_created.
--
-- NÃO versione senhas reais: troque os valores abaixo antes de rodar e não
-- faça commit com eles preenchidos.
-- =============================================================================

do $$
declare
  conta record;
  uid   uuid;
begin
  for conta in
    select * from (values
      -- e-mail                    senha               nome                   perfil
      ('admin@exemplo.org',      'TROQUE-ESTA-SENHA', 'Administrador ONG',   'admin'),
      ('morador@exemplo.org',    'TROQUE-ESTA-SENHA', 'Morador Exemplo',     'morador')
    ) as t(email, senha, nome, perfil)
  loop
    if char_length(conta.senha) < 6 or conta.senha = 'TROQUE-ESTA-SENHA' then
      raise exception 'Defina uma senha (mínimo 6 caracteres) para %.', conta.email;
    end if;

    select id into uid from auth.users where lower(email) = lower(conta.email);

    if uid is null then
      uid := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        -- Precisam ser '' e não NULL, senão o login falha com
        -- "Database error querying schema".
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        lower(conta.email), extensions.crypt(conta.senha, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('name', conta.nome),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', lower(conta.email), 'email_verified', true),
        now(), now(), now()
      );
    else
      update auth.users
      set encrypted_password = extensions.crypt(conta.senha, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || jsonb_build_object('name', conta.nome),
          updated_at = now()
      where id = uid;
    end if;

    -- O trigger criou o perfil como morador; aqui ajusta nome e perfil e
    -- reativa, caso a conta tenha sido excluída (exclusão lógica) antes.
    update public.profiles
    set name = conta.nome, role = conta.perfil::public.user_role, deleted_at = null
    where id = uid;

    raise notice '% pronto como % (id %).', conta.email, conta.perfil, uid;
  end loop;
end $$;
