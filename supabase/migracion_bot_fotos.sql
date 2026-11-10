-- ==========================================================================
-- TACTICAL ERP -- Fotos del bot de WhatsApp: tabla de control + bucket privado (Conde 2026-11-10)
--
-- Por qué: el bot junta las fotos que mandan los clientes (la foto del rompecabezas, el comprobante de
-- pago) y las previsualizaciones que genera. Hasta ahora la galería del Hub bajaba TODAS a tamaño
-- completo cada vez que se abría (consumo de "egress" del plan gratis de Supabase, el mismo problema
-- que ya se corrigió con las fotos de las cotizaciones) y la foto original del cliente solo vivía en el
-- disco de Railway.
--
-- Ahora: cada foto queda registrada en la tabla public.bot_fotos con su MINIATURA (~25 KB). La galería
-- muestra solo miniaturas (y de a pocas) y abre la foto grande únicamente al hacer clic. El bot mide el
-- espacio usado y limpia lo vencido (30 días; 180 si el pedido se aprobó; "conservar" = no se borra).
--
-- Corre este script UNA VEZ en el SQL Editor de Supabase (se puede volver a correr sin problema).
-- ==========================================================================

-- 1) Bucket PRIVADO (las fotos de clientes no deben ser públicas: solo se ven con enlace firmado)
insert into storage.buckets (id, name, public)
values ('bot-rompecabezas-media', 'bot-rompecabezas-media', false)
on conflict (id) do nothing;

-- 2) Permisos de Storage para usuarios autenticados (el bot entra con su propia cuenta y el Hub con la del usuario)
drop policy if exists "bot_media_ver" on storage.objects;
create policy "bot_media_ver" on storage.objects for select
  using (bucket_id = 'bot-rompecabezas-media' and auth.role() = 'authenticated');

drop policy if exists "bot_media_subir" on storage.objects;
create policy "bot_media_subir" on storage.objects for insert
  with check (bucket_id = 'bot-rompecabezas-media' and auth.role() = 'authenticated');

drop policy if exists "bot_media_actualizar" on storage.objects;
create policy "bot_media_actualizar" on storage.objects for update
  using (bucket_id = 'bot-rompecabezas-media' and auth.role() = 'authenticated')
  with check (bucket_id = 'bot-rompecabezas-media' and auth.role() = 'authenticated');

drop policy if exists "bot_media_borrar" on storage.objects;
create policy "bot_media_borrar" on storage.objects for delete
  using (bucket_id = 'bot-rompecabezas-media' and auth.role() = 'authenticated');

-- 3) Tabla de control de las fotos
create table if not exists public.bot_fotos (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  tipo text not null check (tipo in ('original', 'preview', 'comprobante')),
  celular text,
  nombre text,
  pedido_id text,                 -- id del pedido del bot (cuando ya existe)
  ruta text not null unique,      -- archivo grande dentro del bucket
  ruta_mini text,                 -- miniatura (~480 px) dentro del bucket
  bytes bigint not null default 0,
  bytes_mini bigint not null default 0,
  ancho integer,
  alto integer,
  conservar boolean not null default false   -- true = la limpieza automática no la borra
);
create index if not exists bot_fotos_creado_idx on public.bot_fotos (creado desc);
create index if not exists bot_fotos_celular_idx on public.bot_fotos (celular);
create index if not exists bot_fotos_pedido_idx on public.bot_fotos (pedido_id);

alter table public.bot_fotos enable row level security;
drop policy if exists "autenticados_todo_bot_fotos" on public.bot_fotos;
create policy "autenticados_todo_bot_fotos" on public.bot_fotos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RLS sola no alcanza: el rol "authenticated" necesita permiso de tabla (ya pasó con otras tablas nuevas)
grant select, insert, update, delete on public.bot_fotos to authenticated;

-- ==========================================================================
-- FIN. Después de correrlo, avísame para subir el código del bot y la galería nueva.
-- ==========================================================================
