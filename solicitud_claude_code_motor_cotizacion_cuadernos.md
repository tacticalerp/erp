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

### Parámetro nuevo descubierto al revisar casos reales — Diseño del taco

Al analizar los primeros casos de Litoplan apareció un parámetro que no estaba en el modelo: el taco impreso puede tener:
- **Diseño uniforme:** la misma cuadrícula/texto/gráfica se repite en todas las páginas (ej. cuaderno de renglones/cuadrícula estándar).
- **Diseño único por página:** cada página tiene texto/gráfica distinta, como un libro (ej. cuadernos personalizados de contenido variable).

Esto encarece el costo — en el único par comparable que tenemos (mismo tamaño/hojas/tapa/cantidad similar), diseño único cuesta ~16-17% más que diseño uniforme. El mecanismo exacto (¿más mermas? ¿más tiempo de preprensa? ¿ambos van por digital así que el costo por clic no debería variar?) se validará empíricamente cuando se construya la función de cálculo.

## CASOS DE PRUEBA REALES (Paso 0.3 — de Litoplan, entregados por Conde el 2026-07-14)

Todos los precios son **por unidad, antes de IVA**. Vía de impresión: NO se especifica caso por caso — se calcula automáticamente con las reglas ya definidas (gramaje ≤240g + cantidad + tintas → digital si es más económico, si no offset). "1x1 tintas" = 1 tinta en cada cara (frente y respaldo).

| # | Línea | Tamaño | Tapa | Taco | Diseño taco | Tapa acabado | Guardas | Insertos | Encuadernación | Cant. | Precio/u (sin IVA) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cuaderno Anillado | 24x17 (Agenda) | Dura | 100h Bond 70g, 1x1 | Uniforme | Full color 4x0 + plastificado brillante | Sin impresión | 3, full color 2 caras, cote 150g | Anillo Doble O blanco | 100 | $15.232 |
| 2 | Cuaderno Anillado | 21x14 (Media Carta) | Dura | 100h Bond 70g, 1x1 | Uniforme | Full color 4x0 + plastificado mate + UV parcial | Sin impresión | Ninguno | Anillo Doble O blanco | 700 | $7.395 |
| 3 | Cuaderno Anillado | 14x21 (Media Carta) | Dura | 80h Bond 70g, 1x1 | Uniforme | Full color 4x0 + plastificado brillante | Sin impresión | Ninguno | Anillo Doble O blanco | 80 | $11.600 |
| 4 | Escolar | Carta (28x21.5) | Blanda | 30h Bond 70g, 1x1 | Uniforme | Full color + plastificado brillante | Sin impresión | Ninguno | Hilo sin refuerzo | 100 | $7.980 |
| 5 | Escolar | 24x17 (Agenda) | Blanda | 50h Bond 70g, 1x1 | Uniforme | Full color + plastificado brillante | Sin impresión | Ninguno | Hilo sin refuerzo | 1300 | $3.065 |
| 6 | Cuaderno Anillado | 24x17 (Agenda) | Dura | 100h Bond 70g, 1x1 | Único por página | Full color 4x0 + plastificado brillante | Sin impresión | Ninguno | Anillo Doble O blanco | 200 | $17.760 *(corregido, el dato original de $141.060 fue un error)* |
| 7 | Agenda Ejecutiva | 21x14 (Media Carta) | Dura | 80h Bond 70g, 1x1 | Único por página | Full color 4x0 + plastificado brillante | Sin impresión | Ninguno | Costura por cuadernillos | 100 | $19.800 |

**Cobertura actual:** 7 de los 10-15 casos pedidos. Cubre Cuaderno Anillado (4), Escolar (2), Agenda Ejecutiva (1). Faltan ejemplos de: Libretas (cualquier variante), tapa Semidura, y guardas/insertos con impresión (para validar esos costos).

### Segunda tanda de casos reales (2026-07-14) — correcciones al modelo

**Regla real Tapa Blanda vs Semidura (confirmada, corrige lo anterior):** NO depende del material (Propalcote vs Cartulina). Depende de cuántas capas: **1 sola capa (Propalcote o cualquier cartulina liviana/pesada) = Blanda. Colaminado (2 o más capas pegadas) = Semidura.** Ejemplos reales: tapa Blanda en Cartulina C12 o C18 (una sola capa); tapa Semidura = colaminado de 2 cartulinas C16.

**Costo de Refile (encontrado en Dossier V3 / Especificación V8, sección "Costos Fijos Operativos - Mesa de Acabado" de Cuadernos Anillados):**
- Cuaderno Anillado: refile estándar **$100/unidad** + limpieza de sobrantes de colbón **$180/unidad** (fijos, por unidad).
- Escolar: el refile ya viene INCLUIDO dentro del precio de costura (Grapa/Hilo/Hilo con cinta) — sin cargo aparte ("Tarifas de Costura incluyen refile trilateral por taco").
- Libretas (Hotmelt/Colbón): se suma el costo de refile (mismo estándar) + $35.000 fijo de grafado, ambos automáticos.
- Agenda Ejecutiva: pendiente confirmar si aplica el mismo refile de $100/unidad de Cuaderno Anillado.

**Insertos y guardas — confirmado con casos reales que son totalmente libres:** insertos vistos en Bond 90g a 2 tintas (no solo Propalcote 150g full color); guardas vistas impresas a full color sin plastificar, y también impresas y plastificadas — el plastificado de guardas es independiente de si llevan impresión o no.

