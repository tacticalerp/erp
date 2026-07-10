# SOLICITUD DE PROYECTO — Motor de Cotización Tactical Marketing
## Fase 1: SOLO línea Editorial/Cuadernos (no construir nada más todavía)

## CONTEXTO

Voy a construir un ERP con 6 módulos (Cotizador/CRM, Producción Kanban, Contabilidad, Inventarios, Tareas, Informes) para mi empresa de fabricación y artes gráficas Tactical Marketing Group SAS (Bogotá, Colombia). Ya intenté construir el sistema completo de una vez con otras herramientas de IA y me bloqueé varias veces por la cantidad de reglas interdependientes.

**Regla de trabajo obligatoria para este proyecto:** No quiero que empieces por la interfaz visual ni por el proyecto completo. Quiero que trabajemos una sola pieza a la vez: primero SOLO la función de cálculo (backend/lógica pura, sin UI, sin base de datos, sin login) de UNA línea de producto. Cuando esa función esté probada y validada al 100% contra casos reales, pasamos a la siguiente pieza. No avances a la siguiente pieza sin que yo lo confirme explícitamente.

## OBJETIVO DE ESTA FASE 1

Construir y validar la función de cálculo de cotización para la línea Editorial y Cuadernos (cuadernos escolares, agendas, libretas micro), incluyendo el motor financiero general que aplica a toda cotización.

NO construir todavía: interfaz de usuario, base de datos, CRM, Kanban, Contabilidad, Inventarios, Tareas, Informes, ni las demás líneas de producto (Carpetas, Bolsas, Cajas, Rompecabezas, Gran Formato). Eso viene en fases posteriores, una por una.

## PASO 0 — Antes de escribir código

Antes de escribir cualquier línea de código, necesito que:

1. Leas y confirmes que entendiste el diccionario de datos de abajo.
2. Me hagas las preguntas que necesites para resolver cualquier ambigüedad en las reglas (mejor preguntar ahora que corregir después).
3. Me pidas explícitamente entre 10 y 15 cotizaciones reales ya calculadas en Litoplan (mi herramienta actual) para esta línea, con su resultado final en pesos COP. Esos van a ser nuestros casos de prueba. NO avances a escribir la función de cálculo hasta que yo te entregue esos casos.
4. Con esos casos, arma una tabla de "casos de prueba" (input → resultado esperado) antes de programar nada.

## PASO 1 — Construir la función de cálculo

Cuando tengamos los casos de prueba, construye una función pura (input: parámetros del pedido → output: precio final desglosado) que reciba estos parámetros como mínimo:

- Tipo de cuaderno (Escolar / Agenda / Media Carta / Carta / Micro)
- Tipo de tapa (Dura / Semidura / Blanda)
- Tipo de taco (impreso o en blanco 0x0)
- Número de páginas del taco
- Tipo de encuadernación (Wire-O / Hotmelt lomo rústico / Grapa / Hilo / Hilo+Refuerzo)
- Cantidad de unidades (Q)
- Sustrato de tapa y de taco elegidos
- Formato de pliego (60x90 o 70x100) — o que el sistema decida el óptimo
- Vía de impresión (Digital Láser u Offset) — o que el sistema decida automáticamente según las reglas

Y que devuelva:

- Costo total de fabricación (desglosado por componente: tapa, taco, guardas, armado, mermas, planchas si aplica)
- Precio de venta final (aplicando el divisor 0.56)
- IVA desglosado (19%)
- Validación de cada resultado contra los 10-15 casos de prueba de Litoplan, mostrando la diferencia en pesos y % si no coincide exacto

No pases a construir nada visual hasta que el 100% de los casos de prueba cuadren con Litoplan.

## DICCIONARIO DE DATOS — Línea Editorial y Cuadernos

