-- ==========================================================================
-- TACTICAL ERP -- Esquema inicial de base de datos (Supabase / Postgres)
-- Generado 2026-08-18, reemplaza los 33 tipos de datos que hoy viven en
-- localStorage del navegador (ver inventario en la auditoría pre-nube).
--
-- CÓMO USAR ESTE ARCHIVO:
-- 1. Entra a tu proyecto en supabase.com -> menú izquierdo -> "SQL Editor".
-- 2. Clic en "New query".
-- 3. Pega TODO este archivo completo.
-- 4. Clic en "Run" (o Ctrl+Enter). Debe terminar sin errores en rojo.
-- 5. Se puede correr una sola vez -- si lo corres dos veces, algunas partes
--    fallarán porque las tablas ya existen (eso es normal y no daña nada).
--
-- DECISIONES DE DISEÑO (por qué no es un calco 1:1 de localStorage):
-- - Seguridad por defecto: TODAS las tablas tienen Row Level Security (RLS)
--   activado, con una sola regla por ahora: "solo usuarios que iniciaron
--   sesión pueden leer/escribir" (auth.role() = 'authenticated'). Nadie de
--   afuera puede ver nada aunque adivine la URL de la API. Los permisos por
--   ROL específico (que Comercial no vea Contabilidad, etc.) se agregan
--   después sin tener que tocar esta base -- solo se afinan estas reglas.
-- - Los contadores (número de factura, de OT, etc.) usan una función de
--   Postgres con actualización atómica en vez de "leer, sumar 1, guardar"
--   como hoy -- así 2 personas facturando al mismo tiempo nunca chocan.
-- - "Pedido activo" y "Comparación activa" (los borradores en curso) ahora
--   son POR USUARIO, no un solo borrador global como en localStorage --
--   si no, 2 vendedores armando cotizaciones distintas al mismo tiempo se
--   pisarían el borrador el uno al otro.
-- - Plan de Tareas usa fecha real automática (decisión de Conde 2026-08-18),
--   ya no hay "fecha simulada" que avanzar a mano.
-- - Las fotos (Kanban, fototeca, ventas B2C) NO se guardan como texto
--   gigante en una columna -- van a Supabase Storage (buckets al final de
--   este archivo) y la tabla solo guarda la URL.
-- - GUARDADO OPTIMISTA, sin "foreign key" entre tablas que se guardan por
--   separado (ej. id_cliente en opps/kanban_fichas/etc.): el ERP muestra el
--   cambio en pantalla al instante y la base de datos se pone al día un
--   momento después en segundo plano, sin esperar una cosa a la otra. Si
--   estas columnas tuvieran una regla de "el cliente ya debe existir" y dos
--   cosas se crean muy rápido seguidas (un cliente nuevo + algo que lo
--   referencia), la base de datos rechazaría el guardado real (bug real
--   encontrado 2026-08-18 en Historial de Cierres y en Kanban). La app ya
--   garantiza que los IDs coincidan por su cuenta -- estas columnas guardan
--   el mismo uuid, solo que sin exigirlo como requisito de guardado.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. Utilidades compartidas
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- para gen_random_uuid()

create or replace function tactical_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- 1. USUARIOS (perfil sobre la tabla de login que ya trae Supabase)
-- --------------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('administrador','comercial','diseno','produccion','contabilidad')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.usuarios enable row level security;
create policy "autenticados_leen_usuarios" on public.usuarios for select using (auth.role() = 'authenticated');
create policy "solo_yo_edito_mi_perfil" on public.usuarios for update using (auth.uid() = id);

-- --------------------------------------------------------------------------
-- 2. CRM: clientes, oportunidades (pipeline activo), historial de cierres
-- --------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  nombre text not null default '',
  telefono text default '',
  correo text default '',
  clase text not null default 'nuevo' check (clase in ('nuevo','ocasional','recurrente','vip')),
  tipo text default '' check (tipo in ('','corporativo','personalizado')),
  identificacion text default '',
  ltv numeric not null default 0,
  solo_b2c boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function tactical_set_updated_at();
