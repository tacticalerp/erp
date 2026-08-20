-- ==========================================================================
-- TACTICAL ERP -- Agrega el campo "iva" a nivel de ÍTEM en Documentos de
-- Venta y Cuentas por Pagar (antes solo existía a nivel de documento).
-- Conde 2026-08-20: quitó el campo único "IVA incluido" y pidió que sea una
-- columna más de la tabla de ítems (Descripción - Cantidad - Valor Unitario
-- - IVA - Valor Total), igual en Factura de Venta y Factura de Proveedor.
-- El IVA por documento (columnas ya existentes) ahora se calcula sumando el
-- IVA de todos sus ítems, no se escribe aparte.
-- ==========================================================================

alter table public.documentos_venta_items
  add column if not exists iva numeric not null default 0;

alter table public.cuentas_por_pagar_items
  add column if not exists iva numeric not null default 0;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
