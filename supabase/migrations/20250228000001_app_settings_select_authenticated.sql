-- Permitir usuários autenticados ativos lerem app_settings (necessário para UNIT_USER obter seame_receipts_ul_code)
CREATE POLICY "app_settings_select_authenticated" ON app_settings
  FOR SELECT
  USING (public.is_active_user());
