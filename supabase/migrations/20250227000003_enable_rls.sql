-- Funções auxiliares para RLS (SECURITY DEFINER bypassa RLS para leitura)
CREATE OR REPLACE FUNCTION public.active_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_unit_id()
RETURNS uuid AS $$
  SELECT unit_id FROM public.profiles
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Seame receipts UL (para UNIT_USER criar movements)
CREATE OR REPLACE FUNCTION public.seame_receipts_ul_code()
RETURNS char(6) AS $$
  SELECT seame_receipts_ul_code FROM public.app_settings WHERE id = 1 LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
