-- Consulta de diagnóstico (NO modifica nada, solo lee) para revisar cuánto espacio del plan
-- gratis de Supabase se está usando y a qué ritmo, para estimar cuánto falta para llenarlo.
-- Conde 2026-09-18: pedido para calcular un promedio de los últimos 30 días.
-- Límites del plan gratis de Supabase: 500 MB de base de datos + 1 GB de Storage (archivos).

-- 1. Tamaño TOTAL de la base de datos (todas las tablas: cotizaciones, CRM, contabilidad, etc.)
select pg_size_pretty(pg_database_size(current_database())) as tamano_base_datos_total;

-- 2. Tamaño TOTAL del bucket de fotos (Kanban, Fototeca, B2C Rompecabezas)
select pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as tamano_fotos_total
from storage.objects
where bucket_id = 'tactical-fotos';

-- 3. Cuánto se subió de fotos en los últimos 30 días (para calcular el ritmo diario)
select
  count(*) as fotos_subidas_ultimos_30_dias,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as peso_subido_ultimos_30_dias,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0) / 30) as promedio_diario_aprox
from storage.objects
where bucket_id = 'tactical-fotos'
  and created_at >= now() - interval '30 days';

-- 4. Lo mismo pero por tabla, para ver qué está creciendo más rápido en la base de datos
select
  schemaname, relname as tabla,
  pg_size_pretty(pg_total_relation_size(relid)) as tamano,
  n_live_tup as filas_aprox
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 15;