```json
{
  "motor_financiero_general": {
    "punto_equilibrio_planta_mensual_cop": 74737302,
    "mano_obra_directa_cop_por_minuto": 125,
    "costo_estructural_taller_cop_por_minuto": 564.48,
    "divisor_precio_venta": 0.56,
    "nota_divisor": "Precio de Venta = Costo Total Fabricacion / 0.56 (blinda 41% utilidad neta + 3% comision)",
    "limites_perfil_experto": {
      "utilidad_editable_min_pct": 30,
      "utilidad_editable_max_pct": 65,
      "comision_min_pct": 1,
      "comision_max_pct": 6
    },
    "fondo_seguridad_produccion_amortizacion": [
      {"hasta_cop": 500000, "pct": 9},
      {"hasta_cop": 1000000, "pct": 7},
      {"hasta_cop": 3000000, "pct": 5},
      {"superior_a_cop": 3000000, "pct": 3}
    ],
    "escudo_bajos_montos": {
      "umbral_ot_cop": 150000,
      "regla": "Si el total de la OT es menor a $150.000 COP: se elimina la prueba de pre-prensa y el costo de diseño baja de $40.000 a $20.000 fijos"
    },
    "iva_pct": 19
  },

  "descuento_general_erp": {
    "descuento_lista_a_erp_pct": 10,
    "excepciones_sin_descuento": [
      "Carton Industrial 1.5mm (Escalas): precio base fijo $3.500, no aplica -10%",
      "Poliestireno C40 lamina rigida: $50.000 fijo, sin descuento"
    ]
  },

  "cubicaje_dinamico": {
    "regla": "El motor evalua ambos formatos de pliego (60x90 cm y 70x100 cm) y selecciona automaticamente el que genere mayor rendimiento y menor costo para cada OT"
  },

  "sustratos_precio_erp_cop_por_pliego": [
    {"sustrato": "Bond Importado", "gramaje": "60 gr", "formato": "60x90", "precio_erp": 177.30},
    {"sustrato": "Bond Importado", "gramaje": "60 gr", "formato": "70x100", "precio_erp": 229.50},
    {"sustrato": "Bond Importado", "gramaje": "70 gr", "formato": "60x90", "precio_erp": 206.10},
    {"sustrato": "Bond Importado", "gramaje": "70 gr", "formato": "70x100", "precio_erp": 267.30},
    {"sustrato": "Bond Importado", "gramaje": "115 gr", "formato": "70x100", "precio_erp": 459.00},
    {"sustrato": "Propalcote", "gramaje": "150 gr", "formato": "60x90", "precio_erp": 472.50},
    {"sustrato": "Propalcote", "gramaje": "150 gr", "formato": "70x100", "precio_erp": 612.90},
    {"sustrato": "Propalcote", "gramaje": "300 gr", "formato": "60x90", "precio_erp": 910.80},
    {"sustrato": "Propalcote", "gramaje": "300 gr", "formato": "70x100", "precio_erp": 1182.60},
    {"sustrato": "Propalcote", "gramaje": "350 gr", "formato": "70x100", "precio_erp": 1381.50},
    {"sustrato": "Cartulina C16", "gramaje": "255 gr", "formato": "60x90", "precio_erp": 722.70},
    {"sustrato": "Cartulina C16", "gramaje": "255 gr", "formato": "70x100", "precio_erp": 936.90},
    {"sustrato": "Cartulina C18", "gramaje": "275 gr", "formato": "60x90", "precio_erp": 779.40},
    {"sustrato": "Cartulina C18", "gramaje": "275 gr", "formato": "70x100", "precio_erp": 1009.80},
    {"sustrato": "Cartulina C20", "gramaje": "305 gr", "formato": "60x90", "precio_erp": 864.00},
    {"sustrato": "Cartulina C20", "gramaje": "305 gr", "formato": "70x100", "precio_erp": 1120.50},
    {"sustrato": "Cartulina C22", "gramaje": "330 gr", "formato": "70x100", "precio_erp": 1212.30},
    {"sustrato": "Carton Industrial", "gramaje": "1.5 mm", "formato": "N/A", "precio_erp": 3500, "nota": "Escala base, no aplica -10%"},
    {"sustrato": "Carton Industrial", "gramaje": "2.0 mm (Tapas Duras)", "formato": "N/A", "precio_erp": 4500}
  ],

  "motor_impresion": {
    "prioridad_digital_laser": {
      "condiciones_estrictas": [
        "Formato cabe en 49x32 cm",
        "Gramaje <= 240g",
        "NO lleva fondos plenos (>70%)",
        "NO lleva tintas Pantone"
      ],
      "efecto_si_cumple": "Se suprimen 100% los costos de planchas CtP y maquina offset",
      "precios_clic_cop": {
        "carta": {"color": 750, "negro": 350},
        "octavo_25x35": {"color": 900, "negro": 450},
        "pliego_max_50x33": {"color": 1000, "negro": 550}
      },
      "mermas_hojas": {
        "policromia": 20,
        "negro": 10,
        "promedio_general": 18
      },
      "semicorte_cop_fijo": 1500,
      "descuento_volumen_pct": [
        {"rango": "1-9", "pct": 0},
        {"rango": "10-50", "pct": 10},
        {"rango": "51-200", "pct": 18},
        {"rango": "201-400", "pct": 26},
        {"rango": ">500", "pct": 30}
      ]
    },
    "ruta_offset": {
      "forzada_por": [
        "Gramajes pesados (>240g)",
        "Acabados UV/Troquel",
        "Fondos plasticos/solidos",
        "Lotes masivos (>200 unidades)"
      ],
      "costo_planchas_ctp_cop": {
        "medio_pliego": 21000,
        "cuarto": 11000,
        "octavo": 9000
      },
      "vida_util_ctp": "1 juego nuevo cada 25.000 impresiones. Trabajos repetitivos: cobran solo 30% del valor",
      "costo_millar_pasada_cop": {
        "medio_pliego_por_color": 25000,
        "medio_pliego_policromia_4x0": 100000,
        "cuarto": 16000,
        "octavo": 12000
      },
      "recargos_tintas_cop": {
        "tinta_especial_pantone": 50000,
        "tinta_cuadricula_editorial": 20000,
        "fondo_pleno_plaston": {"recargo": 90000, "nota": "obliga a 1 plancha fisica adicional"}
      },
      "mermas_offset_hojas": [
        {"rango": "0-1000", "merma": 100},
        {"rango": "1001-2000", "merma": 130},
        {"rango": ">2001", "merma": 160}
      ],
      "regla_2_o_mas_tintas": "merma x 1.30",
      "pinzas_fisicas": {"entrada_mm": 12, "salida_mm": 5}
    }
  },

  "cuadernos_submodulos": {
    "1_caratula_tapas": {
      "impresion": "4x0",
      "tapa_dura": {
        "estructura": "Carton 1.5/2.0mm + Forro Propalcote 150g",
        "mano_obra_forrado_cop": {
          "media_carta": 620,
          "agenda": 640,
          "carta": 750
        }
      },
      "tapa_semidura": {
        "regla_digital": "OBLIGATORIO usar C20",
        "regla_offset": "El comercial puede escoger C16, C18, C20 o C22"
      },
      "tapa_blanda": {
        "sustratos_permitidos": ["Propalcote 300g", "Propalcote 350g"]
      }
    },
    "2_taco_interiores": {
      "sustratos": ["Bond 60g", "Bond 70g"],
      "regla_taco_en_blanco_0x0": {
        "efecto": "Reduce la merma a la mitad y NO cobra planchas CtP ni impresiones"
      },
      "escudo_paginacion": "Redondea a multiplos de 4"
    },
    "3_guardas_e_insertos": {
      "guardas_piso_minimo_plastificado_cop": 20000,
      "insertos": "4x4 en propalcote",
      "levante_manual_cop_por_hoja_inserto_por_cuaderno": 10
    },
    "4_armado_encuadernacion": {
      "anillado_wire_o": {
        "base_80_hojas_cop": {
          "media_carta": 900,
          "agenda": 990,
          "carta": 1700
        },
        "variacion_por_hoja_fisica_cop": {"min": 5.0, "max": 10.0}
      },
      "agendas_lomo_rustico_hotmelt_cop": {
        "media_carta": 4100,
        "agenda": 4400,
        "carta": 5800,
        "limpieza_colbon_cop": 150
      },
      "escolares_cop": {
        "grapa": 250,
        "hilo": 450,
        "hilo_mas_refuerzo": 650,
        "grafado_caratula_obligatorio_cop_por_millar": 35000
      },
      "libretas_micro_menor_a_media_carta": {
        "formula_costo_micro": "Costo Base x (Area_cm2 / 294) x 1.30",
        "piso_minimo_cop_por_unidad_tapa_dura": 500
      }
    }
  }
}
```

