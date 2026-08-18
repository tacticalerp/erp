-- ==========================================================================
-- TACTICAL ERP -- Permisos de acceso (correr DESPUÉS de schema.sql)
--
-- Por qué hace falta esto: al crear el proyecto desmarcamos a propósito
-- "Exponer automáticamente nuevas tablas" (para que nada quede abierto sin
-- revisar) -- pero eso también significa que Postgres nunca le dio permiso
-- de INTENTAR leer estas tablas al rol "authenticated" (usuarios logueados).
-- Sin este permiso de base, ni siquiera llega a evaluarse la regla de
-- seguridad (RLS) que ya escribimos -- Postgres lo bloquea un paso antes.
--
-- Este script SOLO le da permiso al rol "authenticated" (usuarios con
-- sesión iniciada). El rol "anon" (sin sesión) NO recibe nada -- así
-- cualquiera que no haya iniciado sesión sigue sin poder ver nada, que es
-- justo lo que se busca.
-- ==========================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.usuarios,
  public.clientes,
  public.opps,
  public.historial_cierres,
  public.cotizaciones_cuadernos,
  public.pedidos_borrador,
  public.comparaciones_borrador,
  public.kanban_fichas,
  public.kanban_lineas,
  public.kanban_checklist,
  public.kanban_fotos,
  public.reprocesos,
  public.reprocesos_items,
  public.tareas,
  public.proveedores,
  public.documentos_venta,
  public.documentos_venta_items,
  public.ingresos,
  public.cuentas_por_pagar,
  public.cuentas_por_pagar_items,
  public.egresos,
  public.gastos_fijos_config,
  public.contadores,
  public.ot_contadores,
  public.precios_override,
  public.precios_promo_override,
  public.fototeca_items,
  public.b2c_pedidos,
  public.b2c_pedido_items
to authenticated;

grant execute on function public.siguiente_numero(text) to authenticated;
grant execute on function public.siguiente_ot() to authenticated;

-- ==========================================================================
-- FIN. Corre este script igual que el anterior (pegar + Run). Después
-- avísame y verifico desde aquí que ya quedó accesible.
-- ==========================================================================
