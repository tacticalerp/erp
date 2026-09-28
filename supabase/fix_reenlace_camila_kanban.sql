-- Reconecta el pedido B2C de Camila Lopera con su ficha REAL actual del Kanban (la vieja,
-- 78c771d7-..., ya no existe -- se borró en algún momento sin actualizar este enlace).
update public.b2c_pedidos
set kanban_ficha_id = 'eee20b23-199b-444f-976f-5a660a1d48d5'
where id = '603e5614-d306-43cd-84cf-a0ed66696e8e';