## PASO 2 — Cuando la Fase 1 esté validada al 100%

Solo después de confirmar conmigo que todos los casos de prueba de Litoplan cuadran exacto (o con diferencia justificada y aceptada por mí), paramos y planeamos juntos la Fase 2 (siguiente línea de producto o conexión a base de datos). No avances automáticamente.

## RESUMEN DE REGLAS DE INTERACCIÓN CONMIGO

- No sé programar. Explícame en español simple qué estás haciendo en cada paso, sin asumir que entiendo jerga técnica.
- Antes de tomar una decisión de diseño no especificada aquí, pregúntame en vez de asumir.
- Trabaja en pasos pequeños y verificables. Muéstrame resultados concretos (números, comparaciones con Litoplan) en cada paso, no solo código.
- No construyas interfaz visual hasta que yo la pida explícitamente.

---

## RESPUESTAS ACORDADAS EN PASO 0 (registro de decisiones)

- **Fondo de Seguridad — base del tramo:** se decide sobre el **costo de fabricación** del pedido (no sobre el precio de venta final).
- **Vía de impresión:** se decide **independiente por cada parte** del cuaderno (la tapa puede ir offset y el taco digital, o viceversa).
- **Piso mínimo de guardas ($20.000):** aplica **por todo el pedido (OT completa)**, no por cuaderno individual.
- **Diseño y prueba de preprensa:** se incluyen **siempre** en el cálculo de cada cotización (con la reducción del escudo de bajos montos si aplica).
- **Troqueles en cuadernos:** sí aplican en algunos modelos — falta la tabla de costos/IDs de troquel para cuadernos (no está en el diccionario ni en el Dossier Maestro); se pedirá cuando aparezca en un caso real.
- **Insertos:** se incluyen ya en esta Fase 1 como parámetro opcional (número de hojas de inserto, con costo de $10 por hoja de levante manual por cuaderno).

