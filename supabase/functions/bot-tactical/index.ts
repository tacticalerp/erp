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
// Conde 2026-09-03: sumó el catálogo de papeles/cartulinas (Panel de Precios) y los troqueles de
// Cajas, Carpetas y Bolsas (Rompecabezas ya estaba desde el 09-01).
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

CATÁLOGO DE PAPELES Y CARTULINAS (precio por PLIEGO completo, en COP -- sacado de precios_tactical.js, PRECIOS_BASE_SUSTRATOS. "N/D" = ese gramaje no se maneja en ese tamaño de pliego. OJO: si Conde cambió alguno de estos precios desde el Panel de Precios del Hub, ese ajuste vive en el navegador de Conde y NO se refleja acá automáticamente -- si el precio se ve muy distinto a lo que él recuerda, acláraselo en vez de insistir en el valor de esta lista):
Bond 60g: pliego 60x90 $177 | pliego 70x100 $230
Bond 70g: pliego 60x90 $206 | pliego 70x100 $267
Bond 75g: pliego 60x90 $221 | pliego 70x100 $287
Bond 90g: pliego 60x90 $266 | pliego 70x100 $344
Bond 115g: pliego 60x90 N/D | pliego 70x100 $459
Propalcote 80g: pliego 60x90 N/D | pliego 70x100 $309
Propalcote 90g: pliego 60x90 $267 | pliego 70x100 $348
Propalcote 115g: pliego 60x90 $344 | pliego 70x100 $448
Propalcote 150g: pliego 60x90 $473 | pliego 70x100 $613
Propalcote 200g: pliego 60x90 $604 | pliego 70x100 $810
Propalcote 240g: pliego 60x90 $807 | pliego 70x100 $1.050
Propalcote 300g: pliego 60x90 $911 | pliego 70x100 $1.183
Propalcote 350g: pliego 60x90 N/D | pliego 70x100 $1.382
Cartulina C11 190g: pliego 60x90 N/D | pliego 70x100 $684
Cartulina C12 205g: pliego 60x90 $581 | pliego 70x100 $753
Cartulina C14 225g: pliego 60x90 $637 | pliego 70x100 $826
Cartulina C16 255g: pliego 60x90 $723 | pliego 70x100 $937
Cartulina C18 275g: pliego 60x90 $779 | pliego 70x100 $1.010
Cartulina C20 305g: pliego 60x90 $864 | pliego 70x100 $1.121
Cartulina C22 330g: pliego 60x90 N/D | pliego 70x100 $1.212
Eart Pact 70g: pliego 60x90 $218 | pliego 70x100 $277
Bristol Color 150g: pliego 60x90 N/D | pliego 70x100 $613
Bristol Blanca 140g: pliego 60x90 N/D | pliego 70x100 $555
Kraft Cartón 335g: pliego 60x90 N/D | pliego 70x100 $924
Kraft 98g: pliego 60x90 N/D | pliego 70x100 $353
Kraft 120g: pliego 60x90 N/D | pliego 70x100 $370
Book Cream 56.2g: pliego 60x90 $185 | pliego 70x100 $218
Adhesivo Ritrama Corriente 160g: pliego 60x90 N/D | pliego 70x100 $1.597
Adhesivo Ritrama Seguridad 160g: pliego 60x90 N/D | pliego 70x100 $1.916
Adhesivo Ritrama Vinilo Blanco 220g: pliego 60x90 N/D | pliego 70x100 $5.008
Adhesivo Ritrama Transparente 160g: pliego 60x90 N/D | pliego 70x100 $5.008
Adhesivo Ritrama Polipropileno 220g: pliego 60x90 N/D | pliego 70x100 $4.484
Adhesivo Ritrama Bond 160g: pliego 60x90 N/D | pliego 70x100 $2.147
Adhesivo Arclad PXH K80 160g: pliego 60x90 N/D | pliego 70x100 $1.479
Adhesivo Arclad Corriente P3 160g: pliego 60x90 N/D | pliego 70x100 $1.672
Adhesivo Arclad Hotmelt 160g: pliego 60x90 N/D | pliego 70x100 $2.013
Adhesivo Arclad P4 160g: pliego 60x90 N/D | pliego 70x100 $2.269
(Estos son precio de INSUMO -- lo que Tactical paga por el pliego de papel, no el precio de venta al cliente. Si preguntan "cuánto vale un cuaderno/caja/etc" con esto no alcanza, hace falta el motor de cálculo completo.)