### Casos de prueba 8-10 (pendiente 1 dato para cerrar el caso 8)

| # | Línea | Tamaño | Tapa | Taco | Diseño taco | Tapa acabado | Guardas | Insertos | Encuadernación | Cant. | Precio/u (sin IVA) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | Libretas | 21x14 (Media Carta) | Semidura (colaminado 2x C16) | 80h Bond 70g, 1x1 | Uniforme | Full color + plastificada | Impresas y plastificadas | Ninguno | Hotmelt | 1000 | $4.240 |
| 9 | Cuaderno Anillado | 24x17 (Agenda) | Blanda (1 capa Cartulina C18) | 70h Bond 75g, 1x1 | Uniforme | Full color + plastificada mate | Impresas full color, SIN plastificar | 2, a 2 tintas, 2 caras, Bond 90g | Anillo Doble O | 800 | $5.205 |
| 10 | Libretas | 14x11 (Micro) | Blanda (1 capa Cartulina C12) | 50h Bond 70g, 1x0 | Uniforme | 1 tinta fondo + plastificada mate | Sin impresión | Ninguno | Colbón (refilada) | 500 | $2.230 |

## VERIFICACIÓN FINAL (2026-07-14) — antes de programar

Se hizo una última revisión exhaustiva de los 9 documentos fuente (7 Word + 2 PDF) cruzando cada uno contra el modelo completo. La mayoría de las cifras centrales se confirmaron de forma independiente (punto de equilibrio $74.737.302, MOD $125/min, Costo Estructural $564.48/min, Tinta Cuadrícula $20.000, regla taco en blanco, pliegos 60x90/70x100, descuento -10% con excepciones, plastificado guardas $900/m²). Los 2 PDFs resultaron ser transcripciones de chats de prototipo con Gemini (con motores financieros y nomenclatura que cambian varias veces dentro del mismo chat) — se confirma que no son fuente autoritativa, solo referencia.

**Datos nuevos incorporados directamente (no requieren confirmación, llenan huecos sin contradecir nada ya decidido):**
- Prueba de preprensa (afectada por el escudo de bajos montos): costo específico de **$25.000** cuando SÍ aplica (se elimina si la OT < $150.000).
- Área de catálogo para la fórmula de tamaños custom/Micro confirmada en **294 cm²** (= Media Carta 21x14).
- Carátula continua de **Agenda Ejecutiva** se imprime siempre **4x1** (no 4x0 como el resto de tapas de Cuadernos/Escolar/Cuaderno Anillado).
- Guardas: el número de guardas es seleccionable (0, 1 o 2), no siempre fijo.
- Troquel: además del servicio de troquelado ($35.000/millar), podría existir un cargo aparte de "desgaste de matriz" (Baja $30k/Media $60k/Alta $120k/Especial $200k) si el troquel de tapa usa el mismo esquema general — no confirmado que aplique a Cuadernos, se deja pendiente hasta que aparezca un caso real con troquel.
- Vida útil de plancha CtP: 25.000 impresiones — si el tiraje la supera, se duplica el costo de planchas (relevante solo para tirajes muy grandes, ninguno de los 10 casos actuales lo alcanza).

### 5 puntos críticos — resueltos con Conde el 2026-07-14

1. **Precio de Bond 75g y Bond 90g** — no está en el diccionario JSON inicial. Conde indica que existe una lista de precios más completa en los documentos de la carpeta (con más papeles) — pendiente de localizar (ver siguiente sección), aplicando el mismo -10% de descuento ERP.
2. **Costo del colaminado** (tapa Semidura) — SÍ tiene tarifa propia y separada del plastificado: **$900/m²** (incluye pegante + mano de obra). Distinta de la tarifa de plastificado.
3. **Tarifa de plastificado — corregida:** **$950/m²** (no $900 como se había registrado antes; $900 corresponde al colaminado, son dos procesos y tarifas distintas). 2 caras = $1.900/m². Cobro mínimo $30.000 (este mínimo general de plastificado es distinto del piso de guardas de $20.000/OT ya confirmado).
4. **Mecanismo real de "diseño único por página" vs "diseño uniforme"** — SIGUE PENDIENTE, ningún documento lo explica con cifra concreta.
5. **Refile para Agenda Ejecutiva** — CONFIRMADO: va incluido en el precio de costura, no se cobra aparte.
6. **Guardas — cuántas por defecto** — CONFIRMADO: siempre 2 (una a cada lado) salvo que se indique lo contrario.

**Bond 75g y 90g — RESUELTO.** Se encontraron en "LISTA DE PRECIO 13 MARZO 2026.pdf" (lista de precios de lista, antes del -10% ERP). Se verificó que esta lista es consistente al 100% con los precios ERP que ya se tenían (ej. Bond 60g 60x90: lista $197 × 0.9 = $177.30, coincide exacto con el dato existente) — confirma que la tabla de sustratos SÍ sale de esta lista con el -10% aplicado:

| Sustrato | Gramaje | Formato | Precio lista | Precio ERP (-10%) |
|---|---|---|---|---|
| Bond Importado | 75 gr | 60x90 | $246 | $221.40 |
| Bond Importado | 75 gr | 70x100 | $319 | $287.10 |
| Bond Importado | 90 gr | 60x90 | $295 | $265.50 |
| Bond Importado | 90 gr | 70x100 | $382 | $343.80 |

