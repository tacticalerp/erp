# -*- coding: utf-8 -*-
"""Imprime el desglose completo de un caso en TOTALES DEL PEDIDO (no por
unidad), con planchas y millares como se ve en una cotizacion real de
Litoplan, para poder verificar contra el conocimiento de Conde."""

import sys

from casos_prueba import CASOS, formato_cop
from cotizador import cotizar_cuaderno


def _linea_impresion(nombre, det):
    if det is None:
        return
    print(f"  {nombre}:")
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
    print("--- CARATULA / TAPA ---")
    print(f"  Material (carton+forro o cartulina): {formato_cop(r['desglose_directo']['tapa_material'])}")
    _linea_impresion("Impresion", r["detalle_impresion"].get("tapa_impresion"))
    print(f"  Armado/forrado: {formato_cop(r['desglose_directo']['tapa_armado_forrado'])}")
    print(f"  Acabados (plastificado/UV/colaminado/troquel): {formato_cop(r['desglose_directo']['tapa_acabados'])}")
    print()
    print("--- TACO / INTERIORES ---")
    print(f"  Material (papel): {formato_cop(r['desglose_directo']['taco_material'])}")
    _linea_impresion("Impresion", r["detalle_impresion"].get("taco_impresion"))
    print()
    print("--- GUARDAS ---")
    print(f"  Total: {formato_cop(r['desglose_directo']['guardas'])}")
    print()
    if r["detalle_impresion"].get("insertos"):
        print("--- INSERTOS ---")
        for i, ins in enumerate(r["detalle_impresion"]["insertos"], 1):
            print(f"  Inserto {i}: material {formato_cop(ins['material'])} + levante {formato_cop(ins['levante'])}")
            _linea_impresion(f"  Impresion inserto {i}", ins["impresion"])
        print(f"  TOTAL insertos: {formato_cop(r['desglose_directo']['insertos'])}")
        print()
    print("--- ARMADO / ENCUADERNACION ---")
    print(f"  Total: {formato_cop(r['desglose_directo']['armado_encuadernacion'])}")
    print()
    print(f"COSTO DIRECTO TOTAL (insumos y servicios): {formato_cop(r['costo_directo_total'])}")
    print(f"  Fondo de Seguridad ({r['pct_fondo_seguridad']*100:.1f}%): {formato_cop(r['fondo_seguridad_cop'])}")
    print(f"  Diseno: {formato_cop(r['diseno_cop'])}")
    print(f"  Prueba de preprensa: {formato_cop(r['preprensa_cop'])}")
    print(f"COSTO TOTAL DE FABRICACION: {formato_cop(r['costo_total_fabricacion'])}")
    print(f"Divisor usado: {r['divisor_usado']:.4f}")
    print(f"PRECIO DE VENTA calculado (TOTAL, sin IVA): {formato_cop(r['precio_venta_total'])}")
    print(f"Litoplan real (TOTAL, sin IVA):              {formato_cop(r['litoplan_esperado'] * cantidad)}")
    print(f"Diferencia por unidad: {formato_cop(r['diferencia_cop'])} ({r['diferencia_pct']:.1f}%)")


if __name__ == "__main__":
    idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    desglosar(idx)
