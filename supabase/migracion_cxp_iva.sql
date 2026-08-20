-- ==========================================================================
-- TACTICAL ERP -- Agrega el campo "iva" (informativo) a Cuentas por Pagar
-- (Factura de Proveedor). No afecta el Monto Total ni el Saldo Pendiente --
-- es solo para anotar cuánto de ese monto era IVA, útil para la
-- declaración de impuestos. Conde 2026-08-20.
-- ==========================================================================

alter table public.cuentas_por_pagar
  add column if not exists iva numeric not null default 0;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
