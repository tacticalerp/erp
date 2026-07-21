"""
Datos maestros del motor de cotizacion - Linea Editorial y Cuadernos.
Todos los valores vienen del diccionario acordado con Conde y de la
verificacion cruzada contra los documentos del dossier (ver
solicitud_claude_code_motor_cotizacion_cuadernos.md para el detalle y
las fuentes de cada regla).
"""

# ============================================================
# SUSTRATOS (precio ERP en COP por PLIEGO, ya con el -10% aplicado)
# clave: (nombre, gramaje_g) -> {"60x90": precio o None, "70x100": precio o None}
# ============================================================

SUSTRATOS = {
    ("Bond", 60): {"60x90": 177.30, "70x100": 229.50},
    ("Bond", 70): {"60x90": 206.10, "70x100": 267.30},
    ("Bond", 75): {"60x90": 221.40, "70x100": 287.10},
    ("Bond", 90): {"60x90": 265.50, "70x100": 343.80},
    ("Bond", 115): {"60x90": None, "70x100": 459.00},
    ("Propalcote", 80): {"60x90": None, "70x100": 308.70},
    ("Propalcote", 90): {"60x90": 267.30, "70x100": 348.30},
    ("Propalcote", 115): {"60x90": 343.80, "70x100": 448.20},
    ("Propalcote", 150): {"60x90": 472.50, "70x100": 612.90},
    ("Propalcote", 200): {"60x90": 603.90, "70x100": 810.00},
    ("Propalcote", 300): {"60x90": 910.80, "70x100": 1182.60},
    ("Propalcote", 350): {"60x90": None, "70x100": 1381.50},
    ("Cartulina C11", 190): {"60x90": None, "70x100": 684.00},
    ("Cartulina C12", 205): {"60x90": 580.50, "70x100": 753.30},
    ("Cartulina C14", 225): {"60x90": 637.20, "70x100": 826.20},
    ("Cartulina C16", 255): {"60x90": 722.70, "70x100": 936.90},
    ("Cartulina C18", 275): {"60x90": 779.40, "70x100": 1009.80},
    ("Cartulina C20", 305): {"60x90": 864.00, "70x100": 1120.50},
    ("Cartulina C22", 330): {"60x90": None, "70x100": 1212.30},
}

# Carton para tapa dura: NO aplica el -10% general (precio ya es el final).
# Nota: la lista de precios de marzo 2026 muestra $4.000/$5.000 de lista para
# estos calibres; se deja el valor historico del diccionario ($3.500/$4.500)
# hasta que Conde confirme cual esta vigente.
CARTON_1_5MM_COP = 3500
CARTON_2_0MM_COP = 4500

PLIEGOS_CM = {"60x90": (60, 90), "70x100": (70, 100)}

# ============================================================
# MOTOR FINANCIERO GENERAL
# ============================================================

PUNTO_EQUILIBRIO_MENSUAL = 74_737_302
MANO_OBRA_DIRECTA_COP_MIN = 125
COSTO_ESTRUCTURAL_COP_MIN = 564.48
DIVISOR_PRECIO_VENTA = 0.56
IVA_PCT = 0.19

# Fondo de Seguridad de Produccion: tramo decidido sobre el COSTO DE
# FABRICACION DEL PEDIDO COMPLETO (no el precio de venta, confirmado por Conde).
FONDO_SEGURIDAD_TRAMOS = [
    (500_000, 0.09),
    (1_000_000, 0.07),
    (3_000_000, 0.05),
    (float("inf"), 0.03),
]
# Excepcion de linea: Agenda Ejecutiva ("Agendas con Lomo") tiene tarifa
# preferencial de 2.5% en el tramo superior a $3.000.000 en vez de 3%.
FONDO_SEGURIDAD_TRAMO_SUPERIOR_AGENDA_EJECUTIVA = 0.025

ESCUDO_BAJOS_MONTOS_UMBRAL = 150_000
DISENO_COSTO_NORMAL = 40_000
DISENO_COSTO_REDUCIDO = 20_000
PREPRENSA_COSTO_NORMAL = 25_000  # se elimina (=0) si aplica el escudo

# ============================================================
# TAMANOS DE CATALOGO (cm) y AREA de referencia para escalado
# ============================================================

