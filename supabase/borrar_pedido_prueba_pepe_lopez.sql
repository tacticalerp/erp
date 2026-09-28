-- Borra el pedido de prueba de "pepe lopez" (Conde: "era una prueba que se hizo en algun momento").
-- Su kanban_ficha_id ya apuntaba a una ficha inexistente (huérfano, mismo caso que Camila) -- no
-- hay ficha real que limpiar en kanban_fichas, solo el pedido y sus ítems.
-- Mismo orden que usa la app (tacticalEliminarB2CPedido): ítems primero, pedido después.

delete from public.b2c_pedido_items
where pedido_id = 'eeacbee9-7cfb-4453-b0e6-215ef26dbc69';

delete from public.b2c_pedidos
where id = 'eeacbee9-7cfb-4453-b0e6-215ef26dbc69';
