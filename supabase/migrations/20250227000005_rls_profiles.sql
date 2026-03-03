-- B) profiles
-- Admins podem inserir perfis (ex: ao cadastrar novo usuário)
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT
  WITH CHECK (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

-- Cada usuário lê o próprio profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- PATRIMONIO_ADMIN e SEAME_ADMIN podem ler todos
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (
    public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
  );

-- PATRIMONIO_ADMIN pode alterar roles e unit_id de qualquer usuário
CREATE POLICY "profiles_update_patrimonio_admin" ON profiles
  FOR UPDATE
  USING (public.active_user_role() = 'PATRIMONIO_ADMIN');

-- SEAME_ADMIN pode alterar TECH (e outros), mas não tornar ninguém PATRIMONIO_ADMIN
CREATE POLICY "profiles_update_seame_admin" ON profiles
  FOR UPDATE
  USING (
    public.active_user_role() = 'SEAME_ADMIN'
    AND role != 'PATRIMONIO_ADMIN'
  )
  WITH CHECK (
    public.active_user_role() = 'SEAME_ADMIN'
    AND role != 'PATRIMONIO_ADMIN'
  );
