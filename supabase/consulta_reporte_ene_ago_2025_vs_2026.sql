-- Reporte Ene-Ago 2025 vs Ene-Ago 2026 (solo lectura, no modifica nada).
-- Conde 2026-09-23: "reporte de 2025 resultado de enero a agosto... total de ventas, ingreso,
-- egresos, rentabilidad y 2026 en el mismo periodo".
--
-- OJO -- limitación real de los datos, para que las cifras no se lean como más precisas de lo
-- que son:
--  - VENTAS (facturación) de 2025 Ene-Ago: sí existen mes a mes (historico_financiero_mensual).
--  - EGRESOS/COSTOS de 2025: el cuadro fuente (Excel de Fany) solo trae el costo/gasto TOTAL DEL
--    AÑO, no desglosado mes a mes -- no hay forma de aislar "solo Ene-Ago 2025" de egresos, solo
--    el año completo 2025 (bloque 4 de este script, aparte).
--  - 2026: el ERP en Supabase arrancó a mediados de agosto -- INGRESOS/EGRESOS reales (tabla
--    contabilidad) solo existen desde que se empezó a usar el módulo, no desde enero. Ene-Jul
--    2026 solo tiene el dato de VENTAS (historico_financiero_mensual, del Excel consolidado), sin
--    desglose de egresos.

-- ============================================================================
-- 1. VENTAS (facturación) Ene-Ago 2025, por canal y total
-- ============================================================================
select
  canal,
  sum(ingresos) as ventas_ene_ago_2025
from public.historico_financiero_mensual
where anio = 2025 and mes between 1 and 8 and fuente = 'caja_informal'
group by canal
union all
select 'TOTAL', sum(ingresos)
from public.historico_financiero_mensual
where anio = 2025 and mes between 1 and 8 and fuente = 'caja_informal';

-- ============================================================================
-- 2. VENTAS (facturación) Ene-Ago 2026, por canal y total
--    Ene-Jun: histórico (Excel consolidado). Jul-Ago: si ya hay documentos_venta reales de esos
--    meses, se suman aparte (bloque 2b) porque viven en otra tabla.
-- ============================================================================
select
  canal,
  sum(ingresos) as ventas_historico_ene_ago_2026
from public.historico_financiero_mensual
where anio = 2026 and mes between 1 and 8 and fuente = 'caja_informal'
group by canal
union all
select 'TOTAL', sum(ingresos)
from public.historico_financiero_mensual
where anio = 2026 and mes between 1 and 8 and fuente = 'caja_informal';

-- 2b. Ventas EN VIVO (documentos_venta reales, ya facturados desde el ERP) de Ene-Ago 2026 --
--     esto puede solaparse con el bloque 2 si algún mes quedó cargado en las 2 fuentes; compara
--     los meses antes de sumar los dos bloques a mano.
select
  to_char(fecha, 'YYYY-MM') as mes,
  count(*) as facturas,
  sum(total_documento) as ventas_en_vivo
from public.documentos_venta
where fecha >= '2026-01-01' and fecha < '2026-09-01'
group by 1
order by 1;

-- ============================================================================
-- 3. INGRESOS DE CAJA reales (cobros efectivos, tabla "ingresos") Ene-Ago 2026 -- 2025 no tiene
--    filas acá, es una tabla nueva del ERP en la nube.
-- ============================================================================
select
  to_char(fecha, 'YYYY-MM') as mes,
  sum(valor) as cobros_reales
from public.ingresos
where fecha >= '2026-01-01' and fecha < '2026-09-01'
group by 1
order by 1;

-- ============================================================================
-- 4. EGRESOS/GASTOS -- 2025 solo existe el AÑO COMPLETO (no se puede aislar Ene-Ago), 2026 solo
--    existen los egresos reales cargados desde que se usa el módulo (probablemente ago-sep).
-- ============================================================================
-- 4a. 2025 -- año completo (referencia, NO es "solo Ene-Ago")
select canal, ingresos, costo_ventas, gastos_admin, utilidad_neta
from public.historico_financiero_anual
where anio = 2025 and fuente = 'caja_informal';

-- 4b. 2026 -- egresos reales cargados en el ERP, por mes
select
  to_char(fecha, 'YYYY-MM') as mes,
  sum(monto) as egresos_reales
from public.egresos
where fecha >= '2026-01-01' and fecha < '2026-09-01'
group by 1
order by 1;
