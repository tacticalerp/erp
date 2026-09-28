-- Diagnóstico: por qué Camila Lopera sigue en la tabla "Personalizados" de Comercial aunque su
-- ficha del Kanban ya está en Postventa (Conde 2026-09-28, solo lectura, no modifica nada).

-- 1. Todas las fichas del Kanban de Camila -- ver columna, diseño aprobado y el id exacto.
select id, nombre_cli, titulo, columna, diseno_aprobado, fecha_entrega, created_at
from public.kanban_fichas
where nombre_cli ilike '%camila%lopera%'
order by created_at desc;

-- 2. Todos los pedidos B2C de Camila -- ver a cuál ficha del Kanban están enlazados
-- (kanban_ficha_id) y qué nota comercial tienen guardada.
select id, nombre, estado, nota_comercial, kanban_ficha_id, fecha
from public.b2c_pedidos
where nombre ilike '%camila%lopera%'
order by fecha desc;

-- 3. Cruce directo -- para cada pedido de Camila, muestra en qué columna está la ficha a la que
-- dice estar enlazado (si sale NULL en columna_ficha, el kanban_ficha_id no apunta a nada real).
select p.id as pedido_id, p.nombre, p.nota_comercial, p.kanban_ficha_id,
       f.columna as columna_ficha, f.titulo as titulo_ficha
from public.b2c_pedidos p
left join public.kanban_fichas f on f.id = p.kanban_ficha_id
where p.nombre ilike '%camila%lopera%'
order by p.fecha desc;
