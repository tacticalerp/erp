# Bot de WhatsApp — Rompecabezas B2C (Fase 1)

Backend del asistente de WhatsApp de la línea de Rompecabezas personalizados. Asesora al cliente,
genera la previsualización real (reusa `modulo_montajes_rompecabezas.html` sin reescribirlo), cierra
el pedido y deja el pago pendiente de verificación humana (Nequi personal, sin API de banco).
Troquelados (mayorista) no se cotiza solo: el bot recoge cantidad aproximada + nombre y deja el lead
para que un asesor lo cierre.

## Qué falta para que esto funcione de verdad (fuera de este código)

1. **Facebook Business Manager de Tactical**, verificado, con el número de WhatsApp de Rompecabezas
   dado de alta en **WhatsApp Cloud API** (developers.facebook.com). De ahí salen `WA_ROMPECABEZAS_TOKEN`
   y `WA_ROMPECABEZAS_PHONE_NUMBER_ID`.
2. **VPS** (Ubuntu 22.04, 2GB RAM) con Node.js 18+ instalado.
3. **Dominio o subdominio** apuntando al VPS (ej. `bot.tacticalmarketing.com`), con HTTPS
   (Let's Encrypt vía Nginx) — Meta exige que el webhook sea `https://`.
4. Decidir el **número de Nequi** al que el bot le va a decir al cliente que transfiera
   (`NEQUI_NUMERO` / `NEQUI_TITULAR`).
5. Confirmar los textos reales de FAQ (envíos/materiales/tiempos) — hoy son placeholders marcados
   `TODO (Conde)` en `src/bots/rompecabezas/flow.js`.

Ninguno de estos puntos se puede resolver desde el código — son cuentas/decisiones que Conde tiene
que gestionar/confirmar.

## Instalación local (Node.js y Chromium ya instalados en este equipo)

```bash
cd whatsapp-bot
npm install
cp .env.example .env
# editar .env con los datos reales (o dejarlo vacío para solo probar con el simulador)
npm start
```

## Probar el bot SIN WhatsApp ni VPS

```bash
cd whatsapp-bot
npm run simulate
```

Abre una conversación por terminal contra el flujo real (incluida la previsualización real, generada
igual que la genera un humano). Comandos especiales dentro del simulador:

- `foto:<ruta de una imagen>` — manda esa foto como si fuera del cliente.
- `foto:test` — genera una foto de prueba automática (no necesitas tener una foto a mano).
- `salir` — termina.

Las imágenes que manda el bot (la previsualización) se guardan en `data/simulador_output/` para
abrirlas y verlas. Ya se probó de punta a punta: línea Láser completa (con previsualización real
generada por Puppeteer) y el lead de Troquelados.

## Qué hace y qué no hace todavía

- ✅ Flujo completo de Láser (línea → forma → talla → orientación → cantidad → foto →
  previsualización real → aprobación → nombre → instrucciones de pago Nequi → recibir comprobante →
  queda pendiente de verificación humana). **Probado end-to-end con el simulador.**
- ✅ Troquelados: recoge cantidad aproximada + nombre y guarda el lead (`tipo: "troquel_lead"`) para
  que un asesor lo contacte — no se automatiza el cierre ni el precio.
- ✅ FAQ básicas (envíos/materiales/tiempos) — **los textos son placeholders, hay que confirmarlos
  con Conde antes de producción** (buscar `TODO (Conde)` en `src/bots/rompecabezas/flow.js`).
- ✅ Panel en el Hub (`TACTICAL_ERP_HUB.html`, módulo "🤖 Bot WhatsApp") para importar pedidos,
  ver el comprobante de pago y aprobar (crea cliente en CRM + ficha en Kanban), o marcar un lead de
  Troquel como contactado (solo crea el cliente en CRM). Probado en navegador.
- ✅ Mensajes del mismo cliente se procesan en orden (se corrigió una condición de carrera donde 2
  mensajes seguidos muy rápido podían pisarse el estado de la conversación).
- ⛔ Transcripción de audios: no está conectada todavía (requiere contratar un proveedor de
  speech-to-text, ej. Whisper API — decisión pendiente). Hoy el bot responde "no puedo escuchar
  audios, ¿me escribes?" en vez de fallar en silencio.
- ⛔ Confirmación real de pago: sigue siendo 100% manual (Nequi personal, sin API de banco) — es
  una decisión ya tomada, no un pendiente técnico.
- ⛔ Conexión real a WhatsApp: falta el Business Manager + VPS + dominio (ver arriba). Todo lo demás
  ya está construido y probado localmente.

## Arquitectura en 1 frase

WhatsApp Cloud API → `POST /webhook/rompecabezas` → `flow.js` (máquina de estados por número de
cliente, guardada en `data/sessions.json`, serializada para que 2 mensajes del mismo cliente no se
crucen) → cuando se completa el pedido o el lead de Troquel, se guarda en `data/pedidos.json` → el
Hub lo importa por polling a `/api/pedidos-pendientes` (protegido con `HUB_API_KEY`) y lo mete al
Kanban/CRM con la misma lógica que ya usa `aprobarPedido()` hoy.