TAMANOS_CATALOGO_CM = {
    "media_carta": (21, 14),
    "agenda": (17, 24.5),  # corregido con Litoplan real (era 17,24)
    "carta": (28, 21.5),
}
AREA_CATALOGO_REFERENCIA_CM2 = 294  # = Media Carta 21x14, confirmado en docs
FACTOR_MANIPULACION_TAMANO_CUSTOM = 1.30

# ============================================================
# CARATULA / TAPA
# ============================================================

FORRO_TAPA_DURA = ("Propalcote", 150)
ARMADO_FORRADO_TAPA_DURA_COP = {"media_carta": 620, "agenda": 640, "carta": 750}

# Montaje de caratula (confirmado por Conde, 2026-07-16): la caratula
# SIEMPRE se imprime como UNA pieza continua (caratula + contracaratula
# juntas, doblando el lado corto x2), nunca como 2 piezas sueltas. Si es
# tapa Dura, antes de doblar se le suma el "embone" (~1.5cm por lado,
# el papel que envuelve el canto del carton) a AMBAS dimensiones.
CARATULA_EMBONE_TAPA_DURA_CM = 1.5

# Tamanos de maquina disponibles para redondear el montaje de caratula
# hacia arriba (el mas chico que alcance a cubrirlo). Verificado contra
# 2 casos reales de Litoplan + los 3 formatos ya documentados para
# Agenda Ejecutiva - los 4 numeros salen de esta misma formula.
CARATULA_TAMANOS_MAQUINA_CM = [
    (21.5, 28), (25, 35), (33, 50), (42, 28), (50, 70),
]

# Semidura = colaminado (2+ capas). Blanda = 1 sola capa.
COLAMINADO_COP_M2 = 900  # incluye pegante + mano de obra (confirmado por Conde)
PLASTIFICADO_COP_M2 = 950  # 1 cara (corregido de 900 a 950 por Conde)
PLASTIFICADO_2CARAS_COP_M2 = 1900
PLASTIFICADO_PISO_COP = 30_000
UV_PARCIAL_COP_M2 = 1950
UV_PARCIAL_PISO_COP = 80_000

TROQUEL_TAPA_COP_POR_MILLAR = 35_000  # acabado adicional opcional, poco comun

# Estampado (Hot Stamping / Foil) - encontrado en el indice maestro, no
# estaba en el diccionario original de Cuadernos.
ESTAMPADO_COP_POR_GOLPE = 350
ESTAMPADO_ARRANQUE_COP = 80_000
ESTAMPADO_MINIMO_COP = 80_000

# Umbral de Cuadernos Tapa Dura: desde esta cantidad se agrega 1 tinta
# adicional en el retiro de la caratula (marco para el armado).
# Confirmado por Conde.
TAPA_DURA_UMBRAL_TINTA_RETIRO_UNIDADES = 150

# ============================================================
# TACO / INTERIORES
# ============================================================

RECARGO_TINTA_CUADRICULA_COP = 20_000  # fijo, cuando el taco lleva cuadricula

# ============================================================
# GUARDAS E INSERTOS
# ============================================================

GUARDAS_CANTIDAD_DEFAULT = 2  # una a cada lado (confirmado por Conde)
GUARDAS_SUSTRATO_DEFAULT = ("Propalcote", 150)  # 90% de los casos
GUARDAS_PISO_OT_COP = 20_000  # por toda la OT, no por unidad

LEVANTE_MANUAL_INSERTO_COP_HOJA = 10  # por hoja de inserto, por cuaderno

# ============================================================
# ARMADO / ENCUADERNACION
# ============================================================

ANILLO_DOBLE_O = {
    "media_carta": {"base_80h": 900, "variacion_hoja": 5.0},
    "agenda": {"base_80h": 990, "variacion_hoja": 5.5},
    "carta": {"base_80h": 1700, "variacion_hoja": 10.0},
}
REFILE_CUADERNO_ANILLADO_COP = 100
LIMPIEZA_COLBON_CUADERNO_ANILLADO_COP = 180

COSTURA_AGENDA_EJECUTIVA = {
    "media_carta": {"base_80h": 4100, "variacion_hoja": 10.0},
    "agenda": {"base_80h": 4400, "variacion_hoja": 15.0},
    "carta": {"base_80h": 5800, "variacion_hoja": 55.0},
}
ESPESOR_LOMO_MM_POR_HOJA = 0.13
# Refile de Agenda Ejecutiva va INCLUIDO en el precio de costura (confirmado).