### Corrección del modelo de parámetros — Tamaño vs. Uso (Escolar)

"Tipo de cuaderno" NO es una sola lista de 5 opciones. Son dos parámetros independientes:

1. **Tamaño físico:** Agenda (17x24 cm), Media Carta (21x14 cm), Carta (28x21.5 cm), Micro (ancho/alto variable, libre, < Media Carta).
2. **Uso — ¿Es Escolar?** (sí/no). Un cuaderno Escolar puede ser tamaño Agenda, Media Carta o Carta (Escolar NO es un tamaño en sí mismo).

Esto determina la encuadernación disponible:
- **Escolar** (cualquier tamaño Agenda/Media Carta/Carta) → 3 opciones: **Grapa / Hilo / Hilo con cinta** (nunca lleva anillado).
- **No Escolar** → **Anillo Doble O** (nombre correcto; antes referido como "Wire-O") o **Hotmelt lomo rústico**.
- **Regla de tapa:** si la encuadernación es Anillo Doble O, el cuaderno pasa automáticamente a ser **Tapa Blanda** (no puede llevar tapa dura ni semidura con anillado).

**Pendientes resueltos tras revisar 7 documentos adicionales (Dossiers V3/V7/V8, ERPMIS, Cotizador 4 Tactical):**

1. ~~Medidas físicas~~ — resuelto: Agenda 17x24, Media Carta 21x14, Carta 28x21.5, Micro variable; Escolar es clasificación de uso, no tamaño.
2. ~~Tapa Dura — en qué caso se usa~~ — resuelto: en **Agenda Ejecutiva** (tapa dura + costura con hilo + lomo armado). Tabla de costura (Base 80 hojas + variación por hoja):
   - Media Carta: $4.100 base, ±$10.00/hoja
   - Agenda: $4.400 base, ±$15.00/hoja
   - Carta: $5.800 base, ±$55.00/hoja
   - Fórmula: `Costo = Base_80_hojas + ((N_hojas - 80) × variación_por_hoja)`
   - Espesor del lomo: `N_hojas_tripa × 0.13 mm`
   - Formato de pliego para carátula continua (4x1): Media Carta 25x35cm, Agenda 42x28cm (1/5 del pliego), Carta 33x50cm (se ajusta al máximo digital).
   - Tamaños válidos: Media Carta, Agenda, Carta (no aplica a Micro ni Escolar).
   - **Hotmelt lomo rústico es un producto DISTINTO** (no es lo mismo que Agenda Ejecutiva): $430 COP por unidad, piso mínimo $90.000 — Conde confirmó que se usa "para otros productos como libretas", no está claro aún si también aplica como opción para cuadernos No Escolares (pendiente, ver preguntas).
