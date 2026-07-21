"""
Motor de calculo de cotizacion - Linea Editorial y Cuadernos (Fase 1).

Funcion pura: recibe los parametros de un pedido y devuelve el costo de
fabricacion desglosado, el precio de venta y el IVA. No hay interfaz,
no hay base de datos - solo la logica de calculo, para poder validarla
contra casos reales de Litoplan antes de construir nada mas.

Todas las reglas de negocio referenciadas aqui estan documentadas con su
fuente en solicitud_claude_code_motor_cotizacion_cuadernos.md.
"""

import math

import datos_maestros as D


# ============================================================
# UTILIDADES DE CUBICAJE (cuantas piezas caben en un pliego)
# ============================================================

def piezas_por_pliego(pieza_ancho, pieza_alto, pliego_ancho, pliego_alto):
    """Cuantas piezas rectangulares caben en un pliego, probando las 2
    orientaciones de la pieza (sin rotar el pliego)."""
    sin_rotar = math.floor(pliego_ancho / pieza_ancho) * math.floor(pliego_alto / pieza_alto)
    rotada = math.floor(pliego_ancho / pieza_alto) * math.floor(pliego_alto / pieza_ancho)
    return max(sin_rotar, rotada, 0)


def requiere_pliegue(linea, tipo_encuadernacion):
    if linea in D.LINEAS_CON_PLIEGUE:
        return True
    if linea == "libretas":
        return tipo_encuadernacion in D.ENCUADERNACIONES_LIBRETAS_CON_PLIEGUE
    return False


def piezas_por_medio_pliego_offset(pieza_ancho, pieza_alto, pliegue=False):
    """Cuantas paginas de taco caben en MEDIO PLIEGO, evaluando las dos
    opciones de pliego madre (70x100 partido a la mitad = 70x50, o 60x90
    partido a la mitad = 60x45) y devolviendo la que rinda mejor - mismo
    principio de "cubicaje dinamico" que ya se usa para el papel, aplicado
    ahora tambien al tamano de impresion. Se descuenta el margen de pinzas
    (entrada 12mm + salida 5mm = 17mm).

    pieza_ancho/alto deben ser el tamano REAL del taco (ya con la reduccion
    de D.TACO_REDUCCION_CM aplicada respecto a la tapa).

    Si pliegue=True, las hojas se montan de a PAREJAS (no como un tamano
    doble): se cubica el bloque de la pareja y se multiplica x2 al final
    para obtener las hojas individuales reales. Confirmado por Conde con
    dos ejemplos reales: sin pliegue (cuaderno anillado), una pieza de
    21x14 cabe 10 veces en 70x50; con pliegue (escolar/agenda), la misma
    pieza cabe 8 veces (en parejas) en 60x45, que es el mejor de los dos."""
    margen_cm = (D.PINZA_ENTRADA_MM + D.PINZA_SALIDA_MM) / 10
    if pliegue:
        corto, largo = sorted((pieza_ancho, pieza_alto))
        bloque_ancho, bloque_alto = corto * 2, largo
    else:
        bloque_ancho, bloque_alto = pieza_ancho, pieza_alto

    opciones = []
    for pliego_ancho, pliego_alto in D.PLIEGOS_CM.values():
        medio_alto = pliego_alto / 2
        n = piezas_por_pliego(bloque_ancho, bloque_alto, pliego_ancho, medio_alto - margen_cm)
        if n > 0:
            desperdicio = 1 - (n * bloque_ancho * bloque_alto) / (pliego_ancho * medio_alto)
            opciones.append((desperdicio, n))
    if not opciones:
        return 1
    opciones.sort(key=lambda x: x[0])
    n_bloques = opciones[0][1]
    return n_bloques * 2 if pliegue else n_bloques


