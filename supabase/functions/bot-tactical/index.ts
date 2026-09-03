// ==========================================================================
// TACTICAL ERP -- Bot Tactical (Edge Function de Supabase)
// Backend del asistente conversacional embebido en el ERP (widget de chat).
// Mismo patrón ya usado en supabase/functions/send-reports e index.ts de
// send-backup (Edge Function de Supabase) -- acá vive la llamada a la API
// de Anthropic, para que la clave NUNCA quede expuesta en el navegador.
//
// SESIÓN 1 -- alcance intencionalmente chico: recibe un mensaje, verifica que
// quien pregunta esté realmente logueado en el ERP, le pregunta a Claude con
// un system prompt de soporte técnico neutral (NO la personalidad de Derek,
// que es un proyecto aparte), y devuelve la respuesta. Todavía NO filtra por
// rol, NO conecta a las tablas del ERP, NO maneja fotos ni tareas -- eso es
// de sesiones futuras según spec-bot-tactical.md.
//
// A diferencia de send-reports/send-backup (que corren solas por cron, sin
// usuario), esta función la llama el navegador -- por eso valida el token de
// sesión del usuario (Authorization: Bearer <access_token>) con el cliente
// ANON antes de contestar nada. No usa la SERVICE_ROLE key: no necesita
// saltarse Row Level Security, solo confirmar que quien pregunta inició
// sesión de verdad en el ERP.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// CORS: esta función SÍ la llama el navegador directo (a diferencia de
// send-reports/send-backup, que solo corren por cron) -- sin estas
// cabeceras, el navegador bloquea la respuesta antes de que el widget la vea.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // x-client-info: el navegador la agrega solo (identifica la versión de la librería de Supabase
  // que usa el widget) -- sin autorizarla acá explícitamente, el navegador bloquea la petición
  // ANTES de que llegue a este código, con un error de CORS en el "preflight".
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Datos técnicos REALES de Tactical (sacados directo del motor de cálculo del ERP -- precios_tactical.js
// y las calculadoras, no son un valor genérico de la industria). Conde 2026-09-01: primer dato real
// conectado al bot, para que no compita con la respuesta genérica que cualquier IA ya da gratis.
// Si Conde ajusta alguno de estos valores en el motor de precios, hay que actualizarlo también acá a
// mano -- no se leen automáticamente todavía (eso sería la siguiente mejora de este mismo mecanismo).
const DATOS_TECNICOS_REALES = `
- Margen de pinza en impresión DIGITAL: 5mm (0.5cm). Aplica en Bolsas, Carpetas, Cajas, Rompecabezas, Volantes, Cubo Rubik y Cuadernos.
- Área real de impresión en OFFSET (litografía) por formato de máquina -- estos son los valores validados y en uso en Volantes, Rompecabezas, Carpetas y Cuadernos (el margen de pinza NO es uniforme entre formatos, cada uno pierde un ancho distinto por lado):
  - Octavo: pliego de 25x35cm -> área imprimible real 24.5x34cm.
  - Cuarto: pliego de 35x50cm -> área imprimible real 34x49.5cm.
  - Medio pliego: pliego de 50x70cm -> área imprimible real 49x69.5cm.
  (Esto es solo para calcular cuántas piezas caben por pasada de impresión -- el tamaño de pliego que se compra/corta sigue siendo el tamaño completo de arriba, sin este descuento.)
- Carpetas: además del margen de pinza normal, se suma 1cm extra obligatorio al ALTO del montaje.

CATÁLOGO DE ROMPECABEZAS (línea B2C -- sacado directo de modulo_montajes_rompecabezas.html):

Troquelados (mayorista, mínimo 50 unidades -- SIN precio de lista fijo, siempre se cotiza con un asesor humano, no inventes un precio para esto):
6f: 10x10cm o 18.3x11.7cm | 12f: 18x14cm o 27x23cm | 21f: 20x10cm | 24f: 17x11cm | 30f: 21.5x17cm, 28x20cm o 30x22cm | 48f: 21.5x28cm | 70f: 49x33.5cm | 208f: 43x29.5cm | 252f: 48x33.5cm | 500f: 48x34cm | 1000f: 68x48cm

Láser Rectangular (precio de lista real en COP, venta directa):
20f 24x16cm $49.000 | 30f 32x24cm $55.000 | 80f 32x24cm $65.000 | 100f 32x32cm $73.000 | 150f 32x32cm $83.000 | 100f 50x33cm $85.000 | 200f 50x33cm $99.000 | 300f 50x33cm $125.000 | 500f 50x33cm $142.000 | 200f 66x50cm $139.000 | 300f 66x50cm $149.000 | 500f 66x50cm $159.000 | 1000f 66x50cm $189.000 | 1000f 100x66cm $219.000 | 1500f 100x66cm $240.000 | 2000f 100x66cm $259.000 | 3000f 100x66cm $329.000 | 4000f 90x130cm $380.000 | 5000f 90x130cm $490.000

Láser Portarretrato:
30f 25x16cm $65.000 | 50f 28x22cm $79.000 | 80f 28x22cm $95.000 | 90f 12x17cm (marco de madera) $65.000 | 200f 33x50cm $129.000

Láser Corazón:
30f 32x24cm $75.000 | 60f 32x24cm $85.000 | 90f 32x24cm $95.000 | 160f 50x33cm $110.000 | 90f 32x24cm (corazón + portarretrato) $125.000

Láser Círculo:
50f (diámetro 32cm) $73.000 | 110f (diámetro 32cm) $83.000 | 700f (diámetro 60cm) $219.000

Nota importante sobre esta línea: los precios de Rompecabezas Láser SÍ son precio de lista fijo (no dependen de una fórmula variable), por eso se pueden dar directo. Aplica 20% de descuento automático en cada unidad PAR del pedido (2a, 4a, 6a...) si preguntan por varias unidades. El resto de líneas del ERP (Cuadernos, Volantes, Carpetas, Bolsas, Cajas, Cubo Rubik, Promocionales) NO tienen precio de lista fijo -- sus precios dependen de cantidad/material/tintas y requieren el motor de cálculo real, que todavía no está conectado a este bot.
`.trim();

// System prompt de Bot Tactical: soporte técnico neutral, distinto a Derek (coach de Bezalel en
// Telegram, personalidad confrontativa -- proyecto separado, no confundir). Se le dice
// explícitamente qué NO puede hacer todavía para que no invente que ya sabe crear tareas,
// cotizaciones, o consultar datos reales del ERP -- eso llega en sesiones futuras.
const SYSTEM_PROMPT = `Eres "Bot Tactical", el asistente interno del ERP de Tactical Marketing Group (empresa de impresión y productos promocionales en Colombia).

Tu tono es neutral, profesional y directo -- como el soporte técnico interno de una empresa, no un coach ni un vendedor. Sin emojis excesivos, sin lenguaje motivacional.

Ayudas a los empleados con dudas técnicas de producción (sangrado, formatos de archivo, especificaciones de impresión).

DATOS TÉCNICOS REALES DE TACTICAL (usa estos valores exactos cuando la pregunta sea sobre ellos -- son el dato real del motor de cálculo, no un promedio de la industria; si alguien pregunta "cuánto es el margen de pinza" sin más contexto, dale estos valores en vez de un rango genérico):
${DATOS_TECNICOS_REALES}

Para cualquier otra duda técnica que NO esté en esa lista, puedes usar tu conocimiento general de la industria gráfica, pero acláralo explícitamente (ej. "esto es un estándar general de la industria, no un valor confirmado de Tactical -- confírmalo con Helver antes de usarlo en producción").

IMPORTANTE -- todavía NO tienes estas capacidades, aunque el proyecto las va a incluir más adelante:
- Fuera de la lista de datos técnicos de arriba, no tienes acceso al resto de la documentación interna de Tactical ni a la biblioteca de videos de procesos todavía.
- No puedes crear ni borrar tareas.
- No puedes generar ni confirmar cotizaciones.
- No puedes consultar datos del ERP (Kanban, clientes, finanzas, etc.).
Si te preguntan por algo de esa lista, dilo con honestidad ("todavía no tengo esa función conectada") en vez de inventar una respuesta o fingir que lo hiciste.

Si una pregunta necesita resolución humana que no puedes dar con conocimiento general, sugiere escalar a **Helver** (si es un tema de producción/técnico) o a **Norely** (si es administrativo/comercial) -- nunca digas "Bezalel", ese nombre es de otro proyecto interno y el equipo no lo reconoce.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // --- 1. Verificar que quien pregunta tiene una sesión real en el ERP ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No autenticado." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- 2. Leer el mensaje + historial corto que manda el widget ---
    const body = await req.json();
    const mensaje = (body?.mensaje || "").toString().trim();
    // historial: array de {role: "user"|"assistant", content: string} que arma el widget con lo ya
    // conversado en esta sesión del navegador -- la Edge Function no guarda memoria propia todavía.
    const historial: Array<{ role: string; content: string }> = Array.isArray(body?.historial)
      ? body.historial
      : [];
    if (!mensaje) {
      return new Response(JSON.stringify({ error: "Mensaje vacío." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- 3. Preguntarle a Claude ---
    const mensajesClaude = [
      ...historial
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: mensaje },
    ];

    const respuesta = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // effort "low": son preguntas de soporte cortas, no necesitan razonamiento profundo -- prioriza
      // respuesta rápida y barata. Se puede subir después si hace falta más profundidad.
      output_config: { effort: "low" },
      messages: mensajesClaude,
    });

    const textoRespuesta = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return new Response(JSON.stringify({ respuesta: textoRespuesta || "(sin respuesta)" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error en bot-tactical:", e);
    return new Response(
      JSON.stringify({ error: "Hubo un problema técnico procesando tu pregunta. Intenta de nuevo." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
