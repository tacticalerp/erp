# ÍNDICE MAESTRO — ERP Tactical Marketing
## Catálogo consolidado de todo lo ya decidido/discutido en los 9 documentos fuente

**Fecha de esta consolidación:** 2026-07-15
**Propósito:** evitar reprocesos. Antes de trabajar cualquier tema (nueva línea de producto, módulo, o pantalla), revisar este índice primero — ya se hizo el trabajo de rastrear los 9 documentos originales una vez.

**⚠️ Esto es un catálogo de referencia, NO autorización para construir nada.** Seguimos con el método acordado: una línea de producto a la vez, validada contra casos reales antes de programar (ver [[feedback_erp_modular_method]]). La línea Editorial/Cuadernos ya está resuelta en detalle en `solicitud_claude_code_motor_cotizacion_cuadernos.md` — este índice no la repite salvo para señalar conflictos.

**Fuentes y confiabilidad:**
- **[Docs]** = 9 documentos Word/PDF estructurados (Dossier Maestro, Dossier Técnico V3, Especificación V8/V4/V7, Blueprint Reprocesos, Dossier Arquitectura V8, 2 PROMP) — más confiables, son especificaciones "limpias".
- **[ERPMIS]** = transcripción completa de un chat de brainstorming con Gemini (281KB) — **el propio chat termina admitiendo que nunca tuvo acceso real a los archivos que el usuario adjuntó** (líneas finales del documento). Tratar como borrador/lluvia de ideas a validar, no como dato verificado. Menor confiabilidad.
- **[Cotizador4]** = transcripción de otro chat con Gemini (109KB), específicamente una auditoría de consolidación de versiones V3→V4→V7→V8. Se autocorrige varias veces dentro del propio chat (ej. Rete IVA, precios de plastificado, escudo VIP) — la versión FINAL mencionada en cada tema es la más confiable de esta fuente. Se corta antes de llegar a Carpetas/Bolsas/Cajas/Gran Formato.

Cuando las 3 fuentes coinciden, el dato se da como sólido. Cuando difieren, se listan las versiones marcadas como discrepancia — **son decisiones pendientes de Conde**, no las resolví yo.

---

## 1. Motor Financiero General

- **Divisor de precio de venta:** Precio Venta = Costo Total Fabricación / (1 − (%Utilidad + %Comisión)). Default: **41% utilidad + 3% comisión = divisor 0.56**. [Docs, Cotizador4 — coinciden]
- **Límites de edición (perfil Experto):** Utilidad 30%–65%, Comisión 1%–6%. [Docs]
- **Punto de Equilibrio Planta:** **$74.737.302 COP/mes** (margen neto promedio 22.84%). [Docs, ERPMIS — coinciden]
- **Gastos Fijos Mensuales: $17.070.000 COP** — desglose completo: Arriendo $2.350.000, Luz $300.000, Agua $80.000, Celulares $100.000, Internet $90.000, Google Workspace $250.000, Contadora $400.000, Seguridad $380.000, Seguro Camioneta $270.000, Gerencia $4.000.000, Comercial/Ventas $3.000.000, MOD 3 operarios × $1.950.000 = $5.850.000. [Docs]
- **Capacidad operativa:** 3 operarios × 42h/semana = **30.240 minutos útiles/mes**.
- **MOD:** $125 COP/min. **Costo Estructural Taller:** $564.48 COP/min ($17.070.000 / 30.240). [Docs, ERPMIS — coinciden]
- **Fondo de Seguridad de Producción:** 9% (≤$500k), 7% (≤$1M), 5% (≤$3M), 3% (>$3M) sobre costo directo. Agendas con Lomo: 2.5% preferencial en el tramo superior a $3M. [Docs]
- **Escudo de Bajos Montos:** OT < $150.000 → elimina prueba de preprensa (-$25.000) y diseño baja de $40.000 a $20.000. Si el usuario digita un valor manual de diseño, este reajuste automático queda anulado. [Docs]
- **IVA:** 19% sobre el precio de venta. [las 3 fuentes coinciden]

