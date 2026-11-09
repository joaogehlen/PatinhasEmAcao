-- =============================================================================
-- 0011 — Recusa direta do pedido de adoção
--
-- O pedido podia ser recusado só depois de entrar em análise. Isso impedia o
-- app de recusar sozinho os outros pedidos abertos quando um deles é aprovado
-- e o animal é marcado como adotado — e obrigava o admin a dois toques para
-- descartar um pedido que nem precisa de análise.
--
-- Agora: enviada → em_analise | recusada; em_analise → aprovada | recusada.
-- Espelho de src/domain/rules/adocaoStatus.ts.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

create or replace function public.can_transition_adocao(from_status public.adocao_status, to_status public.adocao_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (from_status, to_status) in (
    ('enviada'::public.adocao_status, 'em_analise'::public.adocao_status),
    ('enviada'::public.adocao_status, 'recusada'::public.adocao_status),
    ('em_analise'::public.adocao_status, 'aprovada'::public.adocao_status),
    ('em_analise'::public.adocao_status, 'recusada'::public.adocao_status)
  )
$$;
