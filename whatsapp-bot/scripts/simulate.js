#!/usr/bin/env node
// Simulador de conversación por terminal para el bot de Rompecabezas B2C.
// Deja probar el flujo completo (incluyendo la previsualización real) sin WhatsApp ni VPS: escribe
// como si fueras el cliente, y el bot responde en esta misma terminal.
//
// Uso:
//   npm run simulate
//
// Comandos especiales (en vez de responder texto normal):
//   foto:<ruta a un archivo de imagen>   -> simula que el cliente mandó esa foto
//   foto:test                            -> genera una foto de prueba automática (no necesitas tener una a mano)
//   salir                                -> termina el simulador

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const mime = require('./lib/mimeFromExt');
const flow = require('../src/bots/rompecabezas/flow');
const { closeBrowser } = require('../src/bots/rompecabezas/preview');

const NUMERO_CLIENTE_SIMULADO = 'simulador';
const OUTPUT_DIR = path.resolve(__dirname, '../data/simulador_output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// El bot manda imágenes con sendImageBuffer(), no hay WhatsApp real que las muestre -- se guardan
// en disco y se imprime la ruta para que las abras y veas la previsualización de verdad.
const fakeWaClient = {
  async sendText(to, body) {
    console.log('\n🤖 Bot:\n' + body + '\n');
  },
  async sendImageBuffer(to, buffer, filename, caption) {
    const outPath = path.join(OUTPUT_DIR, `${Date.now()}_${filename}`);
    fs.writeFileSync(outPath, buffer);
    console.log('\n🤖 Bot envía una imagen:');
    if (caption) console.log(caption);
    console.log(`🖼️  Guardada en: ${outPath}  (ábrela para verla)\n`);
  },
  async downloadMedia(mediaId) {
    // En el simulador, "mediaId" es directamente la ruta local que escribiste después de "foto:".
    const buffer = fs.readFileSync(mediaId);
    return { buffer, mimeType: mime.fromExt(mediaId) };
  },
};

async function generarFotoDePrueba() {
  // Genera una imagen sintética con Puppeteer (ya es dependencia del proyecto) para que se pueda
  // probar el flujo completo sin tener una foto real a la mano.
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 600 });
  await page.setContent(`<body style="margin:0;height:600px;background:linear-gradient(135deg,#e8792c,#1e3a5f);
    display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:white;font-size:32px;">
    FOTO DE PRUEBA</body>`);
  const buffer = await page.screenshot({ type: 'png' });
  await browser.close();
  const outPath = path.join(OUTPUT_DIR, `foto_prueba_${Date.now()}.png`);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SIMULADOR DEL BOT DE ROMPECABEZAS B2C (sin WhatsApp, sin VPS)');
  console.log('='.repeat(60));
  console.log('Escribe como si fueras el cliente. Comandos especiales:');
  console.log('  foto:<ruta del archivo>   -> manda esa imagen como si fuera una foto de WhatsApp');
  console.log('  foto:test                -> genera una foto de prueba automática');
  console.log('  salir                    -> termina\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'Tú: ' });

  // Arranca la conversación como si el cliente hubiera escrito "hola".
  await flow.handleIncomingMessage({
    from: NUMERO_CLIENTE_SIMULADO,
    message: { type: 'text', text: 'hola' },
    waClient: fakeWaClient,
  });

  rl.prompt();
  // "for await...of" sobre la interfaz de readline SÍ espera a que termine de procesarse cada
  // línea antes de pedir la siguiente (a diferencia de rl.on('line', async ...), donde los eventos
  // se disparan uno detrás de otro sin esperar el await interno -- con input pegado por pipe eso
  // hacía que varios mensajes se procesaran en paralelo, fuera de orden).
  for await (const line of rl) {
    const texto = line.trim();
    if (texto.toLowerCase() === 'salir') break;

    let message;
    if (texto.toLowerCase().startsWith('foto:')) {
      let rutaFoto = texto.slice(5).trim();
      if (rutaFoto === 'test') {
        console.log('(generando foto de prueba...)');
        rutaFoto = await generarFotoDePrueba();
      }
      if (!fs.existsSync(rutaFoto)) {
        console.log(`⚠️  No existe el archivo: ${rutaFoto}`);
        rl.prompt();
        continue;
      }
      message = { type: 'image', mediaId: rutaFoto };
    } else {
      message = { type: 'text', text: texto };
    }

    try {
      await flow.handleIncomingMessage({ from: NUMERO_CLIENTE_SIMULADO, message, waClient: fakeWaClient });
    } catch (err) {
      console.error('💥 Error en el flujo:', err);
    }
    // Con input por pipe (pruebas automatizadas), el stream puede llegar a EOF y autocerrar la
    // interfaz mientras un mensaje todavía se estaba procesando -- evita el error "use after close".
    if (!rl.closed) rl.prompt();
  }

  rl.close();
  // generatePreview() deja el navegador headless abierto entre llamadas (por rendimiento) -- si no
  // se cierra acá, el proceso de Node se queda colgado para siempre después de "Simulador terminado."
  await closeBrowser();
  console.log('\nSimulador terminado.');
}

main();
