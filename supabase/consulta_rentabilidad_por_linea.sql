-- Rentabilidad y ventas por LINEA de producto (solo lectura, no modifica nada).
-- Conde 2026-10-05: "analisis de rentabilidad y ventas por linea de producto".
--
-- Como leer estos resultados (limites reales de los datos):
--  - "ventas_monto" = lo cotizado/aprobado en el CRM (negocios en estado GANADO). Incluye IVA cuando
--    la cotizacion lo llevaba (Cuentas de Cobro no llevan IVA).
--  - El COSTO (subtotal) y la GANANCIA solo existen donde la cotizacion guardo su desglose:
--      * Cuadernos: siempre (cotizaciones_cuadernos).
--      * Las otras lineas: solo desde que empezaron a guardar el detalle (~27 ago 2026,
--        cotizaciones_calculadoras). Antes de eso solo hay monto, sin costo.
--      * Libre/manual: no guarda subtotal.
--    Por eso "pedidos_con_costo" puede ser menor que "pedidos": el margen % se calcula SOLO sobre
--    los pedidos que si tienen costo, no sobre todos.
--  - "costo" = subtotal del motor (materiales + mano de obra interna estimada + fondo de seguridad
--    + empaque + transporte...). OJO: incluye mano de obra propia que ya esta en Gastos Fijos
--    (limpieza, levante, troquelado, etc.), asi que el margen aqui sale MENOR al margen de
--    contribucion real. Es el mismo sesgo que se hablo para el Punto de Equilibrio.
--  - Antes de ago 2026 NO existe desglose por linea en ninguna fuente (solo totales).
--
-- Corra cada bloque por separado (el SQL Editor muestra solo el resultado del ultimo).

-- ============================================================================
-- 1. Por LINEA: pedidos, ventas, costo, ganancia y margen (todo el historial del ERP)
-- ============================================================================
with ganados as (
  select h.fecha_cierre, h.snapshot as s, (h.snapshot->>'id') as opp_id
  from public.historial_cierres h
  where h.estado = 'ganado'
),
lineas_multi as (   -- pedidos multi-producto: cada linea viene dentro de snapshot.lineas
  select g.fecha_cierre, g.opp_id,
         e->>'linea' as linea,
         nullif(e->>'monto','')::numeric as monto,
         nullif(e->'resultado'->>'precioVentaTotal','')::numeric as venta_sin_iva,
         nullif(e->'resultado'->>'subtotal','')::numeric as costo
  from ganados g,
       jsonb_array_elements(case when jsonb_typeof(g.s->'lineas') = 'array' then g.s->'lineas' else '[]'::jsonb end) e
),
lineas_simple as (  -- pedidos de una sola linea: el costo se busca en la tabla de cotizaciones
  select g.fecha_cierre, g.opp_id,
         g.s->>'linea' as linea,
         nullif(g.s->>'monto','')::numeric as monto,
         coalesce(nullif(cc.resultado->>'precioVentaTotal','')::numeric, nullif(cq.resultado->>'precioVentaTotal','')::numeric) as venta_sin_iva,
         coalesce(nullif(cc.resultado->>'subtotal','')::numeric, nullif(cq.resultado->>'subtotal','')::numeric) as costo
  from ganados g
  left join public.cotizaciones_calculadoras cc on cc.opp_id::text = g.opp_id
  left join public.cotizaciones_cuadernos cq on cq.opp_id::text = g.opp_id
  where not (jsonb_typeof(g.s->'lineas') = 'array' and jsonb_array_length(g.s->'lineas') > 0)
),
todas as (select * from lineas_multi union all select * from lineas_simple)
select
  coalesce(linea, '(sin linea)') as linea,
  count(*) as pedidos,
  sum(monto) as ventas_monto,
  count(costo) as pedidos_con_costo,
  sum(venta_sin_iva) filter (where costo is not null) as venta_sin_iva_con_costo,
  sum(costo) as costo_subtotal,
  sum(venta_sin_iva - costo) filter (where costo is not null) as ganancia,
  round(100.0 * sum(venta_sin_iva - costo) filter (where costo is not null)
        / nullif(sum(venta_sin_iva) filter (where costo is not null), 0), 1) as margen_pct,
  round(sum(monto) / nullif(count(*), 0)) as ticket_promedio
from todas
group by 1
order by ventas_monto desc nulls last;

-- ============================================================================
-- 2. Ventas por LINEA y por MES (negocios ganados)
-- ============================================================================
with ganados as (
  select h.fecha_cierre, h.snapshot as s
  from public.historial_cierres h
  where h.estado = 'ganado'
),
todas as (
  select g.fecha_cierre, e->>'linea' as linea, nullif(e->>'monto','')::numeric as monto
  from ganados g,
       jsonb_array_elements(case when jsonb_typeof(g.s->'lineas') = 'array' then g.s->'lineas' else '[]'::jsonb end) e
  union all
  select g.fecha_cierre, g.s->>'linea', nullif(g.s->>'monto','')::numeric
  from ganados g
  where not (jsonb_typeof(g.s->'lineas') = 'array' and jsonb_array_length(g.s->'lineas') > 0)
)
select to_char(fecha_cierre, 'YYYY-MM') as mes,
       coalesce(linea, '(sin linea)') as linea,
       count(*) as pedidos,
       sum(monto) as ventas_monto
from todas
group by 1, 2
order by 1, 4 desc nulls last;

-- ============================================================================
-- 3. Control: lo FACTURADO de verdad por mes (documentos_venta) para comparar contra lo ganado
-- ============================================================================
select to_char(fecha, 'YYYY-MM') as mes,
       count(*) as facturas,
       sum(total_documento) as facturado
from public.documentos_venta
group by 1
order by 1;
