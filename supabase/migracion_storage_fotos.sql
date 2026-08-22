-- ==========================================================================
-- TACTICAL ERP -- Fotos a Supabase Storage (Conde 2026-08-23)
--
-- Por qué: hoy TODAS las fotos (Kanban, Fototeca, miniaturas de pedidos B2C
-- de Rompecabezas) se guardan como texto base64 incrustado directo en las
-- filas de la base de datos -- compiten por los mismos 500MB del plan
-- gratis que usan las facturas/cotizaciones. Además, cada vez que se elige
-- una foto de Fototeca para una cotización, se copia el string completo de
-- la imagen en esa cotización -- si la misma foto se usa en 30 cotizaciones,
-- queda guardada 30 veces.
--
-- Este script crea un bucket de Storage (el espacio de 1GB aparte, pensado
-- para archivos) y le da permiso a los usuarios logueados para subir/borrar
-- ahí -- mismo criterio de siempre en este proyecto ("autenticados_todo_X").
-- Después de correr esto, el código ya sube las fotos ahí en vez de
-- guardarlas como texto, y solo guarda la URL corta (no la imagen) en las
-- tablas de siempre (kanban_fotos.url, fototeca_items.foto_url,
-- b2c_pedido_items.foto_thumb_url) -- por eso NO hace falta ninguna
-- migración de columnas, son los mismos campos de texto de siempre.
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('tactical-fotos', 'tactical-fotos', true)
on conflict (id) do nothing;

-- "drop policy if exists" antes de cada una para que este script se pueda correr más de una vez
-- sin error, igual que los demás (por si hay que volver a pegarlo).
drop policy if exists "autenticados_suben_fotos" on storage.objects;
create policy "autenticados_suben_fotos" on storage.objects for insert
  with check (bucket_id = 'tactical-fotos' and auth.role() = 'authenticated');

drop policy if exists "autenticados_actualizan_fotos" on storage.objects;
create policy "autenticados_actualizan_fotos" on storage.objects for update
  using (bucket_id = 'tactical-fotos' and auth.role() = 'authenticated')
  with check (bucket_id = 'tactical-fotos' and auth.role() = 'authenticated');

drop policy if exists "autenticados_borran_fotos" on storage.objects;
create policy "autenticados_borran_fotos" on storage.objects for delete
  using (bucket_id = 'tactical-fotos' and auth.role() = 'authenticated');

-- El bucket es público en LECTURA (public=true arriba) a propósito: las fotos
-- se muestran directo con <img src="..."> en el PDF, la Orden de Producción,
-- el Kanban, etc., igual que hoy funcionan las imágenes base64 -- no hay
-- sesión de por medio en esos lugares, así que la URL pública tiene que
-- funcionar sin login. No es información sensible (fotos de productos), así
-- que no hay riesgo real en que sea pública.

-- ==========================================================================
-- FIN. Corre este script igual que los anteriores (pegar + Run en el SQL
-- Editor de Supabase). Después avísame y verifico desde aquí.
-- ==========================================================================
