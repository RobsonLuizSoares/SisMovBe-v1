-- MVP: permitir itens manuais sem foto (label_photo_url null)
-- O fluxo TECH "Movimentar" adiciona itens manuais sem foto.
-- Na V2 pode-se restaurar a obrigatoriedade via policy ou novo constraint.
ALTER TABLE movement_items DROP CONSTRAINT IF EXISTS movement_items_manual_requires_photo;
