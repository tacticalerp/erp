-- ==========================================================================
-- TACTICAL ERP -- Arreglo de los números de OT repetidos (2026-11-06)
--
-- Problema: siguiente_ot() armaba el consecutivo con lpad(valor::text, 2, '0').
-- En Postgres lpad() RECORTA el texto cuando es más largo que el largo pedido:
-- lpad('248', 2, '0') devuelve '24'. Desde el consecutivo 100 (15-sep-2026) todos
-- los números salieron de 2 dígitos recortados: 100-109 -> "10", 120-129 -> "12",
-- 240-248 -> "24"... así cada 10 cotizaciones compartían el mismo número de OT.
--
-- Arreglo: del 1 al 99 sigue con 2 dígitos (OT-2611-07); desde el 100 se escribe
-- completo (OT-2611-249). El contador NO se toca (sigue en 248; el próximo es 249).
--
-- Pegar COMPLETO en el SQL Editor de Supabase y ejecutar (se puede correr más de
-- una vez sin error).
-- ==========================================================================

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
  return 'OT-' || to_char(now(),'YY') || v_mes || '-' ||
         case when v_valor < 100 then lpad(v_valor::text, 2, '0') else v_valor::text end;
end;
$$;
grant execute on function public.siguiente_ot() to authenticated;

-- Comprobación (no cambia nada): en un SQL Editor aparte se puede ver el contador:
--   select * from public.ot_contadores;   -- 2026 -> 248 (el próximo OT será ...-249)
