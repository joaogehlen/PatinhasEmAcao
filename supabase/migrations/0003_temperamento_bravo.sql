-- =============================================================================
-- 0003 — Temperamento "protetor" vira "bravo"
--
-- "Protetor" descrevia o animal de forma simpática e não avisava nada a quem
-- vai chegar perto. Quem atende a denúncia precisa saber que o bicho pode
-- avançar, e essa informação é de segurança, não de personalidade.
--
-- Não usamos "raivoso": em português, raiva também é o nome da doença, e
-- marcar um animal assim seria uma afirmação médica que ninguém no app tem
-- como sustentar.
--
-- RENAME VALUE preserva as linhas existentes: quem estava como 'protetor'
-- passa a 'bravo' sozinho, sem update e sem recriar o tipo.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'animal_temperament' and e.enumlabel = 'protetor'
  ) then
    alter type public.animal_temperament rename value 'protetor' to 'bravo';
  end if;
end
$$;