(El archivo "LISTA DE PRECIO PARA ERP.pdf" no se pudo leer — parece ser un PDF escaneado/imagen sin texto extraíble en este entorno. No fue necesario: la lista de marzo ya trae todo lo que faltaba.)

**Nota menor detectada (no bloqueante):** la lista de marzo muestra Cartón Prensado 1.5mm a **$4.000** de lista y 2mm a **$5.000** de lista — si NO aplica el -10% (como dice el baseline), el precio ERP debería ser $4.000, no los $3.500 que tenía registrados. Puede ser que la lista se haya actualizado después de fijar ese dato. Se deja registrado por si Conde quiere confirmar el valor vigente cuando se use Tapa Dura en los cálculos.

**Pendiente real, todavía sin resolver:** el mecanismo exacto de "diseño único vs uniforme" del taco (punto 4 de la lista anterior) — no aparece cuantificado en ningún documento. Se abordará empíricamente: se construye la función con el resto de reglas confirmadas, se corre contra los 10 casos, y el caso 6 (el único con diseño único) mostrará cuánto falta para cuadrar — ahí se ajusta con la cifra que Conde confirme.

---

## PASO 1 — Primera versión de la función de cálculo (2026-07-15)

Se construyó el motor en Python, en la carpeta `motor_cotizacion/` (`datos_maestros.py` = tablas y constantes, `motor.py` = funciones de cubicaje/impresión/financiero, `cotizador.py` = función principal `cotizar_cuaderno()`, `casos_prueba.py` = los 10 casos reales + comparador, `desglosar_caso.py` = reporte detallado de un caso en formato Litoplan). Python no estaba instalado en el equipo — se instaló vía winget (Python 3.12, oficial de python.org) con autorización de Conde.

### Reglas de negocio nuevas confirmadas durante la construcción y depuración

1. **Escalado de tamaños custom:** confirmado el catálogo de referencia más cercano por área (Media Carta 294cm² es el punto de referencia ya usado en Libretas Micro).
2. **Colaminado (tapa Semidura):** tarifa propia de **$900/m²** (pegante + mano de obra), distinta del plastificado.
3. **Plastificado:** tarifa corregida a **$950/m²** (no $900, que es la tarifa de colaminado — son procesos distintos). Piso $30.000/OT (distinto del piso de guardas $20.000/OT).
4. **UV Parcial:** "arrastra" el plastificado mate de base — NO se cobran los dos por separado, es uno u otro. Piso propio de $80.000/OT.
5. **Refile:** Cuaderno Anillado $100/unidad + limpieza colbón $180/unidad; Escolar y Agenda Ejecutiva van incluidos en el precio de costura; Libretas (Hotmelt/Colbón) suman refile + $35.000 fijo de grafado.
6. **Cubicaje de impresión offset — hallazgo central:** el "millar" se cobra por PASADAS DE PLIEGO (cuántos pliegos/medios pliegos pasan por máquina), no por cada hoja chica terminada — varias piezas caben imposicionadas en un mismo pliego. Este fue el bug más grande del primer intento (sobrecobraba brutalmente tanto en offset como en digital).
7. **Medio pliego real:** no es un tamaño fijo de máquina — sale de partir a la mitad cualquiera de los 2 pliegos madre (70x100→70x50, o 60x90→60x45), se usa el que rinda mejor (menos desperdicio), mismo principio de "cubicaje dinámico" ya usado para papel.
8. **Pliegue (encuadernación cosida/pegada) vs hoja suelta (anillado):** Escolar, Agenda Ejecutiva, y Libretas con Hotmelt/Colbón PLIEGAN el papel al centro — se monta e imprime por PAREJAS (no como un tamaño doble: se cubica el bloque de la pareja y se multiplica x2 al final para las hojas reales). Cuaderno Anillado y Libretas con Anillo Doble O son hoja suelta, sin pliegue, se monta individual. Ejemplos confirmados por Conde: 21x14 sin pliegue → 10 hojas caben en 70x50; 21x14 con pliegue → 8 hojas (en parejas) caben en 60x45 (el mejor de los dos, menos desperdicio).
9. **Margen de pinzas:** SÍ se descuenta en el cubicaje de impresión del taco (12mm entrada + 5mm salida = 17mm), aplicado sobre el tamaño real del taco (ver punto 10).
10. **El taco es más chico que la tapa** (la tapa debe cubrirlo totalmente): ~0.4cm menos por lado. Se usa el tamaño reducido para cubicar el taco, no el tamaño nominal del cuaderno.
11. **Diseño único por página (taco o insertos con contenido distinto cada uno):** NO se puede reutilizar la misma plancha para tiro/retiro (a diferencia del diseño uniforme). Se necesita 1 plancha por cada "posición" de página que quepa en el medio pliego, y cada plancha corre tantas veces como unidades se pidan. Fórmula: `n_planchas = ceil(páginas_únicas_por_libro / piezas_por_medio_pliego)`, costo = `n_planchas × CTP_medio_pliego + millares(redondeados hacia arriba) × tarifa_millar`.
12. **Fondo Pleno/Plastón** (fondo sólido cubriendo la pieza, aunque sea a 1 sola tinta): existía en el diccionario original pero nunca se aplicaba. Recargo fijo + 1 plancha adicional, y el recargo depende del tamaño de máquina: medio pliego $90.000, cuarto $50.000, octavo $50.000 (los 3 confirmados por Conde).
13. **Máquinas chicas (octavo) en OFFSET solo manejan hasta 2 tintas** — policromía (4 tintas) en offset fuerza mínimo cuarto pliego. OJO: esta restricción es solo para OFFSET — en DIGITAL (máquinas Konica) sí se puede policromía en tamaño octavo/pequeño (visto en pantalla real de Litoplan, ver más abajo). Pendiente revisar por qué el comparador digital-vs-offset del motor no está eligiendo digital en estos casos (posible descalibración del costo digital).
14. **Millares se cobran completos, no proporcionales:** 1.27 millares se factura como 2 millares (redondeo hacia arriba), no 1.27. Aplica en toda tarifa de millar, no solo cuadrícula.
15. **Insertos:** por defecto se tratan como diseño único por página (cada hoja/cara distinta) en vez de diseño uniforme — así es como normalmente se piden en la práctica.

