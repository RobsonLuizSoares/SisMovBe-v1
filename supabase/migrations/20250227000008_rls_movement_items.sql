-- D) movement_items
-- Leitura: acompanha permissão do movement (via join ou subquery)

-- Admin: acesso total
CREATE POLICY "movement_items_all_admin" ON movement_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
    )
  );

-- TECH: leitura quando pode ler o movement
CREATE POLICY "movement_items_select_tech" ON movement_items
  FOR SELECT
  USING (
    public.active_user_role() = 'TECH'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND (m.pickup_technician_id = auth.uid() OR m.status = 'requested')
    )
  );

-- UNIT_USER: leitura quando movement foi solicitado por ele
CREATE POLICY "movement_items_select_unit_user" ON movement_items
  FOR SELECT
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.requested_by = auth.uid()
    )
  );

-- Inserção: UNIT_USER/TECH em movements que criou, status=requested
CREATE POLICY "movement_items_insert_creator" ON movement_items
  FOR INSERT
  WITH CHECK (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.requested_by = auth.uid()
      AND m.status = 'requested'
    )
  );

-- TECH: insert em movements da fila (requested) - para quando for designado
-- Na prática, TECH adiciona itens ao pegar o movement. Policy mais permissiva:
-- TECH pode inserir em movement onde é pickup_technician ou status=requested
CREATE POLICY "movement_items_insert_tech" ON movement_items
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'TECH'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.status = 'requested'
    )
  );

-- Update: TECH pode ajustar itens apenas antes de picked_up (status=requested)
CREATE POLICY "movement_items_update_tech" ON movement_items
  FOR UPDATE
  USING (
    public.active_user_role() = 'TECH'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.status = 'requested'
    )
  );
