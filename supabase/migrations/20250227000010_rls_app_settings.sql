-- F) app_settings
-- Leitura: SEAME_ADMIN e PATRIMONIO_ADMIN
CREATE POLICY "app_settings_select_admin" ON app_settings
  FOR SELECT
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

-- Escrita: somente PATRIMONIO_ADMIN
CREATE POLICY "app_settings_update_patrimonio" ON app_settings
  FOR UPDATE
  USING (public.active_user_role() = 'PATRIMONIO_ADMIN');

CREATE POLICY "app_settings_insert_patrimonio" ON app_settings
  FOR INSERT
  WITH CHECK (public.active_user_role() = 'PATRIMONIO_ADMIN');
