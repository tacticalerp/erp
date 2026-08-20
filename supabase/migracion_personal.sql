-- ==========================================================================
-- TACTICAL ERP -- Tabla "personal": reemplaza la lista fija de nombres que
-- antes estaba escrita en el código (Plan de Tareas y "Responsable del
-- Error" de Reprocesos) por una lista editable desde el propio Hub, en
-- "Plan de Tareas -> Gestionar Personal".
--
-- Se siembra con las 6 personas que ya estaban puestas a mano en el código,
-- con las mismas áreas que ya tenían asignadas, para no perder nada.
-- ==========================================================================

create table public.personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  areas jsonb not null default '[]'::jsonb,
  orden integer not null default 0
);
alter table public.personal enable row level security;
create policy "autenticados_todo_personal" on public.personal for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.personal to authenticated;

insert into public.personal (nombre, areas, orden) values
  ('Nicol', '["diseno"]', 0),
  ('Sebastian', '["produccion"]', 1),
  ('Susana', '["produccion"]', 2),
  ('Norely', '["comercial","gerencia"]', 3),
  ('Yasmid', '["comercial","gerencia"]', 4),
  ('Helver', '["diseno","produccion","comercial","gerencia"]', 5);

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
