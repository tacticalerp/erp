-- Montaje Rompecabezas Plotter (Hub > Montajes) -- tablas de apoyo (Conde 2026-10-17).
--  1) plotter_montajes : historial de montajes generados (da el consecutivo del día: "17 octubre", "B 17 octubre"...)
--  2) plotter_sobrantes: POLI (poliestireno) que sobra de cada lámina de 100x66 y queda disponible para montajes futuros
--  3) plotter_config   : configuración compartida (plantilla de la guía de armado)
--  4) plotter_cola     : cola de rompecabezas enviados desde el Kanban con el botón "Enviar a montaje" (Fase 2)
-- Script idempotente: se puede correr más de una vez.

create table if not exists public.plotter_montajes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,            -- "17 octubre" / "B 17 octubre"
  fecha date not null default current_date,
  consecutivo int not null default 0,   -- 0 = sin letra, 1 = B, 2 = C...
  largo_cm numeric,
  detalle jsonb,                   -- rompecabezas montados, láminas usadas, sobrantes
  creado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.plotter_sobrantes (
  id uuid primary key default gen_random_uuid(),
  ancho numeric not null,
  alto numeric not null,
  estado text not null default 'disponible' check (estado in ('disponible','usado','descartado')),
  origen text,                     -- nombre del montaje que lo generó
  usado_en text,                   -- nombre del montaje que lo consumió
  created_at timestamptz not null default now()
);

create table if not exists public.plotter_config (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.plotter_cola (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid,                   -- ficha del Kanban de origen (sin "references": mismo criterio que el resto)
  ot text,
  cliente text,
  forma text,
  fichas integer,                  -- piezas del rompecabezas (100, 300, 500...)
  medida text,                     -- "50x33"
  cantidad numeric default 1,
  thumb_url text,                  -- miniatura que aprobó el cliente
  estado text not null default 'pendiente' check (estado in ('pendiente','en_montaje','impreso')),
  montaje text,                    -- nombre del montaje donde quedó
  created_at timestamptz not null default now()
);

alter table public.plotter_montajes enable row level security;
alter table public.plotter_sobrantes enable row level security;
alter table public.plotter_config enable row level security;
alter table public.plotter_cola enable row level security;

drop policy if exists "autenticados_todo_plotter_montajes" on public.plotter_montajes;
create policy "autenticados_todo_plotter_montajes" on public.plotter_montajes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "autenticados_todo_plotter_sobrantes" on public.plotter_sobrantes;
create policy "autenticados_todo_plotter_sobrantes" on public.plotter_sobrantes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "autenticados_todo_plotter_config" on public.plotter_config;
create policy "autenticados_todo_plotter_config" on public.plotter_config for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "autenticados_todo_plotter_cola" on public.plotter_cola;
create policy "autenticados_todo_plotter_cola" on public.plotter_cola for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RLS solo no alcanza: toda tabla nueva necesita su GRANT explícito a "authenticated"
grant select, insert, update, delete on public.plotter_montajes to authenticated;
grant select, insert, update, delete on public.plotter_sobrantes to authenticated;
grant select, insert, update, delete on public.plotter_config to authenticated;
grant select, insert, update, delete on public.plotter_cola to authenticated;

select 'listo' as resultado;
