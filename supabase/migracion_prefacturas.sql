-- Conde 2026-08-27: "quiero que primero se cree una prefactura y la persona de contabilidad crea el
-- documento factura de venta... se puede hacer una sola factura por varios pedidos del mismo cliente"
--
-- Hasta hoy, marcar un negocio "Ganado" en el CRM creaba automáticamente un Documento de Venta YA
-- NUMERADO (consumía un consecutivo FV-/CC- real al instante, con condiciones de pago fijas y sin
-- revisión de nadie) -- un documento por cada negocio, sin poder juntar varios pedidos del mismo
-- cliente en una sola factura. Esta tabla es el paso intermedio: un registro simple, sin número, sin
-- ciclo de vida financiero (eso solo aplica una vez se convierte en Documento de Venta real).
create table public.prefacturas (
  id uuid primary key default gen_random_uuid(),
  opp_id uuid, -- sin "references" -- mismo criterio de guardado optimista que el resto del proyecto
  id_cot uuid,
  id_cliente uuid,
  cliente_empresa text,
  ot text,
  descripcion text,
  monto numeric not null,
  vendedor text,
  facturada boolean not null default false,
  id_doc_venta uuid, -- se llena cuando Contabilidad genera el Documento de Venta a partir de esta prefactura
  created_at timestamptz not null default now()
);
alter table public.prefacturas enable row level security;
create policy "autenticados_todo_prefacturas" on public.prefacturas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