CATÁLOGO DE TROQUELES -- CAJAS (calculadora_cajas.html, TROQUELES_CAJAS. Medidas en cm: ancho x alto x largo es la medida de la caja armada; "montaje impreso" es el tamaño de la pieza ya troquelada/plana que hay que imprimir):
CJB1-1: 7x1x15 -- montaje impreso 19.5x17 -- 1 cavidad
CJB1-2: 12.5x3.7x20.5 -- montaje impreso 32.5x31.5 -- 1 cavidad
CJB1-3: 14.5x4.2x15 -- montaje impreso 27x40.5 -- 1 cavidad
CJB1-4: 19.5x1.3x12.5 -- montaje impreso 22.7x17.5 -- 1 cavidad
CJB1-5: 8x4x8 -- montaje impreso 25x19 -- 1 cavidad
CJB1-6: 7.5x7.5x7.5 -- montaje impreso 31x25 -- 1 cavidad
CJB1-7: 6.3x6x6.3 -- montaje impreso 26x21 -- 1 cavidad
CJB1-8: 7x15.3x7 -- montaje impreso 29.5x29.5 -- 1 cavidad
CJB1-9: 22.5x3x15 -- montaje impreso 39.5x35 -- 1 cavidad
CJB1-10: 20x4x13.5 -- montaje impreso 49.5x34.5 -- 1 cavidad
CJB1-11: 4.5x4.7x4.5 -- montaje impreso 18.5x21 -- 1 cavidad
CJB1-12: 23.7x9x8 -- montaje impreso 45x20 -- 1 cavidad
CJB1-13: 5.8x5.8x5.8 -- montaje impreso 24.5x20 -- 1 cavidad
CJB1-14: 25x15x7.5 -- montaje impreso 66.5x30.5 -- 1 cavidad
CJB1-15: 6x24x6 -- montaje impreso 50x25.5 -- 2 cavidades (tubo, 2 cajas por golpe de troquel)
CJB1-16: 4.3x9.5x4.3 -- montaje impreso 28x28 -- 1 cavidad (tiene una medida alternativa de 5.3cm con montaje 22x21cm -- confirmar con Conde cuál usar)
CJB1-17: 9x2.5x9 -- montaje impreso 24x21.5 -- 1 cavidad
CJB1-18: 8x2x17.8 -- montaje impreso 35x27 -- 3 cavidades (3 cajas por golpe de troquel)
CJB1-19: 23.5x5.5x25 -- montaje impreso 67.5x48.5 -- 1 cavidad
CJB1-20: 26x8x26 -- montaje impreso 77x52 -- 1 cavidad (excede medio pliego 50x70, necesita máquina de pliego completo -- cotizar manual con proveedor externo)
CJB1-21: 15.5x4x11 -- montaje impreso 23x20 -- 3 cavidades (3 cajas por golpe de troquel, montaje alterno 50x14cm)

CATÁLOGO DE TROQUELES -- CARPETAS (calculadora_carpetas.html, TROQUELES_CARPETAS. Medidas en cm; "ancho x alto" es la carpeta cerrada, "montaje impreso" el tamaño de la pieza plana a imprimir):
CARP-001: 1 bolsillo (profundidad 8) -- 30x23 -- montaje impreso 46.5x38.5
CARP-002: 2 bolsillos (profundidad 3.5) -- 30x22.5 -- montaje impreso 49x34
CARP-003: 2 bolsillos (profundidad 10) -- 32x22.5 -- montaje impreso 56x45
CARP-004: 1 bolsillo (profundidad 6.5) -- 30.5x23 -- montaje impreso 47.5x37
CARP-005: 1 bolsillo (profundidad 10) -- 30x22.7 -- montaje impreso 47x40
CARP-006: 1 bolsillo (profundidad 8) -- 33x23 -- montaje impreso 48x41
CARP-007: 1 bolsillo (profundidad 5) -- 29x22.5 -- montaje impreso 47x34
CARP-008: 1 bolsillo (profundidad 4) -- 30.5x23 -- montaje impreso 47.5x34.5
CARP-009: 2 bolsillos (profundidad 10) -- 30.5x24.2 -- montaje impreso 51x40.8
CARP-010: 1 bolsillo (profundidad 5) -- 28.3x22.2 -- montaje impreso 47.5x33.5
CARP-011: 1 bolsillo (profundidad 3) -- 29x22.5 -- montaje impreso 69x32 (carpeta de 3 cuerpos)

CATÁLOGO DE TROQUELES -- BOLSAS (calculadora_bolsas.html, TROQUELES_BOLSAS. Medidas en cm: ancho x alto x profundo es la bolsa armada; "montaje impreso" el tamaño de la pieza plana a imprimir; "por2" indica si el troquel corta 2 bolsas por golpe):
BOLS-001: 33x25x13 -- montaje impreso 47.5x37 -- por2
BOLS-002: 25x25x10 -- montaje impreso 34x36 -- por2
BOLS-003: 21.5x37x9 -- montaje impreso 33x46.5 -- por2
BOLS-004: 45x34x13 -- montaje impreso 60x46 -- por2
BOLS-005: 27x33x6 -- montaje impreso 35x41 -- por2
BOLS-006: 24x19x7 -- montaje impreso 63.5x22.5 -- 1 sola pieza (no por2)
BOLS-007: 25x19x10 -- montaje impreso 38x31 -- por2 (trapecio 25/19.5cm, toma el ancho mayor)
BOLS-008: 33x20.5x6 -- montaje impreso 41x30.5 -- por2
BOLS-009: 30x33.5x13 -- montaje impreso 50.5x42.5 -- por2
BOLS-010: 38x35x12 -- montaje impreso 52x45 -- por2
BOLS-011: 30.5x53.5x16 -- montaje impreso 48x67.5 -- por2 (botellera)
BOLS-012: 24x32x10 -- montaje impreso 50x70 -- 1 sola pieza
BOLS-013: 21.5x30x12 -- montaje impreso 44x69 -- 1 sola pieza
BOLS-014: 25x30x8.5 -- montaje impreso 68.5x49.5 -- 1 sola pieza
BOLS-015: 25x35x8.5 -- montaje impreso 69x50 -- 1 sola pieza
BOLS-016: 34.5x25x6 -- montaje impreso 56x50 -- por2
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
