# -*- coding: utf-8 -*-
"""Imprime el desglose completo de un caso en TOTALES DEL PEDIDO, linea
por linea (caratula, taco, cada inserto, guardas), con planchas y
millares como se ve en una cotizacion real de Litoplan."""

import sys

from casos_prueba import CASOS, formato_cop
from cotizador import cotizar_cuaderno


def _linea_impresion(det):
    if det is None:
        print("    (sin impresion)")
        return
    if "n_planchas" in det:
        print(f"    {det['n_planchas']} plancha(s) x {formato_cop(det['costo_ctp_unitario'])} = {formato_cop(det['costo_planchas'])}")
        print(f"    {det['n_millares']:.3f} millar(es) x {formato_cop(det['costo_millar_unitario'])} = {formato_cop(det['costo_millares'])}")
        if det.get("recargo_fondo_pleno"):
            print(f"    Recargo fondo pleno: {formato_cop(det['recargo_fondo_pleno'])}")
    else:
        print(f"    {det['n_clics']} clics x {formato_cop(det['precio_clic'])} (desc. {det['descuento_pct']*100:.0f}%)")
    print(f"    Via: {det['via']} -> TOTAL: {formato_cop(det['total'])}")


def desglosar(indice):
    caso = CASOS[indice]
    r = cotizar_cuaderno(**caso)
    cantidad = caso["cantidad"]

    print(f"=== {r['nombre_caso']} ===")
    print(f"Cantidad del pedido: {cantidad}")
    print(f"Litoplan (precio real por unidad, sin IVA): {formato_cop(r['litoplan_esperado'])}")
    print(f"Litoplan (TOTAL del pedido, sin IVA): {formato_cop(r['litoplan_esperado'] * cantidad)}")
    print()

    for nombre, det in r["detalle_lineas"].items():
        print(f"--- LINEA: {nombre} ---")
        print(f"  Material: {formato_cop(det['costo_material'])}")
        print("  Impresion:")
        _linea_impresion(det["detalle_impresion"])
        print(f"  Acabados: {formato_cop(det['costo_acabados'])}")
        print(f"  TOTAL LINEA: {formato_cop(det['costo_total'])}")
        print()

    print("--- ESTRUCTURAL (armado, carton, encuadernacion) ---")
    for clave, valor in r["desglose_directo"].items():
        if clave.startswith("linea_") or clave == "guardas":
            continue
        print(f"  {clave}: {formato_cop(valor)}")
    print()

    print(f"COSTO DIRECTO TOTAL (insumos y servicios): {formato_cop(r['costo_directo_total'])}")
    print(f"  Diseno Ajuste: {formato_cop(r['diseno_cop'])}")
    print(f"SUBTOTAL: {formato_cop(r['subtotal'])}")
    print(f"% utilidad: {r['utilidad_pct']*100:.1f}  |  % ventas: {r['ventas_pct']*100:.1f}")
    print(f"PRECIO DE VENTA calculado (TOTAL, sin IVA): {formato_cop(r['precio_venta_total'])}")
    print(f"Litoplan real (TOTAL, sin IVA):              {formato_cop(r['litoplan_esperado'] * cantidad)}")
    print(f"Diferencia por unidad: {formato_cop(r['diferencia_cop'])} ({r['diferencia_pct']:.1f}%)")


if __name__ == "__main__":
    idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    desglosar(idx)
