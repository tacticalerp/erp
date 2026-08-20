-- ==========================================================================
-- TACTICAL ERP -- Preparación de Contabilidad para Supabase.
--
-- 1) Arreglo de seguridad: las funciones de numeración automática (facturas,
--    cuentas de cobro, ingresos, CxP, egresos, OT) todavía no se habían
--    probado en uso real -- al revisarlas para migrar Contabilidad, se
--    encontró que iban a fallar: la tabla de contadores solo tiene permiso
--    de LECTURA para los usuarios, pero la función necesita también
--    sumarle 1. Se soluciona marcando las funciones como "security
--    definer": corren con permiso del dueño de la base, así pueden sumarle
--    1 al contador aunque el usuario normal no tenga permiso de modificar
--    esa tabla directamente -- solo pueden pasar por esta función, de a un
--    número a la vez.
-- 2) Columna y función nuevas que hacían falta para Contabilidad.
-- 3) Carga inicial de los 12 Gastos Fijos que hoy son el valor "de fábrica"
--    de la app, para no perder ese punto de partida.
-- ==========================================================================

create or replace function public.siguiente_numero(p_tipo text)
returns integer language sql security definer set search_path = public as $$
  update public.contadores set valor = valor + 1 where tipo = p_tipo returning valor;
$$;
grant execute on function public.siguiente_numero(text) to authenticated;

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

-- Nueva función (para Contabilidad): cuando alguien escribe su PROPIO número
-- a mano en vez de usar la sugerencia (ej. para registrar una factura
-- vieja), esto adelanta el contador compartido para que la próxima
-- sugerencia automática no repita ese número.
create or replace function public.avanzar_contador_si_mayor(p_tipo text, p_valor integer)
returns void language sql security definer set search_path = public as $$
  update public.contadores set valor = greatest(valor, p_valor) where tipo = p_tipo;
$$;
grant execute on function public.avanzar_contador_si_mayor(text, integer) to authenticated;

-- Columna nueva que faltaba en cuentas_por_pagar (referencia informativa al
-- comprobante de egreso que la saldó, se agregó al revisar Contabilidad a fondo).
alter table public.cuentas_por_pagar add column if not exists id_egreso uuid;

-- Los 12 Gastos Fijos que hoy aparecen "de fábrica" en la app (Arriendo, Luz,
-- etc.) vivían como valor por defecto en el código, no en ningún lado
-- guardado -- para no perder ese punto de partida al pasar a Supabase, se
-- cargan aquí UNA sola vez (si la tabla ya tiene algo, no hace nada).
insert into public.gastos_fijos_config (concepto, monto, orden)
select * from (values
  ('Arriendo', 2350000, 0), ('Luz', 300000, 1), ('Agua', 80000, 2),
  ('Celulares', 100000, 3), ('Internet', 90000, 4), ('Google Workspace', 250000, 5),
  ('Contadora', 400000, 6), ('Seguridad', 380000, 7), ('Seguro Camioneta', 270000, 8),
  ('Gerencia', 4000000, 9), ('Comercial/Ventas', 3000000, 10), ('MOD (3 operarios)', 5850000, 11)
) as datos(concepto, monto, orden)
where not exists (select 1 from public.gastos_fijos_config limit 1);

-- Verificación: no debe haber errores arriba.
select 'listo' as resultado;
