-- ==========================================================================
-- TACTICAL ERP -- Tabla "sustratos_custom": permite agregar papeles nuevos
-- desde el Panel de Precios (además de editar los que ya venían fijos en el
-- código), eligiendo en cuáles calculadoras debe aparecer cada uno.
-- ==========================================================================

create table public.sustratos_custom (
  id boolean primary key default true check (id),
  datos jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.sustratos_custom (id, datos) values (true, '[]'::jsonb);
alter table public.sustratos_custom enable row level security;
create policy "autenticados_todo_sustratos_custom" on public.sustratos_custom for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.sustratos_custom to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
