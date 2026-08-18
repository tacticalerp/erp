// Copiado de modulo_montajes_rompecabezas.html (LASER_FORMAS / TROQUEL_CATALOGO).
// Se usa aquí solo para la conversación (listar opciones, calcular precio antes de generar
// la imagen). El arte de corte real sigue viviendo únicamente en modulo_montajes_rompecabezas.html,
// que es lo que preview.js reutiliza sin cambios para generar la previsualización final.
// IMPORTANTE: si Conde cambia precios o agrega tallas en el HTML, hay que replicar el cambio aquí.
// TODO (mejora futura): mover este catálogo a un solo archivo compartido (igual que
// template_svg_data.js) que ambos, el HTML y el bot, importen — así no hay que mantener 2 copias.

const LASER_FORMAS = {
  rectangular: {
    label: 'Rectangular', shape: 'rect',
    catalogo: [
      { fichas: 20, w: 24, h: 16, precio: 49000 },
      { fichas: 30, w: 32, h: 24, precio: 55000 },
      { fichas: 80, w: 32, h: 24, precio: 65000 },
      { fichas: 100, w: 32, h: 32, precio: 73000 },
      { fichas: 150, w: 32, h: 32, precio: 83000 },
      { fichas: 100, w: 50, h: 33, precio: 85000 },
      { fichas: 200, w: 50, h: 33, precio: 99000 },
      { fichas: 300, w: 50, h: 33, precio: 125000 },
      { fichas: 500, w: 50, h: 33, precio: 142000 },
      { fichas: 200, w: 66, h: 50, precio: 139000 },
      { fichas: 300, w: 66, h: 50, precio: 149000 },
      { fichas: 500, w: 66, h: 50, precio: 159000 },
      { fichas: 1000, w: 66, h: 50, precio: 189000 },
      { fichas: 1000, w: 100, h: 66, precio: 219000 },
      { fichas: 1500, w: 100, h: 66, precio: 240000 },
      { fichas: 2000, w: 100, h: 66, precio: 259000 },
      { fichas: 3000, w: 100, h: 66, precio: 329000 },
      { fichas: 4000, w: 90, h: 130, precio: 380000 },
      { fichas: 5000, w: 90, h: 130, precio: 490000 },
    ],
  },
  portarretrato: {
    label: 'Portarretrato', shape: 'frame',
    catalogo: [
      { fichas: 30, w: 25, h: 16, precio: 65000 },
      { fichas: 50, w: 28, h: 22, precio: 79000 },
      { fichas: 80, w: 28, h: 22, precio: 95000 },
      { fichas: 90, w: 12, h: 17, precio: 65000, marcoMadera: true },
      { fichas: 200, w: 33, h: 50, precio: 129000 },
    ],
  },
  corazon: {
    label: 'Corazón', shape: 'heart',
    catalogo: [
      { fichas: 30, w: 32, h: 24, precio: 75000 },
      { fichas: 60, w: 32, h: 24, precio: 85000 },
      { fichas: 90, w: 32, h: 24, precio: 95000 },
      { fichas: 160, w: 50, h: 33, precio: 110000 },
      { fichas: 90, w: 32, h: 24, precio: 125000, nota: 'Corazón + Portarretrato' },
    ],
  },
  circular: {
    label: 'Círculo', shape: 'circle',
    catalogo: [
      { fichas: 50, w: 32, h: 32, precio: 73000, nota: 'Diámetro 32cm' },
      { fichas: 110, w: 32, h: 32, precio: 83000 },
      { fichas: 700, w: 60, h: 60, precio: 219000 },
    ],
  },
};

// Troquelados (mayorista, mínimo 50u): sin precio de lista fijo, siempre se cotiza con asesor humano.
const TROQUEL_FICHAS = [6, 6, 12, 12, 21, 24, 30, 30, 30, 48, 70, 208, 252, 500, 1000];

function cop(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

// Misma regla de modulo_montajes_rompecabezas.html: 20% de descuento en cada unidad PAR del pedido
// (2a, 4a, 6a...), la 1a/3a/5a... van a precio de lista.
function calcularPrecioTotal(precioUnit, cantidad) {
  const cant = Math.max(1, parseInt(cantidad, 10) || 1);
  let total = 0;
  for (let i = 1; i <= cant; i++) {
    const esPar = i % 2 === 0;
    total += esPar ? precioUnit * 0.8 : precioUnit;
  }
  return { cant, total };
}

module.exports = { LASER_FORMAS, TROQUEL_FICHAS, cop, calcularPrecioTotal };
