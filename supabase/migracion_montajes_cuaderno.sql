-- Montaje de Cuaderno (Hub) -- registro de los montajes guardados en la nube.
-- Los archivos (PDF + JPG) viven en el bucket 'tactical-fotos', carpeta montajes/ (ya existe, ver
-- migracion_storage_fotos.sql). Esta tabla solo guarda el enlace para poder encontrarlos por OT.
-- El propio módulo borra los montajes de más de 30 días (archivo + fila) cada vez que alguien entra.
create table if not exists public.montajes_cuaderno (
  id uuid primary key default gen_random_uuid(),
  ot text,
  cliente text,
  descripcion text,
  ruta_pdf text not null,
  ruta_jpg text,
  url_pdf text not null,
  url_jpg text,
  creado_por text,
  created_at timestamptz not null default now()
);

alter table public.montajes_cuaderno enable row level security;
drop policy if exists "autenticados_todo_montajes_cuaderno" on public.montajes_cuaderno;
create policy "autenticados_todo_montajes_cuaderno" on public.montajes_cuaderno for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RLS solo no alcanza: toda tabla nueva necesita su GRANT explícito a "authenticated"
grant select, insert, update, delete on public.montajes_cuaderno to authenticated;
