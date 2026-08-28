-- Conde 2026-08-28: "no lo está borrando" -- el botón de eliminar pedido en Montajes Rompecabezas
-- (B2C) no borraba nada. Mismo patrón que ya pasó antes con historial_cierres: estas tablas nunca
-- necesitaron DELETE hasta ahora (la app solo insertaba/actualizaba), así que el rol autenticado
-- (con el que entra Conde al hacer login real de Supabase, ver tacticalLogin en tactical-supabase.js)
-- nunca tuvo ese permiso concedido. Sin este grant, Supabase rechaza el borrado en silencio para
-- quien mira la consola -- para el usuario, el botón simplemente "no hace nada".
grant delete on public.b2c_pedidos to authenticated;
grant delete on public.b2c_pedido_items to authenticated;

-- De paso, por si el mismo problema ya afectaba (sin que se hubiera notado) al borrado de fichas
-- de producción del Kanban -- que es lo que además intenta borrar este mismo botón cuando el
-- pedido ya estaba aprobado.
grant delete on public.kanban_fichas to authenticated;
grant delete on public.kanban_lineas to authenticated;
grant delete on public.kanban_checklist to authenticated;
grant delete on public.kanban_fotos to authenticated;
