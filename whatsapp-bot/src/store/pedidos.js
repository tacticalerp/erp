const fs = require('fs');
const path = require('path');
const config = require('../config');

// Base de datos simple en archivos JSON. El bot corre en el VPS y el ERP hoy vive en localStorage
// del navegador de Conde -- no hay como escribir directo ahí desde el servidor. Este store es la
// "bandeja de entrada" del bot: el Hub la consulta (vía /api/pedidos-pendientes) y la importa al
// Kanban/CRM con la misma lógica que ya usa aprobarPedido() en modulo_montajes_rompecabezas.html.
// Si más adelante se migra el ERP a una base de datos real (Fase F: nube), este store se reemplaza
// sin tocar la lógica de conversación.

const SESSIONS_FILE = path.join(config.dataDir, 'sessions.json');
const PEDIDOS_FILE = path.join(config.dataDir, 'pedidos.json');
const MEDIA_DIR = path.join(config.dataDir, 'media');

function ensureReady() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '{}');
  if (!fs.existsSync(PEDIDOS_FILE)) fs.writeFileSync(PEDIDOS_FILE, '[]');
}

function readJson(file) {
  ensureReady();
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// --- Sesiones de conversación (una por número de WhatsApp del cliente) ---

function getSession(phone) {
  const sessions = readJson(SESSIONS_FILE);
  return sessions[phone] || { phone, state: 'START', data: {}, updatedAt: null };
}

function saveSession(session) {
  const sessions = readJson(SESSIONS_FILE);
  session.updatedAt = new Date().toISOString();
  sessions[session.phone] = session;
  writeJsonAtomic(SESSIONS_FILE, sessions);
  return session;
}

// --- Pedidos (quedan "pendiente_verificacion" hasta que un humano confirma el pago real) ---

function addPedido(pedido) {
  const pedidos = readJson(PEDIDOS_FILE);
  const nuevo = {
    id: Date.now().toString(),
    fecha: new Date().toISOString(),
    estado: 'pendiente_verificacion',
    importadoAlHub: false,
    ...pedido,
  };
  pedidos.push(nuevo);
  writeJsonAtomic(PEDIDOS_FILE, pedidos);
  return nuevo;
}

function listPedidosPendientesDeImportar() {
  return readJson(PEDIDOS_FILE).filter((p) => !p.importadoAlHub);
}

function marcarImportado(id) {
  const pedidos = readJson(PEDIDOS_FILE);
  const p = pedidos.find((x) => x.id === id);
  if (p) p.importadoAlHub = true;
  writeJsonAtomic(PEDIDOS_FILE, pedidos);
}

function saveMediaFile(buffer, extension) {
  ensureReady();
  const filename = `${Date.now()}_${Math.round(Math.random() * 1e6)}.${extension}`;
  const filePath = path.join(MEDIA_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = {
  getSession,
  saveSession,
  addPedido,
  listPedidosPendientesDeImportar,
  marcarImportado,
  saveMediaFile,
  MEDIA_DIR,
};
