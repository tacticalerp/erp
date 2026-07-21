"""
Funcion principal de cotizacion para la linea Editorial y Cuadernos.

REESTRUCTURADO (2026-07-15): en vez de categorias fijas (tapa/taco/
insertos, cada una con una sola configuracion), el pedido ahora recibe
una lista libre de "lineas de impresion" - cada componente del cuaderno
(caratula, taco, cada grupo de insertos) es independiente y se configura
por separado: paginas, tamano, papel, tintas tiro/retiro, acabados.
Esto refleja como funciona Litoplan realmente (ver pantalla real que
compartio Conde) y evita errores graves de cotizacion por estandarizar
partes que en la practica son todas distintas.

Lo que SIGUE siendo estructural (no es una "linea de impresion" libre,
son formulas fijas de armado fisico): el armado/forrado de tapa, el
costo del carton de tapa dura, la encuadernacion (anillado/costura/
grapa/hilo/hotmelt/colbon), y el fondo de seguridad + motor financiero.

cotizar_cuaderno(...) -> dict con el desglose completo del costo, el
precio de venta y el IVA para UN pedido.

Ver solicitud_claude_code_motor_cotizacion_cuadernos.md para el detalle
y la fuente de cada regla de negocio usada aqui.
"""

import datos_maestros as D
import motor as M
from linea_impresion import procesar_linea_impresion