### Estado de los 10 casos de prueba al cierre de esta sesión

| Caso | Litoplan | Calculado | Diferencia |
|---|---|---|---|
| 1. Agenda anillado dura, Q100 | $15.232 | $15.968 | 4.8% |
| 2. Media Carta anillado dura, Q700 | $7.395 | $7.531 | 1.8% |
| 3. Media Carta anillado dura, Q80 | $11.600 | $11.110 | -4.2% |
| 4. Carta escolar blanda, Q100 | $7.980 | $8.026 | 0.6% |
| 5. Agenda escolar blanda, Q1300 | $3.065 | $3.425 | 11.8% |
| 6. Agenda anillado diseño único, Q200 | $17.760 | $15.805 | -11.0% |
| 7. Agenda Ejecutiva, Q100 | $19.800 | $24.242 | 22.4% |
| 8. Libretas semidura hotmelt, Q1000 | $4.240 | $3.975 | -6.3% |
| 9. Anillado tapa C18, Q800 | $5.205 | $5.894 | 13.2% |
| 10. Libretas Micro colbón, Q500 | $2.230 | $2.276 | 2.1% |

8 de 10 casos dentro de ±13%. El caso 7 (Agenda Ejecutiva) es el que más se aleja — pendiente de revisar a fondo (su fórmula de armado es distinta a las demás líneas y se ha tocado menos).

### Hallazgo clave que cierra la sesión: pantalla real de Litoplan

Conde compartió una captura de la pantalla real de captura de datos de Litoplan para un cuaderno Tapa-dura-ANT (tapa dura anillado), 50 unidades, 21x14. Reveló información arquitectónica importante:

- **Cada componente del cuaderno es una LÍNEA independiente y libremente configurable**, con sus propios: páginas, tamaño, cantidad de tintas TIRO y RETIRO por separado, papel/sustrato, laminado/película — igual que armaría cualquier cotización, sin categorías rígidas.
- Ejemplo real: 1 línea para el taco (160 páginas = 80 hojas×2, Media Carta, 1x1, Bond 70g), 2 líneas de insertos DISTINTAS (una de 6 páginas 4x0 en cote 150g, otra de 1 página 4x0 en adhesivo/sticker — cada una con su propia configuración), y 1 línea para la carátula (Octavo 25x35, 4x0, cote 150g, laminado 1 cara brillante) — impresa en máquina digital Konica de tamaño octavo, confirmando que policromía SÍ puede ir en máquina chica cuando es digital (solo está restringido en offset).
- Confirma explícitamente el punto de Conde: **"no se puede estandarizar como se estaba haciendo con los insertos, cada parte debe ser opcional según lo solicitado por el cliente"** — el modelo actual (categorías fijas tapa/taco/insertos con una sola configuración cada una) no es suficiente y debe rediseñarse.

### DECISIÓN — próximo paso acordado con Conde

**El modelo de entrada de la función debe reestructurarse: en vez de categorías fijas (tapa, taco, insertos con una config cada una), cada componente del cuaderno (carátula, taco, cada grupo de insertos, etc.) debe ser una LÍNEA independiente y libremente configurable** (páginas, tamaño, tintas tiro/retiro por separado, papel, laminado/película, troquel opcional) — reflejando cómo funciona Litoplan realmente. Esto es indispensable para la exactitud del pedido; dejar categorías rígidas deja espacio a errores graves de cotización.

**Se acordó con Conde:** cerrar esta sesión aquí (ya muy larga) y hacer la reestructuración completa en una sesión nueva, empezando fresco directamente con el rediseño del modelo de entrada.

### Pendientes para la próxima sesión

