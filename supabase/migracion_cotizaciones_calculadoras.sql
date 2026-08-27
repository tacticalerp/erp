-- Conde 2026-08-27: "quiero que me permitas editar las cotizaciones de todas las calculadoras" --
-- hoy solo Cuadernos guarda el desglose completo (params) de cada cotización, en su propia tabla
-- "cotizaciones_cuadernos" -- por eso solo Cuadernos tiene el botón ✏️ de editar en el Buscador de
-- Cotizaciones. Las otras 8 calculadoras (Rompecabezas, Cubo Rubik, Carpetas, Volantes, Bolsas,
-- Cajas, Promocionales, Libre) solo guardaban el RESUMEN final (descripción, monto, cantidad) en el
-- CRM -- nunca los parámetros originales del formulario, así que no había nada que recargar para
-- volver a editar.
--
-- Esta tabla es el equivalente de "cotizaciones_cuadernos" pero compartida entre las otras 8
-- calculadoras -- una columna "linea" (rompecabezas/bolsas/cajas/carpetas/cubo_rubik/volantes/
-- promocionales/libre) distingue de cuál calculadora es cada fila, para poder reabrir la calculadora
-- correcta. "cotizaciones_cuadernos" NO se toca -- Cuadernos sigue exactamente igual que hoy.
create table public.cotizaciones_calculadoras (
  id uuid primary key default gen_random_uuid(),
  linea text not null, -- 'rompecabezas' | 'bolsas' | 'cajas' | 'carpetas' | 'cubo_rubik' | 'volantes' | 'promocionales' | 'libre'
  ot text,
  opp_id uuid, -- sin "references" -- mismo criterio de guardado optimista que cotizaciones_cuadernos
  id_cliente uuid,
  vendedor text,
  descripcion text,
  cliente_empresa text,
  cliente_encargado text,
  cliente_telefono text,
  cliente_correo text,
  params jsonb not null,     -- objeto opaco del motor de esa calculadora (ultimoParams)
  resultado jsonb not null,  -- objeto opaco del motor (ultimoResultado)
  plazo_entrega text,
  validez_oferta text,
  observaciones text,
  condiciones_comerciales jsonb,
  created_at timestamptz not null default now()
);
alter table public.cotizaciones_calculadoras enable row level security;
create policy "autenticados_todo_cotizaciones_calculadoras" on public.cotizaciones_calculadoras for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
