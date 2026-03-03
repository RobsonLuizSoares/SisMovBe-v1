-- Código amigável incremental para movements (YYYY_000001)
-- Reinicia contagem a cada ano baseado em created_at

-- 1) Adicionar coluna display_code em movements
ALTER TABLE public.movements
  ADD COLUMN display_code text UNIQUE;

-- 2) Tabela de controle por ano
CREATE TABLE public.movement_counters (
  year int PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);

-- 3) Função para gerar o próximo código (transacional)
-- SECURITY DEFINER: trigger precisa acessar movement_counters independente de RLS
CREATE OR REPLACE FUNCTION public.next_movement_display_code(p_created_at timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year int;
  v_val int;
BEGIN
  v_year := extract(year from p_created_at)::int;
  -- Upsert: incrementa last_value e retorna o novo valor
  INSERT INTO public.movement_counters (year, last_value)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET last_value = public.movement_counters.last_value + 1
  RETURNING last_value INTO v_val;
  RETURN format('%s_%s', v_year, lpad(v_val::text, 6, '0'));
END;
$$;

-- 4) Trigger BEFORE INSERT em movements
CREATE OR REPLACE FUNCTION public.set_movement_display_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.display_code IS NULL THEN
    NEW.display_code := public.next_movement_display_code(COALESCE(NEW.created_at, now()));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movements_set_display_code
  BEFORE INSERT ON public.movements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_movement_display_code();

-- 5) Backfill: preencher display_code para movimentos existentes por ano (ordem created_at)
WITH ordered AS (
  SELECT id, created_at,
    row_number() OVER (PARTITION BY extract(year from created_at)::int ORDER BY created_at, id) AS rn
  FROM public.movements
  WHERE display_code IS NULL
)
UPDATE public.movements m
SET display_code = format('%s_%s', extract(year from o.created_at)::int, lpad(o.rn::text, 6, '0'))
FROM ordered o
WHERE m.id = o.id;

-- Sincronizar movement_counters: last_value = total de movements por ano (próximo insert será +1)
INSERT INTO public.movement_counters (year, last_value)
SELECT extract(year from created_at)::int AS year, count(*)::int
FROM public.movements
GROUP BY extract(year from created_at)
ON CONFLICT (year) DO UPDATE
SET last_value = (SELECT count(*)::int FROM public.movements WHERE extract(year from created_at) = EXCLUDED.year);

-- 6) Tornar display_code NOT NULL após backfill (novos inserts já terão)
-- Manter nullable para segurança: se o trigger falhar, insert não quebra
COMMENT ON COLUMN public.movements.display_code IS 'Código amigável YYYY_000001, gerado automaticamente no insert';