1. **Reestructurar `cotizar_cuaderno()`** para recibir una lista de líneas libres en vez de categorías fijas (tapa/taco/insertos), cada una con: páginas, tamaño (o heredado del cuaderno), tintas tiro, tintas retiro, papel/sustrato, laminado/película opcional, troquel opcional.
2. ~~Aclarar con Conde la regla de tinta adicional en el retiro~~ — **RESUELTO (2026-07-15):** aplica a Cuadernos Tapa Dura a partir de **150 unidades** (no 200 — Conde corrigió el umbral), "porque es el marco para armado: en pocas unidades no es tan indispensable pero en altas unidades sí".
3. **Revisar por qué el comparador digital-vs-offset casi nunca elige digital** — la pantalla real de Litoplan muestra que carátulas chicas en policromía sí van por Konica digital incluso en octavo. **Hallazgo al revisar el índice maestro:** los ÚNICOS precios de "clic" digital que existen en los 9 documentos son los de `dossier.txt` (Carta $750/$350, Octavo 25x35 $900/$450, Pliego Máx 50x33 $1.000/$550) — ningún otro documento los corrobora ni los actualiza. Además, la transcripción ERPMIS admite textualmente (línea 6236) que "faltan los precios de clics/hoja" y menciona de pasada tamaños de referencia distintos a los que usa el motor (33x48cm o 33x33cm, vs. los 49x32/25x35/21.5x28 actuales) — sin confirmar si son reales o solo una idea suelta del chat. **Conclusión: los precios digitales actuales están basados en una sola fuente, sin verificar. Hay que pedirle a Conde la tabla real de precios por clic de las máquinas Konica (y los tamaños de pliego exactos que manejan: Konica-Tabloide, Konica-1/8, etc.) en vez de seguir asumiendo los de `dossier.txt`.**
4. **Precio del troquel y troquelado** — Conde mencionó que lo anexará después (visto en la pantalla real, columna pendiente de llenar).
5. Seguir cerrando casos 6, 7, 9 con el nuevo modelo una vez reestructurado.
6. Cartón Prensado 1.5mm/2.0mm: confirmar si el precio vigente es $3.500/$4.500 (como está ahora) o $4.000/$5.000 (según la lista de marzo 2026).
7. ~~Acabados de Carátula~~ — **RESUELTO (2026-07-15):** se agrega **Estampado** como 4ª casilla, y una 5ª opción **"Otros"** con costeo libre por unidad (para pedidos poco comunes sin nombre fijo). Acordeón de Acabados queda: Plastificado / UV Parcial / Troquelado / Estampado / Otros (costeo libre).
8. ~~Reestructurar a líneas libres~~ — **RESUELTO (2026-07-15):** hecho. Nuevo módulo `linea_impresion.py` con el procesador genérico; `cotizar_cuaderno()` recibe `lineas_impresion` (lista libre) en vez de categorías fijas. De paso se cerraron 2 gaps reales: guardas e insertos ahora sí tienen costo de impresión calculado (antes solo cobraban material).

### HALLAZGO MAYOR (2026-07-15) — la fórmula de precio de venta estaba mal para TODOS los casos

Conde reconstruyó 2 casos reales **desde cero en Litoplan** (Agenda Ejecutiva = caso 7, y caso 9) con capturas de pantalla del desglose completo (Subtotal, %utilidad, %ventas, %agencia, Total). Esto reveló:

1. **La fórmula real es multiplicativa en cascada:** `Precio = Subtotal × (1+%utilidad) × (1+%ventas) × (1+%agencia)` — verificado con precisión de <0.01% en ambos casos. La fórmula que se venía usando (`Costo / (1 - %utilidad - %comisión)`, ej. `/0.56`) es **incorrecta** — para el mismo subtotal da un resultado muy superior al real.
2. **%utilidad y %ventas se ajustan A MANO en cada cotización** según cliente, cantidad y complejidad del producto — no hay un default fijo real. Conde no usa el campo "%agencia" (siempre 0).
3. **El caso 7 original estaba mal transcrito**: el valor real es **$27.167/unidad** (Total $2.716.700 ÷ 100), no los $19.800 que se habían dado al inicio. El caso 9 sí estaba bien ($5.209 real vs $5.205 dado — coincide).
4. **Ni "Fondo de Seguridad" ni "Preprensa" aparecen como líneas separadas** en ninguno de los 2 cálculos reales reconstruidos — se quitaron de la fórmula del Subtotal hasta confirmar si aplican en otro lado o si el concepto quedó descartado.
5. **Correcciones puntuales confirmadas con los datos reales:** tamaño Agenda = **17x24.5cm** (no 17x24); costo de plancha medio pliego = **$22.000** (no $21.000, confirmado en ambos casos); insertos del caso 9 son **cote C2S 90gr a 4x4 tintas** (no Bond 90gr a 2 tintas como se había transcrito verbalmente).
6. **Patrón a confirmar más adelante:** en ambos casos reales, la carátula/tapa se imprime en un tamaño de máquina fijo (**Octavo 25x35 / Konica-1/8**), no en el tamaño real del cuaderno — sugiere que la carátula siempre se monta en un tamaño de referencia estándar en vez de cubicarse dinámicamente como el resto. No implementado todavía, falta más evidencia.
7. **Ítems sin identificar en los cálculos reales:** aparece una línea llamada **"Sherpa"** (2 × $20.000 en caso 7, 2 × $10.000 en caso 9) cuyo significado no se conoce — preguntarle a Conde qué es.

**Impacto en la validación:** con la fórmula corregida y usando el margen real conocido (40% utilidad / 0% ventas), el **caso 9 da 1.3% de diferencia — prácticamente exacto**, confirmando que el motor de costeo (subtotal) está bien calibrado. Los demás 8 casos (1-6, 8, 10) muestran diferencias grandes (-8% a -32%) **no por errores del motor, sino porque no se sabe qué margen real se usó en esas cotizaciones históricas** (fueron transcritas verbalmente, no reconstruidas desde cero como el 7 y el 9). No son comparables de forma justa todavía.

