-- C) movements - políticas complexas

-- PATRIMONIO_ADMIN e SEAME_ADMIN: acesso total
CREATE POLICY "movements_all_admin" ON movements
  FOR ALL
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

-- TECH: leitura onde pickup_technician_id = auth.uid() OR status = 'requested'
CREATE POLICY "movements_select_tech" ON movements
  FOR SELECT
  USING (
    public.active_user_role() = 'TECH'
    AND (
      pickup_technician_id = auth.uid()
      OR status = 'requested'
    )
  );

-- UNIT_USER: leitura apenas movements solicitados por ele
CREATE POLICY "movements_select_unit_user" ON movements
  FOR SELECT
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND requested_by = auth.uid()
  );

-- UNIT_USER: criar apenas origin=unit_id e destination=SEAME receipts
CREATE POLICY "movements_insert_unit_user" ON movements
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'UNIT_USER'
    AND requested_by = auth.uid()
    AND origin_unit_id = public.user_unit_id()
    AND destination_unit_id = (
      SELECT id FROM units WHERE ul_code = public.seame_receipts_ul_code() LIMIT 1
    )
  );

-- TECH: update para transições de status (validação em trigger ou app)
-- Política permissiva; transições válidas devem ser validadas por trigger
CREATE POLICY "movements_update_tech" ON movements
  FOR UPDATE
  USING (
    public.active_user_role() = 'TECH'
    AND (
      pickup_technician_id = auth.uid()
      OR status = 'requested'
    )
  );

-- UNIT_USER: cancelar (requested -> canceled) apenas se status ainda requested
CREATE POLICY "movements_update_unit_user_cancel" ON movements
  FOR UPDATE
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND requested_by = auth.uid()
    AND status = 'requested'
  )
  WITH CHECK (status = 'canceled');