### ⚠️ Discrepancias sin resolver
1. **Comisión del vendedor: 3%** (mayoría, incl. Cotizador4) **vs 2%** (`PROMP PUNTO EQUILIBRIO`, un solo documento).
2. **GMF/4x1000:** aparece en `PROMP PUNTO EQUILIBRIO` (0.4% provisionado) pero NO aparece en ninguna otra fuente — podría ser un detalle descartado en versiones posteriores.
3. **ReteIVA en el PDF cliente:** **[Cotizador4] confirma que esto se declaró un ERROR y se eliminó** ("solo aplica a Agentes Retenedores", queda prohibido mostrarlo) — coincide con `Especificación V8`/`V4` [Docs]. `Especificación V7` [Docs] es la única fuente que todavía pide restar ReteIVA 15% — **es una versión superada**, se recomienda descartarla.
4. **Vigencia del presupuesto: 30 días** (mayoría, incl. Cotizador4) **vs 8 días** (`dossier.txt` y ERPMIS coinciden en 8 días). Dato real y potencialmente importante — dos fuentes independientes dicen 8 días.
5. **Condiciones de pago:** "50% anticipo + 50% contraentrega" (`dossier.txt`, ERPMIS) vs "50%/50% con plazo de compra 30 días y penalización 15%, o cartera a 30 días con crédito" (`Especificación V7`).
6. **Mermas de impresión:** escala progresiva +100/+130/+160 (offset) y +18/+20/+10 (digital), confirmada por 3 fuentes independientes como la vigente, **vs** la regla simplificada de `Especificación V7` (+25 digital / +130 offset según umbral único de 200u) — V7 parece ser una versión temprana superada.
7. **Rango de margen editable:** 30%-65% (Docs) vs "15%-35% para el rol Comercial luego generalizado a 30%-60%" (ERPMIS, con su propia nota de que esto cambió dentro del chat).

---

## 2. Editorial y Cuadernos

**Ya resuelto en detalle** — ver `solicitud_claude_code_motor_cotizacion_cuadernos.md` (modelo completo, 4 líneas de producto, fórmulas de armado/impresión, 10 casos de prueba validados contra Litoplan). No se repite aquí.

**Único hallazgo nuevo de esta ronda:** ninguna de las 2 transcripciones de chat menciona la palabra "Estampado" como acabado de carátula — el acordeón de Acabados que se guardó en `Dossier Arq. V8` [Docs] solo tiene 3 casillas: Plastificado, UV Parcial, Troquelado. Pendiente confirmar con Conde si Estampado se agrega como 4ª opción.

---

## 3. Rompecabezas (ROMB / ROMC)

**Tabla de troqueles — [Docs] es la versión más completa y consistente** (17 referencias con ID, fichas, tamaño de troquel, precio de despiece y bolsa):

| ID | Fichas | Troquel (cm) | Despiece | Bolsa |
|---|---|---|---|---|
| ROMB-001 | 6 | 10x10 | $100 | $100 (admite marco +3cm) |
| ROMB-002 | 6 | 18.3x11.7 | $100 | $100 |
| ROMB-003 | 12 | 18x14 | $100 | $100 |
| ROMB-004 | 12 | 20.5x16.5 | $100 | $100 |
| ROMB-005 | 12 | 27x23 | $100 | $100 |
| ROMB-006 | 21 | 20x10 | $300 | $100 |
| ROMB-007 | 24 | 17x11 | $300 | $100 |
| ROMB-008* | 24 | 19x13 | $300 | $100 (marco de fábrica) |
| ROMB-009 | 30 | 21.5x17 | $300 | $150 |
| ROMB-010 | 30 | 28x20 | $300 | $150 |
| ROMB-011 | 30 | 30x22 | $300 | $150 |
| ROMB-012 | 48 | 21.5x28 | $300 | $150 |
| ROMC-001 | 70 | 49x33.5 | $200 | $150 |
| ROMC-002 | 208 | 43x29.5 | $500 | $200 |
| ROMC-003 | 252 | 48x33.5 | $700 | $200 |
| ROMC-004 | 416 | 59x43 | $800 | $200 |
| ROMC-005 | 500 | 48x34 | $950 | $250 |
| ROMC-006 | 504 | 68x48.3 | $950 | $250 |
| ROMC-007 | 1000 | 68x48 | $1.500 | $250 |

- **Regla Oro:** merma +20% por registro (×1.20). Plastificado y colaminado **obligatorios**, sin opción de desactivar. [Docs, Cotizador4 — coinciden]
- **Mínimo de venta: 50 unidades.** [Docs, Cotizador4 — coinciden]
- **Marco perimetral (solo línea Micro):** Sin marco = Troquel+2cm; Con marco = Troquel+3cm + Base para Marco en Cartón C14 sin impresión (Troquel+2cm, merma 2%). [ERPMIS — único que lo detalla, tratar como borrador]

