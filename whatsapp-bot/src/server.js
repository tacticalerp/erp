const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { createWhatsAppClient, parseIncomingMessages } = require('./whatsapp/client');
const rompecabezasFlow = require('./bots/rompecabezas/flow');
const store = require('./store/pedidos');

const app = express();
app.use(express.json());

const rompecabezasClient = createWhatsAppClient({
  token: config.rompecabezas.token,
  phoneNumberId: config.rompecabezas.phoneNumberId,
});

// --- Webhook línea Rompecabezas ---

// Meta llama esto UNA vez al configurar el webhook, para comprobar que el servidor es tuyo.
app.get('/webhook/rompecabezas', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.rompecabezas.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook/rompecabezas', async (req, res) => {
  // Responder rápido siempre -- si Meta no recibe 200 en pocos segundos, reintenta y puede
  // duplicar mensajes.
  res.sendStatus(200);

  const messages = parseIncomingMessages(req.body);
  for (const message of messages) {
    try {
      await rompecabezasClient.markAsRead(message.id);
      await rompecabezasFlow.handleIncomingMessage({ from: message.from, message, waClient: rompecabezasClient });
    } catch (err) {
      console.error('Error procesando mensaje de', message.from, err);
      try {
        await rompecabezasClient.sendText(message.from, 'Tuvimos un problema técnico, ya estamos revisando. Intenta de nuevo en un momento.');
      } catch (_) { /* si ni esto se puede enviar, ya quedó en el log de arriba */ }
    }
  }
});

// --- API para que el Hub (TACTICAL_ERP_HUB.html) importe los pedidos que llegaron por el bot ---
// El Hub corre en el navegador y su "base de datos" es localStorage, así que es el propio Hub el
// que hace polling aquí y mete los pedidos al Kanban/CRM con la misma lógica de aprobarPedido().
// Lleva nombre/celular/montos de clientes, así que va detrás de una clave compartida simple
// (no es login de usuario, solo evita que quede abierto a cualquiera en internet).

function requireHubApiKey(req, res, next) {
  if (!config.hubApiKey) {
    return res.status(500).send('Falta configurar HUB_API_KEY en el servidor.');
  }
  if (req.get('x-api-key') !== config.hubApiKey) {
    return res.sendStatus(401);
  }
  next();
}

app.get('/api/pedidos-pendientes', requireHubApiKey, (req, res) => {
  res.json(store.listPedidosPendientesDeImportar());
});

app.post('/api/pedidos-pendientes/:id/marcar-importado', requireHubApiKey, (req, res) => {
  store.marcarImportado(req.params.id);
  res.sendStatus(204);
});

// Foto del comprobante de pago (o de la ficha) para que el Hub la muestre al humano que verifica.
// req.params.filename se reduce a basename antes de tocar el filesystem para que nadie pueda pedir
// "../../.env" ni nada fuera de la carpeta de medios.
app.get('/media/:filename', requireHubApiKey, (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(store.MEDIA_DIR, safeName);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);
  res.sendFile(filePath);
});

app.listen(config.port, () => {
  console.log(`Tactical WhatsApp bot escuchando en puerto ${config.port}`);
});
