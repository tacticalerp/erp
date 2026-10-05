-- ==========================================================================
-- TACTICAL ERP -- Notas Crédito (Conde 2026-10-05)
--
-- "necesito crear un documento que se llame nota crédito, que permita anular una
-- factura de venta específica". Una Nota Crédito anula COMPLETA una factura /
-- cuenta de cobro: la factura queda en estado 'anulada' (saldo $0, sale de la
-- cartera) y la Nota resta la venta en el mes en que se hace.
--
-- Pegar COMPLETO en el SQL Editor de Supabase y ejecutar (se puede correr más de
-- una vez sin error).
-- ==========================================================================

-- 1) Tabla de Notas Crédito
create table if not exists public.notas_credito (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,               -- NC-####
  fecha date not null default current_date,
  id_doc_venta uuid,                         -- factura / cuenta de cobro que anula (sin FK: mismo criterio que el resto)
  numero_doc text,                           -- FV-#### / CC-#### (copia, por si luego se elimina el documento)
  id_cliente uuid,
  motivo text,
  valor_bruto numeric not null default 0,    -- copia de la factura al momento de anular
  iva numeric not null default 0,
  total_documento numeric not null default 0,
  total_cobrar numeric not null default 0,
  cobrado_previo numeric not null default 0, -- lo que ya se había cobrado de esa factura (para poder revertir la Nota)
  created_at timestamptz not null default now()
);

alter table public.notas_credito enable row level security;
drop policy if exists "autenticados_todo_notas_credito" on public.notas_credito;
create policy "autenticados_todo_notas_credito" on public.notas_credito for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RLS solo no alcanza: toda tabla nueva necesita su GRANT explícito a "authenticated"
grant select, insert, update, delete on public.notas_credito to authenticated;

-- 2) La factura anulada necesita un estado propio
alter table public.documentos_venta drop constraint if exists documentos_venta_estado_check;
alter table public.documentos_venta add constraint documentos_venta_estado_check
  check (estado in ('pendiente','abonado_parcial','pagada','anulada'));

-- 3) Contador de numeración NC-0001, NC-0002...
insert into public.contadores (tipo, valor) values ('nc', 0) on conflict (tipo) do nothing;