alter table public.clientes enable row level security;
create policy "autenticados_todo_clientes" on public.clientes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.opps (
  id uuid primary key default gen_random_uuid(),
  ot text,
  -- SIN "references clientes(id)" a propósito -- ver nota de guardado optimista
  -- al inicio del archivo. El id sigue siendo el mismo uuid del cliente, solo
  -- que Postgres no lo exige como requisito de guardado.
  id_cliente uuid,
  nombre_cli text,
  descripcion text,
  vendedor text,
  monto numeric not null default 0,
  etapa text not null default 'req' check (etapa in ('req','cot','neg')),
  linea text not null,
  cantidad numeric,
  maquina text,
  material text,
  n_pliegos integer,
  plano_corte jsonb,
  plano_corte_lineas jsonb,
  recomendaciones jsonb,
  lineas jsonb,                 -- pedido multi-producto (linea='multi')
  opciones_comparativa jsonb,   -- cotización comparativa
  cot_params jsonb,
  cot_resultado jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_opps_updated before update on public.opps
  for each row execute function tactical_set_updated_at();
alter table public.opps enable row level security;
create policy "autenticados_todo_opps" on public.opps for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.historial_cierres (
  id uuid primary key default gen_random_uuid(),
  opp_id uuid, -- sin "references" -- ver nota de guardado optimista
  -- copia completa del opp al momento de cerrar (histórico, no debe cambiar
  -- si el cliente/opp original se edita después):
  snapshot jsonb not null,
  estado text not null check (estado in ('ganado','perdido')),
  motivo text,
  fecha_cierre timestamptz not null default now()
);
alter table public.historial_cierres enable row level security;
create policy "autenticados_todo_historial" on public.historial_cierres for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 3. Cotizaciones de Cuadernos (única línea con detalle rico hoy)
-- --------------------------------------------------------------------------
create table public.cotizaciones_cuadernos (
  id uuid primary key default gen_random_uuid(),
  ot text,
  opp_id uuid, -- sin "references" -- ver nota de guardado optimista
  id_cliente uuid,
  vendedor text,
  descripcion text,
  cliente_empresa text,
  cliente_encargado text,
  cliente_telefono text,
  cliente_correo text,
  params jsonb not null,     -- objeto opaco del motor (ver nota en el reporte)
  resultado jsonb not null,
  plazo_entrega text,
  validez_oferta text,
  observaciones text,
  condiciones_comerciales jsonb,
  created_at timestamptz not null default now()
);
alter table public.cotizaciones_cuadernos enable row level security;
create policy "autenticados_todo_cotizaciones" on public.cotizaciones_cuadernos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 4. Borradores en curso -- AHORA POR USUARIO, no globales
-- --------------------------------------------------------------------------
create table public.pedidos_borrador (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  ot text,
  id_cliente uuid, -- sin "references" -- ver nota de guardado optimista
  nombre_cli text,
  vendedor text,
  lineas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.pedidos_borrador enable row level security;
create policy "autenticados_todo_pedidos_borrador" on public.pedidos_borrador for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.comparaciones_borrador (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  ot text,
  id_cliente uuid, -- sin "references" -- ver nota de guardado optimista
  nombre_cli text,
  vendedor text,
  opciones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.comparaciones_borrador enable row level security;
create policy "autenticados_todo_comparaciones_borrador" on public.comparaciones_borrador for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- "Pedido en curso" del Módulo de Montajes Rompecabezas (B2C) -- varios rompecabezas de tamaños
-- distintos armándose para un mismo pedido, antes de guardarlo (Conde 2026-08-20).
create table public.b2c_carrito_borrador (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.b2c_carrito_borrador enable row level security;
create policy "autenticados_todo_b2c_carrito_borrador" on public.b2c_carrito_borrador for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 5. KANBAN -- fichas + líneas + checklist + fotos (normalizado)
-- --------------------------------------------------------------------------
create table public.kanban_fichas (
  id uuid primary key default gen_random_uuid(),
  ot text,
  id_cliente uuid, -- sin "references" -- ver nota de guardado optimista
  nombre_cli text,
  titulo text,
  columna text not null default 'aprobada'
    check (columna in ('aprobada','diseno','preparacion','terminados','entregar','postventa')),
  urgente boolean not null default false,
  fecha_entrega date,
  entrega text,
  responsable text,
  origen text check (origen in ('automatica','manual','bot_whatsapp','b2c')),
  diseno_aprobado boolean not null default false, -- Conde 2026-08-20: botón "Diseño Aprobado"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_kanban_fichas_updated before update on public.kanban_fichas
  for each row execute function tactical_set_updated_at();
alter table public.kanban_fichas enable row level security;
create policy "autenticados_todo_kanban_fichas" on public.kanban_fichas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.kanban_lineas (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.kanban_fichas(id) on delete cascade,
  linea text not null,
  descripcion text,
  cantidad numeric,
  maquina text,
  material text,
  n_pliegos integer,
  plano_corte jsonb,
  plano_corte_lineas jsonb,
  recomendaciones jsonb,
  foto_url text,   -- referencia a Supabase Storage, no base64
  video_url text
);
alter table public.kanban_lineas enable row level security;
create policy "autenticados_todo_kanban_lineas" on public.kanban_lineas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.kanban_checklist (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.kanban_fichas(id) on delete cascade,
  texto text not null,
  hecho boolean not null default false,
  riel text check (riel in ('A','B','gate')),
  orden integer not null default 0
);
alter table public.kanban_checklist enable row level security;
create policy "autenticados_todo_kanban_checklist" on public.kanban_checklist for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.kanban_fotos (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.kanban_fichas(id) on delete cascade,
  url text not null,  -- referencia a Supabase Storage
  etiqueta text,
  created_at timestamptz not null default now()
);
alter table public.kanban_fotos enable row level security;
create policy "autenticados_todo_kanban_fotos" on public.kanban_fotos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 6. REPROCESOS
-- --------------------------------------------------------------------------
create table public.reprocesos (
  id uuid primary key default gen_random_uuid(),
  ot text not null default 'Servicio Express',
  responsable text,
  proveedor text,
  origen text,
  deteccion text,
  observaciones text,
  costo_total numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.reprocesos enable row level security;
create policy "autenticados_todo_reprocesos" on public.reprocesos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.reprocesos_items (
  id uuid primary key default gen_random_uuid(),
  reproceso_id uuid not null references public.reprocesos(id) on delete cascade,
  concepto text,
  cantidad numeric,
  costo numeric,
  medida text,
  caracteristica text
);
alter table public.reprocesos_items enable row level security;
create policy "autenticados_todo_reprocesos_items" on public.reprocesos_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 7. PLAN DE TAREAS -- fecha real automática (Conde 2026-08-19: se quitó el
-- reloj simulado "Simular Fin del Día"; el retraso ahora se calcula en vivo
-- como hoy - fecha_origen, y las tareas Listo/Finalizado se archivan solas
-- al Histórico apenas alguien cambia el estado, sin ritual manual).
-- --------------------------------------------------------------------------
create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('diseno','produccion','comercial','gerencia')),
  descripcion text not null,
  especificaciones text,
  responsables jsonb not null default '[]'::jsonb,  -- array de nombres
  status text not null default 'pendiente' check (status in ('pendiente','proceso','externo','listo','finalizado')),
  aclaracion text,
  fecha_origen timestamptz not null default now(), -- desde cuándo cuenta el retraso (se reinicia al "Reabrir")
  orden double precision not null default extract(epoch from now()), -- prioridad manual dentro de su área (🔼🔽)
  cerrada boolean not null default false,           -- false = tablero activo, true = Histórico
  delay_cerrado integer,                            -- días de atraso, congelados al archivar (null si sigue activa)
  fecha_cierre timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tareas enable row level security;
create policy "autenticados_todo_tareas" on public.tareas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 8. CONTABILIDAD
-- --------------------------------------------------------------------------
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);
alter table public.proveedores enable row level security;
create policy "autenticados_todo_proveedores" on public.proveedores for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.documentos_venta (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,        -- FV-#### o CC-####
  tipo_doc text not null check (tipo_doc in ('factura','cuenta_cobro')),
  fecha date not null default current_date,
  -- sin "references" en estas 3 -- ver nota de guardado optimista:
  id_cliente uuid,
  id_cotizacion uuid,
  opp_id uuid,
  descripcion text,
  valor_bruto numeric not null default 0,
  iva numeric not null default 0,
  reteiva numeric not null default 0,
  valor_envio numeric not null default 0,
  total_documento numeric not null default 0,
  total_cobrar numeric not null default 0,
  condicion_pago text,
  fecha_vencimiento date,
  saldo_pendiente numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','abonado_parcial','pagada')),
  vendedor text,
  created_at timestamptz not null default now()
);
alter table public.documentos_venta enable row level security;
create policy "autenticados_todo_docventa" on public.documentos_venta for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.documentos_venta_items (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_venta(id) on delete cascade,
  descripcion text,
  cantidad numeric,
  valor_unitario numeric,
  iva numeric not null default 0, -- Conde 2026-08-20: IVA por ítem, no por documento
  valor_total numeric
);
alter table public.documentos_venta_items enable row level security;
create policy "autenticados_todo_docventa_items" on public.documentos_venta_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.ingresos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,        -- IN-####
  fecha date not null default current_date,
  -- sin "references" en estas 2 -- ver nota de guardado optimista:
  id_cliente uuid,
  id_documento_venta uuid,
  valor numeric not null,
  concepto text,
  medio_pago text check (medio_pago in ('banco','efectivo')),
  referencia_soporte text,
  created_at timestamptz not null default now()
);
alter table public.ingresos enable row level security;
create policy "autenticados_todo_ingresos" on public.ingresos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.cuentas_por_pagar (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,        -- CP-####
  fecha date not null default current_date,
  proveedor text,
  numero_factura_proveedor text,
  categoria text check (categoria in ('fijo','variable')),
  subcategoria text,
  iva numeric not null default 0, -- informativo, NO afecta monto ni saldo_pendiente (Conde 2026-08-20)
  monto numeric not null default 0,
  saldo_pendiente numeric not null default 0,
  fecha_vencimiento date,
  estado text not null default 'pendiente' check (estado in ('pendiente','abonado_parcial','pagado')),
  id_egreso uuid, -- sin "references" -- ver nota de guardado optimista; solo referencia informativa
  created_at timestamptz not null default now()
);
alter table public.cuentas_por_pagar enable row level security;
create policy "autenticados_todo_cxp" on public.cuentas_por_pagar for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.cuentas_por_pagar_items (
  id uuid primary key default gen_random_uuid(),
  cxp_id uuid not null references public.cuentas_por_pagar(id) on delete cascade,
  descripcion text,
  cantidad numeric,
  valor_unitario numeric,
  iva numeric not null default 0, -- Conde 2026-08-20: IVA por ítem, no por documento
  valor_total numeric
);
alter table public.cuentas_por_pagar_items enable row level security;
create policy "autenticados_todo_cxp_items" on public.cuentas_por_pagar_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.egresos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,        -- EG-####
  fecha date not null default current_date,
  beneficiario text,
  concepto text,
  monto numeric not null,
  categoria text,
  medio_pago text,
  referencia_soporte text,
  cxp_id uuid, -- sin "references" -- ver nota de guardado optimista
  created_at timestamptz not null default now()
);
alter table public.egresos enable row level security;
create policy "autenticados_todo_egresos" on public.egresos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.gastos_fijos_config (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  monto numeric not null default 0,
  orden integer not null default 0
);
alter table public.gastos_fijos_config enable row level security;
create policy "autenticados_todo_gastos_fijos" on public.gastos_fijos_config for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 8b. PERSONAL -- Conde 2026-08-19: reemplaza la lista fija de nombres que antes
-- estaba escrita en el código (Plan de Tareas y "Responsable del Error" de
-- Reprocesos) por una tabla editable desde el propio Hub.
-- --------------------------------------------------------------------------
create table public.personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  areas jsonb not null default '[]'::jsonb, -- ej: ["diseno","produccion"] -- para qué áreas de Plan de Tareas puede recibir tareas
  orden integer not null default 0
);
alter table public.personal enable row level security;
create policy "autenticados_todo_personal" on public.personal for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 9. CONTADORES ATÓMICOS -- reemplaza los contadores manuales de localStorage
-- --------------------------------------------------------------------------
create table public.contadores (
  tipo text primary key,   -- 'fv' | 'cc' | 'ingreso' | 'cxp' | 'egreso'
  valor integer not null default 0
);
insert into public.contadores (tipo, valor) values
  ('fv',0), ('cc',0), ('ingreso',0), ('cxp',0), ('egreso',0);
alter table public.contadores enable row level security;
create policy "autenticados_leen_contadores" on public.contadores for select using (auth.role() = 'authenticated');
-- SIN policy de "update" a propósito -- nadie actualiza esta tabla directo,
-- solo a través de la función siguiente_numero() (ver "security definer" abajo).

-- "security definer" + "search_path" fijo: la función corre con permisos del
-- dueño de la base (no del usuario que la llama), así puede sumarle 1 al
-- contador aunque el usuario normal no tenga permiso de UPDATE en la tabla
-- directamente -- solo puede pasar por acá, un renglón a la vez, nunca
-- pisando ni leyendo el contador de otro tipo de documento.
create or replace function public.siguiente_numero(p_tipo text)
returns integer language sql security definer set search_path = public as $$
  update public.contadores set valor = valor + 1 where tipo = p_tipo returning valor;
$$;
grant execute on function public.siguiente_numero(text) to authenticated;

-- Para cuando alguien escribe su PROPIO número a mano en vez de usar la
-- sugerencia (ej. para registrar una factura vieja) -- adelanta el contador
-- compartido para que la próxima sugerencia automática no repita ese número.
-- No hace nada si el valor escrito es menor o igual al contador actual.
create or replace function public.avanzar_contador_si_mayor(p_tipo text, p_valor integer)
returns void language sql security definer set search_path = public as $$
  update public.contadores set valor = greatest(valor, p_valor) where tipo = p_tipo;
$$;
grant execute on function public.avanzar_contador_si_mayor(text, integer) to authenticated;

create table public.ot_contadores (
  anio integer primary key,
  valor integer not null default 0
);
alter table public.ot_contadores enable row level security;
create policy "autenticados_leen_ot_contadores" on public.ot_contadores for select using (auth.role() = 'authenticated');

create or replace function public.siguiente_ot()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_anio integer := extract(year from now())::integer;
  v_mes text := to_char(now(), 'MM');
  v_valor integer;
begin
  insert into public.ot_contadores (anio, valor) values (v_anio, 0)
    on conflict (anio) do nothing;
  update public.ot_contadores set valor = valor + 1 where anio = v_anio returning valor into v_valor;
  return 'OT-' || to_char(now(),'YY') || v_mes || '-' || lpad(v_valor::text, 2, '0');
end;
$$;
grant execute on function public.siguiente_ot() to authenticated;

-- --------------------------------------------------------------------------
-- 10. PRECIOS (overrides del Panel de Precios)
-- --------------------------------------------------------------------------
create table public.precios_override (
  id boolean primary key default true check (id),  -- fuerza que exista 1 sola fila
  datos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.precios_override (id, datos) values (true, '{}'::jsonb);
alter table public.precios_override enable row level security;
create policy "autenticados_todo_precios_override" on public.precios_override for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.precios_promo_override (
  id boolean primary key default true check (id),
  datos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.precios_promo_override (id, datos) values (true, '{}'::jsonb);
alter table public.precios_promo_override enable row level security;
create policy "autenticados_todo_precios_promo" on public.precios_promo_override for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Papeles/sustratos que Conde agrega desde el Panel de Precios además del catálogo fijo,
-- cada uno con la lista de calculadoras donde debe aparecer (Conde 2026-08-19).
create table public.sustratos_custom (
  id boolean primary key default true check (id),
  datos jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.sustratos_custom (id, datos) values (true, '[]'::jsonb);
alter table public.sustratos_custom enable row level security;
create policy "autenticados_todo_sustratos_custom" on public.sustratos_custom for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Acabados adicionales (ej. plastificado especial, UV a color) que Conde agrega desde el Panel
-- de Precios, cobrados por m² igual que Plastificado/Colaminado, con su lista de calculadoras
-- donde debe aparecer como checkbox opcional (Conde 2026-08-19).
create table public.acabados_custom (
  id boolean primary key default true check (id),
  datos jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.acabados_custom (id, datos) values (true, '[]'::jsonb);
alter table public.acabados_custom enable row level security;
create policy "autenticados_todo_acabados_custom" on public.acabados_custom for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Recomendaciones de Producción editables desde el Panel de Precios (Conde 2026-08-20) -- "overrides"
-- reemplaza el texto de una recomendación existente por su id, "custom" agrega recomendaciones nuevas
-- (siempre se muestran para la línea que se les asigne).
create table public.recomendaciones_override (
  id boolean primary key default true check (id),
  overrides jsonb not null default '{}'::jsonb,
  custom jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.recomendaciones_override (id, overrides, custom) values (true, '{}'::jsonb, '[]'::jsonb);
alter table public.recomendaciones_override enable row level security;
create policy "autenticados_todo_recomendaciones_override" on public.recomendaciones_override for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 11. FOTOTECA (unifica las 3 claves sueltas de hoy en una sola tabla)
-- --------------------------------------------------------------------------
create table public.fototeca_items (
  clave text primary key,   -- 'cuadernos', 'carpetas', ..., o 'custom_<algo>'
  label text,
  linea_base text,
  foto_url text,   -- Supabase Storage
  video_url text,
  es_custom boolean not null default false
);
alter table public.fototeca_items enable row level security;
create policy "autenticados_todo_fototeca" on public.fototeca_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 12. VENTAS B2C ROMPECABEZAS
-- --------------------------------------------------------------------------
create table public.b2c_pedidos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado')),
  nombre text,
  celular text,
  correo text,
  entrega text,
  total numeric not null default 0,
  cantidad numeric not null default 0,
  kanban_ficha_id uuid, -- sin "references" -- ver nota de guardado optimista
  fecha_aprobado timestamptz
);
alter table public.b2c_pedidos enable row level security;
create policy "autenticados_todo_b2c_pedidos" on public.b2c_pedidos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table public.b2c_pedido_items (
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
  foto_thumb_url text  -- Supabase Storage
);
alter table public.b2c_pedido_items enable row level security;
create policy "autenticados_todo_b2c_items" on public.b2c_pedido_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 13. STORAGE -- buckets para fotos (reemplaza el base64 embebido de hoy)
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('kanban-fotos', 'kanban-fotos', true),
  ('fototeca', 'fototeca', true),
  ('b2c-fotos', 'b2c-fotos', true)
on conflict (id) do nothing;

-- Lectura pública (para que las fotos se vean en PDFs/WhatsApp sin login),
-- pero solo usuarios logueados pueden subir/borrar:
create policy "fotos_lectura_publica" on storage.objects for select
  using (bucket_id in ('kanban-fotos','fototeca','b2c-fotos'));
create policy "fotos_solo_autenticados_suben" on storage.objects for insert
  with check (bucket_id in ('kanban-fotos','fototeca','b2c-fotos') and auth.role() = 'authenticated');
create policy "fotos_solo_autenticados_borran" on storage.objects for delete
  using (bucket_id in ('kanban-fotos','fototeca','b2c-fotos') and auth.role() = 'authenticated');

-- ==========================================================================
-- FIN. Si todo corrió sin error, el siguiente paso es crear los 6 usuarios
-- (Authentication -> Users -> Add user) y avísame para seguir con el código
-- que conecta el Hub a esta base de datos.
-- ==========================================================================
