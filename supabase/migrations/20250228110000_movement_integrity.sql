-- Regra primordial: integridade do fluxo de movimentação e histórico imutável (snapshot)

-- Pré-requisito: invalidar movements existentes com origem=destino (dados legados)
UPDATE public.movements SET status = 'canceled' WHERE origin_unit_id = destination_unit_id;

-- B1) Constraint: Origem != Destino
ALTER TABLE public.movements
  ADD CONSTRAINT movements_origin_ne_destination CHECK (origin_unit_id <> destination_unit_id);

-- B2) Imutabilidade estrutural do movement (bloquear alteração de origem, destino e solicitante após criação)
CREATE OR REPLACE FUNCTION public.movements_immutable_structure()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.origin_unit_id IS DISTINCT FROM NEW.origin_unit_id
    OR OLD.destination_unit_id IS DISTINCT FROM NEW.destination_unit_id
    OR OLD.requested_by IS DISTINCT FROM NEW.requested_by
  THEN
    RAISE EXCEPTION 'Não é permitido alterar origem, destino ou solicitante após criação da movimentação'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movements_immutable_structure_trigger ON public.movements;
CREATE TRIGGER movements_immutable_structure_trigger
  BEFORE UPDATE ON public.movements
  FOR EACH ROW
  EXECUTE FUNCTION public.movements_immutable_structure();

-- B3) Imutabilidade dos itens (snapshot) - remover políticas que permitem DELETE/UPDATE para usuários comuns
-- FKs movement_items e movement_events já têm ON DELETE CASCADE (create_tables.sql)
DROP POLICY IF EXISTS "movement_items_delete_unit_user" ON public.movement_items;
DROP POLICY IF EXISTS "movement_items_update_tech" ON public.movement_items;

-- B4) Bloquear "bem em duas movimentações ativas" - trigger BEFORE INSERT em movement_items
CREATE OR REPLACE FUNCTION public.movement_items_no_duplicate_active_asset()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  conflicting_count int;
BEGIN
  IF NEW.asset_id IS NULL THEN
    RETURN NEW; -- itens manuais (sem asset_id) não são validados
  END IF;

  SELECT COUNT(*) INTO conflicting_count
  FROM public.movement_items mi
  INNER JOIN public.movements m ON m.id = mi.movement_id
  WHERE mi.asset_id = NEW.asset_id
    AND m.id <> NEW.movement_id
    AND m.status IN ('requested', 'picked_up');

  IF conflicting_count > 0 THEN
    RAISE EXCEPTION 'Bem já está em movimentação ativa'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movement_items_no_duplicate_active_asset_trigger ON public.movement_items;
CREATE TRIGGER movement_items_no_duplicate_active_asset_trigger
  BEFORE INSERT ON public.movement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.movement_items_no_duplicate_active_asset();

-- B5) Atualizar lotação do bem ao receber (status -> received)
CREATE OR REPLACE FUNCTION public.movements_update_asset_unit_on_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status <> 'received') THEN
    UPDATE public.assets a
    SET current_unit_id = NEW.destination_unit_id
    FROM public.movement_items mi
    WHERE mi.movement_id = NEW.id
      AND mi.asset_id = a.id
      AND mi.asset_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movements_update_asset_unit_on_receive_trigger ON public.movements;
CREATE TRIGGER movements_update_asset_unit_on_receive_trigger
  AFTER UPDATE ON public.movements
  FOR EACH ROW
  EXECUTE FUNCTION public.movements_update_asset_unit_on_receive();

-- B3b) Políticas para rollback: permitir deletar movement vazio quando falha ao criar itens
-- UNIT_USER: deletar própria solicitação requestada com 0 itens (rollback)
CREATE POLICY "movements_delete_unit_user_empty" ON public.movements
  FOR DELETE
  USING (
    public.active_user_role() = 'UNIT_USER'
    AND requested_by = auth.uid()
    AND status = 'requested'
    AND NOT EXISTS (SELECT 1 FROM public.movement_items WHERE movement_id = movements.id)
  );

-- TECH: deletar próprio movement picked_up criado há menos de 5 min (rollback em createMovementPickedUp)
CREATE POLICY "movements_delete_tech_recent" ON public.movements
  FOR DELETE
  USING (
    public.active_user_role() = 'TECH'
    AND pickup_technician_id = auth.uid()
    AND requested_by = auth.uid()
    AND status = 'picked_up'
    AND created_at > now() - interval '5 minutes'
  );

-- B6) View para detectar movimentações inválidas (item_count=0)
CREATE OR REPLACE VIEW public.movements_with_item_count AS
SELECT
  m.*,
  COALESCE(cnt.item_count, 0)::int AS item_count
FROM public.movements m
LEFT JOIN (
  SELECT movement_id, COUNT(*) AS item_count
  FROM public.movement_items
  GROUP BY movement_id
) cnt ON cnt.movement_id = m.id;
