-- E) movement_events
-- Leitura: quem pode ler o movement pode ler os events
CREATE POLICY "movement_events_select_admin" ON movement_events
  FOR SELECT
  USING (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "movement_events_select_tech" ON movement_events
  FOR SELECT
  USING (
    public.active_user_role() = 'TECH'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_events.movement_id
      AND (m.pickup_technician_id = auth.uid() OR m.status = 'requested')
    )
  );

CREATE POLICY "movement_events_select_unit_user" ON movement_events
  FOR SELECT
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_events.movement_id
      AND m.requested_by = auth.uid()
    )
  );

-- Inserção: junto às mudanças de status (TECH/UNIT_USER dentro das restrições)
CREATE POLICY "movement_events_insert_admin" ON movement_events
  FOR INSERT
  WITH CHECK (public.active_user_role() IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN'));

CREATE POLICY "movement_events_insert_tech" ON movement_events
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'TECH'
    AND actor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_events.movement_id
      AND (m.pickup_technician_id = auth.uid() OR m.status = 'requested')
    )
  );

CREATE POLICY "movement_events_insert_unit_user" ON movement_events
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'UNIT_USER'
    AND actor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_events.movement_id
      AND m.requested_by = auth.uid()
    )
  );
