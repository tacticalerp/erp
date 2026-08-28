-- Conde 2026-08-27: módulo nuevo "Comercial" -- tablero compacto por vendedor (Norely/Helver) con
-- Personalizados (pedidos B2C Rompecabezas) y Corporativo (cotizaciones creadas + productos
-- aprobados). No crea tablas nuevas -- reusa cotizaciones/kanban/b2c_pedidos que ya existen, solo
-- le faltan 3 columnas para lo que pidió Conde:

-- 1) A quién quedó asignado el negocio, en la ficha de producción misma (hoy solo vivía en la
--    cotización/opp, no se copiaba a la ficha -- lo necesita el filtro por vendedor de "Productos
--    aprobados"). Texto corto a propósito (Conde: "no es necesario que sea muy grande el texto").
alter table public.kanban_fichas add column if not exists vendedor text;

-- 2) y 3) Seguimiento comercial de un pedido B2C -- hoy "estado" solo es pendiente/aprobado (un
--    checkbox), no hay dónde anotar en qué va el proceso ni observaciones libres del comercial.
alter table public.b2c_pedidos add column if not exists nota_comercial text;
alter table public.b2c_pedidos add column if not exists observaciones_comercial text;

-- 4) Seguimiento comercial de una cotización activa (ej. "llamé el viernes 28, volver a llamar
--    el 2 de septiembre") -- antes de ganarse no hay dónde guardar esto de forma útil.
alter table public.opps add column if not exists seguimiento text;

-- 5) Conde 2026-08-28: fecha programada del botón de reloj (ícono nuevo junto a aprobar/cancelar
--    en "Cotizaciones creadas") -- separada del texto libre de arriba porque esta sí se compara
--    contra la fecha de hoy para activar el aviso "HOY seguimiento cotización..." en Comercial.
alter table public.opps add column if not exists seguimiento_fecha date;