### Próximo paso recomendado

Reconstruir 1-2 casos más **desde cero en Litoplan** (con captura de pantalla del desglose completo, igual que el 7 y el 9) para tener más puntos de comparación limpios con margen real conocido. Candidatos: casos 1 y 6 (comparten la misma base — Agenda 24x17, tapa dura, anillado — así que resolver uno probablemente valida el otro).

### HALLAZGO (2026-07-21) — se construyó la calculadora visual, y con ella salió un caso nuevo que reveló 4 costos faltantes

Conde probó un pedido nuevo (1000 Cuad-Tapa-Blanda, Media Carta 14x21) directamente en Litoplan y comparó línea por línea contra la calculadora. Con eso se confirmaron/resolvieron varios puntos pendientes:

1. **Anillado/Grapa:** el número que teníamos ya estaba bien (`ESCOLAR_ENCUADERNACION_COP.grapa = $250`, coincide exacto). Litoplan solo reutiliza la etiqueta genérica "Anillado" en su UI aunque internamente esté aplicando la tarifa de Grapa — no es un bug del motor.
2. **"Alce", "Revisión" y "Otros" = Fondo de Seguridad de Producción.** Confirmado por Conde: esos 3 renglones que aparecían sueltos en Litoplan (~$80-90/unidad cada uno) son en realidad el Fondo de Seguridad que se había sacado de la fórmula el 2026-07-15 (punto 4 del hallazgo anterior) creyendo que no aplicaba. **Se reincorporó** usando la tabla de tramos que ya existía en `datos_maestros.py` (9%/7%/5%/3% sobre el costo directo, con excepción de 2.5% para Agenda Ejecutiva en el tramo superior).
3. **Empaque** (encontrado en el Dossier Maestro, sección 7 "Logística, Empaque y Fletes"): caja de $3.000, con capacidad según tamaño y si es Escolar o no — Media Carta (35 anillado/40 escolar), Agenda (30/33), Carta (20/26). Conde: "en Litoplan no es exacto, aquí lo puedes usar como está descrito en tus datos" — se implementó tal cual el Dossier, sin forzar que cuadre con el número puntual de Litoplan.
4. **Transporte** (misma sección del Dossier, "Ruta 3 — Cuadernos y Agendas Pesadas"): % escalonado sobre el subtotal (4% de $500k-$3M, 3% de $3M-$5M, 2% sobre $5M), piso $45.000, con descuento de -0.5% en el primer tramo para Agenda Ejecutiva. Confirmado por Conde, coincidía casi exacto en el caso de prueba (3% × $3.034.070 = $91.022 calculado vs $90.000 real).
5. **Sherpa** (muestra de color al cliente) — fórmula confirmada por Conde: piso **$20.000**, sube **$1.000 por cada página de inserto**, tope **$40.000** (no siempre se entregan todas las hojas de muestra en pedidos con muchos insertos, de ahí el tope).
6. **Levante manual de insertos** ($10/hoja de inserto por cuaderno) — ya estaba definido en `datos_maestros.py` desde el Paso 1 pero nunca se había conectado al cálculo. Confirmado por Conde que sí aplica. Ya está conectado.
7. **Limpieza de colbón** ($180/unidad, Cuaderno Anillado) — Conde confirma que "Limpieza" y "Revisión" son nombres genéricos intercambiables y que el dato que ya teníamos está bien, no se toca.

**Efecto en los 10 casos de prueba:** la mayoría se movió en la dirección correcta (más cerca de lo real, porque antes nos faltaba cobrar estos costos). **Excepción importante: el caso 9** — el único con subtotal 100% confirmado desde cero — pasó de **+1.4% a +13.8%** de diferencia. Los 4 costos nuevos suman ~$351.000 en ese pedido que antes no se cobraban y que en el subtotal real reconstruido ($2.976.625) no parecían estar. **Pendiente:** revisar con Conde si el caso 9 realmente no llevaba estos cargos (¿pedido con condición especial?), o si el screenshot original que se usó para reconstruirlo no alcanzaba a mostrar todas las líneas de Litoplan (Alce/Revisión/Otros/Empaque/Transporte/Sherpa) y por eso no se habían capturado antes.

**También se encontraron, buscando sistemáticamente constantes definidas pero nunca usadas en el motor, otros posibles vacíos sin confirmar todavía:**
- `PLASTIFICADO_2CARAS_COP_M2` ($1.900/m²) — tenemos el dato pero la interfaz solo permite marcar "plastificado" genérico (1 cara). ¿Hace falta poder marcar 2 caras?
- `DIGITAL_SEMICORTE_COP` ($1.500/pliego) — cargo de semicorte digital que nunca se cobra hoy en `costo_impresion_digital()`.
- `OFFSET_RECARGO_PANTONE_COP` ($50.000) — no hay forma de marcar "tinta Pantone" en una línea de impresión.
- `OFFSET_CTP_VIDA_UTIL_IMPRESIONES` / `OFFSET_CTP_REPETITIVO_PCT` (30% de descuento en plancha si es reimpresión de un trabajo repetido) — el motor no tiene el concepto de "reorden/repetición" todavía.