ESCOLAR_ENCUADERNACION_COP = {"grapa": 250, "hilo": 450, "hilo_cinta": 650}
GRAFADO_ESCOLAR_COP_POR_MILLAR = 35_000
# Refile de Escolar va INCLUIDO en el precio de costura (confirmado).

HOTMELT_BASE_COP_UNIDAD = 430
HOTMELT_CM_REFERENCIA = 21  # calibrado al ancho de Media Carta
HOTMELT_PISO_OT_COP = 90_000
COLBON_COP_UNIDAD = 250
COLBON_PISO_OT_COP = 30_000
GRAFADO_LIBRETAS_COP_FIJO = 35_000
# Libretas (Hotmelt/Colbon) tambien suman refile estandar + grafado, automatico.

ANILLADO_CORTO_FACTOR = 1.30  # para libretas mas pequenas que el catalogo

# ============================================================
# MOTOR DE IMPRESION
# ============================================================

DIGITAL_MAX_FORMATO_CM = (33, 50)  # confirmado por Conde: maximo Konica 33x50cm
DIGITAL_GRAMAJE_MAX = 240
DIGITAL_PINZA_MM = 5  # se descuenta de un lado en cada uno de los 3 tamanos digitales

DIGITAL_CLIC_COP = {
    "carta": {"color": 750, "negro": 350},          # hoja <= 21.5x28
    "octavo": {"color": 900, "negro": 450},          # hoja <= 25x35
    "pliego_max": {"color": 1000, "negro": 550},     # hoja <= 50x33
}
DIGITAL_MERMA_HOJAS = {"policromia": 20, "negro": 10, "promedio": 18}
DIGITAL_SEMICORTE_COP = 1500

DIGITAL_DESCUENTO_VOLUMEN = [
    (9, 0.0), (50, 0.10), (200, 0.18), (400, 0.26), (float("inf"), 0.30)
]

OFFSET_CTP_COP = {"medio_pliego": 22_000, "cuarto": 11_000, "octavo": 9_000}  # medio_pliego corregido con Litoplan real (era 21.000)
OFFSET_CTP_VIDA_UTIL_IMPRESIONES = 25_000
OFFSET_CTP_REPETITIVO_PCT = 0.30

OFFSET_MILLAR_COP = {
    "medio_pliego_color": 25_000,
    "medio_pliego_policromia_4x0": 100_000,
    "cuarto": 16_000,
    "octavo": 12_000,
}
OFFSET_RECARGO_PANTONE_COP = 50_000
# El recargo de Fondo Pleno/Plaston depende del tamano de la maquina:
# medio pliego (50x70) = $90.000; cuarto (35x50) y octavo (25x35) =
# $50.000 cada uno (los 3 valores confirmados por Conde).
OFFSET_RECARGO_FONDO_PLENO_COP = {
    "medio_pliego": 90_000,
    "cuarto": 50_000,
    "octavo": 50_000,
}
RECARGO_TINTA_CUADRICULA_MILLAR_COP = 20_000  # tarifa preferencial cuadricula uniforme

OFFSET_MERMA_HOJAS = [(1000, 100), (2000, 130), (float("inf"), 160)]
OFFSET_MERMA_FACTOR_2_MAS_TINTAS = 1.30

# Margen de pinzas que se descuenta antes de cubicar cuantas piezas caben
# en medio pliego (confirmado por Conde).
PINZA_ENTRADA_MM = 12
PINZA_SALIDA_MM = 5

# Lineas/encuadernaciones que pliegan el papel al centro (se monta por
# PAREJAS que luego se doblan) vs las que son hoja suelta (se monta
# individual, sin doblar). Confirmado por Conde.
LINEAS_CON_PLIEGUE = {"escolar", "agenda_ejecutiva"}
ENCUADERNACIONES_LIBRETAS_CON_PLIEGUE = {"hotmelt", "colbon"}

# El taco siempre es un poco mas chico que la tapa (la tapa debe cubrirlo
# totalmente): confirmado por Conde, ~0.4cm menos por lado.
TACO_REDUCCION_CM = 0.4
