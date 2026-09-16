-- Conde 2026-09-16: "sigue con el problema" -- migracion_historico_financiero.sql creó las 4
-- tablas + políticas RLS, pero se me olvidó el GRANT explícito al rol 'authenticated' (en este
-- proyecto los permisos NO son automáticos por tabla nueva -- ver migracion_permisos_completa_
-- authenticated.sql, este mismo error ya pasó 4 veces antes con otras tablas). Por eso el SQL
-- Editor sí veía las 38 filas (corre como superusuario, sin RLS) pero el ERP -- que entra como
-- 'authenticated' -- recibía "permission denied" y por eso el arreglo de "recargar el schema"
-- (NOTIFY pgrst) no solucionó nada: el problema nunca fue el caché de PostgREST.
--
-- Cómo correr: Supabase Dashboard -> SQL Editor -> pegar todo -> Run.

grant select, insert, update, delete on public.historico_financiero_anual to authenticated;
grant select, insert, update, delete on public.historico_financiero_mensual to authenticated;
grant select, insert, update, delete on public.historico_balance_anual to authenticated;
grant select, insert, update, delete on public.historico_ventas_cliente to authenticated;
