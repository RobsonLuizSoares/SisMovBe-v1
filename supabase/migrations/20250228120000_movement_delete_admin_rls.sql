-- Exclusão de movimentações: apenas PATRIMONIO_ADMIN e SEAME_ADMIN, e somente quando processed_asiweb=false

-- Substituir movements_all_admin (ALL) por políticas separadas para restringir DELETE
DROP POLICY IF EXISTS "movements_all_admin" ON public.movements;

-- Admin: SELECT, INSERT, UPDATE sem restrição
CREATE POLICY "movements_admin_select_insert_update" ON public.movements
  FOR ALL
  TO authenticated
  USING (
    public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
  )
  WITH CHECK (
    public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
  );

-- Nota: FOR ALL com USING/WITH CHECK aplica a ambos. Para DELETE, só USING importa (WITH CHECK não se aplica a DELETE).
-- Precisamos de política separada só para DELETE com a condição processed_asiweb.

-- Recriar: a política acima permite ALL. Precisamos NEGAR delete quando processed_asiweb.
-- Em RLS, não há "deny". Só permitimos. Então precisamos que a única policy de DELETE seja a restritiva.

-- Solução: criar policy apenas para SELECT, INSERT, UPDATE; e outra apenas para DELETE.
DROP POLICY IF EXISTS "movements_admin_select_insert_update" ON public.movements;

CREATE POLICY "movements_admin_select" ON public.movements
  FOR SELECT
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "movements_admin_insert" ON public.movements
  FOR INSERT
  WITH CHECK (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "movements_admin_update" ON public.movements
  FOR UPDATE
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'))
  WITH CHECK (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "movements_admin_delete_unprocessed" ON public.movements
  FOR DELETE
  USING (
    public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
    AND processed_asiweb = false
  );
