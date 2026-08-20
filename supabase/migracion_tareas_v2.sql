-- ==========================================================================
-- TACTICAL ERP -- Corrige la tabla "tareas" para el Plan de Tareas con fecha
-- real (sin reloj simulado).
--
-- Por qué: la tabla "tareas" se diseñó antes de revisar el módulo real a
-- fondo -- le faltaba el estado "finalizado", el campo de retraso estaba mal
-- pensado (booleano en vez de días) y no tenía cómo saber desde cuándo
-- cuenta el retraso de cada tarea ni su orden manual dentro del área. Como
-- esta tabla todavía no se había usado (Plan de Tareas es el módulo que se
-- migra hoy), es más simple borrarla y crearla de nuevo que ir corrigiéndola
-- campo por campo.
-- ==========================================================================

drop table if exists public.tareas cascade;

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('diseno','produccion','comercial','gerencia')),
  descripcion text not null,
  especificaciones text,
  responsables jsonb not null default '[]'::jsonb,  -- array de nombres
  status text not null default 'pendiente' check (status in ('pendiente','proceso','externo','listo','finalizado')),
  aclaracion text,
  fecha_origen timestamptz not null default now(), -- desde cuándo cuenta el retraso (se reinicia al "Reabrir")
  orden double precision not null default extract(epoch from now()), -- prioridad manual dentro de su área (🔼🔽)
  cerrada boolean not null default false,           -- false = tablero activo, true = Histórico
  delay_cerrado integer,                            -- días de atraso, congelados al archivar (null si sigue activa)
  fecha_cierre timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tareas enable row level security;
create policy "autenticados_todo_tareas" on public.tareas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.tareas to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
