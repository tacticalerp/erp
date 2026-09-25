-- Conde 2026-09-25: carpetas CONTABILIDAD 2020-2024 -- completan el backfill de la fuente
-- 'formal_accrual' en historico_financiero_anual que quedó pendiente desde la migración de
-- 2013-2020 (ver migracion_historico_formal_2013_2020.sql): esos años solo tenían el Balance
-- General formal en historico_balance_anual, pero nunca su P&G desglosado por canal aquí.
--
-- Fuente: "ESTADOS FINANCIEROS TACTICAL 2021-2020 ANEXO 01.pdf" (2021, restated -- ver nota),
-- "ESTADOS FINANCIEROS TACTICAL 2022-2021 (1).pdf" (2022), "ESTADOS FINANCIEROS TACTICAL
-- 2023-2022.pdf" (2023), "ESTADOS FINANCIEROS 2024.pdf" (2024). 2020 NO se repite aquí porque
-- ya quedó cargado en la migración anterior con la misma fuente (mismo PDF NIIF 2020-2019).
--
-- Verificado: las 4 filas (Activos/Pasivos/Patrimonio/Ingresos/Costo/GastosAdmin/UtilidadNeta)
-- de cada año cuadran EXACTO contra lo que ya había en historico_balance_anual (cargado desde
-- 2026-09-16) -- confirma que ambas fuentes documentales son consistentes entre sí.
--
-- Nota 2021: el PDF "2021-2020 ANEXO 01" (firmado en su momento) trae Ganancia del período
-- 2021 = 61.521.910, pero el PDF posterior "2022-2021" trae la MISMA cifra 2021 restated a
-- 62.891.246 en su columna comparativa (y así quedó también en historico_balance_anual desde
-- la carga original) -- se usa la cifra restated/posterior por ser la que se mantuvo vigente.
--
-- gastos_admin es SOLO administración (no incluye gastos financieros/otros gastos, que el
-- documento fuente lista aparte) -- utilidad_neta es la cifra final ya con impuestos y todo lo
-- demás descontado, por eso no cuadra con una resta simple de las columnas de arriba (mismo
-- criterio ya usado en los demás años formales).

insert into public.historico_financiero_anual (anio, canal, ingresos, costo_ventas, gastos_admin, utilidad_neta, fuente, nota) values
(2021,'tactical',267076000,132783529,52183077,62891246,'formal_accrual','Estados financieros auditados NIIF -- 2021 restated según comparativo del PDF 2022-2021'),
(2022,'tactical',435531711,224744513,121726744,69486699,'formal_accrual','Estados financieros auditados NIIF'),
(2023,'tactical',637359864,289327364,107134367,193993359,'formal_accrual','Estados financieros auditados NIIF -- año récord'),
(2024,'tactical',481677328,273952508,125228014,61906135,'formal_accrual','Estados financieros auditados NIIF')
on conflict (anio, canal, fuente) do nothing;

-- Verificar que quedó bien:
--   select * from historico_financiero_anual where fuente='formal_accrual' order by anio;
