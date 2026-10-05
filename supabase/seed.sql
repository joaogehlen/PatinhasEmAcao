-- =============================================================================
-- Patinhas em Ação — dados de demonstração
--
-- Porta de src/infrastructure/database/seed.ts.
--
-- PRÉ-REQUISITO: as duas contas de demonstração precisam existir no Auth antes
-- de rodar este arquivo. Criar usuário de autenticação por SQL não é suportado
-- pelo Supabase, e a Admin API exigiria a service_role key — que não pode sair
-- do servidor. Então crie as duas pelo painel:
--
--   Authentication > Users > Add user > Create new user
--   Marque "Auto Confirm User" nas duas.
--
--     admin@patinhas.org    / admin123
--     morador@patinhas.org  / morador123
--
-- O trigger on_auth_user_created cria os perfis automaticamente, todos como
-- 'morador'. Este script corrige o nome e promove o primeiro a admin.
--
-- Idempotente: se já houver animais cadastrados, não faz nada.
--
-- ATENÇÃO: senhas fracas, públicas e versionadas. Servem para a banca avaliar
-- os dois perfis sem precisar de cadastro. Não use este seed se o app entrar em
-- uso real pela ONG.
-- =============================================================================

do $$
declare
  admin_id    uuid;
  resident_id uuid;
begin
  select id into admin_id    from public.profiles where email = 'admin@patinhas.org';
  select id into resident_id from public.profiles where email = 'morador@patinhas.org';

  if admin_id is null or resident_id is null then
    raise exception
      'Contas de demonstração não encontradas. Crie as duas em Authentication > Users (com Auto Confirm) antes de rodar este seed.';
  end if;

  update public.profiles set name = 'Administrador ONG', role = 'admin' where id = admin_id;
  update public.profiles set name = 'Morador Carlos'                     where id = resident_id;

  if exists (select 1 from public.animals) then
    raise notice 'Já existem animais cadastrados; o seed de animais foi ignorado.';
    return;
  end if;

  -- As fotos vêm do Unsplash e exigem internet. Não são animais atendidos pela
  -- ONG — são placeholder, conforme registrado em PRODUCT.md.
  insert into public.animals
    (name, species, size, sex, age_months, temperament, description, health_notes, status, photo_uri, latitude, longitude, created_by)
  values
    ('Paçoca', 'cachorro', 'medio', 'femea', 24, 'docil',
     'Muito carinhosa e companheira, foi encontrada perto da praça central. Adora passeios e se dá bem com crianças.',
     'Vacinada, vermifugada e castrada.',
     'disponivel',
     'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80&auto=format&fit=crop',
     -28.8738, -52.1753, admin_id),

    ('Frajola', 'gato', 'pequeno', 'macho', 8, 'brincalhao',
     'Filhote curioso resgatado de um terreno baldio. Brinca o dia todo e ronrona no colo.',
     'Em tratamento de verminose, com previsão de alta em duas semanas.',
     'em_tratamento',
     'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&q=80&auto=format&fit=crop',
     -28.8761, -52.1712, admin_id),

    ('Sem nome', 'cachorro', 'grande', 'desconhecido', null, 'timido',
     'Cão grande e magro visto na beira da estrada, parece estar com a pata ferida.',
     null,
     'denunciado',
     'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=900&q=80&auto=format&fit=crop',
     -28.8702, -52.1801, resident_id),

    ('Mel', 'cachorro', 'pequeno', 'femea', 36, 'docil',
     'Pequena e tranquila, ideal para apartamento. Gosta de dormir perto das pessoas.',
     'Vacinada e castrada.',
     'disponivel',
     'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=900&q=80&auto=format&fit=crop',
     -28.8745, -52.1769, admin_id),

    ('Luna', 'gato', 'pequeno', 'femea', 14, 'timido',
     'Um pouco reservada no início, mas muito afetuosa depois que ganha confiança.',
     'Castrada. Testada negativo para FIV/FeLV.',
     'disponivel',
     'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=80&auto=format&fit=crop',
     -28.8729, -52.1741, admin_id),

    ('Thor', 'cachorro', 'grande', 'macho', 48, 'bravo',
     'Desconfiado com estranhos e precisa de uma casa com pátio. Resgatado após denúncia de maus-tratos; aproxime-se com calma.',
     'Em recuperação nutricional.',
     'resgatado',
     'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=900&q=80&auto=format&fit=crop',
     -28.8778, -52.1725, admin_id),

    ('Nina', 'gato', 'pequeno', 'femea', 30, 'docil',
     'Adotada por uma família do bairro Centro. Hoje vive feliz com dois irmãos humanos.',
     null,
     'adotado',
     'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=900&q=80&auto=format&fit=crop',
     -28.8712, -52.1788, admin_id);

  raise notice 'Seed aplicado: 2 perfis ajustados e 7 animais criados.';
