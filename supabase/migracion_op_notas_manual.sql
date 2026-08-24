-- Conde 2026-08-24: "hay cosas que se hacen de manera manual... prefiero editar la OT" -- notas
-- libres que se ven al imprimir la Orden de Producción y quedan guardadas en la ficha para poder
-- volver a editarlas la próxima vez que se abra esa misma OP.
alter table kanban_fichas add column if not exists op_notas_manual text;
