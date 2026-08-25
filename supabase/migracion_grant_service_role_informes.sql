-- Conde 2026-08-25: la Edge Function send-reports (informes por correo) usa la SERVICE_ROLE key,
-- que en teoría bypasea RLS -- pero RLS y los GRANT de SQL son 2 capas distintas de permisos.
-- Estas tablas nunca recibieron un GRANT explícito para "service_role" (los scripts de migración
-- de este proyecto solo otorgaban permisos a "authenticated"), así que las consultas del informe
-- fallaban con error 42501 ("insufficient privilege") -- confirmado en los logs de la función
-- ("Grant the required privileges to the current role").
--
-- Esto da permiso de SOLO LECTURA (select) a service_role sobre todo el esquema "public" -- suficiente
-- para que los informes puedan consultar cualquier tabla, sin darle permiso de escribir/borrar nada
-- (los informes nunca modifican datos). El "alter default privileges" al final hace que las tablas
-- que se creen MÁS ADELANTE también incluyan este permiso automáticamente, sin tener que repetir
-- este script cada vez que se agregue una tabla nueva.
grant usage on schema public to service_role;
grant select on all tables in schema public to service_role;
alter default privileges in schema public grant select on tables to service_role;
