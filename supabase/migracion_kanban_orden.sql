-- Conde 2026-10-09: guardar el ORDEN de las fichas del Kanban dentro de cada columna.
-- Antes el orden (ej. subir una ficha arriba de otra) solo valia hasta recargar: al abrir de nuevo
-- las fichas volvian al orden de creacion. El ERP sigue funcionando sin esto, pero sin esta columna
-- el orden no se conserva al recargar.
-- Pegar en el SQL Editor de Supabase y ejecutar (se puede correr mas de una vez).
alter table public.kanban_fichas add column if not exists orden double precision;
