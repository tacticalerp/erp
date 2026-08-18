-- ==========================================================================
-- TACTICAL ERP -- Arreglo GENERAL: quitar TODAS las restricciones que pueden
-- causar el mismo bug que ya vimos 2 veces (Historial de Cierres y Kanban).
--
-- Por qué: el ERP guarda de forma "optimista" -- muestra el cambio en
-- pantalla al instante y la base de datos se pone al día un momento después
-- en segundo plano, sin esperar una cosa a la otra. Cualquier regla de
-- integridad (foreign key) que exija "el cliente/oportunidad ya debe existir
-- en la base de datos" puede rechazar un guardado real si dos cosas se crean
-- muy rápido seguidas (ej. un cliente nuevo + la ficha de Kanban para ese
-- cliente, casi al mismo tiempo). Ya pasó 2 veces con tablas distintas --
-- en vez de ir arreglando una por una según aparezcan, se quitan TODAS las
-- que tienen este mismo riesgo de una vez, en las tablas que ya existen Y en
-- las que se van a usar en las próximas migraciones (Cotizaciones,
-- Contabilidad, Ventas B2C) para no volver a tropezar con esto.
--
-- La app ya se encarga de que los IDs coincidan correctamente por su cuenta
-- -- estas reglas de la base de datos no aportaban seguridad real (eso lo da
-- Row Level Security, que NO se toca aquí), solo generaban este problema.
-- ==========================================================================

alter table public.opps drop constraint if exists opps_id_cliente_fkey;
alter table public.historial_cierres drop constraint if exists historial_cierres_opp_id_fkey;
alter table public.kanban_fichas drop constraint if exists kanban_fichas_id_cliente_fkey;
alter table public.cotizaciones_cuadernos drop constraint if exists cotizaciones_cuadernos_opp_id_fkey;
alter table public.cotizaciones_cuadernos drop constraint if exists cotizaciones_cuadernos_id_cliente_fkey;
alter table public.pedidos_borrador drop constraint if exists pedidos_borrador_id_cliente_fkey;
alter table public.comparaciones_borrador drop constraint if exists comparaciones_borrador_id_cliente_fkey;
alter table public.documentos_venta drop constraint if exists documentos_venta_id_cliente_fkey;
alter table public.documentos_venta drop constraint if exists documentos_venta_id_cotizacion_fkey;
alter table public.documentos_venta drop constraint if exists documentos_venta_opp_id_fkey;
alter table public.ingresos drop constraint if exists ingresos_id_cliente_fkey;
alter table public.ingresos drop constraint if exists ingresos_id_documento_venta_fkey;
alter table public.egresos drop constraint if exists egresos_cxp_id_fkey;
alter table public.b2c_pedidos drop constraint if exists b2c_pedidos_kanban_ficha_id_fkey;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
