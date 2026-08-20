-- ==========================================================================
-- TACTICAL ERP -- Borra las pruebas de Contabilidad, conserva Proveedores y
-- Gastos Fijos. Reinicia los consecutivos (FV/CC/IN/CP/EG) a 0.
-- Conde 2026-08-20. IRREVERSIBLE -- revisa antes de correr.
-- ==========================================================================

-- Documentos de Venta (Factura/Cuenta de Cobro) -- borra también sus items
-- automáticamente (documentos_venta_items tiene "on delete cascade").
delete from public.documentos_venta;

-- Ingresos
delete from public.ingresos;

-- Cuentas por Pagar -- borra también sus items automáticamente
-- (cuentas_por_pagar_items tiene "on delete cascade").
delete from public.cuentas_por_pagar;

-- Egresos
delete from public.egresos;

-- Reinicia los consecutivos de numeración a 0 -- el próximo documento real
-- empieza limpio (ej. FV-1 en vez de continuar donde quedaron las pruebas).
update public.contadores set valor = 0 where tipo in ('fv','cc','ingreso','cxp','egreso');

-- NO se tocan: proveedores, gastos_fijos_config (se conservan a propósito).

-- Verificación: debe mostrar 0 en las 4 tablas y 0 en los 5 consecutivos.
select 'documentos_venta' as tabla, count(*) from public.documentos_venta
union all select 'ingresos', count(*) from public.ingresos
union all select 'cuentas_por_pagar', count(*) from public.cuentas_por_pagar
union all select 'egresos', count(*) from public.egresos;

select tipo, valor from public.contadores where tipo in ('fv','cc','ingreso','cxp','egreso');
