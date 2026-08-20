-- ==========================================================================
-- TACTICAL ERP -- Tabla "recomendaciones_override": permite editar el texto
-- de una Recomendación de Producción existente, o agregar una nueva, desde
-- el Panel de Precios del Hub -- sin tocar código. Conde 2026-08-20.
-- Mismo patrón de fila única jsonb que sustratos_custom/acabados_custom.
-- "overrides" = {id_recomendacion: "texto nuevo"} (reemplaza el texto de
-- una recomendación existente, escrita en el código de la calculadora).
-- "custom" = [{id, calculadora, texto}] (recomendaciones nuevas, se
-- muestran siempre para esa línea de producto).
-- ==========================================================================

create table if not exists public.recomendaciones_override (
  id boolean primary key default true check (id),
  overrides jsonb not null default '{}'::jsonb,
  custom jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.recomendaciones_override (id, overrides, custom)
  values (true, '{}'::jsonb, '[]'::jsonb)
  on conflict (id) do nothing;
alter table public.recomendaciones_override enable row level security;
drop policy if exists "autenticados_todo_recomendaciones_override" on public.recomendaciones_override;
create policy "autenticados_todo_recomendaciones_override" on public.recomendaciones_override for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.recomendaciones_override to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
