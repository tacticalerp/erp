-- ==========================================================================
-- TACTICAL ERP -- Tablas "b2c_pedidos" + "b2c_pedido_items": migra el Módulo
-- de Montajes Rompecabezas (modulo_montajes_rompecabezas.html, B2C) de
-- localStorage a Supabase. Reporte de ventas/marketing separado del CRM/
-- pipeline B2B (opps) -- ver sección "12. VENTAS B2C ROMPECABEZAS" de
-- schema.sql, donde este diseño ya estaba documentado desde el setup inicial
-- pero nunca había quedado con permisos (Conde 2026-08-20).
--
-- Versión corregida: las tablas YA EXISTÍAN (creadas en el setup inicial del
-- proyecto, ver captura de Conde -- "relation b2c_pedidos already exists").
-- Este script es idempotente (se puede correr más de una vez sin error):
-- crea solo si falta, y siempre deja la policy y los permisos al día.
-- ==========================================================================

create table if not exists public.b2c_pedidos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado')),
  nombre text,
  celular text,
  correo text,
  entrega text,
  total numeric not null default 0,
  cantidad numeric not null default 0,
  kanban_ficha_id uuid, -- sin "references" -- ver nota de guardado optimista al inicio de schema.sql
  fecha_aprobado timestamptz
);
alter table public.b2c_pedidos enable row level security;
drop policy if exists "autenticados_todo_b2c_pedidos" on public.b2c_pedidos;
create policy "autenticados_todo_b2c_pedidos" on public.b2c_pedidos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.b2c_pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.b2c_pedidos(id) on delete cascade,
  linea text,       -- 'laser' u otra
  forma text,
  fichas integer,
  medida text,
  cantidad numeric,
  precio_unitario numeric,
  total numeric,
  marco_madera boolean default false,
  foto_thumb_url text  -- hoy guarda el data-URI base64 de la miniatura directo (mismo criterio ya
                        -- aceptado en kanban_fotos -- ver nota "Storage real es optimización futura,
                        -- no bloqueante" en project_migracion_supabase_status), no un URL real de Storage
);
alter table public.b2c_pedido_items enable row level security;
drop policy if exists "autenticados_todo_b2c_items" on public.b2c_pedido_items;
create policy "autenticados_todo_b2c_items" on public.b2c_pedido_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.b2c_pedidos to authenticated;
grant select, insert, update, delete on public.b2c_pedido_items to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