def cotizar_cuaderno(
    linea_producto,
    ancho_cm,
    alto_cm,
    cantidad,
    tapa_tipo,
    encuadernacion,
    lineas_impresion,
    taco_hojas,
    guardas_cantidad=D.GUARDAS_CANTIDAD_DEFAULT,
    guardas_sustrato=None,
    guardas_tintas_tiro=0,
    guardas_plastificado=False,
    carton_calibre_mm=1.5,
    utilidad_pct=0.40,
    ventas_pct=0.0,
    litoplan_esperado=None,
    nombre_caso="",
):
    """
    linea_producto: "escolar" | "cuaderno_anillado" | "agenda_ejecutiva" | "libretas"
    tapa_tipo: "dura" | "semidura" | "blanda" (determina el armado/forrado
        estructural; el material/impresion de la tapa en si va como una
        linea mas dentro de lineas_impresion, con rol="caratula")
    encuadernacion: dict, forma depende de la linea:
        escolar -> {"tipo": "grapa"/"hilo"/"hilo_cinta"}
        cuaderno_anillado -> {"tipo": "anillo_doble_o"}
        agenda_ejecutiva -> {"tipo": "costura"}
        libretas -> {"tipo": "anillo_doble_o"/"hotmelt"/"colbon"}
    lineas_impresion: lista de dicts, cada uno es una linea INDEPENDIENTE
        (ver linea_impresion.procesar_linea_impresion para el formato
        completo). Debe incluir al menos una linea con rol="caratula" y
        una con rol="taco". El "rol" solo se usa para identificar la
        caratula (regla de +150 unidades) y para el reporte - no cambia
        el calculo generico.
    taco_hojas: numero de hojas del taco, usado en las formulas de
        armado/anillado/costura (independiente de lo que se haya puesto
        en la linea de impresion del taco).
    """
    lineas_impresion = [dict(l) for l in lineas_impresion]  # copia, no mutar el input del caller

    cat_clave, coincide_exacto = M.tamano_catalogo_mas_cercano(ancho_cm, alto_cm)
    factor_escala = 1.0 if coincide_exacto else M.factor_escalado_tamano(ancho_cm, alto_cm, cat_clave)

    # Regla confirmada por Conde: Cuadernos Tapa Dura desde 150 unidades
    # llevan 1 tinta adicional en el retiro de la caratula (marco para
    # el armado). Se aplica automaticamente si el caller no la puso ya.
    if tapa_tipo == "dura" and cantidad >= D.TAPA_DURA_UMBRAL_TINTA_RETIRO_UNIDADES:
        for l in lineas_impresion:
            if l.get("rol") == "caratula" and l.get("tintas_retiro", 0) == 0:
                l["tintas_retiro"] = 1

    # La caratula SIEMPRE se monta como 1 pieza continua (caratula +
    # contracaratula juntas, doblando el lado corto x2 - mas el embone
    # si es tapa Dura), redondeada al tamano de maquina mas chico que
    # alcance. Confirmado con 2 casos reales de Litoplan (2026-07-16).
    # Reemplaza el viejo modelo de "2 piezas sueltas" para TODAS las
    # lineas de producto, no solo Agenda Ejecutiva.
    montaje_ancho, montaje_alto = M.tamano_montaje_caratula(ancho_cm, alto_cm, tapa_tipo)
    tamano_maquina_caratula = M.redondear_a_tamano_maquina_caratula(montaje_ancho, montaje_alto)
    for l in lineas_impresion:
        if l.get("rol") == "caratula":
            l["ancho_cm"], l["alto_cm"] = tamano_maquina_caratula
            l["hojas_por_cuaderno"] = 1  # ya es 1 sola pieza continua

    desglose = {}
    detalle_lineas = {}

    for l in lineas_impresion:
        r = procesar_linea_impresion(l, ancho_cm, alto_cm, cantidad)
        clave = l.get("nombre", l.get("rol", "linea"))
        desglose[f"linea_{clave}"] = r["costo_total"]
        detalle_lineas[clave] = r

    linea_caratula = next((l for l in lineas_impresion if l.get("rol") == "caratula"), None)

    # ---------------- ARMADO/FORRADO ESTRUCTURAL DE TAPA ----------------
    costo_tapa_armado = 0.0
    costo_tapa_carton = 0.0
    if tapa_tipo == "dura":
        armado_base = D.ARMADO_FORRADO_TAPA_DURA_COP[cat_clave]
        costo_tapa_armado = armado_base * factor_escala * cantidad

        carton_precio = D.CARTON_1_5MM_COP if carton_calibre_mm == 1.5 else D.CARTON_2_0MM_COP
        n_por_pliego_carton = M.piezas_por_pliego(*tamano_maquina_caratula, 70, 100)
        costo_tapa_carton = (carton_precio / max(n_por_pliego_carton, 1)) * cantidad

    desglose["tapa_armado_forrado"] = costo_tapa_armado
    desglose["tapa_carton"] = costo_tapa_carton

    # Tapa Semidura = colaminado de 2 capas. La linea de impresion de la
    # caratula ya cubre la capa visible (con su tinta/acabados); aqui se
    # agrega la SEGUNDA capa (mismo sustrato, sin imprimir) + el proceso
    # de colaminado en si (pegante + mano de obra, $900/m2).
    costo_tapa_semidura_extra = 0.0
    if tapa_tipo == "semidura" and linea_caratula is not None:
        r_capa2 = M.mejor_pliego_para_pieza(*tamano_maquina_caratula, *linea_caratula["sustrato"])
        costo_tapa_semidura_extra = r_capa2["costo_por_pieza"] * cantidad
        area_colaminado_m2 = (M.area_cm2(*tamano_maquina_caratula) * cantidad) / 10_000
        costo_tapa_semidura_extra += area_colaminado_m2 * D.COLAMINADO_COP_M2
    desglose["tapa_semidura_segunda_capa"] = costo_tapa_semidura_extra

    # ---------------- GUARDAS (estructural: cantidad + plastificado) ----------------
    guardas_sustrato = guardas_sustrato or D.GUARDAS_SUSTRATO_DEFAULT
    linea_guardas = {
        "nombre": "Guardas",
        "hojas_por_cuaderno": guardas_cantidad,
        "sustrato": guardas_sustrato,
        "tintas_tiro": guardas_tintas_tiro,
        "tintas_retiro": 0,
        "diseno": "unico_por_pagina",
        "acabados": [{"tipo": "plastificado"}] if guardas_plastificado else [],
    }
    r_guardas = procesar_linea_impresion(linea_guardas, ancho_cm, alto_cm, cantidad)
    costo_guardas_total = max(r_guardas["costo_total"], D.GUARDAS_PISO_OT_COP)
    desglose["guardas"] = costo_guardas_total
    detalle_lineas["Guardas"] = r_guardas

    # ---------------- ARMADO / ENCUADERNACION ----------------
    costo_armado = 0.0
    tipo_enc = encuadernacion["tipo"]

    if linea_producto == "escolar":
        costo_armado = D.ESCOLAR_ENCUADERNACION_COP[tipo_enc] * cantidad * factor_escala
        costo_armado += (cantidad / 1000) * D.GRAFADO_ESCOLAR_COP_POR_MILLAR

    elif linea_producto == "cuaderno_anillado":
        tabla = D.ANILLO_DOBLE_O[cat_clave]
        costo_unit = tabla["base_80h"] + (taco_hojas - 80) * tabla["variacion_hoja"]
        costo_unit *= factor_escala
        costo_armado = costo_unit * cantidad
        costo_armado += D.REFILE_CUADERNO_ANILLADO_COP * cantidad
        costo_armado += D.LIMPIEZA_COLBON_CUADERNO_ANILLADO_COP * cantidad

    elif linea_producto == "agenda_ejecutiva":
        tabla = D.COSTURA_AGENDA_EJECUTIVA[cat_clave]
        costo_unit = tabla["base_80h"] + (taco_hojas - 80) * tabla["variacion_hoja"]
        costo_unit *= factor_escala
        costo_armado = costo_unit * cantidad
        # Refile incluido en el precio de costura (confirmado por Conde).

    elif linea_producto == "libretas":
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

    # ---------------- SUBTOTAL Y PRECIO DE VENTA ----------------
    # Diseno Ajuste SI aparece como linea real en las cotizaciones de
    # Litoplan reconstruidas (~$20.000-$40.000) - se mantiene. Fondo de
    # Seguridad y Preprensa NO aparecieron como lineas separadas en
    # ninguno de los 2 casos reales reconstruidos desde cero - se quitan
    # de la formula hasta confirmar con Conde si aplican en otro lado.
    costo_directo = sum(desglose.values())
    diseno_cop, _preprensa_no_usada = M.diseno_y_preprensa(costo_directo)
    subtotal = costo_directo + diseno_cop

    precio_venta = M.precio_venta_desde_subtotal(subtotal, utilidad_pct, ventas_pct)
    iva = precio_venta * D.IVA_PCT
    precio_final = precio_venta + iva

    precio_venta_unitario = precio_venta / cantidad

    resultado = {
        "nombre_caso": nombre_caso,
        "desglose_directo": desglose,
        "detalle_lineas": detalle_lineas,
        "costo_directo_total": costo_directo,
        "costo_directo_unitario": costo_directo / cantidad,
        "diseno_cop": diseno_cop,
        "subtotal": subtotal,
        "utilidad_pct": utilidad_pct,
        "ventas_pct": ventas_pct,
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
