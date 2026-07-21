# -*- coding: utf-8 -*-
"""
Los 10 casos reales de Litoplan (entregados por Conde), REESTRUCTURADOS
(2026-07-15) al modelo de lineas de impresion libres: cada componente
del cuaderno (caratula, taco, cada inserto) es su propia linea con
tintas tiro/retiro, papel y acabados independientes.
"""

from cotizador import cotizar_cuaderno

PROPALCOTE_150 = ("Propalcote", 150)

CASOS = [
    dict(
        nombre_caso="1. 100 cuadernos Agenda anillado tapa dura",
        linea_producto="cuaderno_anillado", ancho_cm=24, alto_cm=17, cantidad=100,
        tapa_tipo="dura", encuadernacion={"tipo": "anillo_doble_o"}, taco_hojas=100,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=100, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme"),
            dict(nombre="Insertos", rol="inserto", hojas_por_cuaderno=3, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=4, diseno="unico_por_pagina"),
        ],
        litoplan_esperado=15232,
    ),
    dict(
        nombre_caso="2. 700 cuadernos Media Carta anillado tapa dura",
        linea_producto="cuaderno_anillado", ancho_cm=21, alto_cm=14, cantidad=700,
        tapa_tipo="dura", encuadernacion={"tipo": "anillo_doble_o"}, taco_hojas=100,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "uv_parcial"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=100, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme"),
        ],
        litoplan_esperado=7395,
    ),
    dict(
        nombre_caso="3. 80 cuadernos Media Carta anillado tapa dura",
        linea_producto="cuaderno_anillado", ancho_cm=14, alto_cm=21, cantidad=80,
        tapa_tipo="dura", encuadernacion={"tipo": "anillo_doble_o"}, taco_hojas=80,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=80, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme"),
        ],
        litoplan_esperado=11600,
    ),
    dict(
        nombre_caso="4. 100 cuadernos Carta escolar tapa blanda",
        linea_producto="escolar", ancho_cm=28, alto_cm=21.5, cantidad=100,
        tapa_tipo="blanda", encuadernacion={"tipo": "hilo"}, taco_hojas=30,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=("Propalcote", 300),
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=30, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme", pliegue=True),
        ],
        litoplan_esperado=7980,
    ),
    dict(
        nombre_caso="5. 1300 cuadernos Agenda escolar tapa blanda",
        linea_producto="escolar", ancho_cm=24, alto_cm=17, cantidad=1300,
        tapa_tipo="blanda", encuadernacion={"tipo": "hilo"}, taco_hojas=50,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=("Propalcote", 300),
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=50, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme", pliegue=True),
        ],
        litoplan_esperado=3065,
    ),
    dict(
        nombre_caso="6. 200 cuadernos Agenda anillado disenio unico",
        linea_producto="cuaderno_anillado", ancho_cm=24, alto_cm=17, cantidad=200,
        tapa_tipo="dura", encuadernacion={"tipo": "anillo_doble_o"}, taco_hojas=100,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=100, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="unico_por_pagina"),
        ],
        litoplan_esperado=17760,
    ),
    dict(
        nombre_caso="7. 100 Agenda Ejecutiva Media Carta",
        linea_producto="agenda_ejecutiva", ancho_cm=21, alto_cm=14, cantidad=100,
        tapa_tipo="dura", encuadernacion={"tipo": "costura"}, taco_hojas=80,
        lineas_impresion=[
            # Caratula continua de Agenda Ejecutiva: siempre 4x1, y se
            # monta/pliega como una sola pieza continua (no 2 sueltas).
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=PROPALCOTE_150,
                 tintas_tiro=4, tintas_retiro=1, diseno="uniforme", pliegue=True,
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=80, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="unico_por_pagina", pliegue=True),
        ],
        litoplan_esperado=27167,  # corregido: el dato original ($19.800) estaba mal, confirmado con Litoplan real (subtotal $1.934.925, total $2.716.700)
    ),
    dict(
        nombre_caso="8. 1000 libretas Media Carta semidura hotmelt",
        linea_producto="libretas", ancho_cm=21, alto_cm=14, cantidad=1000,
        tapa_tipo="semidura", encuadernacion={"tipo": "hotmelt"}, taco_hojas=80,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=("Cartulina C16", 255),
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=80, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme", pliegue=True),
        ],
        guardas_tintas_tiro=4, guardas_plastificado=True,
        litoplan_esperado=4240,
    ),
    dict(
        nombre_caso="9. 800 cuadernos Agenda anillado tapa blanda C18",
        linea_producto="cuaderno_anillado", ancho_cm=24, alto_cm=17, cantidad=800,
        tapa_tipo="blanda", encuadernacion={"tipo": "anillo_doble_o"}, taco_hojas=70,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=("Cartulina C18", 275),
                 tintas_tiro=4, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=70, sustrato=("Bond", 75),
                 tintas_tiro=1, tintas_retiro=1, diseno="uniforme"),
            dict(nombre="Insertos", rol="inserto", hojas_por_cuaderno=2, sustrato=("Propalcote", 90),
                 tintas_tiro=4, tintas_retiro=4, diseno="unico_por_pagina"),
        ],
        guardas_tintas_tiro=4, guardas_plastificado=False,
        litoplan_esperado=5209,  # confirmado con calculo real de Litoplan (subtotal $2.976.625, total $4.167.200)
    ),
    dict(
        nombre_caso="10. 500 libretas Micro 14x11 tapa blanda C12 colbon",
        linea_producto="libretas", ancho_cm=14, alto_cm=11, cantidad=500,
        tapa_tipo="blanda", encuadernacion={"tipo": "colbon"}, taco_hojas=50,
        lineas_impresion=[
            dict(nombre="Caratula", rol="caratula", hojas_por_cuaderno=2, sustrato=("Cartulina C12", 205),
                 tintas_tiro=1, tintas_retiro=0, diseno="uniforme",
                 acabados=[{"tipo": "fondo_pleno"}, {"tipo": "plastificado"}]),
            dict(nombre="Taco", rol="taco", hojas_por_cuaderno=50, sustrato=("Bond", 70),
                 tintas_tiro=1, tintas_retiro=0, diseno="uniforme", pliegue=True),
        ],
        litoplan_esperado=2230,
    ),
]


def formato_cop(valor):
    return f"${valor:,.0f}".replace(",", ".")


def correr_todos():
    print(f"{'Caso':<45} {'Litoplan':>12} {'Calculado':>12} {'Diferencia':>14} {'%':>8}")
    print("-" * 95)
    resultados = []
    for caso in CASOS:
        r = cotizar_cuaderno(**caso)
        resultados.append(r)
        print(
            f"{r['nombre_caso']:<45} "
            f"{formato_cop(r['litoplan_esperado']):>12} "
            f"{formato_cop(r['precio_venta_unitario']):>12} "
            f"{formato_cop(r['diferencia_cop']):>14} "
            f"{r['diferencia_pct']:>7.1f}%"
        )
    return resultados


if __name__ == "__main__":
    correr_todos()
