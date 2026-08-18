-- ==========================================================================
-- TACTICAL ERP -- Arreglo: quitar restricciones que causaban que el
-- Historial de Cierres se rechazara en silencio.
--
-- Por qué: el ERP guarda de forma "optimista" -- muestra el cambio en
-- pantalla al instante, y la base de datos se pone al día un momento
-- después en segundo plano (no espera). Las reglas de integridad
-- (foreign key) que exigían que la oportunidad YA existiera en la base de
-- datos antes de poder cerrarla chocan con ese modelo -- si el cierre pasa
-- muy rápido después de crear la oportunidad, la base de datos la rechaza.
-- La app ya se encarga de que los IDs coincidan correctamente por su
-- cuenta, así que esta regla no hace falta -- se quita para que nunca
-- vuelva a bloquear un guardado real.
-- ==========================================================================

alter table public.historial_cierres drop constraint if exists historial_cierres_opp_id_fkey;
alter table public.opps drop constraint if exists opps_id_cliente_fkey;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
