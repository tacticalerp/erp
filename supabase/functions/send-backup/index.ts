// ==========================================================================
// TACTICAL ERP -- Backup semanal automático (Edge Function de Supabase)
// Conde 2026-08-28: "puedes programar hacer un backup cada semana? donde se
// descargaría?" -- mismo mecanismo ya desplegado y probado en
// supabase/functions/send-reports/index.ts (Edge Function + pg_cron + pg_net
// + Resend), reutilizado acá para no depender de que alguien tenga el
// navegador abierto para darle clic a "Exportar todo (backup)" en el Hub.
//
// A DÓNDE LLEGA: como archivo ADJUNTO en un correo (no se guarda dentro de
// Supabase) -- así, si algún día hay un problema con la cuenta de Supabase,
// la copia ya está afuera, en la bandeja de entrada. El adjunto es un
// tactical-erp-backup-AAAA-MM-DD.json.gz (comprimido, para no chocar con el
// límite de tamaño de los adjuntos de correo) -- para abrirlo: descomprimir
// el .gz y abrir el .json resultante con cualquier editor de texto.
//
// Misma lista de tablas que TACTICAL_TABLAS_BACKUP en TACTICAL_ERP_HUB.html
// (el botón manual "Exportar todo") -- si se agrega una tabla nueva ahí,
// agregarla acá también a mano.
//
// Se ejecuta sin sesión de usuario (cron), por eso usa la SERVICE_ROLE key
// (bypasea RLS) en vez del anon key -- igual que send-reports, ya viene
// inyectada automáticamente por Supabase en toda Edge Function.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "Tactical ERP <reportes@tacticalmg.co>";

// Conde 2026-08-28: el backup completo incluye TODO (finanzas, clientes, costos) -- por eso llega
// solo a gerencia, no a la misma lista más amplia que los informes por rol. Si quieres que también
// le llegue a alguien más, agrégalo acá.
const DESTINATARIOS = ["gerencia@tacticalmg.co"];

const TABLAS: string[] = [
  "usuarios", "clientes", "opps", "historial_cierres", "cotizaciones_cuadernos",
  "cotizaciones_calculadoras", "prefacturas",
  "pedidos_borrador", "comparaciones_borrador", "b2c_carrito_borrador",
  "kanban_fichas", "kanban_lineas", "kanban_checklist", "kanban_fotos",
  "reprocesos", "reprocesos_items", "tareas", "proveedores",
  "documentos_venta", "documentos_venta_items", "ingresos",
  "cuentas_por_pagar", "cuentas_por_pagar_items", "egresos", "gastos_fijos_config",
  "personal", "contadores", "ot_contadores",
  "precios_override", "precios_promo_override", "sustratos_custom", "acabados_custom",
  "fototeca_items", "b2c_pedidos", "b2c_pedido_items",
];

async function comprimirGzip(texto: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(texto);
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

function bytesABase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (_req: Request) => {
  const data: Record<string, unknown[]> = {};
  const errores: string[] = [];
  for (const tabla of TABLAS) {
    const { data: filas, error } = await supabase.from(tabla).select("*");
    if (error) {
      console.error(`Error respaldando tabla ${tabla}:`, error);
      errores.push(tabla);
      continue;
    }
    data[tabla] = filas ?? [];
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const respaldo = { version: 2, exportadoEn: new Date().toISOString(), origen: "supabase (cron semanal)", data };
  const json = JSON.stringify(respaldo);
  const comprimido = await comprimirGzip(json);
  const base64 = bytesABase64(comprimido);

  const totalFilas = Object.values(data).reduce((s, arr) => s + arr.length, 0);
  const resumenTablas = TABLAS.map((t) => `${t}: ${data[t]?.length ?? "ERROR"}`).join(", ");

  const html = `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
      <div style="background:#1e3a5f; color:#fff; padding:16px 20px;">
        <h2 style="margin:0; font-size:18px;">📦 Backup semanal -- Tactical ERP</h2>
        <p style="margin:4px 0 0; font-size:12px; color:#cbd8e8;">${
    new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  }</p>
      </div>
      <div style="padding:20px; border:1px solid #e2e8f0; border-top:none;">
        <p>Copia completa de todos los datos guardados en Supabase, adjunta a este correo (archivo comprimido .json.gz).</p>
        <p><strong>${TABLAS.length - errores.length} de ${TABLAS.length} tablas respaldadas</strong>, ${totalFilas} registro(s) en total.</p>
        ${errores.length ? `<p style="color:#c0392b;"><strong>⚠️ Fallaron estas tablas:</strong> ${errores.join(", ")}</p>` : ""}
        <p style="font-size:12px; color:#718096;">Para abrirlo: descomprime el .gz y abre el .json con cualquier editor de texto. Detalle por tabla: ${resumenTablas}.</p>
      </div>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: DESTINATARIOS,
      subject: `Tactical ERP -- Backup semanal (${fecha})`,
      html,
      attachments: [{ filename: `tactical-erp-backup-${fecha}.json.gz`, content: base64 }],
    }),
  });
  const respData = await r.json();
  if (!r.ok) console.error("Error enviando backup por correo:", respData);

  return new Response(
    JSON.stringify({ ok: r.ok, fecha, tablasOk: TABLAS.length - errores.length, tablasError: errores, totalFilas }),
    { headers: { "Content-Type": "application/json" } },
  );
});
