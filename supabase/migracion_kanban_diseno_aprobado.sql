-- ==========================================================================
-- TACTICAL ERP -- Agrega "diseno_aprobado" a kanban_fichas: controla el
-- botón "Diseño Aprobado" en la columna Diseño del Kanban (se desactiva
-- después de usarse una vez). Conde 2026-08-20.
-- ==========================================================================

alter table public.kanban_fichas
  add column if not exists diseno_aprobado boolean not null default false;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
