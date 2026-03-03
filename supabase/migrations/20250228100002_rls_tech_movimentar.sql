-- TECH: permitir criar movements (fluxo Movimentar setor→setor)
-- requested_by = auth.uid, pickup_technician_id = auth.uid, status = picked_up
CREATE POLICY "movements_insert_tech" ON movements
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'TECH'
    AND requested_by = auth.uid()
    AND pickup_technician_id = auth.uid()
    AND status = 'picked_up'
  );

-- TECH: inserir itens em movements que criou (pickup_technician = auth)
-- Necessário para createMovementPickedUp que cria movement + items em seguida
CREATE POLICY "movement_items_insert_tech_picked_up" ON movement_items
  FOR INSERT
  WITH CHECK (
    public.active_user_role() = 'TECH'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.pickup_technician_id = auth.uid()
      AND m.requested_by = auth.uid()
    )
  );
