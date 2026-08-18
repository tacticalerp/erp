const axios = require('axios');

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

// Cliente delgado sobre la WhatsApp Cloud API (Meta) para UNA línea (un phone_number_id + token).
// bots/rompecabezas y bots/b2b crean cada uno su propia instancia con sus propias credenciales,
// para que las 2 líneas queden aisladas aunque compartan el mismo servidor.
function createWhatsAppClient({ token, phoneNumberId }) {
  const http = axios.create({
    baseURL: GRAPH_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  async function sendText(to, body) {
    return http.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    });
  }

  async function sendImageBuffer(to, buffer, filename, caption) {
    const mediaId = await uploadMedia(buffer, filename, 'image/png');
    return http.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { id: mediaId, caption },
    });
  }

  async function sendDocumentBuffer(to, buffer, filename, mimeType, caption) {
    const mediaId = await uploadMedia(buffer, filename, mimeType);
    return http.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { id: mediaId, filename, caption },
    });
  }

  async function uploadMedia(buffer, filename, mimeType) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', buffer, { filename, contentType: mimeType });
    const res = await http.post(`/${phoneNumberId}/media`, form, {
      headers: form.getHeaders(),
    });
    return res.data.id;
  }

  // Las fotos/audios/comprobantes que manda el CLIENTE llegan como media_id en el webhook -- hay
  // que resolver la URL temporal y descargar el archivo aparte (la Cloud API no lo manda inline).
  async function downloadMedia(mediaId) {
    const meta = await http.get(`/${mediaId}`);
    const fileRes = await axios.get(meta.data.url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    });
    return { buffer: Buffer.from(fileRes.data), mimeType: meta.data.mime_type };
  }

  async function markAsRead(messageId) {
    return http.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  return { sendText, sendImageBuffer, sendDocumentBuffer, downloadMedia, markAsRead };
}

// Extrae los mensajes entrantes de un payload crudo de webhook de Meta a un formato simple.
// Devuelve [] si el payload es un evento que no es un mensaje (ej. confirmación de entrega).
function parseIncomingMessages(webhookBody) {
  const out = [];
  const entries = webhookBody.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        out.push({
          from: msg.from,
          id: msg.id,
          type: msg.type,
          text: msg.type === 'text' ? msg.text.body : null,
          mediaId: msg[msg.type] && msg[msg.type].id ? msg[msg.type].id : null,
          timestamp: msg.timestamp,
        });
      }
    }
  }
  return out;
}

module.exports = { createWhatsAppClient, parseIncomingMessages };
