-- Conde 2026-09-23: Supabase avisó que desde el 30 de octubre deja de otorgar automáticamente
-- permisos de API a las tablas nuevas -- cada tabla nueva ya necesitaba su propio GRANT explícito
-- a "authenticated" en este proyecto (bug real ya repetido 5 veces, ver
-- feedback_grant_authenticated_tabla_nueva en la memoria del proyecto). El 25 de agosto se
-- resolvió lo mismo para "service_role" (migracion_grant_service_role_informes.sql) con
-- ALTER DEFAULT PRIVILEGES -- se replica el mismo mecanismo acá para "authenticated", así ninguna
-- tabla nueva queda bloqueada aunque alguna vez se olvide el GRANT a mano.
--
-- Esto NO cambia el comportamiento real de la app: todas las tablas de este proyecto ya usan RLS
-- con "using (auth.role() = 'authenticated')", así que un usuario autenticado ya podía leer/
-- escribir según esa política -- este GRANT es la capa de permisos de PostgREST que tiene que
-- existir POR ENCIMA de RLS para que la API ni siquiera intente la consulta. De paso, si alguna
-- tabla vieja se hubiera quedado sin su GRANT por descuido, este script la deja funcionando.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
