-- A) units e assets: leitura para qualquer usuário autenticado ativo
CREATE POLICY "units_select_active" ON units
  FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "assets_select_active" ON assets
  FOR SELECT
  USING (public.is_active_user());

-- Admins podem gerenciar units e assets
CREATE POLICY "units_all_admin" ON units
  FOR ALL
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "assets_all_admin" ON assets
  FOR ALL
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));
