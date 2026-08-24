-- Conde 2026-08-24: Plan de Tareas ahora permite poner una fecha límite (opcional) por tarea,
-- para cuando de entrada no se sabe cuándo termina algo pero luego sí se puede fijar una meta.
alter table tareas add column if not exists fecha_limite date;
