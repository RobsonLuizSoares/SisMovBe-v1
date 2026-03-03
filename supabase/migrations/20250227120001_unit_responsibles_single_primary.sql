-- Garantir apenas 1 responsável principal por unidade
-- Ao marcar is_primary=true, desmarca os outros da mesma unidade
CREATE OR REPLACE FUNCTION public.ensure_single_primary_responsible()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE unit_responsibles
    SET is_primary = false
    WHERE unit_id = NEW.unit_id
      AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_single_primary_responsible ON unit_responsibles;
CREATE TRIGGER trg_ensure_single_primary_responsible
  BEFORE INSERT OR UPDATE OF is_primary ON unit_responsibles
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.ensure_single_primary_responsible();