def tamano_montaje_caratula(ancho, alto, tapa_tipo):
    """La caratula se imprime SIEMPRE como una sola pieza continua
    (caratula + contracaratula juntas). Si es tapa Dura, se le suma el
    embone (~1.5cm por lado, papel que envuelve el canto del carton) a
    ambas dimensiones ANTES de doblar. Confirmado por Conde con ejemplo
    real: 24x17 dura -> embone da 27x20 -> doblado da 40x27."""
    corto, largo = sorted((ancho, alto))
    if tapa_tipo == "dura":
        corto += D.CARATULA_EMBONE_TAPA_DURA_CM * 2
        largo += D.CARATULA_EMBONE_TAPA_DURA_CM * 2
    return (corto * 2, largo)


def redondear_a_tamano_maquina_caratula(ancho, alto):
    """Redondea el montaje de caratula al tamano de maquina mas chico
    que alcance a cubrirlo, de la lista de formatos conocidos."""
    a, b = sorted((ancho, alto))
    candidatos = []
    for mw, mh in D.CARATULA_TAMANOS_MAQUINA_CM:
        ma, mb = sorted((mw, mh))
        if a <= ma and b <= mb:
            candidatos.append((ma * mb, ma, mb))
    if not candidatos:
        return (ancho, alto)  # no hay formato de maquina que alcance, se usa el propio
    candidatos.sort()
    _, ma, mb = candidatos[0]
    return (ma, mb)


def mejor_pliego_para_pieza(pieza_ancho, pieza_alto, sustrato_nombre, gramaje):
    """Cubicaje dinamico: evalua 60x90 y 70x100 y devuelve el que rinda
    mas barato por pieza (mas piezas por pliego / precio del pliego)."""
    precios = D.SUSTRATOS.get((sustrato_nombre, gramaje))
    if precios is None:
        raise ValueError(f"Sustrato no encontrado: {sustrato_nombre} {gramaje}g")

    mejores = []
    for formato, (pw, ph) in D.PLIEGOS_CM.items():
        precio_pliego = precios.get(formato)
        if precio_pliego is None:
            continue
        n = piezas_por_pliego(pieza_ancho, pieza_alto, pw, ph)
        if n == 0:
            continue
        costo_por_pieza = precio_pliego / n
        mejores.append((costo_por_pieza, formato, n, precio_pliego))

    if not mejores:
        raise ValueError(
            f"La pieza {pieza_ancho}x{pieza_alto}cm no cabe en ningun pliego "
            f"disponible para {sustrato_nombre} {gramaje}g"
        )
    mejores.sort(key=lambda x: x[0])
    costo_por_pieza, formato, n, precio_pliego = mejores[0]
    return {"formato": formato, "piezas_por_pliego": n, "costo_por_pieza": costo_por_pieza}


def area_cm2(ancho, alto):
    return ancho * alto


# ============================================================
# TAMANO: catalogo mas cercano y factor de escalado
# ============================================================

def tamano_catalogo_mas_cercano(ancho, alto):
    """Devuelve la clave de catalogo (media_carta/agenda/carta) mas
    cercana por AREA al tamano pedido, y si coincide exacto."""
    area_pedida = area_cm2(ancho, alto)
    mejor = None
    mejor_dif = None
    for clave, (a, b) in D.TAMANOS_CATALOGO_CM.items():
        area_cat = area_cm2(a, b)
        dif = abs(area_cat - area_pedida)
        if mejor_dif is None or dif < mejor_dif:
            mejor_dif = dif
            mejor = clave
    coincide_exacto = mejor_dif == 0 or math.isclose(
        area_cm2(*D.TAMANOS_CATALOGO_CM[mejor]), area_pedida, rel_tol=1e-6
    )
    return mejor, coincide_exacto


def factor_escalado_tamano(ancho, alto, catalogo_clave):
    """Costo_custom = Costo_catalogo x (Area_custom/Area_catalogo) x 1.30
    (regla confirmada para tamanos que no calzan exacto con el catalogo)."""
    area_pedida = area_cm2(ancho, alto)
    area_cat = area_cm2(*D.TAMANOS_CATALOGO_CM[catalogo_clave])
    return (area_pedida / area_cat) * D.FACTOR_MANIPULACION_TAMANO_CUSTOM


