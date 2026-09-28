select id, nombre_cli, titulo, columna, diseno_aprobado, fecha_entrega, created_at
from public.kanban_fichas
where nombre_cli ilike '%camila%lopera%'
order by created_at desc;