end $$;

-- =============================================================================
-- Vaquinhas de demonstração (precisa da migração 0006)
--
-- Bloco separado e idempotente: roda mesmo em banco que já tinha os animais.
-- O arrecadado sai dos lançamentos — o trigger soma; ninguém digita o total.
-- =============================================================================
do $$
declare
  admin_id   uuid;
  frajola_id uuid;
  v_frajola  uuid;
  v_castra   uuid;
begin
  select id into admin_id from public.profiles where email = 'admin@patinhas.org';
  select id into frajola_id from public.animals where name = 'Frajola' limit 1;

  if admin_id is null then
    raise exception 'Rode o bloco anterior (contas e animais) antes deste.';
  end if;

  if exists (select 1 from public.vaquinhas) then
    raise notice 'Já existem vaquinhas cadastradas; o seed de vaquinhas foi ignorado.';
    return;
  end if;

  insert into public.vaquinhas
    (title, description, details, cover_uri, photo_uris, goal_cents, pix_key, animal_id, active, created_by)
  values
    ('Tratamento do Frajola',
     'Exames e remédios para o Frajola terminar o tratamento de verminose e ficar pronto para adoção.',
     'O Frajola foi resgatado de um terreno baldio com uma verminose forte. Já está comendo bem e brincando, mas ainda precisa de dois exames de controle e de mais um ciclo de medicação.' || chr(10) || chr(10) ||
     'O valor cobre: exames de fezes e sangue (R$ 180), medicação (R$ 120) e a castração quando ele tiver alta (R$ 300).',
     'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&q=80&auto=format&fit=crop',
     array[
       'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=900&q=80&auto=format&fit=crop',
       'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=900&q=80&auto=format&fit=crop'
     ],
     60000, '12.345.678/0001-90', frajola_id, true, admin_id)
  returning id into v_frajola;

  insert into public.vaquinhas
    (title, description, details, cover_uri, photo_uris, goal_cents, pix_key, animal_id, active, created_by)
  values
    ('Mutirão de castração',
     'Castração de 20 gatos de rua da região da praça central, em parceria com a clínica do município.',
     'Castrar é a forma mais eficiente de reduzir o número de animais abandonados. A clínica parceira fez preço de custo: R$ 150 por animal.',
     'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&q=80&auto=format&fit=crop',
     '{}',
     300000, '12.345.678/0001-90', null, true, admin_id)
  returning id into v_castra;

  insert into public.vaquinha_entradas (vaquinha_id, amount_cents, note, created_by, created_at)
  values
    (v_frajola, 15000, 'PIX recebidos na primeira semana', admin_id, now() - interval '10 days'),
    (v_frajola, 22000, 'Bazar de sábado', admin_id, now() - interval '3 days'),
    (v_castra, 85000, 'Doação da feira do produtor', admin_id, now() - interval '6 days'),
    (v_castra, 40000, null, admin_id, now() - interval '1 day');

  raise notice 'Seed de vaquinhas aplicado: 2 campanhas e 4 lançamentos.';
end $$;
