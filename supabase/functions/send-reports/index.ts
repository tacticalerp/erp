// ==========================================================================
// TACTICAL ERP -- Informes automáticos por correo (Edge Function de Supabase)
// Conde 2026-08-24: "continuemos con el proceso de crear los envíos diarios,
// semanales y mensuales a cada mail" -- construye los 15 informes (5 roles x
// 3 cadencias) que quedaron pendientes desde el 2026-08-20 (ver
// project_mejoras_ago20_contabilidad_iva.md), sobre el borrador que ya
// probaba el mecanismo de punta a punta (informe diario de Contabilidad).
//
// Se ejecuta sin sesión de usuario (cron), por eso usa la SERVICE_ROLE key
// (bypasea RLS) en vez del anon key -- SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY ya vienen inyectadas automáticamente por
// Supabase en toda Edge Function, no hay que crearlas como secreto aparte.
// RESEND_API_KEY sí es un secreto que Conde ya guardó a mano (dominio
// tacticalmg.co verificado en Resend, confirmado 2026-08-24).
//
// Se invoca por POST con body {"rol": "...", "cadencia": "..."} -- ver
// supabase/migracion_cron_informes.sql para los 15 cron.schedule() que la
// llaman cada uno con su combinación. Un solo archivo despachador en vez de
// 15 Edge Functions separadas: más fácil de mantener y de volver a desplegar.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "Tactical ERP <reportes@tacticalmg.co>";

// Destinatarios por lista fija (no por rol dinámico del ERP), acordado con
// Conde 2026-08-20 -- ver project_mejoras_ago20_contabilidad_iva.md.
const DESTINATARIOS: Record<string, string[]> = {
  administrador: ["gerencia@tacticalmg.co", "comercial@tacticalmg.co"],
  comercial: ["comercial@tacticalmg.co"],
  diseno: ["diseno@tacticalmg.co"],
  contabilidad: ["contacto@tacticalmg.co"],
  produccion: ["producciontactical@gmail.com"],
};

async function enviarCorreo(to: string[], subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const data = await r.json();
  if (!r.ok) console.error(`Error enviando correo a ${to.join(", ")}:`, data);
  return { ok: r.ok, data };
}

