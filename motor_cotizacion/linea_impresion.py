"""
Procesador GENERICO de una linea de impresion (Fase 2 - reestructuracion).

Antes el motor tenia categorias fijas: tapa, taco, insertos, cada una
con su propia configuracion rigida. La pantalla real de Litoplan que
compartio Conde mostro que en la practica cada componente del cuaderno
(caratula, taco, cada grupo de insertos, guardas) es una LINEA
independiente y libremente configurable: paginas, tamano, tintas TIRO y
RETIRO por separado, papel, y acabados propios. Esta funcion reemplaza
el codigo repetido que existia por separado para tapa/taco/insertos.
"""

import math

import datos_maestros as D
import motor as M


def procesar_linea_impresion(linea, ancho_cuaderno, alto_cuaderno, cantidad_cuadernos):
    """
    linea (dict):
      nombre: str, solo para el reporte
      hojas_por_cuaderno: cuantas piezas fisicas de este componente lleva
          CADA cuaderno (ej. taco=80 hojas, tapa=2 piezas [tapa+contratapa],
          inserto=cantidad de hojas del inserto)
      ancho_cm / alto_cm: opcional - si no se dan, hereda el tamano del cuaderno
      sustrato: (nombre, gramaje)
      tintas_tiro: 0-4 (cuantas tintas en la cara frontal)
      tintas_retiro: 0-4 (cuantas tintas en el reverso; 0 = no se imprime esa cara)
      diseno: "uniforme" (mismo diseno repetido) o "unico_por_pagina" (cada
          hoja distinta, como un libro o insertos con contenido variable).
          Default "uniforme".
      pliegue: bool - si el papel se monta por parejas y se dobla al centro
          (encuadernacion cosida/pegada). Default False (hoja suelta).
      acabados: lista de dicts {"tipo": "plastificado"/"uv_parcial"/
          "troquelado"/"estampado"/"colaminado"/"fondo_pleno"/"otro",
          "costo_manual": <valor por unidad, solo para "otro">}

    Devuelve un dict con costo_material, costo_impresion, costo_acabados,
    costo_total, y detalle_impresion (planchas/millares, para el reporte).

    Nota sobre tintas: "1 tinta" siempre es negro. 2 tintas o mas se trata
    como color/policromia para efectos de tarifa (no hay tarifas propias
    de 2 o 3 tintas separadas de policromia). Confirmado por Conde.
    """
    nombre = linea.get("nombre", "Linea")
    hojas = linea["hojas_por_cuaderno"]
    ancho = linea.get("ancho_cm") or ancho_cuaderno
    alto = linea.get("alto_cm") or alto_cuaderno
    sustrato = linea["sustrato"]
    tintas_tiro = linea.get("tintas_tiro", 0)
    tintas_retiro = linea.get("tintas_retiro", 0)
    diseno = linea.get("diseno", "uniforme")
    pliegue = linea.get("pliegue", False)
    acabados = linea.get("acabados", [])

    resultado = {"nombre": nombre}

    n_piezas_fisicas = hojas * cantidad_cuadernos
    caras = 2 if tintas_retiro > 0 else 1
    es_color = tintas_tiro >= 2 or tintas_retiro >= 2
    cant_tintas = max(tintas_tiro, tintas_retiro, 1)

    # Merma de alistamiento offset: hojas de mas que se pierden calibrando
    # la maquina - hay que comprarlas tambien en papel, no solo pagarlas
    # en la impresion. Solo aplica si la linea SI se imprime (tintas>0).
    # Confirmado por Conde 2026-07-22 (antes solo se sumaba al calculo de
    # impresion, no al de material).
    merma_material = M.merma_offset_hojas(n_piezas_fisicas, cant_tintas) if (tintas_tiro > 0 or tintas_retiro > 0) else 0

    # ---------------- MATERIAL ----------------
    # El papel se compra en pliegos COMPLETOS (redondeado hacia arriba),
    # no a una tarifa continua por pieza suelta.
    r_mat = M.costo_material_pliegos(ancho, alto, *sustrato, n_piezas_fisicas, merma_material)
    costo_material = r_mat["costo_total"]
    resultado["costo_material"] = costo_material

    # ---------------- IMPRESION ----------------
    fondo_pleno = any(a["tipo"] == "fondo_pleno" for a in acabados)

    if tintas_tiro == 0 and tintas_retiro == 0:
        resultado["costo_impresion"] = 0.0
        resultado["detalle_impresion"] = None
    else:
        if fondo_pleno:
            fraccion = M._fraccion_pliego_offset(ancho, alto, es_policromia=es_color)
            merma_o = M.merma_offset_hojas(n_piezas_fisicas, cant_tintas)
            det = M.costo_impresion_offset(n_piezas_fisicas + merma_o, cant_tintas, es_color, ancho, alto)
            recargo = D.OFFSET_RECARGO_FONDO_PLENO_COP[fraccion]
            plancha_extra = D.OFFSET_CTP_COP[fraccion]
            det["total"] += recargo + plancha_extra
            det["n_planchas"] += 1
            det["costo_planchas"] += plancha_extra
            det["recargo_fondo_pleno"] = recargo
            det["via"] = f"offset (fondo pleno {fraccion})"
        elif diseno == "unico_por_pagina":
            paginas_unicas = hojas * caras
            det = M.costo_impresion_unico_por_pagina(
                paginas_unicas, cantidad_cuadernos, ancho, alto, es_color, pliegue=pliegue
            )
        else:
            es_cuadricula_uniforme = (diseno == "uniforme") and not es_color
            elegible_dig = M.elegible_digital(ancho, alto, sustrato[1], cantidad_cuadernos) and not pliegue

            if elegible_dig and not es_cuadricula_uniforme:
                merma_d = M.merma_digital_hojas(es_color)
                det_digital = M.costo_impresion_digital(
                    n_piezas_fisicas + merma_d, caras, es_color, ancho, alto, cantidad_cuadernos
                )
                merma_o = M.merma_offset_hojas(n_piezas_fisicas, cant_tintas)
                det_offset = M.costo_impresion_offset(
                    n_piezas_fisicas + merma_o, cant_tintas, es_color, ancho, alto, pliegue=pliegue
                )
                det = det_digital if (det_digital is not None and det_digital["total"] < det_offset["total"]) else det_offset
            else:
                merma_o = M.merma_offset_hojas(n_piezas_fisicas, cant_tintas)
                det = M.costo_impresion_offset(
                    n_piezas_fisicas + merma_o, cant_tintas, es_color, ancho, alto,
                    cuadricula_uniforme=es_cuadricula_uniforme, pliegue=pliegue,
                )

        resultado["costo_impresion"] = det["total"]
        resultado["detalle_impresion"] = det

    # ---------------- ACABADOS ----------------
    costo_acabados = 0.0
    area_total_m2 = (M.area_cm2(ancho, alto) * hojas * cantidad_cuadernos) / 10_000
    piezas_totales = hojas * cantidad_cuadernos
    tiene_uv = any(a["tipo"] == "uv_parcial" for a in acabados)

    for acab in acabados:
        tipo = acab["tipo"]
        if tipo == "plastificado":
            if tiene_uv:
                continue  # UV Parcial ya arrastra el plastificado, no se cobra doble
            costo_acabados += max(area_total_m2 * D.PLASTIFICADO_COP_M2, D.PLASTIFICADO_PISO_COP)
        elif tipo == "uv_parcial":
            costo_acabados += max(area_total_m2 * D.UV_PARCIAL_COP_M2, D.UV_PARCIAL_PISO_COP)
        elif tipo == "troquelado":
            costo_acabados += math.ceil(piezas_totales / 1000) * D.TROQUEL_TAPA_COP_POR_MILLAR
        elif tipo == "estampado":
            costo_acabados += max(
                piezas_totales * D.ESTAMPADO_COP_POR_GOLPE + D.ESTAMPADO_ARRANQUE_COP,
                D.ESTAMPADO_MINIMO_COP,
            )
        elif tipo == "colaminado":
            costo_acabados += area_total_m2 * D.COLAMINADO_COP_M2
        elif tipo == "otro":
            costo_acabados += acab.get("costo_manual", 0) * cantidad_cuadernos
        elif tipo == "fondo_pleno":
            pass  # ya se resolvio dentro de la impresion arriba

    resultado["costo_acabados"] = costo_acabados
    resultado["costo_total"] = costo_material + resultado["costo_impresion"] + costo_acabados
    return resultado
