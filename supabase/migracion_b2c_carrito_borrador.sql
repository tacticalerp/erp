-- ==========================================================================
-- TACTICAL ERP -- Tabla "b2c_carrito_borrador": último pedacito que le
-- faltaba a la migración del Módulo de Montajes Rompecabezas (B2C) --
-- el "pedido en curso" (carrito, mientras se arman varios rompecabezas para
-- un mismo pedido antes de guardarlo) seguía en localStorage. Mismo patrón
-- ya usado para Pedido Activo/Comparación Activa: un borrador por USUARIO,
-- no por navegador (Conde 2026-08-20, "quiero que no quede nada pendiente").
-- ==========================================================================

create table if not exists public.b2c_carrito_borrador (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.b2c_carrito_borrador enable row level security;
drop policy if exists "autenticados_todo_b2c_carrito_borrador" on public.b2c_carrito_borrador;
create policy "autenticados_todo_b2c_carrito_borrador" on public.b2c_carrito_borrador for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.b2c_carrito_borrador to authenticated;

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
