-- =============================================================================
-- Patinhas em Ação — três vaquinhas de demonstração em estágios diferentes
--
-- Mesma meta (R$ 1.200,00) para comparar a barra de progresso lado a lado:
--
--   Vacinas dos filhotes   →   0%   (sem entradas)
--   Ração para o inverno   →  47%   (R$ 564,00)
--   Castração da ninhada   → 100%   (R$ 1.200,00)
--
-- Dados fictícios; fotos do Unsplash (placeholder, exigem internet).
-- PRÉ-REQUISITO: seed.sql já rodado (conta admin@patinhas.org) e migração 0006.
-- Idempotente: pula a vaquinha cujo título já existe.
-- =============================================================================
do $$
declare
  admin_id uuid;
  v_id     uuid;
  img      constant text := 'https://images.unsplash.com/photo-';
  cover    constant text := '?w=1200&q=80&auto=format&fit=crop';
  thumb    constant text := '?w=900&q=80&auto=format&fit=crop';
begin
  select id into admin_id from public.profiles where email = 'admin@patinhas.org';
  if admin_id is null then
    raise exception 'Conta admin@patinhas.org não encontrada. Rode seed.sql antes.';
  end if;

  if to_regclass('public.vaquinha_entradas') is null then
    raise exception 'Migração 0006 não aplicada. Rode supabase/migrations/0006_vaquinhas_completas_nota_status.sql antes.';
  end if;

  -- 1. Zerada --------------------------------------------------------------------
  if not exists (select 1 from public.vaquinhas where title = 'Vacinas dos filhotes') then
    insert into public.vaquinhas
      (title, description, details, cover_uri, photo_uris, goal_cents, pix_key, animal_id, active, created_by)
    values
      ('Vacinas dos filhotes',
       'Vacina V10 e antirrábica para os seis filhotes resgatados no bairro Moinhos.',
       'Os seis filhotes chegaram ao abrigo com cerca de dois meses, todos saudáveis, mas sem nenhuma vacina.' || chr(10) || chr(10) ||
       'O valor cobre três doses de V10 por filhote (R$ 900) e a antirrábica (R$ 300). Vacinados, eles já podem ir para adoção.',
       img || '1576201836106-db1758fd1c97' || cover,
       array[img || '1507146426996-ef05306b995a' || thumb,
             img || '1537151608828-ea2b11777ee8' || thumb],
       120000, '12.345.678/0001-90', null, true, admin_id);
  end if;

  -- 2. 47% -----------------------------------------------------------------------
  if not exists (select 1 from public.vaquinhas where title = 'Ração para o inverno') then
    insert into public.vaquinhas
      (title, description, details, cover_uri, photo_uris, goal_cents, pix_key, animal_id, active, created_by)
    values
      ('Ração para o inverno',
       'Ração e cobertores para os cães do abrigo atravessarem os meses mais frios.',
       'No inverno os cães gastam mais energia para se aquecer e comem quase o dobro.' || chr(10) || chr(10) ||
       'O valor cobre 10 sacos de ração de 15 kg (R$ 950) e cobertores novos para as baias (R$ 250).',
       img || '1548199973-03cce0bbc87b' || cover,
       array[img || '1530281700549-e82e7bf110d6' || thumb,
             img || '1588943211346-0908a1fb0b01' || thumb,
             img || '1583511655857-d19b40a7a54e' || thumb],
       120000, '12.345.678/0001-90', null, true, admin_id)
    returning id into v_id;

    insert into public.vaquinha_entradas (vaquinha_id, amount_cents, note, created_by, created_at)
    values
      (v_id, 30000, 'PIX recebidos na primeira semana', admin_id, now() - interval '8 days'),
      (v_id, 26400, 'Rifa do bazar de sábado', admin_id, now() - interval '2 days');
  end if;

  -- 3. 100% ----------------------------------------------------------------------
  if not exists (select 1 from public.vaquinhas where title = 'Castração da ninhada') then
    insert into public.vaquinhas
      (title, description, details, cover_uri, photo_uris, goal_cents, pix_key, animal_id, active, created_by)
    values
      ('Castração da ninhada',
       'Castração de oito gatos e cães jovens resgatados juntos no galpão da rua Bento Rosa.',
       'Meta atingida! Obrigado a todo mundo que doou.' || chr(10) || chr(10) ||
       'Com a clínica parceira cobrando R$ 150 por animal, os oito já estão agendados para a próxima semana.',
       img || '1450778869180-41d0601e046e' || cover,
       array[img || '1518791841217-8f162f1e1131' || thumb,
             img || '1494256997604-768d1f608cac' || thumb,
             img || '1517423440428-a5a00ad493e8' || thumb],
       120000, '12.345.678/0001-90', null, true, admin_id)
    returning id into v_id;

    insert into public.vaquinha_entradas (vaquinha_id, amount_cents, note, created_by, created_at)
    values
      (v_id, 70000, 'Doação da feira do produtor', admin_id, now() - interval '20 days'),
      (v_id, 35000, 'PIX recebidos', admin_id, now() - interval '9 days'),
      (v_id, 15000, 'Bazar de encerramento', admin_id, now() - interval '1 day');
  end if;

  raise notice 'Vaquinhas de demonstração aplicadas.';
end $$;
