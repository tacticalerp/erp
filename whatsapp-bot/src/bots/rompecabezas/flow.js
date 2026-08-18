const store = require('../../store/pedidos');
const config = require('../../config');
const { LASER_FORMAS, cop, calcularPrecioTotal } = require('./catalog');
const { generatePreview } = require('./preview');

// Máquina de estados de la conversación del bot de Rompecabezas B2C. Cubre línea Láser completa
// (asesora -> previsualiza -> cobra -> dispara verificación humana del pago -> queda para Kanban).
// Línea Troquel no tiene precio de lista (mayorista, min. 50u) así que no se automatiza el cierre:
// el bot solo recoge cantidad aproximada + nombre y deja el lead guardado (tipo 'troquel_lead')
// para que un asesor humano lo cotice y cierre aparte.

const FORMA_KEYS = Object.keys(LASER_FORMAS); // ['rectangular','portarretrato','corazon','circular']
const NEEDS_ORIENTACION = { rect: true, frame: true, heart: false, circle: false };

// ---- FAQ: respuestas rápidas que no rompen el estado de la conversación. -----------------------
// TODO (Conde): confirmar/editar estos textos (tiempos reales de entrega, materiales exactos, zonas
// de envío) antes de dejar el bot contestando clientes reales -- por ahora son placeholders
// conservadores para no prometerle al cliente algo que no esté confirmado.
const FAQS = [
  { keywords: ['envio', 'envío', 'domicilio', 'entrega', 'cuando llega'],
    respuesta: 'Hacemos envíos a nivel nacional. Los tiempos exactos de entrega según tu ciudad te los confirmamos junto con el pedido. [Conde: confirmar tiempos/transportadora exactos]' },
  { keywords: ['material', 'madera', 'mdf', 'de que esta hecho', 'de qué está hecho'],
    respuesta: 'El rompecabezas se corta en láser sobre el material de nuestra línea B2C. [Conde: confirmar material exacto para esta respuesta]' },
  { keywords: ['tiempo', 'demora', 'cuanto tardan', 'cuánto tardan'],
    respuesta: 'El tiempo de producción luego de confirmado el pago es corto (se prioriza sobre pedidos mayoristas). [Conde: confirmar días exactos]' },
];

function buscarFaq(texto) {
  const t = (texto || '').toLowerCase();
  return FAQS.find((f) => f.keywords.some((k) => t.includes(k))) || null;
}