function cop(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function fechaHaceDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function diasDesde(fechaISO: string): number {
  return Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
}

// ---- Festivos de Colombia (Ley Emiliani) -- Conde 2026-08-24: "los días festivos en Colombia no
// se debe enviar informes". Mismo algoritmo que ya usa modulo_montajes_rompecabezas.html
// (tacticalFestivosColombia/tacticalPascua, para calcular fechas de entrega) -- portado aquí
// porque una Edge Function no puede importar ese archivo HTML, tiene que ser autocontenida.
// La función corre en UTC; el cron dispara a las 12:20 UTC = 7:20am Bogotá (Colombia es UTC-5 fijo,
// sin horario de verano), hora en la que el día calendario en UTC y en Bogotá ya coinciden -- por
// eso no hace falta convertir zona horaria para este chequeo.
function pascua(anio: number): Date {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}
function siguienteLunes(fecha: Date): Date {
  const d = new Date(fecha);
  const dow = d.getDay();
  if (dow !== 1) d.setDate(d.getDate() + ((8 - dow) % 7 || 7));
  return d;
}
function masDias(fecha: Date, n: number): Date {
  const d = new Date(fecha); d.setDate(d.getDate() + n); return d;
}
function festivosColombia(anio: number): Set<string> {
  const p = pascua(anio);
  const fechas = [
    new Date(anio, 0, 1), siguienteLunes(new Date(anio, 0, 6)), siguienteLunes(new Date(anio, 2, 19)),
    masDias(p, -3), masDias(p, -2), new Date(anio, 4, 1),
    siguienteLunes(masDias(p, 39)), siguienteLunes(masDias(p, 60)), siguienteLunes(masDias(p, 68)),
    siguienteLunes(new Date(anio, 5, 29)), new Date(anio, 6, 20), new Date(anio, 7, 7),
    siguienteLunes(new Date(anio, 7, 15)), siguienteLunes(new Date(anio, 9, 12)), siguienteLunes(new Date(anio, 10, 1)),
    siguienteLunes(new Date(anio, 10, 11)), new Date(anio, 11, 8), new Date(anio, 11, 25),
  ];
  return new Set(fechas.map((f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`));
}
function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function esFestivoColombia(d: Date): boolean {
  return festivosColombia(d.getFullYear()).has(claveFecha(d));
}
function esDiaHabilColombia(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false; // domingo, sábado
  return !esFestivoColombia(d);
}
// Conde 2026-08-24: el informe MENSUAL se manda el día 1, pero si ese día cae festivo o fin de
// semana, prefiere que se corra al SIGUIENTE día hábil en vez de perderse el mes completo (a
// diferencia de diario/semanal, donde saltarse un día no pierde nada -- mañana o el próximo
// viernes sale normal). Como el cron no puede "reprogramarse solo", en vez de disparar una sola
// vez el día 1 dispara todos los días 1-5 de cada mes (ver migracion_cron_informes.sql) y esta
// función decide cuál de esos días es el correcto: el primero de ellos que sea hábil.
function esPrimerDiaHabilDelMes(hoy: Date): boolean {
  if (!esDiaHabilColombia(hoy)) return false;
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  while (d.getDate() < hoy.getDate()) {
    if (esDiaHabilColombia(d)) return false; // ya hubo un día hábil antes -- "hoy" no es el primero
    d.setDate(d.getDate() + 1);
  }
  return true;
}

// Plantilla mínima -- cada informe arma sus "secciones" (título + filas de texto ya formateadas).
function plantilla(titulo: string, secciones: { titulo: string; filas: string[] }[]): string {
  const cuerpo = secciones.map((sec) => {
    const items = sec.filas.length
      ? sec.filas.map((f) => `<li style="margin-bottom:6px;">${f}</li>`).join("")
      : `<li style="color:#718096;">Sin novedades.</li>`;
    return `<h3 style="margin:16px 0 6px; font-size:14px; color:#1e3a5f;">${sec.titulo}</h3><ul style="padding-left:20px; margin:0;">${items}</ul>`;
  }).join("");
  return `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
      <div style="background:#1e3a5f; color:#fff; padding:16px 20px;">
        <h2 style="margin:0; font-size:18px;">${titulo}</h2>
        <p style="margin:4px 0 0; font-size:12px; color:#cbd8e8;">Tactical Marketing Group -- ${
          new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        }</p>
      </div>
      <div style="padding:20px; border:1px solid #e2e8f0; border-top:none;">${cuerpo}</div>
    </div>`;
}

// ---------------------------------------------------------------------
// Helpers de datos compartidos entre varios informes
// ---------------------------------------------------------------------

async function mapaClientes(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("clientes").select("id, empresa");
  if (error) { console.error("Error cargando clientes:", error); return new Map(); }
  return new Map((data || []).map((c: any) => [c.id, c.empresa]));
}

async function tareasPendientesFilas(filtro: { area?: string; responsable?: string }): Promise<string[]> {
  let q = supabase.from("tareas").select("descripcion, area, fecha_origen")
    .eq("cerrada", false).not("status", "in", "(listo,finalizado)");
  if (filtro.area) q = q.eq("area", filtro.area);
  if (filtro.responsable) q = q.contains("responsables", [filtro.responsable]);
  const { data, error } = await q;
  if (error) { console.error("Error consultando tareas:", error); return []; }
  return (data || [])
    .sort((a: any, b: any) => diasDesde(b.fecha_origen) - diasDesde(a.fecha_origen))
    .map((t: any) => `<strong>${t.descripcion}</strong> (${t.area}) -- ${diasDesde(t.fecha_origen)} día(s) desde que se creó`);
}

async function tareasVencidasTodasLasAreasFilas(minDias = 3): Promise<string[]> {
  const { data, error } = await supabase.from("tareas").select("descripcion, area, fecha_origen")
    .eq("cerrada", false).not("status", "in", "(listo,finalizado)");
  if (error) { console.error("Error consultando tareas:", error); return []; }
  return (data || [])
    .filter((t: any) => diasDesde(t.fecha_origen) >= minDias)
    .sort((a: any, b: any) => diasDesde(b.fecha_origen) - diasDesde(a.fecha_origen))
    .map((t: any) => `<strong>${t.descripcion}</strong> (${t.area}) -- ${diasDesde(t.fecha_origen)} día(s)`);
}

async function carteraVencida(): Promise<{ total: number; filas: string[] }> {
  const clientes = await mapaClientes();
  const { data, error } = await supabase.from("documentos_venta")
    .select("numero, id_cliente, saldo_pendiente, fecha_vencimiento")
    .gt("saldo_pendiente", 0).not("fecha_vencimiento", "is", null).lt("fecha_vencimiento", hoyISO())
    .order("fecha_vencimiento");
  if (error) { console.error("Error consultando cartera vencida:", error); return { total: 0, filas: [] }; }
  const total = (data || []).reduce((s: number, d: any) => s + Number(d.saldo_pendiente), 0);
  const filas = (data || []).slice(0, 8).map((d: any) =>
    `${d.numero} -- <strong>${clientes.get(d.id_cliente) || "Cliente"}</strong>: ${cop(d.saldo_pendiente)} vencida desde ${d.fecha_vencimiento}`);
  return { total, filas };
}

async function cxpProximaVencer(dias: number): Promise<{ total: number; filas: string[] }> {
  const limite = new Date(); limite.setDate(limite.getDate() + dias);
  const { data, error } = await supabase.from("cuentas_por_pagar")
    .select("numero, proveedor, saldo_pendiente, fecha_vencimiento")
    .gt("saldo_pendiente", 0).not("fecha_vencimiento", "is", null)
    .gte("fecha_vencimiento", hoyISO()).lte("fecha_vencimiento", limite.toISOString().slice(0, 10))
    .order("fecha_vencimiento");
  if (error) { console.error("Error consultando CxP próximas:", error); return { total: 0, filas: [] }; }
  const total = (data || []).reduce((s: number, d: any) => s + Number(d.saldo_pendiente), 0);
  const filas = (data || []).map((d: any) =>
    `${d.numero} -- <strong>${d.proveedor || "Proveedor"}</strong>: ${cop(d.saldo_pendiente)} vence ${d.fecha_vencimiento}`);
  return { total, filas };
}

async function ventasGanadasDesde(desdeISO: string): Promise<{ total: number; cantidad: number; porLinea: Record<string, number> }> {
  const { data, error } = await supabase.from("historial_cierres")
    .select("snapshot, estado, fecha_cierre").eq("estado", "ganado").gte("fecha_cierre", desdeISO);
  if (error) { console.error("Error consultando ventas ganadas:", error); return { total: 0, cantidad: 0, porLinea: {} }; }
  let total = 0; const porLinea: Record<string, number> = {};
  (data || []).forEach((h: any) => {
    const snap = h.snapshot || {};
    if (snap.lineas && snap.lineas.length) {
      snap.lineas.forEach((l: any) => { total += l.monto || 0; porLinea[l.linea || "otro"] = (porLinea[l.linea || "otro"] || 0) + (l.monto || 0); });
    } else {
      total += snap.monto || 0; porLinea[snap.linea || "otro"] = (porLinea[snap.linea || "otro"] || 0) + (snap.monto || 0);
    }
  });
  return { total, cantidad: (data || []).length, porLinea };
}

async function reprocesosDesde(desdeISO: string): Promise<{ total: number; cantidad: number; filas: string[] }> {
  const { data, error } = await supabase.from("reprocesos").select("ot, responsable, costo_total, created_at").gte("created_at", desdeISO);
  if (error) { console.error("Error consultando reprocesos:", error); return { total: 0, cantidad: 0, filas: [] }; }
  const total = (data || []).reduce((s: number, r: any) => s + Number(r.costo_total), 0);
  const filas = (data || [])
    .sort((a: any, b: any) => Number(b.costo_total) - Number(a.costo_total)).slice(0, 5)
    .map((r: any) => `Pedido ${r.ot}${r.responsable ? " -- responsable: " + r.responsable : ""}: ${cop(r.costo_total)}`);
  return { total, cantidad: (data || []).length, filas };
}

async function clientesEnRiesgoFilas(): Promise<string[]> {
  const clientes = await mapaClientes();
  const { data, error } = await supabase.from("historial_cierres").select("snapshot, estado, fecha_cierre").eq("estado", "ganado");
  if (error) { console.error("Error consultando clientes en riesgo:", error); return []; }
  const porCliente: Record<string, number[]> = {};
  (data || []).forEach((h: any) => {
    const idCli = h.snapshot?.idCli;
    if (!idCli) return;
    (porCliente[idCli] = porCliente[idCli] || []).push(new Date(h.fecha_cierre).getTime());
  });
  const hoyMs = Date.now();
  const resultados: { nombre: string; dias: number; ritmo: number }[] = [];
  Object.keys(porCliente).forEach((idCli) => {
    const fechas = porCliente[idCli].filter((t) => !isNaN(t)).sort((a, b) => a - b);
    if (fechas.length < 2) return;
    let suma = 0;
    for (let i = 1; i < fechas.length; i++) suma += fechas[i] - fechas[i - 1];
    const intervaloProm = suma / (fechas.length - 1) / 86400000;
    const diasDesdeUltima = (hoyMs - fechas[fechas.length - 1]) / 86400000;
    if (intervaloProm <= 90 && diasDesdeUltima > Math.max(intervaloProm * 1.5, 10)) {
      resultados.push({ nombre: clientes.get(idCli) || "Cliente", dias: Math.round(diasDesdeUltima), ritmo: Math.round(intervaloProm) });
    }
  });
  return resultados.sort((a, b) => b.dias - a.dias).slice(0, 5)
    .map((r) => `<strong>${r.nombre}</strong> no pide desde hace ${r.dias} días (antes compraba cada ${r.ritmo} días aprox.)`);
}

async function mejorVendedorFila(dias: number): Promise<string[]> {
  const { data, error } = await supabase.from("historial_cierres").select("snapshot, estado, fecha_cierre").gte("fecha_cierre", fechaHaceDias(dias));
  if (error) { console.error("Error consultando mejor vendedor:", error); return []; }
  const porVendedor: Record<string, { ganadas: number; total: number }> = {};
  (data || []).forEach((h: any) => {
    const v = h.snapshot?.vendedor; if (!v) return;
    const d = porVendedor[v] = porVendedor[v] || { ganadas: 0, total: 0 };
    d.total++; if (h.estado === "ganado") d.ganadas++;
  });
  let mejor: { vendedor: string; tasa: number; ganadas: number; total: number } | null = null;
  Object.keys(porVendedor).forEach((v) => {
    const d = porVendedor[v]; if (d.total < 3) return;
    const tasa = d.ganadas / d.total;
    if (!mejor || tasa > mejor.tasa) mejor = { vendedor: v, tasa, ganadas: d.ganadas, total: d.total };
  });
  if (!mejor) return [];
  const m = mejor as { vendedor: string; tasa: number; ganadas: number; total: number };
  return [`<strong>${m.vendedor}</strong>: ${m.ganadas}/${m.total} negocios cerrados (${Math.round(m.tasa * 100)}% de efectividad) en los últimos ${dias} días`];
}

async function costoCalidadResponsableFila(): Promise<string[]> {
  const { data, error } = await supabase.from("reprocesos").select("responsable, costo_total");
  if (error) { console.error("Error consultando costo de calidad:", error); return []; }
  const porResponsable: Record<string, number> = {};
  (data || []).forEach((r: any) => { if (!r.responsable) return; porResponsable[r.responsable] = (porResponsable[r.responsable] || 0) + Number(r.costo_total); });
  const totalGeneral = Object.values(porResponsable).reduce((s, v) => s + v, 0);
  if (totalGeneral <= 0) return [];
  const top = Object.keys(porResponsable).sort((a, b) => porResponsable[b] - porResponsable[a])[0];
  const pct = Math.round((porResponsable[top] / totalGeneral) * 100);
  return [`<strong>${top}</strong> concentra ${cop(porResponsable[top])} (${pct}% del costo total de reprocesos histórico)`];
}

async function fichasPorColumna(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("kanban_fichas").select("columna");
  if (error) { console.error("Error consultando Kanban:", error); return {}; }
  const conteo: Record<string, number> = {};
  (data || []).forEach((f: any) => { conteo[f.columna] = (conteo[f.columna] || 0) + 1; });
  return conteo;
}

async function fichasUrgentesFilas(): Promise<string[]> {
  const { data, error } = await supabase.from("kanban_fichas").select("ot, titulo, nombre_cli, columna").eq("urgente", true);
  if (error) { console.error("Error consultando fichas urgentes:", error); return []; }
  return (data || []).map((f: any) => `🚨 ${f.titulo || f.ot || "Ficha"} -- <strong>${f.nombre_cli || "Cliente"}</strong> (columna: ${f.columna})`);
}

async function fichasEnColumnaFilas(columna: string): Promise<string[]> {
  const { data, error } = await supabase.from("kanban_fichas").select("ot, titulo, nombre_cli").eq("columna", columna);
  if (error) { console.error("Error consultando fichas por columna:", error); return []; }
  return (data || []).map((f: any) => `${f.titulo || f.ot || "Ficha"} -- <strong>${f.nombre_cli || "Cliente"}</strong>`);
}

async function oportunidadesEstancadasFilas(minDias = 5): Promise<string[]> {
  const { data, error } = await supabase.from("opps").select("descripcion, nombre_cli, etapa, created_at").in("etapa", ["cot", "neg"]);
  if (error) { console.error("Error consultando oportunidades:", error); return []; }
  return (data || [])
    .filter((o: any) => diasDesde(o.created_at) >= minDias)
    .sort((a: any, b: any) => diasDesde(b.created_at) - diasDesde(a.created_at))
    .map((o: any) => `<strong>${o.nombre_cli}</strong> -- ${o.descripcion} (${diasDesde(o.created_at)} días sin cerrar)`);
}

async function financieroDelMes(): Promise<{ ventasFacturadas: number; ingresos: number; gastosFijos: number; gastosVariables: number; utilidadNeta: number }> {
  const hoy = new Date(); const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const [dv, ing, egF, egV] = await Promise.all([
    supabase.from("documentos_venta").select("total_documento").gte("fecha", desde),
    supabase.from("ingresos").select("valor").gte("fecha", desde),
    supabase.from("egresos").select("monto").gte("fecha", desde).eq("categoria", "fijo"),
    supabase.from("egresos").select("monto").gte("fecha", desde).eq("categoria", "variable"),
  ]);
  const ventasFacturadas = (dv.data || []).reduce((s: number, d: any) => s + Number(d.total_documento), 0);
  const ingresos = (ing.data || []).reduce((s: number, d: any) => s + Number(d.valor), 0);
  const gastosFijos = (egF.data || []).reduce((s: number, d: any) => s + Number(d.monto), 0);
  const gastosVariables = (egV.data || []).reduce((s: number, d: any) => s + Number(d.monto), 0);
  return { ventasFacturadas, ingresos, gastosFijos, gastosVariables, utilidadNeta: ingresos - (gastosFijos + gastosVariables) };
}

// ---------------------------------------------------------------------
// Los 15 informes (5 roles x 3 cadencias)
// ---------------------------------------------------------------------

const INFORMES: Record<string, Record<string, () => Promise<{ asunto: string; secciones: { titulo: string; filas: string[] }[] }>>> = {

  contabilidad: {
    diario: async () => {
      const pendientes = await tareasPendientesFilas({ responsable: "Yasmid Conde" });
      const cartera = await carteraVencida();
      const cxp = await cxpProximaVencer(3);
      return { asunto: "📋 Informe diario -- Contabilidad", secciones: [
        { titulo: "Tareas pendientes", filas: pendientes },
        { titulo: `Cartera vencida (total: ${cop(cartera.total)})`, filas: cartera.filas },
        { titulo: `Facturas de proveedor que vencen en 3 días (total: ${cop(cxp.total)})`, filas: cxp.filas },
      ] };
    },
    semanal: async () => {
      const desde = fechaHaceDias(7);
      const [dv, ing, eg] = await Promise.all([
        supabase.from("documentos_venta").select("total_documento").gte("fecha", desde.slice(0, 10)),
        supabase.from("ingresos").select("valor").gte("fecha", desde.slice(0, 10)),
        supabase.from("egresos").select("monto").gte("fecha", desde.slice(0, 10)),
      ]);
      const totalDv = (dv.data || []).reduce((s: number, d: any) => s + Number(d.total_documento), 0);
      const totalIng = (ing.data || []).reduce((s: number, d: any) => s + Number(d.valor), 0);
      const totalEg = (eg.data || []).reduce((s: number, d: any) => s + Number(d.monto), 0);
      const cartera = await carteraVencida();
      return { asunto: "📊 Informe semanal -- Contabilidad", secciones: [
        { titulo: "Esta semana", filas: [
          `Documentos de venta emitidos: ${cop(totalDv)}`,
          `Ingresos cobrados: ${cop(totalIng)}`,
          `Egresos pagados: ${cop(totalEg)}`,
        ] },
        { titulo: `Cartera vencida (total: ${cop(cartera.total)})`, filas: cartera.filas },
      ] };
    },
    mensual: async () => {
      const fin = await financieroDelMes();
      const cartera = await carteraVencida();
      return { asunto: "📆 Informe mensual -- Contabilidad", secciones: [
        { titulo: "Resumen financiero del mes", filas: [
          `Ventas facturadas: ${cop(fin.ventasFacturadas)}`,
          `Ingresos cobrados: ${cop(fin.ingresos)}`,
          `Gastos fijos: ${cop(fin.gastosFijos)}`,
          `Gastos variables: ${cop(fin.gastosVariables)}`,
          `Utilidad neta estimada (caja): ${cop(fin.utilidadNeta)}`,
        ] },
        { titulo: `Cartera vencida (total: ${cop(cartera.total)})`, filas: cartera.filas },
      ] };
    },
  },

  comercial: {
    diario: async () => {
      const pendientes = await tareasPendientesFilas({ area: "comercial" });
      const estancadas = await oportunidadesEstancadasFilas(5);
      return { asunto: "📋 Informe diario -- Comercial", secciones: [
        { titulo: "Tareas pendientes", filas: pendientes },
        { titulo: "Oportunidades sin movimiento hace más de 5 días", filas: estancadas },
      ] };
    },
    semanal: async () => {
      const ventas = await ventasGanadasDesde(fechaHaceDias(7));
      const riesgo = await clientesEnRiesgoFilas();
      return { asunto: "📊 Informe semanal -- Comercial", secciones: [
        { titulo: "Ventas de la semana", filas: [`${ventas.cantidad} negocio(s) ganado(s) -- ${cop(ventas.total)}`] },
        { titulo: "Clientes en riesgo de fuga", filas: riesgo },
      ] };
    },
    mensual: async () => {
      const ventas = await ventasGanadasDesde(fechaHaceDias(30));
      const mejor = await mejorVendedorFila(30);
      return { asunto: "📆 Informe mensual -- Comercial", secciones: [
        { titulo: "Ventas del mes", filas: [`${ventas.cantidad} negocio(s) ganado(s) -- ${cop(ventas.total)}`] },
        { titulo: "Efectividad del mes", filas: mejor },
      ] };
    },
  },

  diseno: {
    diario: async () => {
      const pendientes = await tareasPendientesFilas({ area: "diseno" });
      const enDiseno = await fichasEnColumnaFilas("diseno");
      return { asunto: "📋 Informe diario -- Diseño", secciones: [
        { titulo: "Tareas pendientes", filas: pendientes },
        { titulo: `Fichas en Kanban esperando diseño (${enDiseno.length})`, filas: enDiseno },
      ] };
    },
    semanal: async () => {
      const enDiseno = await fichasEnColumnaFilas("diseno");
      return { asunto: "📊 Informe semanal -- Diseño", secciones: [
        { titulo: `Fichas en Kanban esperando diseño ahora mismo (${enDiseno.length})`, filas: enDiseno },
      ] };
    },
    mensual: async () => {
      const enDiseno = await fichasEnColumnaFilas("diseno");
      return { asunto: "📆 Informe mensual -- Diseño", secciones: [
        { titulo: `Fichas en Kanban esperando diseño ahora mismo (${enDiseno.length})`, filas: enDiseno },
      ] };
    },
  },

  produccion: {
    diario: async () => {
      const pendientes = await tareasPendientesFilas({ area: "produccion" });
      const urgentes = await fichasUrgentesFilas();
      return { asunto: "📋 Informe diario -- Producción", secciones: [
        { titulo: "Tareas pendientes", filas: pendientes },
        { titulo: "Fichas urgentes", filas: urgentes },
      ] };
    },
    semanal: async () => {
      const rep = await reprocesosDesde(fechaHaceDias(7));
      const conteo = await fichasPorColumna();
      return { asunto: "📊 Informe semanal -- Producción", secciones: [
        { titulo: `Reprocesos de la semana (${rep.cantidad}, total: ${cop(rep.total)})`, filas: rep.filas },
        { titulo: "Fichas por columna ahora mismo", filas: [
          `Preparación: ${conteo["preparacion"] || 0}`, `Terminados: ${conteo["terminados"] || 0}`, `Por entregar: ${conteo["entregar"] || 0}`,
        ] },
      ] };
    },
    mensual: async () => {
      const rep = await reprocesosDesde(fechaHaceDias(30));
      const responsable = await costoCalidadResponsableFila();
      return { asunto: "📆 Informe mensual -- Producción", secciones: [
        { titulo: `Reprocesos del mes (${rep.cantidad}, total: ${cop(rep.total)})`, filas: rep.filas },
        { titulo: "Costo de calidad por responsable (histórico)", filas: responsable },
      ] };
    },
  },

  administrador: {
    diario: async () => {
      const vencidas = await tareasVencidasTodasLasAreasFilas(3);
      const cartera = await carteraVencida();
      return { asunto: "📋 Informe diario -- Gerencia", secciones: [
        { titulo: "Tareas con más de 3 días sin resolver (todas las áreas)", filas: vencidas },
        { titulo: `Cartera vencida (total: ${cop(cartera.total)})`, filas: cartera.filas },
      ] };
    },
    semanal: async () => {
      const ventas = await ventasGanadasDesde(fechaHaceDias(7));
      const riesgo = await clientesEnRiesgoFilas();
      const rep = await reprocesosDesde(fechaHaceDias(7));
      const cartera = await carteraVencida();
      const cxp = await cxpProximaVencer(15);
      return { asunto: "📊 Informe semanal -- Gerencia", secciones: [
        { titulo: "Ventas de la semana", filas: [`${ventas.cantidad} negocio(s) ganado(s) -- ${cop(ventas.total)}`] },
        { titulo: "Clientes en riesgo de fuga", filas: riesgo },
        { titulo: `Reprocesos de la semana (total: ${cop(rep.total)})`, filas: rep.filas },
        { titulo: "Flujo de caja (próximos 15 días)", filas: [
          `Por cobrar (cartera ya vencida): ${cop(cartera.total)}`,
          `Por pagar (próximos 15 días): ${cop(cxp.total)}`,
        ] },
      ] };
    },
    mensual: async () => {
      const ventas = await ventasGanadasDesde(fechaHaceDias(30));
      const mejor = await mejorVendedorFila(30);
      const responsable = await costoCalidadResponsableFila();
      const cartera = await carteraVencida();
      return { asunto: "📆 Informe mensual -- Gerencia", secciones: [
        { titulo: "Ventas del mes", filas: [`${ventas.cantidad} negocio(s) ganado(s) -- ${cop(ventas.total)}`] },
        { titulo: "Efectividad de ventas", filas: mejor },
        { titulo: "Costo de calidad por responsable (histórico)", filas: responsable },
        { titulo: `Cartera vencida (total: ${cop(cartera.total)})`, filas: cartera.filas },
      ] };
    },
  },
};

Deno.serve(async (req: Request) => {
  let body: { rol?: string; cadencia?: string } = {};
  try { body = await req.json(); } catch (_e) { /* body vacío -- se valida abajo */ }
  const { rol, cadencia } = body;

  const destinatarios = rol ? DESTINATARIOS[rol] : undefined;
  const informe = rol && cadencia ? INFORMES[rol]?.[cadencia] : undefined;
  if (!destinatarios || !informe) {
    return new Response(JSON.stringify({ ok: false, error: `rol/cadencia inválidos: ${rol}/${cadencia}` }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const hoy = new Date();
  if (esFestivoColombia(hoy)) {
    return new Response(JSON.stringify({ ok: true, rol, cadencia, skip: "Hoy es festivo en Colombia -- no se envían informes." }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  // El mensual dispara todos los días 1-5 del mes (ver migracion_cron_informes.sql) para poder
  // correrse solo al primer día hábil si el 1 cae festivo/fin de semana -- si hoy no es ESE día
  // exacto, no se manda (evita mandarlo varias veces esos días).
  if (cadencia === "mensual" && !esPrimerDiaHabilDelMes(hoy)) {
    return new Response(JSON.stringify({ ok: true, rol, cadencia, skip: "Todavía no es el primer día hábil del mes." }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { asunto, secciones } = await informe();
  const html = plantilla(asunto.replace(/^[^\s]+\s/, ""), secciones);
  const resultado = await enviarCorreo(destinatarios, `Tactical ERP -- ${asunto}`, html);

  return new Response(JSON.stringify({ ok: resultado.ok, rol, cadencia, enviado: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
