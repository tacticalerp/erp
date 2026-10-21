-- ==========================================================================
-- TACTICAL ERP -- Área "Administrativa" en el Plan de Tareas (Conde 2026-10-21)
--
-- "quiero un nuevo módulo que se llame Administrativo, y allí llegará el informe de facturación, ya no será en Comercial".
-- La tarea automática "Facturar a ..." (cuando una ficha del Kanban pasa a Para Entregar) ahora se crea en el área Administrativa.
-- La tabla tareas solo aceptaba 4 áreas (diseno, produccion, comercial, gerencia): hay que permitir la nueva.
--
-- Pegar COMPLETO en el SQL Editor de Supabase y ejecutar (se puede correr más de una vez).
-- ⚠️ Correrlo ANTES de usar el área: sin esto, las tareas del área Administrativa NO se guardan.
-- ==========================================================================
alter table public.tareas drop constraint if exists tareas_area_check;
alter table public.tareas add constraint tareas_area_check
  check (area in ('diseno','produccion','comercial','administrativo','gerencia'));
