-- ==========================================================================
-- TACTICAL ERP -- Tabla "acabados_custom": permite crear acabados nuevos
-- (ej. plastificado especial, impresión UV a color) desde el Panel de
-- Precios, cobrados por m² igual que Plastificado/Colaminado, eligiendo en
-- cuáles calculadoras aparece cada uno como checkbox opcional.
-- ==========================================================================

create table public.acabados_custom (
  id boolean primary key default true check (id),
  datos jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.acabados_custom (id, datos) values (true, '[]'::jsonb);
alter table public.acabados_custom enable row level security;
create policy "autenticados_todo_acabados_custom" on public.acabados_custom for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.acabados_custom to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
