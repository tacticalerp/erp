-- Conde 2026-10-08: ventas de Rompecabezas 2026 (cuadro "TACTICAL-ROMPECABEZAS VENTAS AÑO 2026")
-- para los meses que faltaban en la seccion "Rompecabezas personalizados" de Reportes.
--
-- Decision de Conde: SOLO se agregan Julio y Agosto. Enero-Junio 2026 NO se tocan -- ya existen
-- (cuadro consolidado de Fany, canal Personalizado completo, con su costo/utilidad) con cifras
-- mayores a las del cuadro de Rompecabezas porque incluyen otros ingresos sin factura.
--
-- OJO al leer la grafica: Jul y Ago son SOLO Rompecabezas; Ene-Jun son el canal completo. No son
-- 100% comparables entre si.
--
-- Solo agrega filas a una tabla que ya existe y ya tiene su GRANT -- no hace falta nada mas.
-- Se puede correr varias veces sin duplicar (on conflict actualiza el ingreso).
insert into public.historico_financiero_mensual (anio, mes, canal, ingresos, fuente) values
(2026, 7, 'personalizado', 4428150, 'caja_informal'),
(2026, 8, 'personalizado', 5261000, 'caja_informal')
on conflict (anio, mes, canal, fuente) do update set ingresos = excluded.ingresos;

-- Verificacion (opcional): debe mostrar los 8 meses de 2026, Jul y Ago con 4.428.150 y 5.261.000
select mes, ingresos
from public.historico_financiero_mensual
where anio = 2026 and canal = 'personalizado' and fuente = 'caja_informal'
order by mes;