### ⚠️ Discrepancias sin resolver
1. **Troquelado industrial:** "$60.000 mínimo o $80.000/millar" ([Docs] `dossier.txt`, y ERPMIS confirma que esto fue una CORRECCIÓN explícita del usuario reemplazando un $35.000/millar anterior) — parece ser el dato vigente. Cotizador4 no lo detalla (se corta antes).
2. **Desgaste de matriz/cuchilla para troquel existente:** $30k-$60k (Grupo 1, ROMB) / $120k-$200k (Grupo 2, ROMC) — aparece en Docs y en ambas transcripciones, pero ERPMIS advierte que "solo aparece una vez, no se repite después" (posible dato descartado). Cotizador4 sí lo confirma como vigente y como parte del sistema general de troqueles (ver sección 6).
3. **Costo de ayudante/acompañamiento (línea Macro ≥70 fichas):** "$20.000 por cada 100 rompecabezas" — confirmado como corrección explícita del usuario en ERPMIS, coincide con `dossier.txt` [Docs].
4. **Bolsa de empaque por rango de fichas superior (500+):** dato faltante/vacío en la tabla original según ERPMIS — revisar si `dossier.txt` [Docs] lo tiene completo (sí: $250 para 500-1000 fichas, ver tabla arriba) — **usar la tabla de Docs como la completa**.
5. Cotizador4 trae una tabla de troqueles CON CÓDIGOS DISTINTOS (CÓD_R01-R10, solo 10 referencias, medidas de ficha distintas a las de `dossier.txt`) — probablemente una versión de trabajo anterior/paralela que fue reemplazada por la tabla ROMB/ROMC de 19 referencias. **Se recomienda usar la tabla de Docs (19 refs) como la vigente.**

---

## 4. Carpetas Corporativas (CARP)

**Fuente principal: [Docs].** Ni ERPMIS ni Cotizador4 llegan a detallar esta línea (Cotizador4 se corta justo antes).

- Restringido a papeles **≥240g**. Pinza obligatoria: +1cm al alto de planta.
- Pegue: 1 Bolsillo $150.000/millar, 2 Bolsillos $250.000/millar. **Mínimo protegido $30.000.**
- Tabla de 11 troqueles (CARP-001 a CARP-011) con dimensiones — ver `dossier.txt` sección 5.2, ya transcrita en la primera ronda de este proyecto.
- Tintas (solo ERPMIS, tratar como borrador): 1 Color Fondo $90.000/medio pliego; 4x4 Policromía $100.000/pasada medio pliego. Plastificado opcional (a diferencia de Rompecabezas) — si se omite, se etiqueta "Carpeta Ecológica".

---

## 5. Bolsas de Papel (BOLS)

**Fuente principal: [Docs]**, con detalle operativo adicional de ERPMIS (tratar como borrador).

- **Regla "Bolsa por 2":** multiplica Q×2. Diseño asimétrico → 2 montajes, duplica planchas CtP. Suma obligatoria: Base Cartulina Maule C.16 ($400), Cordón ($700), Pegue ($900-$1.000).
- Tabla de 16 troqueles (BOLS-001 a BOLS-016) con dimensiones — ver `dossier.txt` sección 5.3.
- **Detalle de fórmulas (ERPMIS, borrador):** Si Bolsa x2 = Sí → Pliegos=Q×2+mermas, Millares=(Q×2)/1000, Armado=Q×$1.000. Si No → Pliegos=Q+mermas, Armado=Q×$900. Mismo diseño en ambas caras = 1 cobro de impresión; diseños distintos = cobro duplicado + duplica planchas CtP.
- Categorías reservadas sin tabla poblada: **BLSL** (Bolsillos, separado de BOLS para evitar IDs duplicados — corrección confirmada en Cotizador4) y **SOBR** (Sobres).

---

## 6. Cajas Blandas (CJB1)

**Fuente principal: [Docs]**, detalle operativo adicional de ERPMIS (borrador).