function parseNumero(texto) {
  const n = parseInt((texto || '').trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function esAfirmativo(texto) {
  const t = (texto || '').trim().toLowerCase();
  return ['si', 'sí', 's', 'ok', 'dale', 'de acuerdo', '1'].includes(t);
}

function esNegativo(texto) {
  const t = (texto || '').trim().toLowerCase();
  return ['no', 'n', '2'].includes(t);
}

function listaFormas() {
  return FORMA_KEYS.map((k, i) => `${i + 1}. ${LASER_FORMAS[k].label}`).join('\n');
}

function listaTallas(formaKey) {
  const catalogo = LASER_FORMAS[formaKey].catalogo;
  return catalogo
    .map((it, i) => `${i + 1}. ${it.fichas} fichas — ${it.w}x${it.h}cm — ${cop(it.precio)}${it.marcoMadera ? ' (marco de madera)' : ''}`)
    .join('\n');
}

// Si el mismo cliente manda 2 mensajes seguidos muy rápido (o Meta reintenta un webhook), 2
// llamadas a handleIncomingMessage podían correr en paralelo, cada una con su propia lectura de
// sessions.json -- la que terminara de escribir de última pisaba el estado de la otra y la
// conversación "olvidaba" en qué paso iba. Se serializa por número de cliente para que nunca haya
// 2 mensajes del mismo "from" procesándose al tiempo (mensajes de clientes distintos sí corren en
// paralelo sin problema).
const colasPorCliente = new Map();
function handleIncomingMessage(args) {
  const anterior = colasPorCliente.get(args.from) || Promise.resolve();
  const siguiente = anterior.then(() => procesarMensaje(args));
  // La entrada del mapa nunca debe quedar en una promesa rechazada, o bloquearía los próximos
  // mensajes de ese cliente para siempre -- el error real igual se propaga al caller vía "siguiente".
  colasPorCliente.set(args.from, siguiente.catch(() => {}));
  return siguiente;
}

async function procesarMensaje({ from, message, waClient }) {
  const session = store.getSession(from);
  session.data = session.data || {};

  // TODO (pendiente decisión): transcripción de audios requiere contratar un proveedor de
  // speech-to-text (ej. Whisper API) -- todavía no está conectado. Por ahora se degrada con
  // gracia en vez de quedarse callado.
  if (message.type === 'audio') {
    await waClient.sendText(from, 'Por ahora no puedo escuchar audios, ¿me lo escribes en texto? 🙏');
    return;
  }

  // FAQ solo intercepta cuando el mensaje es texto libre y no es la respuesta esperada al menú
  // actual -- así "envíos" no rompe el flujo si justo se estaba esperando un número de talla.
  if (message.type === 'text') {
    const faq = buscarFaq(message.text);
    if (faq && !['ASK_FOTO', 'ASK_COMPROBANTE'].includes(session.state)) {
      await waClient.sendText(from, faq.respuesta);
      await reenviarPreguntaActual(from, session, waClient);
      return;
    }
  }

  switch (session.state) {
    case 'START':
      await waClient.sendText(from,
        '¡Hola! 🧩 Soy el asistente de Rompecabezas personalizados de Tactical. ¿Qué línea te interesa?\n\n' +
        '1. Corte Láser (venta al detal, precio fijo, compra directa aquí)\n' +
        '2. Troquelados (mayorista, mínimo 50 unidades, te cotiza un asesor)');
      session.state = 'ASK_LINEA';
      break;

    case 'ASK_LINEA': {
      const idx = parseNumero(message.text);
      if (idx === 2) {
        await waClient.sendText(from, '¿Cuántas unidades necesitas aproximadamente? (mínimo 50)');
        session.state = 'TROQUEL_ASK_CANTIDAD';
      } else if (idx === 1) {
        await waClient.sendText(from, '¿Qué forma quieres?\n\n' + listaFormas());
        session.state = 'ASK_FORMA';
      } else {
        await waClient.sendText(from, 'Respóndeme 1 (Láser) o 2 (Troquelados).');
      }
      break;
    }

    case 'TROQUEL_ASK_CANTIDAD': {
      const cant = parseNumero(message.text);
      if (!cant || cant < 1) {
        await waClient.sendText(from, 'Dime la cantidad aproximada con un número, ej: 100');
        break;
      }
      session.data.troquelCantidad = cant;
      await waClient.sendText(from, '¿A nombre de quién o de qué empresa hacemos el registro?');
      session.state = 'TROQUEL_ASK_NOMBRE';
      break;
    }

    case 'TROQUEL_ASK_NOMBRE': {
      const nombre = (message.text || '').trim();
      if (!nombre) {
        await waClient.sendText(from, 'Dime el nombre o el de la empresa, por favor.');
        break;
      }
      store.addPedido({
        tipo: 'troquel_lead',
        estado: 'lead_por_contactar',
        nombre,
        cel: from,
        linea: 'troquel',
        cantidadAprox: session.data.troquelCantidad,
        origen: 'bot_whatsapp',
      });
      await waClient.sendText(from,
        `Gracias ${nombre}, quedó registrado tu interés en ${session.data.troquelCantidad} unidades. Un asesor te va a contactar para darte el precio y cerrar el pedido. 🙌`);
      session.state = 'FIN_LEAD_TROQUEL';
      break;
    }

    case 'FIN_LEAD_TROQUEL':
      await waClient.sendText(from, 'Ya quedaste registrado, un asesor te contacta pronto. Si quieres empezar de nuevo escribe "hola".');
      break;

    case 'ASK_FORMA': {
      const idx = parseNumero(message.text);
      if (!idx || idx < 1 || idx > FORMA_KEYS.length) {
        await waClient.sendText(from, 'Respóndeme con el número de la forma:\n\n' + listaFormas());
        break;
      }
      session.data.forma = FORMA_KEYS[idx - 1];
      await waClient.sendText(from,
        `Perfecto, ${LASER_FORMAS[session.data.forma].label}. ¿Qué talla?\n\n` + listaTallas(session.data.forma));
      session.state = 'ASK_TALLA';
      break;
    }

    case 'ASK_TALLA': {
      const catalogo = LASER_FORMAS[session.data.forma].catalogo;
      const idx = parseNumero(message.text);
      if (!idx || idx < 1 || idx > catalogo.length) {
        await waClient.sendText(from, 'Respóndeme con el número de la talla:\n\n' + listaTallas(session.data.forma));
        break;
      }
      session.data.catalogIndex = idx - 1;
      session.data.item = catalogo[idx - 1];
      const shape = LASER_FORMAS[session.data.forma].shape;
      if (NEEDS_ORIENTACION[shape] && !session.data.item.marcoMadera) {
        await waClient.sendText(from, '¿Orientación? 1. Horizontal  2. Vertical');
        session.state = 'ASK_ORIENTACION';
      } else {
        await waClient.sendText(from, '¿Cuántos rompecabezas quieres en el pedido? (el 2°, 4°, 6°... tienen 20% de descuento)');
        session.state = 'ASK_CANTIDAD';
      }
      break;
    }

    case 'ASK_ORIENTACION': {
      const idx = parseNumero(message.text);
      if (idx !== 1 && idx !== 2) {
        await waClient.sendText(from, '¿Orientación? 1. Horizontal  2. Vertical');
        break;
      }
      session.data.orientation = idx === 1 ? 'horizontal' : 'vertical';
      await waClient.sendText(from, '¿Cuántos rompecabezas quieres en el pedido? (el 2°, 4°, 6°... tienen 20% de descuento)');
      session.state = 'ASK_CANTIDAD';
      break;
    }

    case 'ASK_CANTIDAD': {
      const cant = parseNumero(message.text);
      if (!cant || cant < 1) {
        await waClient.sendText(from, 'Dime la cantidad con un número, ej: 1');
        break;
      }
      const { total } = calcularPrecioTotal(session.data.item.precio, cant);
      session.data.cantidad = cant;
      session.data.total = total;
      await waClient.sendText(from,
        `Total por ${cant} unidad(es): ${cop(total)}.\n\nAhora mándame la foto que quieres en el rompecabezas 📷`);
      session.state = 'ASK_FOTO';
      break;
    }

    case 'ASK_FOTO': {
      if (message.type !== 'image') {
        await waClient.sendText(from, 'Necesito que me mandes la foto como imagen para generar la previsualización.');
        break;
      }
      await waClient.sendText(from, 'Dame un momento, estoy generando la previsualización...');
      const { buffer, mimeType } = await waClient.downloadMedia(message.mediaId);
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const photoPath = store.saveMediaFile(buffer, ext);
      session.data.photoPath = photoPath;

      const previewBuffer = await generatePreview({
        linea: 'laser',
        forma: session.data.forma,
        catalogIndex: session.data.catalogIndex,
        orientation: session.data.orientation,
        photoPath,
      });
      const previewPath = store.saveMediaFile(previewBuffer, 'png');
      session.data.previewPath = previewPath;

      await waClient.sendImageBuffer(from, previewBuffer, 'previsualizacion.png',
        `Así queda tu rompecabezas: ${session.data.item.fichas} fichas, ${session.data.item.w}x${session.data.item.h}cm. Total: ${cop(session.data.total)}.\n\n¿Te gusta? 1. Sí, continuar  2. Quiero mandar otra foto`);
      session.state = 'ASK_APROBACION';
      break;
    }

    case 'ASK_APROBACION': {
      if (esAfirmativo(message.text)) {
        await waClient.sendText(from, '¡Genial! ¿A nombre de quién hacemos el pedido?');
        session.state = 'ASK_NOMBRE';
      } else if (esNegativo(message.text)) {
        await waClient.sendText(from, 'Sin problema, mándame otra foto 📷');
        session.state = 'ASK_FOTO';
      } else {
        await waClient.sendText(from, '¿Te gusta la previsualización? 1. Sí, continuar  2. Quiero mandar otra foto');
      }
      break;
    }

    case 'ASK_NOMBRE': {
      const nombre = (message.text || '').trim();
      if (!nombre) {
        await waClient.sendText(from, 'Dime el nombre completo para el pedido, por favor.');
        break;
      }
      session.data.nombre = nombre;
      await waClient.sendText(from,
        `Para confirmar el pedido, transfiere ${cop(session.data.total)} a este Nequi:\n\n` +
        `📱 ${config.nequi.numero || '[Conde: falta configurar NEQUI_NUMERO]'}\n` +
        `👤 ${config.nequi.titular || '[Conde: falta configurar NEQUI_TITULAR]'}\n\n` +
        `Cuando pagues, mándame el pantallazo del comprobante aquí mismo.`);
      session.state = 'ASK_COMPROBANTE';
      break;
    }

    case 'ASK_COMPROBANTE': {
      if (message.type !== 'image' && message.type !== 'document') {
        await waClient.sendText(from, 'Mándame el pantallazo del comprobante de pago de Nequi (foto o PDF).');
        break;
      }
      const { buffer, mimeType } = await waClient.downloadMedia(message.mediaId);
      const ext = mimeType.includes('pdf') ? 'pdf' : (mimeType.includes('png') ? 'png' : 'jpg');
      const comprobantePath = store.saveMediaFile(buffer, ext);

      store.addPedido({
        nombre: session.data.nombre,
        cel: from,
        linea: 'laser',
        forma: session.data.forma,
        fichas: session.data.item.fichas,
        medida: `${session.data.item.w}x${session.data.item.h}`,
        marcoMadera: !!session.data.item.marcoMadera,
        cantidad: session.data.cantidad,
        precioUnitario: session.data.item.precio,
        total: session.data.total,
        photoPath: session.data.photoPath,
        previewPath: session.data.previewPath,
        comprobantePath,
        origen: 'bot_whatsapp',
      });

      await waClient.sendText(from,
        'Recibido ✅ Tu pago queda pendiente de verificación (es un proceso manual, no toma mucho). En cuanto se confirme, arrancamos producción y te aviso por aquí.');
      session.state = 'FIN_PENDIENTE_VERIFICACION';
      break;
    }

    case 'FIN_PENDIENTE_VERIFICACION':
      await waClient.sendText(from, 'Tu pedido ya quedó registrado y pendiente de verificación de pago. Te aviso apenas se confirme.');
      break;

    default:
      session.state = 'START';
      // Llama procesarMensaje() directo, NO el handleIncomingMessage exportado -- ya estamos
      // dentro de la cola serializada de este "from"; volver a pasar por el wrapper esperaría a
      // que esta misma ejecución termine, y como esta ejecución depende de esa espera, se
      // bloquearían mutuamente para siempre.
      await procesarMensaje({ from, message, waClient });
      return;
  }

  store.saveSession(session);
}

async function reenviarPreguntaActual(from, session, waClient) {
  const reprompts = {
    ASK_LINEA: () => 'Respóndeme 1 (Láser) o 2 (Troquelados).',
    TROQUEL_ASK_CANTIDAD: () => '¿Cuántas unidades necesitas aproximadamente? (mínimo 50)',
    TROQUEL_ASK_NOMBRE: () => '¿A nombre de quién o de qué empresa hacemos el registro?',
    ASK_FORMA: () => '¿Qué forma quieres?\n\n' + listaFormas(),
    ASK_TALLA: () => '¿Qué talla?\n\n' + listaTallas(session.data.forma),
    ASK_ORIENTACION: () => '¿Orientación? 1. Horizontal  2. Vertical',
    ASK_CANTIDAD: () => '¿Cuántos rompecabezas quieres en el pedido?',
    ASK_APROBACION: () => '¿Te gusta la previsualización? 1. Sí, continuar  2. Quiero mandar otra foto',
    ASK_NOMBRE: () => '¿A nombre de quién hacemos el pedido?',
  };
  const f = reprompts[session.state];
  if (f) await waClient.sendText(from, f());
}

module.exports = { handleIncomingMessage };
