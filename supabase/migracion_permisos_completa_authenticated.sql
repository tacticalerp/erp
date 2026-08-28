-- Conde 2026-08-28: "revisa si hay más problemas similares" -- después de tropezar 4 veces esta
-- semana con la misma causa (historial_cierres, b2c_pedidos borrar, cotizaciones_calculadoras...
-- una tabla que nunca tuvo el permiso concedido al rol 'authenticated', y como el error solo
-- queda en la consola del navegador, nadie se entera hasta que ya pasó), revisé el código
-- completo de tactical-supabase.js: cada tabla que se usa, y con qué permiso (select/insert/
-- update/delete). Este script concede exactamente eso -- ni más ni menos -- para el rol
-- 'authenticated' (con el que entra cualquiera que hace login real en el ERP: Conde, Norely,
-- Helver, etc.). Correrlo es seguro aunque algún permiso ya existiera (Postgres no da error por
-- repetir un GRANT).
--
-- OJO -- esto es solo para 'authenticated' (adentro del ERP, con sesión iniciada). NO toca 'anon'
-- a propósito: el módulo B2C de Rompecabezas (modulo_montajes_rompecabezas.html) tiene una
-- pantalla de login que no sé con certeza si bloquea también a los clientes que llegan solos a
-- pedir su rompecabezas sin cuenta (el diseño original decía que sí era autoservicio sin login).
-- Si un cliente SIN iniciar sesión no puede crear su pedido hoy, avísame y reviso ese caso aparte
-- -- ese sí necesitaría permisos para 'anon' en b2c_pedidos/b2c_pedido_items/b2c_carrito_borrador,
-- y ahí prefiero confirmar contigo antes de abrir permisos a un rol sin login.

-- ===== CRM / Embudo / Comercial =====
grant select, insert, update, delete on public.clientes to authenticated;
grant select, insert, update, delete on public.opps to authenticated;
grant select, insert, update, delete on public.historial_cierres to authenticated;
grant select, insert, update, delete on public.prefacturas to authenticated;

-- ===== Cotizador de Cuadernos + las 7 calculadoras =====
grant select, insert, update, delete on public.cotizaciones_cuadernos to authenticated;
grant select, insert, update on public.cotizaciones_calculadoras to authenticated;
grant select, insert, update, delete on public.pedidos_borrador to authenticated;
grant select, insert, update, delete on public.comparaciones_borrador to authenticated;

-- ===== Kanban de Producción =====
grant select, insert, update, delete on public.kanban_fichas to authenticated;
grant select, insert, delete on public.kanban_lineas to authenticated;
grant select, insert, delete on public.kanban_checklist to authenticated;
grant select, insert, delete on public.kanban_fotos to authenticated;

-- ===== Reprocesos =====
grant select, insert, update, delete on public.reprocesos to authenticated;
grant select, insert, delete on public.reprocesos_items to authenticated;

-- ===== Contabilidad =====
grant select, insert, update, delete on public.documentos_venta to authenticated;
grant select, insert, delete on public.documentos_venta_items to authenticated;
grant select, insert, update, delete on public.cuentas_por_pagar to authenticated;
grant select, insert, delete on public.cuentas_por_pagar_items to authenticated;
grant select, insert, update, delete on public.ingresos to authenticated;
grant select, insert, update, delete on public.egresos to authenticated;
grant select, insert, update, delete on public.gastos_fijos_config to authenticated;
grant select, insert, update on public.proveedores to authenticated;

-- ===== Plan de Tareas / Personal =====
grant select, insert, update, delete on public.tareas to authenticated;
grant select, insert, update, delete on public.personal to authenticated;

-- ===== Panel de Precios (overrides que edita Conde sin tocar código) =====
grant select, insert, update on public.precios_override to authenticated;
grant select, insert, update on public.precios_promo_override to authenticated;
grant select, insert, update on public.recomendaciones_override to authenticated;
grant select, insert, update on public.acabados_custom to authenticated;
grant select, insert, update on public.sustratos_custom to authenticated;

-- ===== Fototeca =====
grant select, insert, update, delete on public.fototeca_items to authenticated;

-- ===== Módulo B2C Rompecabezas -- lado ADMIN (aprobar/buscar/borrar pedidos, ya logueado) =====
grant select, insert, update, delete on public.b2c_pedidos to authenticated;
grant select, insert, update, delete on public.b2c_pedido_items to authenticated;
grant select, insert, update, delete on public.b2c_carrito_borrador to authenticated;

-- ===== Login / perfil =====
grant select on public.usuarios to authenticated;

-- ===== Contador de OT (siguienteOT / avanzarContadorSiMayor) -- estas van por función (RPC), no
-- por tabla. Se concede a TODAS las funciones del schema public en vez de nombrar cada una con
-- sus tipos exactos de parámetro (que no puedo confirmar sin ver la base) -- más simple y sin
-- riesgo de que el script falle por adivinar mal un tipo; siguen siendo solo las funciones que tú
-- mismo definiste para el ERP, no algo externo. =====
grant select on public.contadores to authenticated;
grant execute on all functions in schema public to authenticated;
