-- Conde 2026-09-16: "quiero darte la informacion financiera de otros periodos... organices,
-- guardes, compares... un espacio para ver las cifras y diagnostico util enfocado en gerencia y
-- marketing". Tablas para guardar el historico financiero (2011-2026) extraido de:
--   - CUADRO FINANCIERO TACTICAL 2025 FANY.xls (P&G mensual en base CAJA, 2011-2025, por canal)
--   - CONSOLIDADO AÑO 2026 / AGOSTO A DICIEMBRE 2025 .xlsx (mismo formato, 2025-2026)
--   - ESTADOS FINANCIEROS TACTICAL 20XX-20XX.pdf (Balance General + P&G formal AUDITADO, base
--     CAUSACION/accrual, 2021-2025, solo entidad formal "Tactical Marketing Group SAS")
--   - VENTAS POR CLIENTE... .xlsx (ranking de clientes real por NIT, 2025-2026)
--
-- Conde confirmo (2026-09-16): quiere Tactical y "Personalizados" (canal Rompecabezas B2C /
-- cuenta de cobro, antes a nombre de Norely Sarmiento) DISCRIMINADOS por separado + el total de
-- la suma -- por eso "canal" existe como columna, no se pre-suman los totales.
--
-- OJO -- dos bases contables distintas conviven a proposito, marcadas en "fuente":
--   'caja_informal'  = el cuadro que Conde/Fany llevan mes a mes (ingresos y egresos de caja real)
--   'formal_accrual' = los Estados Financieros formales que presenta el contador (causacion,
--                      incluye depreciacion, provision de renta, etc). NO van a cuadrar centavo a
--                      centavo contra el informal -- son dos métodos válidos, no un error.
--
-- Como correr: Supabase Dashboard -> SQL Editor -> pegar todo -> Run.

-- ============================================================================
-- 1. TABLAS
-- ============================================================================

create table if not exists public.historico_financiero_anual (
  id uuid primary key default gen_random_uuid(),
  anio int not null,
  canal text not null check (canal in ('tactical','personalizado','total')),
  ingresos numeric not null default 0,
  costo_ventas numeric,
  gastos_admin numeric,
  utilidad_neta numeric,
  fuente text not null default 'caja_informal' check (fuente in ('caja_informal','formal_accrual')),
  nota text,
  created_at timestamptz not null default now(),
  unique(anio, canal, fuente)
);
alter table public.historico_financiero_anual enable row level security;
create policy "autenticados_leen_historico_anual" on public.historico_financiero_anual for select
  using (auth.role() = 'authenticated');
create policy "autenticados_escriben_historico_anual" on public.historico_financiero_anual for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.historico_financiero_mensual (
  id uuid primary key default gen_random_uuid(),
  anio int not null,
  mes int not null check (mes between 1 and 12),
  canal text not null check (canal in ('tactical','personalizado')),
  ingresos numeric not null default 0,
  costo_ventas numeric,
  gastos_admin numeric,
  utilidad_neta numeric,
  fuente text not null default 'caja_informal',
  created_at timestamptz not null default now(),
  unique(anio, mes, canal, fuente)
);
alter table public.historico_financiero_mensual enable row level security;
create policy "autenticados_leen_historico_mensual" on public.historico_financiero_mensual for select
  using (auth.role() = 'authenticated');
create policy "autenticados_escriben_historico_mensual" on public.historico_financiero_mensual for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.historico_balance_anual (
  id uuid primary key default gen_random_uuid(),
  anio int not null unique,
  total_activos numeric,
  total_pasivos numeric,
  total_patrimonio numeric,
  ingresos numeric,
  costo_ventas numeric,
  gastos_admin numeric,
  utilidad_neta numeric,
  created_at timestamptz not null default now()
);
alter table public.historico_balance_anual enable row level security;
create policy "autenticados_leen_balance_anual" on public.historico_balance_anual for select
  using (auth.role() = 'authenticated');
