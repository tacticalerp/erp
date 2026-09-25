-- Conde 2026-09-25: "en ocasiones el proveedor [cliente] nos paga ese reteiva, quiero tener la
-- posibilidad de quitar o dejar el reteiva cuando se este haciendo el comprobante de ingreso" --
-- nueva columna para dejar trazado cuándo un cobro llegó SIN que el cliente retuviera la ReteIVA
-- (pagó el bruto de la factura en vez del neto). Default false = comportamiento de siempre
-- (se asume que si la factura llevaba ReteIVA, el cliente sí la retuvo).
alter table public.ingresos add column if not exists reteiva_recibida boolean not null default false;
