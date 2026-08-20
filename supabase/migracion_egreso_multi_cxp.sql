-- ==========================================================================
-- TACTICAL ERP -- Agrega "ids_cxp" (lista) a egresos: permite pagar varias
-- Cuentas por Pagar del mismo proveedor en un solo Comprobante de Egreso.
-- "cxp_id" (singular) se conserva para los egresos viejos de una sola
-- factura -- no se borra ni se migra, el código nuevo simplemente prefiere
-- "ids_cxp" cuando existe. Conde 2026-08-20.
-- ==========================================================================

alter table public.egresos
  add column if not exists ids_cxp jsonb not null default '[]'::jsonb;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
