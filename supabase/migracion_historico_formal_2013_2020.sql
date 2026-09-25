-- Conde 2026-09-25: nuevos Estados Financieros formales (auditados, NIIF) 2013-2020 -- extienden
-- hacia atrás el Balance General que antes solo tenía 2021-2025, y agregan por primera vez la
-- versión "formal_accrual" del P&G anual (antes solo existía la versión "caja_informal" del
-- cuadro de Fany, para estos mismos años).
--
-- Fuente: BALANCE GENERAL/ESTADO DE RESULTADOS 2015 (comparativo 2013-2014-2015), Balance/Estado
-- de Resultados 2016 (comparativo 2014-2015-2016), ESTADOS 2017.pdf (comparativo 2016-2017),
-- ESTADOS FINANCIEROS 2018.pdf (comparativo 2017-2018), ESTADOS FINANCIEROS NIIF 2020-2019.pdf
-- (comparativo 2019-2020). Verificado: Activo = Pasivo + Patrimonio cuadra exacto en los 8 años;
-- para 2013 también se verificó Ingresos - Costo - Gastos Admin - Gastos no operac + Ingresos no
-- operac = Utilidad Antes de Impuestos exacto contra el documento fuente.
--
-- gastos_admin es SOLO administración (no incluye gastos financieros, que el documento fuente
-- lista aparte) -- utilidad_neta es la cifra final real ya con impuestos, gastos financieros y
-- todo lo demás descontado, por eso no cuadra con una resta simple de las columnas de arriba
-- (mismo criterio ya usado en los años 2021-2025 que ya estaban cargados).

-- ============================================================================
-- 1. BALANCE GENERAL 2013-2020 (antes el histórico de balance solo empezaba en 2021)
-- ============================================================================
insert into public.historico_balance_anual (anio, total_activos, total_pasivos, total_patrimonio, ingresos, costo_ventas, gastos_admin, utilidad_neta) values
(2013, 48324489, 7014200, 41310289, 95756000, 42113300, 58174689, -4820194),
(2014, 61195604, 14076747, 47118857, 126756355, 67640661, 52350702, 4710379),
(2015, 62937486, 9064846, 53872640, 133133218, 76336633, 43826933, 6753784),
(2016, 73972885, 20531585, 53441300, 126910638, 65337473, 48887772, 6259727),
(2017, 79879732, 18865094, 61014638, 229410443, 144690689, 68466956, 7573338),
(2018, 97730351, 45945557, 51784794, 294569799, 152025141, 105731204, 20722140),
(2019, 85327375, 44478346, 40849029, 296359995, 152596214, 118744198, 13969387),
(2020, 71659793, 10223105, 61436688, 151416566, 65362475, 53141657, 21511643)
on conflict (anio) do nothing;

-- ============================================================================
-- 2. HISTORICO_FINANCIERO_ANUAL, fuente 'formal_accrual' (canal tactical, entidad formal
--    solamente -- estas cifras NO incluyen el canal Personalizado/Norely, que nunca tuvo
--    estados financieros formales propios). Coexiste con la fila 'caja_informal' ya cargada
--    para el mismo año -- las 2 fuentes NO tienen por qué cuadrar entre sí (una es devengo/NIIF
--    auditado, la otra caja informal de Fany), es la comparación que se buscaba desde el inicio
--    del proyecto histórico.
-- ============================================================================
insert into public.historico_financiero_anual (anio, canal, ingresos, costo_ventas, gastos_admin, utilidad_neta, fuente, nota) values
(2013,'tactical',95756000,42113300,58174689,-4820194,'formal_accrual','Estados financieros auditados NIIF'),
(2014,'tactical',126756355,67640661,52350702,4710379,'formal_accrual','Estados financieros auditados NIIF'),
(2015,'tactical',133133218,76336633,43826933,6753784,'formal_accrual','Estados financieros auditados NIIF'),
(2016,'tactical',126910638,65337473,48887772,6259727,'formal_accrual','Estados financieros auditados NIIF'),
(2017,'tactical',229410443,144690689,68466956,7573338,'formal_accrual','Estados financieros auditados NIIF'),
(2018,'tactical',294569799,152025141,105731204,20722140,'formal_accrual','Estados financieros auditados NIIF'),
(2019,'tactical',296359995,152596214,118744198,13969387,'formal_accrual','Estados financieros auditados NIIF'),
(2020,'tactical',151416566,65362475,53141657,21511643,'formal_accrual','Estados financieros auditados NIIF')
on conflict (anio, canal, fuente) do nothing;

-- ============================================================================
-- 3. Canal Personalizado 2020 -- se creía sin datos para este año ("No se registró canal Norely
--    separado", ver nota de 2018/2019/2020 en la migración original), pero el cuadro
--    "CUADRO FINANCIERO TACTICAL 2020.xls" SÍ lo trae, solo que con el título "SIMPLIFICADO" en
--    vez de "NORELY SARMIENTO" -- por eso no se había visto antes. Verificado: Tactical
--    (27.986.755) + este bloque (31.737.755) = 59.724.510 = exacto contra la fila
--    "UTILIDAD TAC - NORELY" del mismo archivo. Solo trae Mayo-Diciembre (8 meses).
-- ============================================================================
insert into public.historico_financiero_anual (anio, canal, ingresos, costo_ventas, gastos_admin, utilidad_neta, fuente, nota) values
(2020,'personalizado',89911999,58174244,0,31737755,'caja_informal','Norely Sarmiento -- solo May-Dic 2020 (8 meses), aparece como "SIMPLIFICADO" en el cuadro fuente')
on conflict (anio, canal, fuente) do nothing;

insert into public.historico_financiero_mensual (anio, mes, canal, ingresos, fuente) values
(2020,5,'personalizado',3368000,'caja_informal'),
(2020,6,'personalizado',5059500,'caja_informal'),
(2020,7,'personalizado',14765250,'caja_informal'),
(2020,8,'personalizado',24516800,'caja_informal'),
(2020,9,'personalizado',4017750,'caja_informal'),
(2020,10,'personalizado',24164799,'caja_informal'),
(2020,11,'personalizado',6496800,'caja_informal'),
(2020,12,'personalizado',7523100,'caja_informal')
on conflict (anio, mes, canal, fuente) do nothing;

-- Verificar que quedó bien:
--   select * from historico_balance_anual order by anio;
--   select * from historico_financiero_anual where fuente='formal_accrual' order by anio;
--   select * from historico_financiero_anual where anio=2020 order by canal, fuente;