create policy "autenticados_escriben_balance_anual" on public.historico_balance_anual for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Ranking de clientes historico (SIIGO), con posible cruce a clientes.id del CRM actual (por NIT o
-- nombre) -- el cruce real se hace desde el ERP con JS (mucho mejor para normalizar nombres), acá
-- solo queda la columna lista para llenarla.
create table if not exists public.historico_ventas_cliente (
  id uuid primary key default gen_random_uuid(),
  periodo_etiqueta text not null, -- ej "2025", "2026 Ene-Jun"
  anio int not null,
  nit text,
  nombre_cliente text not null,
  valor numeric not null default 0,
  num_facturas int,
  id_cliente_crm uuid references public.clientes(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.historico_ventas_cliente enable row level security;
create policy "autenticados_leen_historico_clientes" on public.historico_ventas_cliente for select
  using (auth.role() = 'authenticated');
create policy "autenticados_escriben_historico_clientes" on public.historico_ventas_cliente for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create index if not exists idx_historico_ventas_cliente_crm on public.historico_ventas_cliente(id_cliente_crm);

-- ============================================================================
-- 2. DATOS ANUALES 2011-2025 (base caja informal, Cuadro Financiero Tactical)
--    canal 'tactical' = razón social formal (Claroscuro+Helver en 2011, Tactical MG después)
--    canal 'personalizado' = Norely Sarmiento / Rompecabezas B2C / cuenta de cobro
--    canal 'total' = la suma de los dos (ya venía calculada en el archivo como "RESUMEN")
-- ============================================================================
insert into public.historico_financiero_anual (anio, canal, ingresos, costo_ventas, gastos_admin, utilidad_neta, fuente, nota) values
(2011,'tactical',153398160,56505465,39356211,54296619,'caja_informal','Suma Helver personal + Claroscuro Agencia Gráfica SAS (derivado: total 3-vías del cuadro menos Norely)'),
(2011,'personalizado',36678949,58174965,0,-21496016,'caja_informal','Norely Sarmiento'),
(2011,'total',190077109,114680430,39356211,32800603,'caja_informal',null),
(2012,'tactical',90657167,32369711,48958257,4690478,'caja_informal',null),
(2012,'personalizado',37838500,42039482,0,-4200982,'caja_informal','Norely Sarmiento'),
(2012,'total',128495667,74409193,48958257,489496,'caja_informal',null),
(2013,'tactical',93859824,42200965,56530659,-6166471,'caja_informal',null),
(2013,'personalizado',26847619,37028097,0,-10180478,'caja_informal','Norely Sarmiento'),
(2013,'total',120707443,76738909,56530659,-13856796,'caja_informal','El "total" del cuadro original no cuadra exacto contra tactical+personalizado (diferencia ~2.5M en costo de ventas) -- es una inconsistencia del cuadro fuente de hace más de 10 años, no de esta migración; se dejó el total tal como está en el archivo por ser la cifra que Conde/Fany reportaban en su momento'),
(2014,'tactical',129362355,62516892,51285041,14406236,'caja_informal',null),
(2014,'personalizado',39085900,44619377,0,-5533477,'caja_informal','Norely Sarmiento'),
(2014,'total',168448255,106739768,51285041,8989260,'caja_informal','El "total" del cuadro original no cuadra exacto contra tactical+personalizado (diferencia menor, ~400K) -- misma inconsistencia de origen que 2013, se dejó el total tal como está en el archivo fuente'),
(2015,'tactical',133309123,76336633,43826933,9180950,'caja_informal',null),
(2015,'personalizado',22860600,31642504,0,-8781904,'caja_informal','Norely Sarmiento'),
(2015,'total',156169723,107979137,43826933,399046,'caja_informal',null),
(2016,'tactical',127453037,65696973,34593970,23777065,'caja_informal',null),
(2016,'personalizado',26506950,31838934,0,-5331984,'caja_informal','Norely Sarmiento'),
(2016,'total',153959987,97535907,34593970,18445081,'caja_informal',null),
(2017,'tactical',229410443,143905254,69920950,10958872,'caja_informal',null),
(2017,'personalizado',13221667,13624730,0,-403063,'caja_informal','Norely Sarmiento'),
(2017,'total',242632110,157529984,69920950,10555809,'caja_informal',null),
(2018,'tactical',295101981,167363811,92253825,32661973,'caja_informal','No se registró canal Norely separado este año en el cuadro'),
(2019,'tactical',301216603,152359802,107127783,39345173,'caja_informal','No se registró canal Norely separado este año en el cuadro'),
(2020,'tactical',151289289,78581574,42794031,27986755,'caja_informal','No se registró canal Norely separado este año en el cuadro'),
(2021,'tactical',267076342,132834849,44852390,78469008,'caja_informal',null),
(2021,'personalizado',79252176,75985046,0,3267130,'caja_informal','Norely Sarmiento'),
(2021,'total',346328518,208819895,44852390,81736138,'caja_informal',null),
(2022,'tactical',187319976,103225315,37906740,40681238,'caja_informal','Cuadro incompleto: solo Ene-Jul 2022'),
(2022,'personalizado',37167864,60228198,0,-23060334,'caja_informal','Norely Sarmiento -- solo Ene-Jul 2022'),
(2022,'total',224487840,163453513,37906740,17620904,'caja_informal','Solo Ene-Jul 2022'),
(2023,'tactical',637359863,289327314,87551070,225149594,'caja_informal',null),
(2023,'personalizado',102065444,153564229,0,-51498785,'caja_informal','Norely Sarmiento'),
(2023,'total',739425307,442891543,87551070,173650809,'caja_informal',null),
(2024,'tactical',481677328,273952508,122828014,63347173,'caja_informal',null),
(2024,'personalizado',33866503,50452734,0,-16586231,'caja_informal','Norely Sarmiento -- solo Ene-May 2024 en el cuadro'),
(2024,'total',515543831,324405242,122828014,54764552,'caja_informal','Personalizado solo Ene-May 2024. Ademas la utilidad de diciembre del combinado no cuadra exacto contra tactical solo (diferencia ~8.4M, coincide con la Provisión de Renta del año -- parece que el cuadro original la restó una vez en el total combinado y otra en el de tactical solo); se dejó el total tal como está en el archivo fuente'),
(2025,'tactical',589573834,318901737,104952848,156480730,'caja_informal','Gastos admin/financieros del cuadro solo Ene-Oct; Nov-Dic quedaron con el total de egresos como aproximación'),
(2025,'personalizado',54339140,72828696,0,-18489556,'caja_informal','INCOMPLETO: solo Ago-Dic 2025 (5 meses) -- no hay dato de Ene-Jul 2025 para este canal en ninguna fuente que Conde entregó')
on conflict (anio, canal, fuente) do nothing;
-- Nota: no se inserta fila 'total' para 2025 -- el canal personalizado solo tiene 5 de 12 meses
-- (Ago-Dic), sumarlo con el tactical completo daría un total falso. El desglose mensual sí
-- permite comparar mes a mes lo que hay.

-- ============================================================================
-- 3. DATOS MENSUALES 2024-2026 (base caja informal) -- el grano fino para "cómo vamos este mes
--    vs el mismo mes en años anteriores". Canal 'tactical' = ventas facturadas SIIGO;
--    'personalizado' = Rompecabezas B2C + otros ingresos sin factura.
-- ============================================================================
insert into public.historico_financiero_mensual (anio, mes, canal, ingresos, fuente) values
(2024,1,'tactical',27145531,'caja_informal'),(2024,2,'tactical',29329374,'caja_informal'),(2024,3,'tactical',29039394,'caja_informal'),
(2024,4,'tactical',38416427,'caja_informal'),(2024,5,'tactical',26306224,'caja_informal'),(2024,6,'tactical',31026055,'caja_informal'),
(2024,7,'tactical',33569550,'caja_informal'),(2024,8,'tactical',31474109,'caja_informal'),(2024,9,'tactical',22342626,'caja_informal'),
(2024,10,'tactical',130924734,'caja_informal'),(2024,11,'tactical',34287216,'caja_informal'),(2024,12,'tactical',47816088,'caja_informal'),
(2025,1,'tactical',80521391,'caja_informal'),(2025,2,'tactical',24952551,'caja_informal'),(2025,3,'tactical',16113136,'caja_informal'),
(2025,4,'tactical',69135862,'caja_informal'),(2025,5,'tactical',25982203,'caja_informal'),(2025,6,'tactical',51205089,'caja_informal'),
(2025,7,'tactical',14429019,'caja_informal'),(2025,8,'tactical',85596809,'caja_informal'),(2025,9,'tactical',62682240,'caja_informal'),
(2025,10,'tactical',45292817,'caja_informal'),(2025,11,'tactical',40603955,'caja_informal'),(2025,12,'tactical',72758764,'caja_informal'),
(2026,1,'tactical',46194925,'caja_informal'),(2026,2,'tactical',25156590,'caja_informal'),(2026,3,'tactical',103783799,'caja_informal'),
(2026,4,'tactical',42753915,'caja_informal'),(2026,5,'tactical',29118906,'caja_informal'),(2026,6,'tactical',40149684,'caja_informal')
on conflict (anio, mes, canal, fuente) do nothing;

insert into public.historico_financiero_mensual (anio, mes, canal, ingresos, gastos_admin, utilidad_neta, fuente) values
(2025,8,'personalizado',5578300,9179635,-3601335,'caja_informal'),
(2025,9,'personalizado',7065800,20979129,-13913329,'caja_informal'),
(2025,10,'personalizado',13318000,14863922,-1545922,'caja_informal'),
(2025,11,'personalizado',5345650,7622507,-2276857,'caja_informal'),
(2025,12,'personalizado',23031390,20183503,2847887,'caja_informal'),
(2026,1,'personalizado',7211800,13583388,-6371588,'caja_informal'),
(2026,2,'personalizado',4978400,11803172,-6824772,'caja_informal'),
(2026,3,'personalizado',8578900,16625703,-8046803,'caja_informal'),
(2026,4,'personalizado',3648999,7537321,-3888322,'caja_informal'),
(2026,5,'personalizado',5138198,18151935,-13013737,'caja_informal'),
(2026,6,'personalizado',4331400,10584466,-6253066,'caja_informal')
on conflict (anio, mes, canal, fuente) do nothing;

-- ============================================================================
-- 4. BALANCE GENERAL + P&G FORMAL AUDITADO 2021-2025 (Estados Financieros, solo entidad
--    "Tactical Marketing Group SAS" -- no incluye el canal personalizado/Norely)
-- ============================================================================
insert into public.historico_balance_anual (anio, total_activos, total_pasivos, total_patrimonio, ingresos, costo_ventas, gastos_admin, utilidad_neta) values
(2021, 98381885, 2978996, 95402889, 267076000, 132783529, 52183077, 62891246),
(2022, 144838633, 35881158, 108957475, 435531711, 224744513, 121726744, 69486699),
(2023, 241325096, 36331737, 204993359, 637359864, 289327364, 107134367, 193993359),
(2024, 103073630, 10842964, 92230666, 481677328, 273952508, 125228014, 61906135),
(2025, 161566243, 25922796, 135643447, 589773836, 263510143, 197317483, 90944409)
on conflict (anio) do nothing;

-- Verificar que quedó bien:
--   select * from historico_financiero_anual order by anio, canal;
--   select * from historico_balance_anual order by anio;
