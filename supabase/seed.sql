-- Seeds do SismovBE
-- Executado após migrations. RLS é bypassado quando rodado como owner (supabase local).

-- 1) app_settings
INSERT INTO app_settings (id, seame_group_email, seame_receipts_ul_code)
VALUES (1, 'ci-seame@unicamp.br', '000001')
ON CONFLICT (id) DO UPDATE SET
  seame_group_email = EXCLUDED.seame_group_email,
  seame_receipts_ul_code = EXCLUDED.seame_receipts_ul_code,
  updated_at = now();

-- 2) Unidades de exemplo (ul_code 6 dígitos)
INSERT INTO units (ul_code, name, active) VALUES
  ('000001', 'Unidade Exemplo 1', true),
  ('000002', 'Unidade Exemplo 2', true),
  ('000003', 'Unidade Exemplo 3', true),
  ('000004', 'Unidade Exemplo 4', true)
ON CONFLICT (ul_code) DO NOTHING;

-- 3) Responsáveis (1 por unidade)
INSERT INTO unit_responsibles (unit_id, name, email, is_primary, active)
SELECT u.id, 'Responsável ' || u.name, 'resp' || substr(u.ul_code::text, 6, 1) || '@exemplo.unicamp.br', true, true
FROM units u
WHERE NOT EXISTS (SELECT 1 FROM unit_responsibles ur WHERE ur.unit_id = u.id);

-- 4) 10 assets distribuídos nas unidades
INSERT INTO assets (tombamento, barcode_value, description, current_unit_id, active)
SELECT v.tombamento, v.barcode_value, v.description, u.id, true
FROM (VALUES
  ('TOM001', 'BAR001', 'Notebook Dell', '000001'),
  ('TOM002', 'BAR002', 'Monitor LG 24"', '000001'),
  ('TOM003', 'BAR003', 'Cadeira ergonômica', '000001'),
  ('TOM004', 'BAR004', 'Estação de trabalho', '000002'),
  ('TOM005', 'BAR005', 'Impressora HP', '000002'),
  ('TOM006', 'BAR006', 'Armário de arquivo', '000002'),
  ('TOM007', 'BAR007', 'Projetor Epson', '000003'),
  ('TOM008', 'BAR008', 'Mesa executiva', '000003'),
  ('TOM009', 'BAR009', 'Switch de rede', '000004'),
  ('TOM010', 'BAR010', 'Ar condicionado', '000004')
) AS v(tombamento, barcode_value, description, ul_code)
JOIN units u ON u.ul_code = v.ul_code
ON CONFLICT (tombamento) DO NOTHING;
