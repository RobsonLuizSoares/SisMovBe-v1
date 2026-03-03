-- unit_responsibles: leitura para usuários ativos (como units)
CREATE POLICY "unit_responsibles_select_active" ON unit_responsibles
  FOR SELECT
  USING (public.is_active_user());

-- Admins podem gerenciar responsáveis
CREATE POLICY "unit_responsibles_all_admin" ON unit_responsibles
  FOR ALL
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));