3. Modos de color/tintas del taco impreso — resuelto: Blanco 0x0, o Impreso 1x1 (negro/líneas), 1x0, 2x2 (color). Recargo adicional: **Tinta Cuadrícula $20.000 fijo** cuando el taco lleva líneas/cuadrícula impresa.
4. Matriz tapa/encuadernación — resuelto:
   - Escolar (Agenda/Media Carta/Carta) → Grapa/Hilo/Hilo con cinta → tapa Semidura o Blanda.
   - No Escolar → Anillo Doble O → siempre tapa Blanda.
   - No Escolar → Agenda Ejecutiva (costura) → tapa Dura.
   - No Escolar → Colbón (pegue) → aplica también a Media Carta y Agenda, no solo Micro (Conde lo confirmó). $250/unidad, piso mínimo $30.000.
   - Hotmelt: pendiente confirmar si aplica a cuadernos o es exclusivo de otro producto.
5. ~~Definición de "Costo Base" en libretas Micro~~ — resuelto: no es un número único. Es el costo de referencia a tamaño Media Carta de **cada componente que se reescala** (Armado de Tapa Dura y Anillado Corto), aplicando la fórmula de área dos veces. Fórmula de Anillado Corto: `((Anillado_Base × Lado_Corto) / Lado_Largo) × 1.30` (ejemplo Media Carta ≈ $780/unidad).
6. ~~Variación Anillo Doble O $5-$10~~ — resuelto, depende del tamaño: Media Carta ±$5.0, Agenda ±$5.5, Carta ±$10.0.
7. **Guardas — costo variable** — resuelto: el costo variable de guardas es el del **plastificado**, no el papel. El papel de las guardas se cobra aparte con la tabla general de sustratos (Bond/Propalcote) que ya se tiene. Falta confirmar sustrato por defecto y si el plastificado es 1 o 2 caras (ver preguntas).
8. **Gramaje de insertos** — el más común es Propalcote 150g, pero debe ser un parámetro editable (puede ser 200g, Bristol u otro sustrato de la lista general).
9. **Sustrato del taco** — Bond 60g/70g son los más comunes (van primero en la lista), pero el sustrato del taco debe ser parámetro editable contra la lista general de sustratos, no una lista cerrada.
10. **Troquel de tapa para cuadernos** — Conde confirmó que usa el servicio general de troquelado ya documentado (~$35.000, posiblemente $30.000 según el nivel de desgaste del molde) — no requiere tabla propia nueva, se reutiliza el marco general de troquelado. Falta confirmar la unidad de cobro (ver preguntas).

**Resuelto (segunda ronda de preguntas):**
- **Hotmelt NO aplica a cuadernos tapa dura ni a Agenda Ejecutiva.** Aplica solo a "libretas", y su precio escala según la medida en cm (fórmula exacta pendiente — ver preguntas abiertas). Matriz de encuadernación de Cuadernos queda entonces: Escolar → Grapa/Hilo/Hilo con cinta; No Escolar → Anillo Doble O, Agenda Ejecutiva (costura), Colbón (Media Carta/Agenda/Micro). Hotmelt queda fuera de Cuadernos, es de otro producto (Libretas).
- **Sustrato de guardas:** por defecto Propalcote/Cote 150g (90% de los casos), editable si el cliente pide diseño personalizado.
- **Plastificado de guardas:** siempre 1 cara.
- **Troquel de tapa:** se cobra por millar de tapas o fracción (igual que el resto del sistema de troquelado), tarifa base ~$35.000 (a confirmar si es $35.000 o $30.000 exactos).

