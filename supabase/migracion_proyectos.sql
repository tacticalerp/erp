-- ==========================================================================
-- TACTICAL ERP -- Proyectos del Plan de Tareas (Conde 2026-10-07).
-- Cada proyecto tiene nombre, nombre corto (etiqueta), color, objetivo, que SI y
-- que NO se hace, fecha de inicio y fecha de fin. Cada tarea puede (o no)
-- pertenecer a un proyecto (tareas.proyecto_id).
--
-- CORRER ESTO EN EL SQL EDITOR DE SUPABASE ANTES de usar la version nueva del Hub.
-- ==========================================================================

create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  corto text not null default '',
  color text not null default '#378ADD',
  objetivo text not null default '',
  si_hace text not null default '',
  no_hace text not null default '',
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'activo',
  orden integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.proyectos enable row level security;
create policy "autenticados_todo_proyectos" on public.proyectos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RLS solo no alcanza: cada tabla nueva necesita su propio GRANT.
grant select, insert, update, delete on public.proyectos to authenticated;

-- Si se borra un proyecto, sus tareas NO se borran: quedan "sin proyecto".
alter table public.tareas
  add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;

select 'listo' as resultado;