- Multicavidad en pliegos, pegue $200. Troquelado $35.000 mínimo o fracción.
- Tabla de 21 troqueles (CJB1-001 a CJB1-021) — ver `dossier.txt` sección 5.4.
- Categorías reservadas sin datos: **CJB2** (Cajas Blandas 2 piezas), **CJD1**/**CJD2** (Cajas Duras 1 y 2 piezas).
- Detalle de fórmulas (ERPMIS, borrador): modo estándar Pliegos=ceil(Q/Ct)+mermas; modo optimizado (bajas cantidades, 1 cavidad) Pliegos=Q+mermas pero el troquelado sigue procesando el pliego completo. Tintas 4x0 estándar, 4x1 especial (+1 plancha CtP).

---

## 7. Gran Formato, Acabados y Marcación

**Fuente principal: [Docs]**, complementado por Cotizador4 en Laminado y DTF.

- **Plastificado térmico:** ⚠️ **$950/m²** (`dossier.txt`) vs **$900/m²** (`Dossier V3`/`Especificación V8`, ítem ACAB_005, y Cotizador4 confirma $900/m² con piso $30.000 — corregido desde $20.000 tras petición explícita del usuario). **La versión más reciente/corregida parece ser $900/m², piso $30.000.**
- **Brillo UV Parcial:** $1.950/m². Arrastra el plastificado mate de base — no se cobran los dos por separado. Mínimo combinado **$80.000**. [3 fuentes coinciden]
- **Laminado en frío (ACAB_004):** $14.000/m², exclusivo Gran Formato/Plotter (protege tintas solventes/UV en banners y vinilos). [Cotizador4]
- **Terminados tradicionales** [Docs]: Hot Stamping/Foil $350/golpe + arranque $80.000 (mínimo $80.000); Numeración $9/und ($9.000 millar, baja a $7 sobre 5.000u); Perforación $30/und ($30.000 millar); Repujado/Embossing $90/und ($90.000 millar). Todos con mínimo de 1 millar.
- **Gran Formato (sustratos):** Banner 13oz $25.000/m², Vinilo Adhesivo $28.000/m², Vinilo Microperforado $38.000/m², DTF $164.000/m² (mínimo $20.000), UV Vinilo+Tinta Blanca $55.000/m² (mínimo 1m²). Ojales $1.000/und.
- **Marcación Merchandising** [Docs]: Screen/Serigrafía (Matriz $120.000 + $1.500/tiro corto o $600/millar), Tampografía (Matriz $130.000 + $1.000/tiro o $420/millar), Láser Fibra (Matriz $90.000 + $3.200/tiro o $1.500/millar), Sublimación Mugs/Termos (sin matriz, $5.000/tiro o $3.000/millar).
- **Marcación DTF (mano de obra de termofijado, separado del costo del film):** 3 niveles confirmados en Cotizador4 (versión final, reemplaza un ejemplo anterior con Matriz $35.000+$1.200/unidad que quedó descartado): **Baja $50/und** (superficies planas), **Media $100/und** (libretas/carpetas/curvas leves), **Alta $150/und** (textiles/superficies irregulares). Auto-enrutamiento: <50 unidades de bolígrafos → cancela Tampografía, fuerza DTF.
- **Cubo Rubik Premium** [Docs]: Insumo $3.200/und (merma 2%). Marcación por caras: 1c=$200 … 6c=$1.000. Brillo UV por tramo: 1-200u=$50.000, 201-1.000u=$100.000, 1.001-2.000u=$150.000, +$50.000 por cada 1.000 adicional desde 2.001u. Ruta digital (<200u) vs litográfica (≥200u) con parámetros propios de pliego/plancha/millar.
- **Corte/Grabado Láser CO2:** MDF 3mm $800/min, MDF 5.5mm $1.100/min, Acrílico 2-3mm $950/min, Acrílico 5mm $1.500/min, Grabado madera/acrílico $1.100/min. [Docs, confirmado también en Blueprint Reprocesos]
- **Servicios de instalación en campo:** vinilo pared/vidrio $18.000/m² (mín. $72.000); instalación en altura >2.5m $26.000/m² (mín. $100.000); desinstalación/limpieza $9.000/m².
- **Poliestireno C40:** lámina 2.00x1.00m, $50.000/lámina, **sin el descuento general del -10%**, merma base 5%.

---

## 8. Sistema de Troqueles (Banco de Troqueles)

**Las 3 fuentes coinciden en la arquitectura final** (Cotizador4 documenta explícitamente la evolución de 3 versiones hasta llegar a esta):

- **Nomenclatura por prefijo:** CJB1/CJB2 (Cajas Blandas), CJD1/CJD2 (Cajas Duras), ROMB/ROMC (Rompecabezas), BOLS (Bolsas), BLSL (Bolsillos), SOBR (Sobres), CARP (Carpetas), GRAF (Grafas), STCK (Sticker Figuras), VARI (Varios). El mismo ID va rotulado físicamente en la madera del troquel.
- **Dos cobros SEPARADOS** (Cotizador4 aclara que mezclarlos fue un error corregido):
  1. **Servicio de Troquelado (la máquina):** $35.000 por millar o fracción — se cobra siempre, sin importar si el troquel es nuevo o existente. (Rompecabezas tiene su propia tarifa distinta de $60.000/$80.000, ver sección 3).
  2. **Uso del Troquel (la matriz física):**
     - Troquel Nuevo → se cobra el 100% del costo de fabricación del molde.
     - Troquel Existente (del banco) → "Préstamo y Desgaste de Cuchilla" según complejidad: **Baja $30.000 / Media $60.000 / Alta $120.000 / Especial $200.000**.
- **Fuente viva de datos:** Google Sheets **"Base_Master_Troqueles"**, columnas: ID_Troquel, Categoría, Nombre Comercial, Medida Abierta Ancho/Alto, Profundidad, Desgaste Cuchilla (COP), Fichas/Detalles. Se sincroniza con el ERP (lectura nocturna + botón manual, según Cotizador4).
- **Flujo de UI (Cotizador4):** el vendedor elige "Usar Troquel de la Casa" (costo $0 de matriz, solo paga servicio de troquelado) vs "Crear Troquel Nuevo" (paga molde completo). El sistema muestra un desplegable solo con las medidas ya existentes en Tactical.
- **Planchas CtP (impresión, no troquel):** $35.000 por tinta/plancha física. Vida útil 25.000 impresiones (al superarla, se duplican los juegos). Trabajo repetitivo (mismo cliente/diseño, planchas archivadas): cobra solo 30% del valor en vez de $0.

---

## 9. Interfaz Visual / UI-UX General

**Modelo confirmado por las 3 fuentes de forma consistente: Secciones Desplegables (Acordeón)** para toda pantalla de cotización, en cualquier línea de producto — no es exclusivo de Cuadernos.

- **Hub Central (Pantalla 0):** tarjetas por módulo. [Docs] confirma 6 módulos (Cotizador/CRM, Producción-Kanban, Contabilidad, Inventarios, Tareas Diarias, Informes-Reprocesos). ⚠️ Cotizador4 documenta una estructura de **4 módulos** en la barra lateral (Solicitador de Cotizaciones, Banco de Datos Maestros, Control de Reprocesos, Tablero de Ventas) — posiblemente una etapa intermedia. **Usar el modelo de 6 módulos de Docs como el vigente**, ya que es el que se usa consistentemente en el resto del proyecto (memoria del proyecto también lo confirma).
- **Flujo del Cotizador:** Pantalla 1 (Selección Macro: Editorial, Publicomerciales, Rompecabezas, Promocionales, Empaques, Gran Formato — `Especificación V7` [Docs] agrega una 7ª opción "Especiales" para proyectos a medida con costo manual, no confirmada en las demás fuentes) → Pantalla 2 (sub-producto) → Pantalla 3 (Acordeones de parámetros técnicos).
- **Corrección explícita del usuario (ERPMIS):** "Cuadernos" debe ir primero en la lista (es el producto más vendido).
- **Estructura de acordeón por secciones (confirmada, ejemplo Editorial ya resuelto, patrón repetible para cualquier línea):**
  - ESPECIFICACIONES GENERALES (abierto por defecto)
  - SECCIÓN 1: CARÁTULA/TAPA — tintas, guardas, Acabados de selección múltiple (Plastificado / UV Parcial / Troquelado)
  - SECCIÓN 2: TACO/INTERIOR — papel, tintas
  - SECCIÓN 3: INSERTOS — sí/no, cantidad, papel
  - SECCIÓN 4: ADICIONALES/OTROS — descripción libre + valor manual en COP (se suma directo a insumos antes de la fórmula final)
  - Para Rompecabezas/Carpetas/Bolsas/Cajas: patrón análogo con SECCIÓN "GEOMETRÍA Y TROQUELADO" (Usar Troquel de la Casa / Crear Nuevo) en vez de Carátula/Taco.
- **Escalas de Cantidad (Quantity Breaks):** botón [+ Añadir Escala] para cotizar 2-3 cantidades en paralelo (ej. 100/200/500) en una sola pasada; el PDF genera tabla comparativa con % de ahorro.
- **Botones estándar de cierre:** [+ Cotizar Otro Producto] (mantiene memoria del cliente/ID) + [Continuar y Generar PDF].
- **Perfiles de usuario:** ⚠️ el prompt original pedía 3 roles (básico/comercial/experto); las especificaciones posteriores consolidaron a **2 perfiles: Comercial (cotización rápida, campos técnicos ocultos) y Editor/Experto (control total, acabados acumulables, puede forzar costos backend)**. Confirmar con Conde si el rol "básico" se descarta definitivamente.
- **PDF Cliente:** oculta jerga técnica/mermas/CtP/comisión; IVA 19% desglosado; enlace a video YouTube; 3 "insignias de valor técnico" autogeneradas; botón WhatsApp con mensaje preconfigurado de aprobación + anticipo 50%.
- **Orden de Trabajo (vista taller):** sin info financiera; segrega Carátula/Taco/Insertos; alertas críticas en rojo (ej. sustrato 300g exige plastificado obligatorio).
- **Motor de Alertas de Eco-Eficiencia (no bloqueante):** sugiere optimización de tamaño de papel si el ahorro simulado supera 5%, o bajar gramaje para saltar a ruta digital — con botones [Aplicar Optimización] / [Mantener Configuración del Cliente].
- **Arquitectura técnica sugerida (Cotizador4, decisión tomada por la IA, no validada por un desarrollador humano — revisar antes de tomarla como definitiva):** PWA (sin apps nativas), backend en la nube (AWS/GCP), frontend Tailwind CSS adaptativo, modo offline con caché de catálogo.
- **Persistencia:** guardado automático en Local Storage del navegador (ERPMIS) para no perder la captura si se interrumpe la conexión.

---

## 10. CRM

- **Nomenclatura:** `COT-AÑO-MES-CONSECUTIVO`, reinicio único el 1 de enero. [3 fuentes coinciden]
- **Estados del pipeline (versión final confirmada por Cotizador4 explícitamente descartando la alternativa):** **Borrador → Enviada → En Seguimiento → Ganada → Perdida.** El término "Aprobada" (usado en `Especificación V7`) queda **obsoleto**.
- **Detalle de cada estado:** Enviada = bloqueo de edición + clon versionado (V2, V3...) + inicia cronómetro; En Seguimiento = alerta si 3 días hábiles sin notas; Ganada = congela costo + calcula comisión + dispara OT a taller; Perdida = requiere motivo obligatorio (Precio/Tiempos/Competencia/Archivo Dañado).
- **Escudo VIP — VERSIÓN FINAL (confirmada por Cotizador4, que documenta 3 iteraciones hasta llegar a esta):**
  - Volumen financiero alto (Top 20% facturación mensual) = **7 puntos** → VIP automático.
  - Frecuencia alta (>3 órdenes "Ganada"/mes) = **3 puntos**.
  - Recurrencia media (2 órdenes "Ganada"/mes) = **1 punto**.
  - **VIP si puntaje total ≥ 7.** Evaluación nocturna sobre últimos 30 días.
  - Alerta roja gerencial si un VIP lleva >30 días sin comprar.
  - (Se descartan las versiones anteriores: solo top-20%-dinero de `dossier.txt`, solo frecuencia de `Especificación V7`, y un modelo híbrido intermedio con distinto puntaje).
- Verificación de cliente por NIT/Cédula al cotizar; si no existe, crea "Prospecto - Cotización Emitida" (ERPMIS).

---

## 11. Producción / Kanban

- **6 columnas** [Docs]: Cotización Aprobada → Diseño → Preparación Producción → Terminados y Revisión → Para Entregar → Postventa.
- El estado "Ganada" del CRM dispara automáticamente la creación de la OT técnica. [Docs, Especificación V8]
- **Creación directa de OT sin cotización previa** (pedido explícito del usuario en `PROMP ERP`, y confirmado como patrón transversal por el "Modo B: Servicio Express" del Módulo de Reprocesos): botón tipo "Crear Trabajo Directo" para maquila externa (Corte Láser, DTF) sin pasar por el cotizador estructural.
- Regla logística de peso (ver sección 14) se aplica en la columna "Para Entregar".

---

## 12. Contabilidad y Finanzas

- **Alcance congelado para el MVP Fase 1** (`PROMP PUNTO EQUILIBRIO`, [Docs]): 1) Cotizador, 2) PDF Comercial con Quantity Breaks, 3) Grilla Contable CxC/CxP tipo matriz editable (reemplazo de Excel). **CRM y Kanban quedan explícitamente FUERA de esta primera entrega** — dato importante de planeación/orden de fases.
- Estructura de Gastos Fijos y Punto de Equilibrio — ver sección 1.
- **Semáforo de Cotizaciones (KPI dinámico):** en pedidos masivos calcula dilución del costo estructural; en pedidos micro advierte si el tiempo de alistamiento absorbe la utilidad.
- **Requerimientos originales sin desarrollo posterior encontrado** (`PROMP ERP`): calendario de pago de impuestos, promedio de pago de IVA por periodo — mencionados solo en el prompt inicial, ningún otro documento los retoma en detalle.
- Informe ejecutivo automático (ERPMIS, borrador): lunes 7:00am + primer día del mes, PDF a Gerencia con cumplimiento de Punto de Equilibrio + análisis de pérdidas + indicador "Escape de Errores".

---

## 13. Inventarios / Datos Maestros

- **Buscador global** de papeles, maderas y sustratos (Hub Central). [Docs]
- **Módulo 2 — Banco de Datos Maestros e Insumos** con 4 sub-secciones (Cotizador4): A) Inventario de Troqueles Fabricados (con contador de usos en OT para planificar reafilado), B) Catálogo de Papeles y Precios Base, C) Matriz de Pesos y Parámetros Logísticos, D) Conector con `Base_Master_Troqueles` (Google Sheets).
- **Descuento general ERP: -10%** sobre precio de lista, EXCEPCIONES: Cartón Industrial 1.5mm (⚠️ posible discrepancia entre "precio fijo $3.500 sin descuento" y "tabla de precios por escalas" — ya se investigó para Cuadernos, ver ese archivo), Poliestireno C40 (fijo $50.000).
- **Cubicaje Dinámico:** evalúa 60x90cm y 70x100cm, elige el de mayor rendimiento por OT. [3 fuentes coinciden]
- Directriz de siguiente fase (`Especificación V7`): cargar tablas CSV reales, conectar con Google BigQuery o Sheets corporativo.

---

## 14. Tareas Diarias

- **4 pestañas por área:** Comercial, Diseño, Producción, Gerencia. [3 fuentes coinciden]
- **Regla de Rollover:** tareas no marcadas "Listo"/"Finalizado" se clonan automáticamente a las **11:59 PM** del día siguiente, con etiqueta de retraso (escalando el texto de la etiqueta si se arrastra varios días, según ERPMIS). Sin discrepancias entre fuentes.

---

## 15. Informes y Reprocesos

- **`Blueprint Reprocesos`** [Docs] es la fuente dedicada más completa — modelo de datos maestro-detalle:
  - `reprocesos_maestro`: id, id_master_ot (opcional), etapa_origen, etapa_detección (incluye "Cliente" → mide "Escape de Errores"), responsable, tiempo_perdido_min, evitable (bool), observaciones_lecciones (texto libre).
  - `reprocesos_insumos`: id, id_reproceso (FK), id_insumo, cantidad_perdida.
  - **Costo del error:** (Cantidad Perdida × Costo Insumo) + (Tiempo Perdido × Tarifa Minuto del Cargo). Se contrasta contra el Fondo de Seguridad (3%-9%) de la OT original — alerta si las pérdidas superan el fondo.
  - **Menú de "Servicios Express"** (5 familias, con espacio reservado para 4 más): Rompecabezas, Editorial y Cuadernos, Maquila Láser CO2, Marcación Express/Merchandising, Papelería y Gran Formato Express.
  - **Módulo de Inteligencia Preventiva:** las `observaciones_lecciones` alimentan un histórico que retroalimenta un escudo de validación en cotizaciones futuras. Ejemplo real citado: *"No usar cuerina de calibre 20 para cuadernos porque es muy gruesa y se suelta el pegante en armado."*
- **UI dual de captura** (Blueprint): Modo A "Pedido con OT" (precarga receta de materiales) vs Modo B "Servicio Express" (bypass de OT, por familia pre-costeada).
- **Informes de BI (Cotizador4, capa BigQuery, CRON nocturno):** Efectividad/Embudo (conversión por semana), Movimiento de Inventario, Desempeño Comercial (utilidad neta + comisión por asesor).

---

## 16. Logística y Fletes

- **Cubicaje de despacho (Cuadernos):** cajas $3.000/und — Media Carta 35u(anillado)/40u(escolar), Agenda 30u/33u, Carta 20u/26u. [3 fuentes coinciden]
- **Ruta 1 (Papelería):** Peso = Gramaje × Tamaño × Cantidad. ≤20kg → Moto $15.000 (**exenta del piso mínimo transversal**, aclarado explícitamente en 2 fuentes). >20kg → Vehículo $45.000. ⚠️ Alcance de esta ruta: "Papelería/Bolsas/Carpetas" (`dossier.txt`) vs solo "Papelería Comercial" (`Especificación V8`) — no queda claro si Bolsas/Carpetas usan Ruta 1 o Ruta 3.
- **Ruta 2 (Cubos Rubik, por volumen):** 1-400u=$40.000, 401-1.000u=$90.000, 1.001-2.000u=$120.000, +$40.000 por cada 1.000 adicional desde 2.001u.
- **Ruta 3 (Cuadernos/Agendas pesadas):** porcentual sobre subtotal — 4% ($500k-$3M), 3% ($3M-$5M), 2% (>$5M). Agendas con Lomo: -0.5% en el primer tramo (3.5%). Piso mínimo transversal **$45.000**.
- ⚠️ Cotizador4 en un punto posterior del chat simplifica la Ruta 3 a la misma regla de "≤20kg Moto $15.000 / >20kg Vehículo $45.000" sin mencionar el cálculo porcentual — no queda claro si es una simplificación descriptiva o un reemplazo real de la regla porcentual. **Confirmar con Conde.**

---

## 17. Otros hallazgos / notas de proceso

- **Requerimientos del prompt original (`PROMP ERP`)** aún sin desarrollo posterior confirmado: calendario de pago de impuestos, informes automáticos semanales/mensuales al correo — quedaron mencionados solo en la génesis del proyecto.
- **Matriz de "Placeholders" para expansión futura** (`Especificación V8`/`V4`) cataloga a Rompecabezas, Carpetas, Bolsas y Cajas como líneas "pendientes de expansión" — pero `dossier.txt` y `Dossier Arq. V8` YA tienen tablas de troqueles y precios bastante desarrolladas para estas mismas líneas. Esto sugiere que la tabla de placeholders es de una versión temprana superada por el trabajo de detalle posterior. **No tratar esas líneas como "sin datos" — sí los tienen, ver secciones 3-6 de este índice.**
- **Nota de arquitectura de las transcripciones de chat (auto-reconocida por ambos chats):** los intentos de construir "un solo prototipo con todo el ERP junto" colapsaron por complejidad — coincide exactamente con el diagnóstico que ya hizo Conde al iniciar este proyecto con Claude Code (ver `[[feedback_erp_modular_method]]`). Ambos chats terminan recomendando descomponer por sub-cotizadores independientes, el mismo método que ya estamos siguiendo.
- **ERPMIS reconoce explícitamente** (líneas finales del documento) que nunca tuvo acceso real a los archivos/imágenes que el usuario adjuntó originalmente — toda mención de "guardado en Google Drive" dentro de ese chat fue simulada, no una acción real. Por eso esa fuente se trata como borrador de menor confianza en todo este índice.

---

## Resumen — Discrepancias pendientes de decisión (consolidado)

Cuando lleguemos a construir cada una de estas partes, preguntarle a Conde directamente en vez de asumir:

1. Comisión del vendedor: ¿3% o 2%?
2. ¿Existe recargo de GMF/4x1000, o se descartó?
3. Vigencia del presupuesto: ¿30 días o 8 días?
4. Condiciones de pago exactas (contraentrega vs plazo 30 días con penalización).
5. Plastificado térmico general: ¿$950/m² o $900/m² (parece ser $900 la versión corregida)?
6. Alcance de la Ruta 1 de fletes: ¿incluye Bolsas y Carpetas o solo Papelería Comercial?
7. Ruta 3 de fletes para Cuadernos/Agendas: ¿sigue siendo porcentual (4%/3%/2%) o se simplificó a Moto/Vehículo fijo?
8. Rol "básico" del CRM/cotizador: ¿se descarta definitivamente (quedando solo Comercial/Editor)?
9. Hub Central: ¿6 módulos (versión que se ha usado todo el proyecto) confirmado como definitivo?
10. ~~Acabado "Estampado" en el acordeón de Carátula~~ — **RESUELTO (2026-07-15):** se agrega Estampado + una opción "Otros" de costeo libre por unidad. Acordeón de Acabados queda: Plastificado / UV Parcial / Troquelado / Estampado / Otros.
11. "5 papeles más recientes" (mencionado por Conde en el chat, no encontrado en ningún documento): ¿se agrega como requisito nuevo?
12. **Precios de impresión digital (clic) sin verificar:** solo existen en `dossier.txt`, ningún otro documento los corrobora; la transcripción ERPMIS incluso admite que le faltaban esos precios. Pendiente pedirle a Conde la tabla real de precios por máquina Konica.

---

*Este índice se debe actualizar cada vez que se resuelva una discrepancia o se cierre una nueva línea de producto, igual que se hizo con `solicitud_claude_code_motor_cotizacion_cuadernos.md` para Cuadernos.*
