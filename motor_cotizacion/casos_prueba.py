# -*- coding: utf-8 -*-
"""
Los 10 casos reales de Litoplan (entregados por Conde) y el comparador
que corre cada uno contra la funcion cotizar_cuaderno() y muestra la
diferencia en pesos y porcentaje.
"""

from cotizador import cotizar_cuaderno

CASOS = [
    dict(
        nombre_caso="1. 100 cuadernos Agenda anillado tapa dura",
        linea="cuaderno_anillado", ancho_cm=24, alto_cm=17,
        tapa_tipo="dura", tapa_sustrato_capas=[],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=100, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "anillo_doble_o"}, cantidad=100,
        insertos=[{"cantidad": 3, "sustrato": ("Propalcote", 150), "tintas": 4, "caras": 2}],
        litoplan_esperado=15232,
    ),
    dict(
        nombre_caso="2. 700 cuadernos Media Carta anillado tapa dura",
        linea="cuaderno_anillado", ancho_cm=21, alto_cm=14,
        tapa_tipo="dura", tapa_sustrato_capas=[],
        tapa_acabado={"plastificado": "mate", "uv_parcial": True},
        taco_hojas=100, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "anillo_doble_o"}, cantidad=700,
        litoplan_esperado=7395,
    ),
    dict(
        nombre_caso="3. 80 cuadernos Media Carta anillado tapa dura",
        linea="cuaderno_anillado", ancho_cm=14, alto_cm=21,
        tapa_tipo="dura", tapa_sustrato_capas=[],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=80, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "anillo_doble_o"}, cantidad=80,
        litoplan_esperado=11600,
    ),
    dict(
        nombre_caso="4. 100 cuadernos Carta escolar tapa blanda",
        linea="escolar", ancho_cm=28, alto_cm=21.5,
        tapa_tipo="blanda", tapa_sustrato_capas=[("Propalcote", 300)],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=30, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "hilo"}, cantidad=100,
        litoplan_esperado=7980,
    ),
    dict(
        nombre_caso="5. 1300 cuadernos Agenda escolar tapa blanda",
        linea="escolar", ancho_cm=24, alto_cm=17,
        tapa_tipo="blanda", tapa_sustrato_capas=[("Propalcote", 300)],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=50, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "hilo"}, cantidad=1300,
        litoplan_esperado=3065,
    ),
    dict(
        nombre_caso="6. 200 cuadernos Agenda anillado disenio unico",
        linea="cuaderno_anillado", ancho_cm=24, alto_cm=17,
        tapa_tipo="dura", tapa_sustrato_capas=[],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=100, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="unico_por_pagina",
        encuadernacion={"tipo": "anillo_doble_o"}, cantidad=200,
        litoplan_esperado=17760,
    ),
    dict(
        nombre_caso="7. 100 Agenda Ejecutiva Media Carta",
        linea="agenda_ejecutiva", ancho_cm=21, alto_cm=14,
        tapa_tipo="dura", tapa_sustrato_capas=[],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=80, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="unico_por_pagina",
        encuadernacion={"tipo": "costura"}, cantidad=100,
        litoplan_esperado=19800,
    ),
    dict(
        nombre_caso="8. 1000 libretas Media Carta semidura hotmelt",
        linea="libretas", ancho_cm=21, alto_cm=14,
        tapa_tipo="semidura", tapa_sustrato_capas=[("Cartulina C16", 255), ("Cartulina C16", 255)],
        tapa_acabado={"plastificado": "brillante", "uv_parcial": False},
        taco_hojas=80, taco_sustrato=("Bond", 70), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "hotmelt"}, cantidad=1000,
        guardas_impresion=True, guardas_tintas=4, guardas_plastificado=True,
        litoplan_esperado=4240,
    ),
    dict(
        nombre_caso="9. 800 cuadernos Agenda anillado tapa blanda C18",
        linea="cuaderno_anillado", ancho_cm=24, alto_cm=17,
        tapa_tipo="blanda", tapa_sustrato_capas=[("Cartulina C18", 275)],
        tapa_acabado={"plastificado": "mate", "uv_parcial": False},
        taco_hojas=70, taco_sustrato=("Bond", 75), taco_modo="1x1", taco_diseno="uniforme",
        encuadernacion={"tipo": "anillo_doble_o"}, cantidad=800,
        guardas_impresion=True, guardas_tintas=4, guardas_plastificado=False,
        insertos=[{"cantidad": 2, "sustrato": ("Bond", 90), "tintas": 2, "caras": 2}],
        litoplan_esperado=5205,
    ),
    dict(
        nombre_caso="10. 500 libretas Micro 14x11 tapa blanda C12 colbon",
        linea="libretas", ancho_cm=14, alto_cm=11,
        tapa_tipo="blanda", tapa_sustrato_capas=[("Cartulina C12", 205)],
        tapa_acabado={"plastificado": "mate", "uv_parcial": False},
        tapa_es_color=False, tapa_fondo_pleno=True,
        taco_hojas=50, taco_sustrato=("Bond", 70), taco_modo="1x0", taco_diseno="uniforme",
        encuadernacion={"tipo": "colbon"}, cantidad=500,
        litoplan_esperado=2230,
    ),
]


def formato_cop(valor):
    return f"${valor:,.0f}".replace(",", ".")


def correr_todos():
    print(f"{'Caso':<45} {'Litoplan':>12} {'Calculado':>12} {'Diferencia':>14} {'%':>8} {'ViaTapa':>10} {'ViaTaco':>12}")
    print("-" * 130)
    resultados = []
    for caso in CASOS:
        r = cotizar_cuaderno(**caso)
        resultados.append(r)
        print(
            f"{r['nombre_caso']:<45} "
            f"{formato_cop(r['litoplan_esperado']):>12} "
            f"{formato_cop(r['precio_venta_unitario']):>12} "
            f"{formato_cop(r['diferencia_cop']):>14} "
            f"{r['diferencia_pct']:>7.1f}% "
            f"{r['via_tapa']:>10} "
            f"{r['via_taco']:>12}"
        )
    return resultados


if __name__ == "__main__":
    correr_todos()