Implementado en `motor_cotizacion/datos_maestros.py`, `motor.py`, `cotizador.py`, `desglosar_caso.py` y portado también a `calculadora.html`. Commit `9f8b4f8`.

### CORRECCIÓN (2026-07-21) — el cartón de tapa dura se cortaba al tamaño de montaje de la carátula, no al tamaño final

Usando la calculadora, Conde armó un caso (Agenda Ejecutiva, 24x17cm, 400 unidades, tapa dura, taco 80 hojas) donde el cartón salía en $350.000 — evidentemente muy alto. La causa: el cartón se estaba cubicando contra el tamaño de MONTAJE de la carátula (40x27cm redondeado a 42x28cm — el tamaño inflado por el embone + doblez, pensado para el PAPEL que envuelve el cartón), no contra el tamaño FINAL del cuaderno.

**Corregido:** el cartón de tapa dura ahora son 2 láminas al tamaño final del cuaderno (tapa + contratapa) más, únicamente en Agenda Ejecutiva (línea con lomo/costura), 1 lámina de lomo cuyo largo es el lado más largo del cuaderno y cuyo ancho es el espesor del taco (`taco_hojas × 0.13mm`, dato `ESPESOR_LOMO_MM_POR_HOJA` que ya existía en `datos_maestros.py` pero nunca se había conectado — ahora resuelto). Con el ejemplo de Conde: $175.000 (2 láminas) + $5.224 (lomo) = **$180.224**, contra los $350.000 de antes.

**Confirmado por Conde, sin necesidad de más cambios de código:**
1. El lomo de cartón solo aplica a Agenda Ejecutiva — Cuaderno Anillado (Anillo Doble O) no lo lleva, porque las argollas conectan directo los 2 cartones.
2. El largo del lomo = el lado más largo del cuaderno, en el 95% de los casos — se deja fijo así.
3. Libretas (Hotmelt/Colbón) NO llevan lámina de cartón de lomo — el lomo ahí sale directo de la carátula (el papel impreso hace de lomo, sin pieza estructural rígida). El código ya lo maneja bien porque solo agrega la lámina de lomo cuando `linea_producto == "agenda_ejecutiva"`.

Implementado en `motor.py` y `cotizador.py`, portado a `calculadora.html`. Commit `15cfd98`.

### Ronda de correcciones sobre Agenda Ejecutiva y guardas (2026-07-21, misma sesión)

Con la calculadora visual, Conde probó varios casos de Agenda Ejecutiva y fue destapando errores puntuales, todos corregidos y verificados Python=JS el mismo día:

1. **Guardas plastificado**: tarifa incorrecta ($950/m², piso $30.000 genérico) → corregida a la propia de guardas ($900/m², piso $20.000). Commit `da38915`.
2. **Armado de Agenda Ejecutiva**: tabla vieja (`COSTURA_AGENDA_EJECUTIVA`, base+variación por hoja) reemplazada por tarifa fija por tamaño (Media Carta $4.000, Agenda $4.300, Carta $5.600/unidad), con descuento por volumen: 0% hasta 199u, 4% en 200u, +1% cada 100u, tope 10% desde 800u. Commits `8872242`, `bc104e1`.
3. **Transporte de Agenda Ejecutiva se duplica** (viaje adicional a proveedor distante). Commit `8872242`.
4. **Doble cobro corregido**: el precio de armado de Agenda Ejecutiva YA incluye el forrado de tapa sobre cartón (el documento fuente lo dice explícito). Se estaba cobrando también aparte en "Armado y forrado de tapa (dura)". Commit `b8332c6`.
5. **Limpieza** extendida a las 4 líneas (antes solo Cuaderno Anillado): $180/u Cuaderno Anillado y Agenda Ejecutiva, $120/u Libretas y Escolar. Commit `90afb41`.
6. **Levante manual del taco** ($8/hoja) — antes solo se cobraba levante para insertos ($10/hoja), nunca para el taco. Además el levante pasó a ser CONDICIONAL: solo aplica cuando el diseño de esa línea es "único por página" (las hojas cambian) — si es diseño uniforme no hace falta ordenar nada. Commit `71ba23f`.
7. **HALLAZGO CLAVE — millar mal calculado en impresión "único por página"** (usado para taco/insertos con contenido distinto en cada hoja, típico de agendas con fecha en cada página): el millar se estaba repartiendo entre TODAS las planchas juntas (ej. 25 planchas × 200 copias = 5.000 impresiones → 5 millares). Pero cada plancha es un cambio de máquina/registro independiente — aunque cada una corra menos de 1000 veces, cuenta como mínimo 1 millar CADA UNA (25 planchas = 25 millares, no 5). Además no se aplicaba ninguna merma de alistamiento en esta ruta (existía `merma_offset_hojas()` para policromía/1 tinta pero nunca se llamaba aquí). Commit `82f2e18`.

**Este último punto (7) era el problema de fondo que arrastraba el caso 7 desde el 15-jul.** Con este arreglo, el caso 7 (Agenda Ejecutiva, dato real 100% confirmado: $27.167) pasó de -32.8% (inicio del día) a **-3.0%** — prácticamente calibrado. El caso 6 (cuaderno anillado diseño único) también mejoró de -21.5% a +2.6%.

