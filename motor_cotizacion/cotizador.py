"""
Funcion principal de cotizacion para la linea Editorial y Cuadernos.

cotizar_cuaderno(...) -> dict con el desglose completo del costo, el
precio de venta y el IVA para UN pedido. Ademas de los totales por
seccion (tapa, taco, guardas, insertos, armado), devuelve un "detalle"
con las planchas y millares usados en cada trabajo de impresion, para
poder comparar linea por linea contra como se arma una cotizacion en
Litoplan (ej. "4 planchas $44.000", "1 millar policromia $60.000").

Ver solicitud_claude_code_motor_cotizacion_cuadernos.md para el detalle
y la fuente de cada regla de negocio usada aqui.
"""

import math

import datos_maestros as D
import motor as M


def cotizar_cuaderno(
    linea,
    ancho_cm,
    alto_cm,
    tapa_tipo,
    tapa_sustrato_capas,
    tapa_acabado,
    taco_hojas,
    taco_sustrato,
    taco_modo,
    taco_diseno,
    encuadernacion,
    cantidad,
    guardas_cantidad=D.GUARDAS_CANTIDAD_DEFAULT,
    guardas_sustrato=None,
    guardas_impresion=False,
    guardas_tintas=0,
    guardas_plastificado=False,
    insertos=None,
    carton_calibre_mm=1.5,
    tapa_troquelada=False,
    tapa_es_color=True,
    tapa_fondo_pleno=False,
    litoplan_esperado=None,
    nombre_caso="",
):
    """
    linea: "escolar" | "cuaderno_anillado" | "agenda_ejecutiva" | "libretas"
    tapa_tipo: "dura" | "semidura" | "blanda"
    tapa_sustrato_capas: lista de (nombre, gramaje) - 1 elemento si blanda,
        2 si semidura (colaminado); se ignora si tapa_tipo == "dura"
        (la tapa dura siempre usa el forro fijo Propalcote 150g)
    tapa_acabado: dict {"plastificado": "brillante"/"mate"/None, "uv_parcial": bool}
    taco_modo: "0x0" | "1x0" | "1x1" | "2x2"
    taco_diseno: "uniforme" | "unico_por_pagina"
    encuadernacion: dict, forma depende de la linea:
        escolar -> {"tipo": "grapa"/"hilo"/"hilo_cinta"}
        cuaderno_anillado -> {"tipo": "anillo_doble_o"}
        agenda_ejecutiva -> {"tipo": "costura"}
        libretas -> {"tipo": "anillo_doble_o"/"hotmelt"/"colbon"}
    insertos: lista de {"cantidad": n_hojas, "sustrato": (nombre,gramaje),
        "tintas": n, "caras": 1 o 2} o None
    """
    guardas_sustrato = guardas_sustrato or D.GUARDAS_SUSTRATO_DEFAULT
    insertos = insertos or []

    cat_clave, coincide_exacto = M.tamano_catalogo_mas_cercano(ancho_cm, alto_cm)
    factor_escala = 1.0 if coincide_exacto else M.factor_escalado_tamano(ancho_cm, alto_cm, cat_clave)

    desglose = {}
    detalle = {}  # planchas/millares por trabajo de impresion, para el reporte estilo Litoplan

    # ---------------- TAPA ----------------
    costo_tapa_material = 0.0
    costo_tapa_armado = 0.0
    costo_tapa_acabados = 0.0

    piezas_tapa = 2  # tapa + contratapa

    if tapa_tipo == "dura":
        carton_precio = D.CARTON_1_5MM_COP if carton_calibre_mm == 1.5 else D.CARTON_2_0MM_COP
        # El carton no tiene tabla de formatos; se asume pliego 70x100 para cubicar.
        n_por_pliego_carton = M.piezas_por_pliego(ancho_cm, alto_cm, 70, 100)
        costo_tapa_material += (carton_precio / max(n_por_pliego_carton, 1)) * piezas_tapa

        forro = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *D.FORRO_TAPA_DURA)
        costo_tapa_material += forro["costo_por_pieza"] * piezas_tapa

        armado_base = D.ARMADO_FORRADO_TAPA_DURA_COP[cat_clave]
        costo_tapa_armado = armado_base * factor_escala

        sustrato_impresion = D.FORRO_TAPA_DURA

    elif tapa_tipo == "semidura":
        if len(tapa_sustrato_capas) != 2:
            raise ValueError("Tapa semidura requiere 2 capas (colaminado)")
        costo_capas = 0.0
        for capa in tapa_sustrato_capas:
            r = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *capa)
            costo_capas += r["costo_por_pieza"] * piezas_tapa
        costo_tapa_material += costo_capas

        area_colaminado_m2 = (M.area_cm2(ancho_cm, alto_cm) * piezas_tapa) / 10_000
        costo_tapa_acabados += area_colaminado_m2 * D.COLAMINADO_COP_M2

        sustrato_impresion = tapa_sustrato_capas[0]

    else:  # blanda
        if len(tapa_sustrato_capas) != 1:
            raise ValueError("Tapa blanda requiere 1 capa")
        capa = tapa_sustrato_capas[0]
        r = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *capa)
        costo_tapa_material += r["costo_por_pieza"] * piezas_tapa
        sustrato_impresion = capa

    # Impresion de tapa: 4x1 para Agenda Ejecutiva (caratula continua), 4x0 el resto.
    caras_impresion_tapa = 2 if linea == "agenda_ejecutiva" else 1
    gramaje_tapa = sustrato_impresion[1]
    n_hojas_impresion_tapa = piezas_tapa * cantidad

    # Fondo Pleno/Plaston (fondo solido a 1 tinta o mas cubriendo la tapa):
    # recargo fijo (depende del tamano de maquina) + 1 plancha fisica
    # adicional; tambien fuerza ruta offset (fondos solidos no van en
    # digital). Encontrado en el diccionario original ("Recargos de
    # Tintas"), no se estaba aplicando.
    if tapa_fondo_pleno:
        fraccion_tapa = M._fraccion_pliego_offset(ancho_cm, alto_cm)
        det_tapa = M.costo_impresion_offset(n_hojas_impresion_tapa, 4 if tapa_es_color else 1, tapa_es_color, ancho_cm, alto_cm)
        recargo_fondo = D.OFFSET_RECARGO_FONDO_PLENO_COP[fraccion_tapa]
        plancha_extra = D.OFFSET_CTP_COP[fraccion_tapa]
        det_tapa["total"] += recargo_fondo + plancha_extra
        det_tapa["n_planchas"] += 1
        det_tapa["costo_planchas"] += plancha_extra
        det_tapa["recargo_fondo_pleno"] = recargo_fondo
        det_tapa["via"] = f"offset (fondo pleno {fraccion_tapa})"
    elif M.elegible_digital(ancho_cm, alto_cm, gramaje_tapa, cantidad):
        det_digital = M.costo_impresion_digital(n_hojas_impresion_tapa, caras_impresion_tapa, tapa_es_color, ancho_cm, alto_cm, cantidad)
        det_offset = M.costo_impresion_offset(n_hojas_impresion_tapa, 4 if tapa_es_color else 1, tapa_es_color, ancho_cm, alto_cm)
        det_tapa = det_digital if (det_digital is not None and det_digital["total"] < det_offset["total"]) else det_offset
    else:
        det_tapa = M.costo_impresion_offset(n_hojas_impresion_tapa, 4 if tapa_es_color else 1, tapa_es_color, ancho_cm, alto_cm)

    costo_tapa_impresion = det_tapa["total"]
    via_tapa = det_tapa["via"]
    detalle["tapa_impresion"] = det_tapa

    # Acabados de tapa: plastificado O UV parcial (el UV parcial "arrastra
    # plastificado mate de base" segun el dossier, es decir que INCLUYE el
    # plastificado - no se cobran los dos por separado). Cada uno tiene su
    # propio piso minimo, aplicado UNA vez por toda la OT, no por unidad.
    area_tapa_unidad_m2 = (M.area_cm2(ancho_cm, alto_cm) * piezas_tapa) / 10_000
    area_tapa_total_m2 = area_tapa_unidad_m2 * cantidad

    costo_tapa_acabados_total = costo_tapa_acabados * cantidad  # colaminado (si semidura)
    if tapa_acabado.get("uv_parcial"):
        costo_tapa_acabados_total += max(area_tapa_total_m2 * D.UV_PARCIAL_COP_M2, D.UV_PARCIAL_PISO_COP)
    elif tapa_acabado.get("plastificado"):
        costo_tapa_acabados_total += max(area_tapa_total_m2 * D.PLASTIFICADO_COP_M2, D.PLASTIFICADO_PISO_COP)

    if tapa_troquelada:
        piezas_troquelables = piezas_tapa * cantidad
        costo_tapa_acabados_total += math.ceil(piezas_troquelables / 1000) * D.TROQUEL_TAPA_COP_POR_MILLAR

    desglose["tapa_material"] = costo_tapa_material * cantidad
    desglose["tapa_impresion"] = costo_tapa_impresion
    desglose["tapa_armado_forrado"] = costo_tapa_armado * cantidad
    desglose["tapa_acabados"] = costo_tapa_acabados_total

    # ---------------- TACO ----------------
    hojas_efectivas = taco_hojas
    if taco_hojas % 4 != 0:
        hojas_efectivas = ((taco_hojas // 4) + 1) * 4  # escudo de paginacion: multiplos de 4

    r_taco = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *taco_sustrato)
    costo_taco_material = r_taco["costo_por_pieza"] * hojas_efectivas * cantidad

    pliega_taco = M.requiere_pliegue(linea, encuadernacion["tipo"])
    # El taco es mas chico que la tapa (la tapa lo debe cubrir totalmente).
    taco_ancho = ancho_cm - D.TACO_REDUCCION_CM
    taco_alto = alto_cm - D.TACO_REDUCCION_CM

    costo_taco_impresion = 0.0
    det_taco = None

    if taco_modo != "0x0":
        caras = 2 if taco_modo in ("1x1", "2x2") else 1
        es_color = taco_modo == "2x2"
        n_hojas_fisicas = hojas_efectivas * cantidad

        if taco_diseno == "unico_por_pagina":
            paginas_unicas_por_cuaderno = hojas_efectivas * caras
            det_taco = M.costo_impresion_unico_por_pagina(
                paginas_unicas_por_cuaderno, cantidad, taco_ancho, taco_alto, es_color, pliegue=pliega_taco
            )
            costo_taco_impresion = det_taco["total"]
            via_taco = det_taco["via"]
        else:
            merma_h = M.merma_offset_hojas(n_hojas_fisicas, 1)
            n_con_merma = n_hojas_fisicas + merma_h
            es_cuadricula_uniforme = _taco_tiene_cuadricula(taco_modo)
            taco_digital = M.elegible_digital(ancho_cm, alto_cm, taco_sustrato[1], cantidad) and not pliega_taco

            if taco_digital and not es_cuadricula_uniforme:
                merma_h = M.merma_digital_hojas(es_color)
                n_con_merma = n_hojas_fisicas + merma_h
                det_digital = M.costo_impresion_digital(n_con_merma, caras, es_color, ancho_cm, alto_cm, cantidad)
                det_offset = M.costo_impresion_offset(n_con_merma, 1, es_color, taco_ancho, taco_alto, pliegue=pliega_taco)
                det_taco = det_digital if (det_digital is not None and det_digital["total"] < det_offset["total"]) else det_offset
            else:
                det_taco = M.costo_impresion_offset(
                    n_con_merma, 1, es_color, taco_ancho, taco_alto,
                    cuadricula_uniforme=es_cuadricula_uniforme, pliegue=pliega_taco,
                )
            costo_taco_impresion = det_taco["total"]
            via_taco = det_taco["via"]
    else:
        # Taco en blanco: reduce merma a la mitad, sin CtP ni impresion.
        via_taco = "n/a (blanco)"

    if det_taco is not None:
        detalle["taco_impresion"] = det_taco

    desglose["taco_material"] = costo_taco_material
    desglose["taco_impresion"] = costo_taco_impresion

    # ---------------- GUARDAS ----------------
    r_guardas = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *guardas_sustrato)
    costo_guardas_material = r_guardas["costo_por_pieza"] * guardas_cantidad * cantidad
    costo_guardas_acabado = 0.0
    if guardas_plastificado:
        area_guardas_m2 = (M.area_cm2(ancho_cm, alto_cm) * guardas_cantidad * cantidad) / 10_000
        costo_guardas_acabado = area_guardas_m2 * D.PLASTIFICADO_COP_M2
    costo_guardas_total = costo_guardas_material + costo_guardas_acabado
    costo_guardas_total = max(costo_guardas_total, D.GUARDAS_PISO_OT_COP)
    desglose["guardas"] = costo_guardas_total

    # ---------------- INSERTOS ----------------
    # Insertos son hoja suelta (no se pliegan), igual que Cuaderno Anillado.
    costo_insertos = 0.0
    detalle_insertos = []
    for ins in insertos:
        r_ins = M.mejor_pliego_para_pieza(ancho_cm, alto_cm, *ins["sustrato"])
        costo_material = r_ins["costo_por_pieza"] * ins["cantidad"] * cantidad
        costo_levante = D.LEVANTE_MANUAL_INSERTO_COP_HOJA * ins["cantidad"] * cantidad

        ins_caras = ins.get("caras", 1)
        ins_tintas = ins.get("tintas", 1)
        ins_es_color = ins_tintas >= 4
        # Los insertos normalmente traen contenido distinto cada uno (no
        # es una cuadricula/diseno repetido) - cada hoja x cara es una
        # posicion de pagina unica, igual que el taco con diseno unico.
        # Confirmado por Conde.
        paginas_unicas_ins = ins["cantidad"] * ins_caras
        det_ins = M.costo_impresion_unico_por_pagina(paginas_unicas_ins, cantidad, ancho_cm, alto_cm, ins_es_color)

        costo_insertos += costo_material + costo_levante + det_ins["total"]
        detalle_insertos.append({"material": costo_material, "levante": costo_levante, "impresion": det_ins})
    desglose["insertos"] = costo_insertos
    if detalle_insertos:
        detalle["insertos"] = detalle_insertos

    # ---------------- ARMADO / ENCUADERNACION ----------------
    costo_armado = 0.0
    tipo_enc = encuadernacion["tipo"]

    if linea == "escolar":
        costo_armado = D.ESCOLAR_ENCUADERNACION_COP[tipo_enc] * cantidad * factor_escala
        costo_armado += (cantidad / 1000) * D.GRAFADO_ESCOLAR_COP_POR_MILLAR

    elif linea == "cuaderno_anillado":
        tabla = D.ANILLO_DOBLE_O[cat_clave]
        costo_unit = tabla["base_80h"] + (taco_hojas - 80) * tabla["variacion_hoja"]
        costo_unit *= factor_escala
        costo_armado = costo_unit * cantidad
        costo_armado += D.REFILE_CUADERNO_ANILLADO_COP * cantidad
        costo_armado += D.LIMPIEZA_COLBON_CUADERNO_ANILLADO_COP * cantidad

    elif linea == "agenda_ejecutiva":
        tabla = D.COSTURA_AGENDA_EJECUTIVA[cat_clave]
        costo_unit = tabla["base_80h"] + (taco_hojas - 80) * tabla["variacion_hoja"]
        costo_unit *= factor_escala
        costo_armado = costo_unit * cantidad
        # Refile incluido en el precio de costura (confirmado por Conde).

    elif linea == "libretas":
        if tipo_enc == "anillo_doble_o":
            tabla = D.ANILLO_DOBLE_O[cat_clave]
            base_corta = tabla["base_80h"] + (taco_hojas - 80) * tabla["variacion_hoja"]
            lado_corto, lado_largo = sorted((ancho_cm, alto_cm))
            costo_unit = ((base_corta * lado_corto) / lado_largo) * D.ANILLADO_CORTO_FACTOR
            costo_armado = costo_unit * cantidad
        elif tipo_enc == "hotmelt":
            lado_pegue = min(ancho_cm, alto_cm)  # el lado corto es el que se pega (lomo)
            costo_unit = D.HOTMELT_BASE_COP_UNIDAD * (lado_pegue / D.HOTMELT_CM_REFERENCIA)
            costo_armado = max(costo_unit * cantidad, D.HOTMELT_PISO_OT_COP)
            costo_armado += D.GRAFADO_LIBRETAS_COP_FIJO
        elif tipo_enc == "colbon":
            costo_armado = max(D.COLBON_COP_UNIDAD * cantidad, D.COLBON_PISO_OT_COP)
            costo_armado += D.GRAFADO_LIBRETAS_COP_FIJO
        costo_armado += D.REFILE_CUADERNO_ANILLADO_COP * cantidad

    desglose["armado_encuadernacion"] = costo_armado

    # ---------------- TOTAL DE FABRICACION Y PRECIO DE VENTA ----------------
    costo_directo = sum(desglose.values())

    pct_fondo = M.tramo_fondo_seguridad(costo_directo, linea)
    fondo_seguridad_cop = costo_directo * pct_fondo

    diseno_cop, preprensa_cop = M.diseno_y_preprensa(costo_directo)

    costo_total_fabricacion = costo_directo + fondo_seguridad_cop + diseno_cop + preprensa_cop

    divisor = M.divisor_precio_venta(cantidad)
    precio_venta = costo_total_fabricacion / divisor
    iva = precio_venta * D.IVA_PCT
    precio_final = precio_venta + iva

    precio_venta_unitario = precio_venta / cantidad

    resultado = {
        "nombre_caso": nombre_caso,
        "desglose_directo": desglose,
        "detalle_impresion": detalle,
        "costo_directo_total": costo_directo,
        "costo_directo_unitario": costo_directo / cantidad,
        "via_tapa": via_tapa,
        "via_taco": via_taco,
        "divisor_usado": divisor,
        "pct_fondo_seguridad": pct_fondo,
        "fondo_seguridad_cop": fondo_seguridad_cop,
        "diseno_cop": diseno_cop,
        "preprensa_cop": preprensa_cop,
        "costo_total_fabricacion": costo_total_fabricacion,
        "precio_venta_total": precio_venta,
        "precio_venta_unitario": precio_venta_unitario,
        "iva_total": iva,
        "precio_final_total": precio_final,
    }

    if litoplan_esperado is not None:
        diferencia = precio_venta_unitario - litoplan_esperado
        pct_diferencia = (diferencia / litoplan_esperado) * 100
        resultado["litoplan_esperado"] = litoplan_esperado
        resultado["diferencia_cop"] = diferencia
        resultado["diferencia_pct"] = pct_diferencia

    return resultado


def _taco_tiene_cuadricula(taco_modo):
    return taco_modo in ("1x1", "1x0")