# ============================================================
# MOTOR DE IMPRESION: decide via (digital/offset) y calcula costo
# ============================================================

def _clase_formato_digital(ancho, alto):
    a, b = sorted((ancho, alto))
    if a <= 21.5 and b <= 28:
        return "carta"
    if a <= 25 and b <= 35:
        return "octavo"
    if a <= 33 and b <= 50:
        return "pliego_max"
    return None  # no cabe en digital


def elegible_digital(ancho, alto, gramaje, cantidad_unidades=1):
    if gramaje > D.DIGITAL_GRAMAJE_MAX:
        return False
    if cantidad_unidades > 200:
        # Lotes masivos (>200 unidades) fuerzan la ruta offset.
        return False
    return _clase_formato_digital(ancho, alto) is not None


def _descuento_volumen_digital(cantidad_unidades):
    """El descuento de volumen se aplica sobre la CANTIDAD DE UNIDADES del
    pedido, no sobre el numero de hojas impresas."""
    for tope, pct in D.DIGITAL_DESCUENTO_VOLUMEN:
        if cantidad_unidades <= tope:
            return pct
    return 0.0


DIGITAL_FORMATOS_CM = {
    "carta": (21.5, 28),
    "octavo": (25, 35),
    "pliego_max": (33, 50),
}


def costo_impresion_digital(n_paginas, caras, es_color, ancho, alto, cantidad_unidades=1):
    """n_paginas: paginas fisicas a imprimir (ya incluye cantidad de
    cuadernos x hojas por cuaderno). caras: 1 o 2 (1x0 o 1x1/2x2).

    Un "clic" digital es una pasada del pliego MAXIMO de esa categoria
    (carta/octavo/pliego_max) por la maquina - varias paginas chicas
    caben imposicionadas en un mismo clic, igual que el cubicaje de
    offset. Antes se cobraba 1 clic completo por cada pagina chica, lo
    que disparaba el costo digital muy por encima de offset siempre.

    Se descuenta la pinza de la Konica (5mm de un lado) de cada uno de
    los 3 tamanos antes de cubicar, confirmado por Conde: en pliego_max
    (33x50) el area util queda en 32.5x49.5."""
    clase = _clase_formato_digital(ancho, alto)
    if clase is None:
        return None
    sheet_w, sheet_h = DIGITAL_FORMATOS_CM[clase]
    margen_cm = D.DIGITAL_PINZA_MM / 10
    piezas_por_clic = piezas_por_pliego(ancho, alto, sheet_w, sheet_h - margen_cm)
    if piezas_por_clic == 0:
        piezas_por_clic = 1
    n_clics = math.ceil(n_paginas / piezas_por_clic) * caras
    precio_clic = D.DIGITAL_CLIC_COP[clase]["color" if es_color else "negro"]
    descuento = _descuento_volumen_digital(cantidad_unidades)
    total = n_clics * precio_clic * (1 - descuento)
    return {
        "total": total, "via": "digital", "n_clics": n_clics,
        "precio_clic": precio_clic, "descuento_pct": descuento,
    }


OFFSET_FORMATOS_CM = {
    "octavo": (25, 35),
    "cuarto": (35, 50),
    "medio_pliego": (50, 70),
}


def _fraccion_pliego_offset(ancho, alto, es_policromia=False):
    """Las maquinas chicas (octavo) solo manejan hasta 2 tintas. Policromia
    (4 tintas / full color) SIEMPRE va en cuarto o medio pliego como
    minimo, nunca en octavo, sin importar que la pieza sea chica.
    Confirmado por Conde."""
    a, b = sorted((ancho, alto))
    if a <= 25 and b <= 35 and not es_policromia:
        return "octavo"
    if a <= 35 and b <= 50:
        return "cuarto"
    return "medio_pliego"


