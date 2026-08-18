const path = require('path');
const puppeteer = require('puppeteer');

// Genera la previsualización EXACTAMENTE igual que el módulo humano (mismo Canvas + clip-path +
// arte de corte real), abriendo modulo_montajes_rompecabezas.html en un navegador headless y
// manejándolo como lo haría una persona: click en los botones, elegir la talla, subir la foto,
// y leer el mismo canvas que ya usa "Descargar imagen". Así el bot nunca puede dibujar una ficha
// distinta a la aprobada — reusa el arte real, no lo reinterpreta.
const HTML_PATH = path.resolve(__dirname, '../../../../modulo_montajes_rompecabezas.html');

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

/**
 * @param {object} opts
 * @param {'laser'|'troquel'} opts.linea
 * @param {'rectangular'|'portarretrato'|'corazon'|'circular'} [opts.forma] - solo si linea==='laser'
 * @param {number} opts.catalogIndex - índice dentro del <select> de talla (mismo orden del catálogo)
 * @param {'horizontal'|'vertical'} [opts.orientation]
 * @param {string} opts.photoPath - ruta local a la foto que mandó el cliente por WhatsApp
 * @returns {Promise<Buffer>} PNG de la previsualización, igual al que descarga un humano
 */
async function generatePreview({ linea, forma, catalogIndex, orientation, photoPath }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 900, height: 900 });
    await page.goto('file://' + HTML_PATH, { waitUntil: 'load' });

    if (linea === 'troquel') {
      await page.click('[data-linea="troquel"]');
    } else {
      await page.click('[data-linea="laser"]');
      if (forma) {
        // Los botones de forma se generan dinámicamente sin un selector estable por clave, así que
        // se fija la misma variable global "forma" que usaría el click y se reconstruye el catálogo
        // exactamente como hace buildFormaButtons() al hacer click -- ruta de datos idéntica, sin
        // depender de encontrar un botón concreto en el DOM.
        await page.evaluate((formaKey) => {
          forma = formaKey;
          rebuildCatalogoSelect();
        }, forma);
      }
    }

    if (orientation) {
      await page.click(`#grupoOrientacion [data-or="${orientation}"]`).catch(() => {});
    }

    await page.select('#selCatalogo', String(catalogIndex));

    const fileInput = await page.$('#fileInput');
    await fileInput.uploadFile(photoPath);

    // El listener de 'change' es asíncrono (FileReader) — se espera a que la imagen quede montada.
    // OJO: la página declara "let img = {...}" a nivel superior -- eso NO cuelga de window (solo
    // los "var" globales lo hacen), así que hay que referenciar "img" a secas, no "window.img".
    await page.waitForFunction(() => {
      return typeof img !== 'undefined' && img.natW > 0 && document.getElementById('photoImg').style.display === 'block';
    }, { timeout: 15000 });

    const dataUrl = await page.evaluate(() => {
      const canvas = renderCanvas();
      return canvas.toDataURL('image/png');
    });

    return Buffer.from(dataUrl.split(',')[1], 'base64');
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { generatePreview, closeBrowser };
