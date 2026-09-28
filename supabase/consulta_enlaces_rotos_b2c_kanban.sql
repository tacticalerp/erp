-- Diagnóstico general: ¿el enlace roto de Camila es un caso aislado, o hay más pedidos B2C con
-- kanban_ficha_id que ya no apunta a ninguna ficha real? (Conde 2026-09-28, solo lectura).
select p.id as pedido_id, p.nombre, p.estado, p.nota_comercial, p.kanban_ficha_id, p.fecha
from public.b2c_pedidos p
left join public.kanban_fichas f on f.id = p.kanban_ficha_id
where p.kanban_ficha_id is not null and f.id is null
order by p.fecha desc;