def costo_impresion_offset(n_piezas_finales, cant_tintas, es_policromia, ancho, alto,
                            cuadricula_uniforme=False, pliegue=False):
    """Costo de planchas (CtP) + millar/pasada + recargos, para un tiraje
    de n_piezas_finales piezas ya cortadas a su tamano final.

    El "millar" se cobra por cada 1000 PASADAS DE PLIEGO (o su fraccion),
    no por cada 1000 piezas chicas terminadas - varias piezas caben
    imposicionadas en un mismo pliego, igual que en digital. Antes se
    cobraba 1 pasada completa por cada pieza chica, disparando el costo.

    Escudo para Cuadriculas y Tirajes Largos: si el interior es una
    cuadricula/diseno uniforme (se repite igual en todas las hojas), 1
    SOLA plancha (tiro/retiro comparten plancha ya que el diseno es igual
    en ambas caras) y tarifa de millar preferencial de $20.000. Esa tarifa
    de $20.000 es preferencial CONTRA medio pliego ($25.000) - pero es mas
    CARA que las tarifas normales de octavo/cuarto ($9-16.000), asi que
    solo se usa si de verdad sale mas barata que la tarifa estandar de esa
    fraccion (nunca puede ser peor que la ruta normal)."""
    fraccion = _fraccion_pliego_offset(ancho, alto, es_policromia=es_policromia)
    sheet_w, sheet_h = OFFSET_FORMATOS_CM[fraccion]
    piezas_por_pasada = piezas_por_pliego(ancho, alto, sheet_w, sheet_h)
    if piezas_por_pasada == 0:
        piezas_por_pasada = 1
    n_pasadas = math.ceil(n_piezas_finales / piezas_por_pasada)
    # Los millares se cobran completos, no en proporcion (1.27 millares
    # se cobra como 2). Confirmado por Conde.
    millares = math.ceil(n_pasadas / 1000)

    n_planchas_normal = max(cant_tintas, 1)
    costo_ctp_normal = D.OFFSET_CTP_COP[fraccion] * n_planchas_normal
    if fraccion == "medio_pliego" and es_policromia:
        tarifa_millar_normal = D.OFFSET_MILLAR_COP["medio_pliego_policromia_4x0"]
        costo_millar_normal = tarifa_millar_normal * millares
    elif fraccion == "medio_pliego":
        tarifa_millar_normal = D.OFFSET_MILLAR_COP["medio_pliego_color"] * n_planchas_normal
        costo_millar_normal = tarifa_millar_normal * millares
    else:
        tarifa_millar_normal = D.OFFSET_MILLAR_COP[fraccion] * n_planchas_normal
        costo_millar_normal = tarifa_millar_normal * millares
    costo_normal = costo_ctp_normal + costo_millar_normal
    detalle_normal = {
        "total": costo_normal, "via": f"offset ({fraccion})",
        "n_planchas": n_planchas_normal, "costo_ctp_unitario": D.OFFSET_CTP_COP[fraccion],
        "costo_planchas": costo_ctp_normal, "n_millares": millares,
        "costo_millar_unitario": tarifa_millar_normal, "costo_millares": costo_millar_normal,
    }

    if not cuadricula_uniforme:
        return detalle_normal

    # Cuadricula/diseno uniforme: SIEMPRE va en medio pliego real (50x70,
    # con el margen de pinzas descontado - confirmado por Conde), con 1
    # sola plancha (tiro/retiro comparten plancha ya que el diseno se
    # repite igual en ambas caras) y tarifa de millar preferencial $20.000.
    piezas_medio_pliego = piezas_por_medio_pliego_offset(ancho, alto, pliegue=pliegue)
    n_pasadas_mp = math.ceil(n_piezas_finales / max(piezas_medio_pliego, 1))
    millares_mp = math.ceil(n_pasadas_mp / 1000)  # millar completo, no proporcion
    costo_ctp_cuadricula = D.OFFSET_CTP_COP["medio_pliego"]  # 1 sola plancha, no x tintas
    costo_millar_cuadricula = D.RECARGO_TINTA_CUADRICULA_MILLAR_COP * millares_mp
    costo_cuadricula = costo_ctp_cuadricula + costo_millar_cuadricula
    detalle_cuadricula = {
        "total": costo_cuadricula, "via": "offset (medio pliego, cuadricula)",
        "n_planchas": 1, "costo_ctp_unitario": D.OFFSET_CTP_COP["medio_pliego"],
        "costo_planchas": costo_ctp_cuadricula, "n_millares": millares_mp,
        "costo_millar_unitario": D.RECARGO_TINTA_CUADRICULA_MILLAR_COP, "costo_millares": costo_millar_cuadricula,
    }
    return detalle_cuadricula