**Estado de los 10 casos al cierre de esta ronda:** casos 1,2,3,4 entre -9% y -16% (esperado, sin margen real conocido — ver hallazgo del 15-jul); caso 5 +10.7%; caso 6 +2.6%; **caso 7 -3.0%** (el más importante, ya casi exacto); caso 8 -3.5%; **caso 9 +13.8%** (regresión pendiente de revisar, ver más abajo); caso 10 +4.9%.

**Sigue pendiente:** la regresión del caso 9 (pasó de +1.4% a +13.8% al agregar Fondo de Seguridad/Empaque/Transporte/Sherpa el 21-jul) — falta confirmar con Conde si ese caso realmente no llevaba esos cargos o si el screenshot original no mostraba todas las líneas de Litoplan.

### Revisión de merma en todas las rutas de impresión (2026-07-22)

A pedido de Conde se revisaron los documentos fuente por merma en cada tipo de impresión: la merma digital (20 hojas policromía / 10 negro / 18 promedio) y la merma offset (100/130/160 hojas según tiraje, ×1.30 si 2+ tintas) ya estaban bien capturadas y aplicadas correctamente. Se encontró un cargo relacionado sin conectar — **Semicorte Digital ($1.500/pliego)** — que se agregó y luego se **revirtió**: Conde aclaró que ese cargo es exclusivo de troquelado sobre sustratos adhesivos/vinilo (Gran Formato), no aplica a papel de Cuadernos. Commits `9cef8ed` (agregado) y `1337ce8` (revertido).

### Ronda de ajustes de fórmula y UI (2026-07-22)

Confirmados por Conde, implementados y verificados Python=JS:

1. **Piso mínimo de armado Agenda Ejecutiva: $3.000/unidad.** En tamaños muy chicos (ej. agenda 15x10cm) el factor de escala por área bajaba el costo por debajo de $3.000, que no refleja la mano de obra mínima real. Se aplica un `max()` sobre la tarifa por tamaño antes del descuento por volumen.
2. **Anillado en 2 secciones** (nuevo, Cuaderno Anillado): para un cuaderno grande que se anilla en 2 partes separadas en vez de 1 anillo continuo. El combinado de las 2 secciones cuesta 30% MENOS que el anillado normal (no se duplica el costo). Nuevo checkbox en la calculadora, visible solo cuando la línea es Cuaderno Anillado.
3. Ajustes de UI en la calculadora: carátula con sustrato por defecto Propalcote 150g (90% de los casos reales) y sin selector de "Diseño" (no aplica, solo hay 1 pieza); taco/insertos con las opciones de diseño renombradas a "Páginas iguales"/"Páginas diferentes" (antes "Uniforme"/"Único por página"), taco inicia en "iguales", insertos en "diferentes"; guardas con plastificado marcado por defecto; preset de tamaño "Agenda 17x24.5" renombrado a "Mediano 24x17".

Implementado en `datos_maestros.py`, `cotizador.py`, portado a `calculadora.html`. Commit `bb4bf8d`.

### Merma también en el material, no solo en la impresión (2026-07-22)

Conde revisó a mano el cálculo de papel de un caso Escolar (Carta 28x21.5cm, 500 unidades, taco 100 hojas): 50.000 hojas ÷ 8 piezas que caben en un pliego 60x90 = 6.250 pliegos, y preguntó si la merma se le sumaba antes de ese cálculo. Aclaración de términos: las 8 piezas caben en el pliego COMPLETO 60x90, no en medio pliego (60x45) — en medio pliego solo caben 4 (por área no alcanzan 8 piezas de ese tamaño ahí).

**Hallazgo confirmado:** la merma de alistamiento offset (100/130/160 hojas según tiraje, ×1.30 si 2+ tintas) solo se le sumaba al cálculo de impresión (planchas/millares), nunca al material — pero si la máquina desperdicia hojas calibrando, esas hojas también hay que comprarlas en papel. Corregido: ahora la merma se suma también al material.

De paso se corrigió el modelo de compra de papel: antes se cobraba una tarifa continua por pieza suelta (`precio_pliego / piezas_por_pliego × piezas_necesarias`); ahora se compran pliegos COMPLETOS redondeando hacia arriba (`ceil((piezas_necesarias + merma) / piezas_por_pliego) × precio_pliego`), y se elige el formato de pliego (60x90 vs 70x100) que salga más barato en TOTAL para la cantidad real, no solo por tarifa unitaria — puede haber casos donde un formato con peor tarifa por pieza desperdicie menos al redondear y termine siendo más barato en total.

Verificado con el caso de Conde: taco Carta 28x21.5cm Bond 70g, 50.000 hojas + 160 de merma = 50.160 ÷ 8 = 6.270 pliegos × $206.10 = **$1.292.247** (antes $1.288.125 sin merma). Los 10 casos de prueba se movieron levemente en la dirección esperada (más papel = más costo).

**Pendiente relacionado (no implementado aún, alcance menor):** la segunda capa de cartón en tapa semidura (`tapa_semidura_segunda_capa` en `cotizador.py`) todavía usa la tarifa continua vieja (`mejor_pliego_para_pieza`), no el redondeo a pliegos completos. No lleva merma porque no se imprime, pero sí debería redondear a pliegos completos por consistencia — revisar si vale la pena el cambio.

Implementado en `motor.py` (`costo_material_pliegos`), `linea_impresion.py`, portado a `calculadora.html`. Commit `fc91cca`.
