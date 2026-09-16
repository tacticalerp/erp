-- Conde 2026-09-16: "elimina causa externa... coloca una que sea urgente" -- el ERP ya permite
-- marcar una tarea como 'urgente' (borde rojo en toda la fila), pero la tabla tareas todavía
-- tenía la restricción vieja que solo aceptaba
-- ('pendiente','proceso','externo','listo','finalizado') -- guardar 'urgente' se veía bien en
-- pantalla pero Supabase lo rechazaba con "Error guardando tarea en Supabase" (violación de la
-- restricción CHECK).
--
-- Se agrega 'urgente' a la lista permitida. 'proceso' y 'externo' se DEJAN en la lista (no se
-- quitan) por si alguna tarea vieja todavía los tiene guardados sin tocar -- el ERP ya no permite
-- elegirlos desde el desplegable y los normaliza solos a 'pendiente' en cuanto esa tarea se
-- carga/guarda de nuevo, así que se van a ir "limpiando" solos con el uso normal, sin necesidad
-- de una restricción más estricta que pueda romper algo.
--
-- Cómo correr: Supabase Dashboard -> SQL Editor -> pegar todo -> Run.

alter table public.tareas drop constraint if exists tareas_status_check;
alter table public.tareas add constraint tareas_status_check
  check (status in ('pendiente','proceso','externo','urgente','listo','finalizado'));

-- Verificar que quedó bien:
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'tareas_status_check';
