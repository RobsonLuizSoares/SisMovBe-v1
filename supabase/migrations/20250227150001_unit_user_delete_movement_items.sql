-- UNIT_USER pode deletar itens de movements que solicitou, enquanto status=requested
CREATE POLICY "movement_items_delete_unit_user" ON movement_items
  FOR DELETE
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_items.movement_id
      AND m.requested_by = auth.uid()
      AND m.status = 'requested'
    )
  );