**Troquelado de tapa — confirmado:** $35.000 por millar (o fracción), unificado. Es un acabado ADICIONAL opcional que puede tener una tapa (poco común, pero posible) — parámetro "tapa troquelada: sí/no", default no.

### Reestructuración final del modelo — 4 líneas dentro de Cuadernos

El modelo completo de clasificación (independiente del parámetro Tamaño) queda en 4 combinaciones tapa/encuadernación:

**A. Escolar**
- Tamaños: Agenda, Media Carta, Carta
- Tapa: Semidura o Blanda
- Encuadernación: Grapa / Hilo / Hilo con cinta
- Taco: blanco o impreso

**B. Cuaderno Anillado** (la línea principal — encontrada en Dossier Técnico V3 y Especificación Maestra V8, sección "Cuadernos Anillados (Acabado Suelto)")
- Tamaños: Media Carta, Agenda, Carta (y tamaños personalizados vía fórmula de escalado, ver abajo)
- Tapa: Dura, Semidura o Blanda — CONFIRMADO que admite las 3 (la regla anterior de "anillado = siempre tapa blanda" queda descartada)
- Encuadernación: Anillo Doble O — base 80 hojas: Media Carta $900 (±$5.0/hoja), Agenda $990 (±$5.5/hoja), Carta $1.700 (±$10.0/hoja). Si la tapa es Dura, se suma el armado/forrado: Media Carta $620, Agenda $640, Carta $750.
- Taco: blanco o impreso

**C. Agenda Ejecutiva**
- Tamaños: Media Carta, Agenda, Carta
- Tapa: Dura únicamente (cartón 1.5/2.0mm + forro)
- Encuadernación: costura con hilo + lomo armado (fórmula Base80 + variación por hoja, espesor de lomo)
- Taco: blanco o impreso

**D. Libretas** (incluye el sub-tamaño "Micro")
- Tamaños: Micro, 21x14 (el más habitual), Agenda, o Carta — puede ser cualquiera de los 4, confirmado.
- Tapa: Dura, Semidura o Blanda (las 3 disponibles). Si es Dura: cartón 1.5mm + guardas SIEMPRE plastificadas.
- Encuadernación: Anillado (Anillo Doble O, vía fórmula de Anillado Corto) o Pegado (Hotmelt o Colbón)
- Taco: blanco o impreso

**Fórmula Hotmelt para Libretas — confirmada:** el precio base de $430/unidad está calibrado para 21cm de "pegue" (el lado donde se aplica el pegante, coincide con el ancho de Media Carta — el tamaño más habitual). Escala proporcionalmente según el tamaño real:
```
Precio Hotmelt = $430 × (cm_reales_del_lado_de_pegue / 21)
```
Piso mínimo $90.000 (por OT, a confirmar si aplica igual que el piso de guardas).

### Fórmula general para tamaños personalizados (cualquier línea)

Confirmado: los cuadernos pueden pedirse en CUALQUIER medida (ej. 20x20cm, 23x12cm), no solo los 3-4 tamaños de catálogo. Regla de escalado — confirmada por Conde:

1. Se toma el tamaño de catálogo (Media Carta 294cm² / Agenda / Carta) **más cercano por área** al tamaño pedido.
2. Se escala el costo de armado/anillado de ese tamaño de catálogo proporcionalmente:
```
Costo_tamaño_custom = Costo_Base_tamaño_más_cercano × (Área_custom / Área_tamaño_más_cercano) × 1.30
```
(mismo patrón que ya existía para libretas Micro, generalizado a cualquier línea y cualquier tamaño no estándar).

**Pendientes reales aún sin resolver:**
- Accesorios de Agenda Ejecutiva (cantoneras, esquineros, elástico de cierre) — no aparece en ningún documento; asumir que no existen salvo que Conde diga lo contrario.
- Confirmar que el "piso mínimo $90.000" del Hotmelt aplica por OT completa (igual que el piso de guardas de $20.000), no por unidad.
- Confirmar el área exacta de Agenda (17x24=408cm²) y Carta (28x21.5=602cm²) como referencias de catálogo para la fórmula de escalado (Media Carta ya confirmada en 294cm²/21x14).