def costo_impresion_unico_por_pagina(paginas_unicas, cantidad, ancho, alto, es_color, pliegue=False):
    """Diseno unico por pagina (como un libro / insertos con contenido
    distinto cada uno): no se puede reutilizar la misma plancha para
    tiro/retiro. 1 plancha por cada "posicion" de pagina que quepa en el
    medio pliego, y cada plancha corre tantas veces como cuadernos se
    pidan. Formula y cifras confirmadas por Conde."""
    piezas_por_plancha = piezas_por_medio_pliego_offset(ancho, alto, pliegue=pliegue)
    n_planchas = math.ceil(paginas_unicas / max(piezas_por_plancha, 1))
    n_impresiones = n_planchas * cantidad
    millar_rate = D.OFFSET_MILLAR_COP["medio_pliego_policromia_4x0"] if es_color else D.RECARGO_TINTA_CUADRICULA_MILLAR_COP
    n_millares = math.ceil(n_impresiones / 1000)
    costo_planchas = n_planchas * D.OFFSET_CTP_COP["medio_pliego"]
    costo_millares = n_millares * millar_rate
    total = costo_planchas + costo_millares
    return {
        "total": total, "via": f"offset ({n_planchas} planchas, unico)", "n_planchas": n_planchas,
        "costo_ctp_unitario": D.OFFSET_CTP_COP["medio_pliego"], "costo_planchas": costo_planchas,
        "n_millares": n_millares, "costo_millar_unitario": millar_rate, "costo_millares": costo_millares,
    }


def merma_offset_hojas(n_hojas_fisicas, cant_tintas):
    for tope, merma in D.OFFSET_MERMA_HOJAS:
        if n_hojas_fisicas <= tope:
            base = merma
            break
    else:
        base = D.OFFSET_MERMA_HOJAS[-1][1]
    if cant_tintas >= 2:
        base *= D.OFFSET_MERMA_FACTOR_2_MAS_TINTAS
    return base


def merma_digital_hojas(es_policromia):
    return D.DIGITAL_MERMA_HOJAS["policromia" if es_policromia else "negro"]


# ============================================================
# FONDO DE SEGURIDAD / ESCUDO DE BAJOS MONTOS
# ============================================================

def tramo_fondo_seguridad(costo_fabricacion, linea):
    for tope, pct in D.FONDO_SEGURIDAD_TRAMOS:
        if costo_fabricacion <= tope:
            if tope == float("inf") and linea == "agenda_ejecutiva":
                return D.FONDO_SEGURIDAD_TRAMO_SUPERIOR_AGENDA_EJECUTIVA
            return pct
    return D.FONDO_SEGURIDAD_TRAMOS[-1][1]


def diseno_y_preprensa(monto_ot):
    if monto_ot < D.ESCUDO_BAJOS_MONTOS_UMBRAL:
        return D.DISENO_COSTO_REDUCIDO, 0
    return D.DISENO_COSTO_NORMAL, D.PREPRENSA_COSTO_NORMAL


def descuento_volumen_armado_agenda_ejecutiva(cantidad):
    """Tramos de 100 unidades desde 200, +1% cada tramo, tope 10%.
    Confirmado por Conde (2026-07-21)."""
    for tope, pct in D.ARMADO_AGENDA_EJECUTIVA_DESCUENTO_TRAMOS:
        if cantidad <= tope:
            return pct
    return D.ARMADO_AGENDA_EJECUTIVA_DESCUENTO_TRAMOS[-1][1]


def espesor_lomo_cm(taco_hojas):
    """Grosor del lomo = cantidad de hojas del taco x 0.13mm/hoja,
    convertido a cm. Confirmado por Conde (2026-07-21)."""
    return taco_hojas * D.ESPESOR_LOMO_MM_POR_HOJA / 10


def costo_empaque(cantidad, cat_clave, linea_producto):
    """$3.000 por caja de carton, con capacidad segun tamano y si es Escolar
    o no. Confirmado por Conde (2026-07-21): usar la tabla del Dossier tal
    cual, aunque el numero de Litoplan no siempre coincida exacto."""
    columna = "escolar" if linea_producto == "escolar" else "no_escolar"
    capacidad = D.EMPAQUE_CAPACIDAD_CAJA[cat_clave][columna]
    n_cajas = math.ceil(cantidad / capacidad)
    return n_cajas * D.EMPAQUE_CAJA_COP


def costo_transporte(base_cop, linea_producto):
    """Ruta 3 (Cuadernos y Agendas Pesadas): % escalonado sobre el subtotal
    previo a utilidad/ventas, con piso de $45.000. Agenda Ejecutiva tiene
    descuento de -0.5% en el primer tramo."""
    for tope, pct in D.TRANSPORTE_TRAMOS:
        if base_cop <= tope:
            if tope == D.TRANSPORTE_TRAMOS[0][0] and linea_producto == "agenda_ejecutiva":
                pct -= D.TRANSPORTE_DESCUENTO_AGENDA_EJECUTIVA_PRIMER_TRAMO
            return max(base_cop * pct, D.TRANSPORTE_PISO_COP)
    return max(base_cop * D.TRANSPORTE_TRAMOS[-1][1], D.TRANSPORTE_PISO_COP)


def costo_sherpa(total_paginas_insertos):
    """Muestra de color entregada al cliente: piso $20.000, sube $1.000 por
    cada pagina de inserto, tope $40.000. Fija por OT, no escala con la
    cantidad de cuadernos. Confirmado por Conde (2026-07-21)."""
    return min(
        D.SHERPA_BASE_COP + D.SHERPA_COP_POR_PAGINA_INSERTO * total_paginas_insertos,
        D.SHERPA_MAXIMO_COP,
    )


def precio_venta_desde_subtotal(subtotal, utilidad_pct=0.40, ventas_pct=0.0, agencia_pct=0.0):
    """CORREGIDO (2026-07-15): la formula real de Litoplan NO es un
    divisor (costo / (1-%)) - es una cascada MULTIPLICATIVA de 3
    porcentajes independientes (utilidad, ventas, agencia), cada uno
    editable a mano por cotizacion segun cliente/cantidad/complejidad.
    Confirmado reconstruyendo 2 casos reales desde cero en Litoplan
    (subtotales $1.934.925->$2.716.700 y $2.976.625->$4.167.200,
    ambos coinciden con esta formula, no con el divisor). Conde no usa
    el campo "agencia" (queda en 0 siempre). Los defaults (40% utilidad,
    0% ventas) son un promedio de los 2 casos reales conocidos - no hay
    un default fijo real, se ajusta a mano en cada cotizacion."""
    return subtotal * (1 + utilidad_pct) * (1 + ventas_pct) * (1 + agencia_pct)
