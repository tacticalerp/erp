// ==========================================
// precios_tactical.js
// Fuente única de precios de insumos compartidos entre las 8 herramientas de Tactical ERP.
// Se carga con <script src="precios_tactical.js"></script> ANTES del script principal de
// cada archivo. Los valores base de aquí abajo son los ya validados en el motor del hub
// (TACTICAL_ERP_HUB.html). Conde puede sobreescribirlos sin tocar código desde el
// Panel de Precios del hub (vista "precios") — esos cambios quedan en localStorage bajo
// la clave tactical_precios_override_v1 y tienen prioridad sobre los valores base.
// ==========================================

// Vendedores de la empresa -- compartido entre el hub y las 8 calculadoras, para poder filtrar
// Reportes por vendedor sin importar desde qué herramienta se hizo la cotización (Conde 2026-08-13).
const VENDEDORES = {
  "Norely Sarmiento": { correo: "contacto@tacticalmg.co", telefono: "311 222 8871" },
  "Helver Conde": { correo: "gerencia@tacticalmg.co", telefono: "320 840 1643" },
};

function tacticalLeerOverridesPrecios(){
  try{ return JSON.parse(localStorage.getItem('tactical_precios_override_v1')) || {}; }
  catch(e){ return {}; }
}
const TACTICAL_PRECIOS_OVERRIDE = tacticalLeerOverridesPrecios();

// Papeles agregados por Conde desde el Panel de Precios (no forman parte del catálogo fijo de
// PRECIOS_BASE_SUSTRATOS de abajo). Cada uno lleva su propia lista de calculadoras donde debe
// aparecer, elegida a mano por Conde al crearlo (2026-08-19: "Eliges en cuáles calculadoras").
function tacticalLeerSustratosCustom(){
  try{ return JSON.parse(localStorage.getItem('tactical_sustratos_custom_v1')) || []; }
  catch(e){ return []; }
}
const TACTICAL_SUSTRATOS_CUSTOM = tacticalLeerSustratosCustom();
// Calculadoras que ofrecen selección de sustrato/papel (Promocionales y Cotización Manual no aplican).
const TACTICAL_CALCULADORAS_SUSTRATOS = [
  {id:'cuadernos', label:'Cuadernos (Hub)'},
  {id:'bolsas', label:'Bolsas'},
  {id:'cajas', label:'Cajas'},
  {id:'carpetas', label:'Carpetas'},
  {id:'volantes', label:'Volantes/Afiches/Plegables'},
  {id:'rompecabezas', label:'Rompecabezas'},
  {id:'cubo_rubik', label:'Cubo Rubik'},
];

function tacticalMergeNivel1(base, ov){ return Object.assign({}, base, ov||{}); }
function tacticalMergeNivel2(base, ov){
  const out = {};
  for(const k in base) out[k] = Object.assign({}, base[k], (ov && ov[k]) || {});
  return out;
}

/* ---- PAPEL / SUSTRATOS (tabla maestra completa; cada calculadora toma el subconjunto que le aplica) ---- */
const PRECIOS_BASE_SUSTRATOS = {
  "Bond__60": {p6090:177.30, p70100:229.50},
  "Bond__70": {p6090:206.10, p70100:267.30},
  "Bond__75": {p6090:221.40, p70100:287.10},
  "Bond__90": {p6090:265.50, p70100:343.80},
  "Bond__115": {p6090:null, p70100:459.00},
  "Propalcote__80": {p6090:null, p70100:308.70},
  "Propalcote__90": {p6090:267.30, p70100:348.30},
  "Propalcote__115": {p6090:343.80, p70100:448.20},
  "Propalcote__150": {p6090:472.50, p70100:612.90},
  "Propalcote__200": {p6090:603.90, p70100:810.00},
  "Propalcote__240": {p6090:807.00, p70100:1050.00},
  "Propalcote__300": {p6090:910.80, p70100:1182.60},
  "Propalcote__350": {p6090:null, p70100:1381.50},
  "Cartulina C11__190": {p6090:null, p70100:684.00},
  "Cartulina C12__205": {p6090:580.50, p70100:753.30},
  "Cartulina C14__225": {p6090:637.20, p70100:826.20},
  "Cartulina C16__255": {p6090:722.70, p70100:936.90},
  "Cartulina C18__275": {p6090:779.40, p70100:1009.80},
  "Cartulina C20__305": {p6090:864.00, p70100:1120.50},
  "Cartulina C22__330": {p6090:null, p70100:1212.30},
  "Eart Pact__70": {p6090:218.49, p70100:277.31},
  "Bristol Color__150": {p6090:null, p70100:613.45},
  "Bristol Blanca__140": {p6090:null, p70100:554.62},
  "Kraft Cartón__335": {p6090:null, p70100:924.37},
  "Kraft__98": {p6090:null, p70100:352.94},
  "Kraft__120": {p6090:null, p70100:369.75},
  "Book Cream__56.2": {p6090:184.87, p70100:218.49},
  "Adhesivo Ritrama - Corriente__160": {p6090:null, p70100:1596.64},
  "Adhesivo Ritrama - Seguridad__160": {p6090:null, p70100:1915.97},
  "Adhesivo Ritrama - Vinilo Blanco__220": {p6090:null, p70100:5007.56},
  "Adhesivo Ritrama - Transparente__160": {p6090:null, p70100:5007.56},
  "Adhesivo Ritrama - Polipropileno__220": {p6090:null, p70100:4484.03},
  "Adhesivo Ritrama - Bond__160": {p6090:null, p70100:2147.06},
  "Adhesivo Arclad - PXH K80__160": {p6090:null, p70100:1478.99},
  "Adhesivo Arclad - Corriente P3__160": {p6090:null, p70100:1672.27},
  "Adhesivo Arclad - Hotmelt__160": {p6090:null, p70100:2012.61},
  "Adhesivo Arclad - P4__160": {p6090:null, p70100:2268.91},
};
const PRECIOS_SUSTRATOS_MAESTRO = tacticalMergeNivel2(PRECIOS_BASE_SUSTRATOS, TACTICAL_PRECIOS_OVERRIDE.sustratos);
function tacticalSeleccionarSustratos(claves, calculadoraId){
  const out = {};
  claves.forEach(k => { out[k] = PRECIOS_SUSTRATOS_MAESTRO[k] || {p6090:null, p70100:null}; });
  if(calculadoraId){
    TACTICAL_SUSTRATOS_CUSTOM.forEach(s => {
      if(!(s.calculadoras||[]).includes(calculadoraId)) return;
      const clave = s.nombre + '__' + s.gramaje;
      const ov = (TACTICAL_PRECIOS_OVERRIDE.sustratos && TACTICAL_PRECIOS_OVERRIDE.sustratos[clave]) || {};
      out[clave] = {
        p6090: ov.p6090 !== undefined ? ov.p6090 : s.p6090,
        p70100: ov.p70100 !== undefined ? ov.p70100 : s.p70100,
      };
    });
  }
  return out;
}

/* ---- IMPRESIÓN OFFSET ---- */
const PRECIOS_OFFSET_CTP_COP = tacticalMergeNivel1({medio_pliego:22000, cuarto:11000, octavo:9000}, TACTICAL_PRECIOS_OVERRIDE.offsetCtp);
const PRECIOS_OFFSET_MILLAR_COP = tacticalMergeNivel1({medio_pliego_color:25000, medio_pliego_policromia_4x0:100000, cuarto:16000, octavo:12000}, TACTICAL_PRECIOS_OVERRIDE.offsetMillar);
const PRECIOS_OFFSET_RECARGO_FONDO_PLENO_COP = tacticalMergeNivel1({medio_pliego:90000, cuarto:50000, octavo:50000}, TACTICAL_PRECIOS_OVERRIDE.offsetRecargoFondoPleno);
const PRECIOS_OFFSET_TOLERANCIA_MERMA_MILLAR = (TACTICAL_PRECIOS_OVERRIDE.offsetToleranciaMerma != null) ? TACTICAL_PRECIOS_OVERRIDE.offsetToleranciaMerma : 180;

/* ---- IMPRESIÓN DIGITAL (dos tarifarios: Cuadernos usa un tiraje distinto al de las demás líneas) ---- */
const PRECIOS_DIGITAL_CLIC_CUADERNOS = tacticalMergeNivel2({ carta:{color:750, negro:350}, octavo:{color:900, negro:450}, pliego_max:{color:1000, negro:550} }, TACTICAL_PRECIOS_OVERRIDE.digitalClicCuadernos);
const PRECIOS_DIGITAL_CLIC_OTRAS_LINEAS = tacticalMergeNivel2({ carta:{color:1000, negro:250}, octavo:{color:1400, negro:350}, pliego_max:{color:2200, negro:550} }, TACTICAL_PRECIOS_OVERRIDE.digitalClicOtrasLineas);

/* ---- ACABADOS ---- */
const PRECIOS_PLASTIFICADO_COP_M2 = (TACTICAL_PRECIOS_OVERRIDE.plastificadoM2 != null) ? TACTICAL_PRECIOS_OVERRIDE.plastificadoM2 : 950;
const PRECIOS_PLASTIFICADO_PISO_COP = (TACTICAL_PRECIOS_OVERRIDE.plastificadoPiso != null) ? TACTICAL_PRECIOS_OVERRIDE.plastificadoPiso : 30000;
const PRECIOS_COLAMINADO_COP_M2 = (TACTICAL_PRECIOS_OVERRIDE.colaminadoM2 != null) ? TACTICAL_PRECIOS_OVERRIDE.colaminadoM2 : 900;

// ---- ACABADOS ADICIONALES (creados por Conde desde el Panel de Precios, 2026-08-19) ----
// Igual que los papeles custom: se cobran por m² (área de la pieza × cantidad), igual que
// Plastificado/Colaminado de arriba, y cada uno lleva su propia lista de calculadoras donde
// aparece como checkbox opcional. El precio se puede reeditar después desde el Panel de Precios
// -- el override vive en TACTICAL_PRECIOS_OVERRIDE.acabadosCustom, mismo patrón que los papeles.
function tacticalLeerAcabadosCustom(){
  try{ return JSON.parse(localStorage.getItem('tactical_acabados_custom_v1')) || []; }
  catch(e){ return []; }
}
const TACTICAL_ACABADOS_CUSTOM = tacticalLeerAcabadosCustom();
function tacticalAcabadosDisponibles(calculadoraId){
  return TACTICAL_ACABADOS_CUSTOM.filter(a => (a.calculadoras||[]).includes(calculadoraId)).map(a => {
    const ov = TACTICAL_PRECIOS_OVERRIDE.acabadosCustom && TACTICAL_PRECIOS_OVERRIDE.acabadosCustom[a.id];
    return { id: a.id, nombre: a.nombre, precioM2: (ov != null) ? ov : a.precioM2 };
  });
}
function tacticalRenderAcabadosCustomHtml(calculadoraId, prefijoId){
  const lista = tacticalAcabadosDisponibles(calculadoraId);
  if(lista.length === 0) return '';
  return `<div class="fila" style="flex-direction:column; align-items:flex-start; gap:6px;">
    <label style="font-weight:bold;">Acabados adicionales (opcional):</label>
    ${lista.map(a => `<label style="font-weight:normal; display:flex; align-items:center; gap:6px; margin:0;">
      <input type="checkbox" id="${prefijoId}-${a.id}">
      ${a.nombre} ($${Math.round(a.precioM2).toLocaleString('es-CO')}/m²)
    </label>`).join('')}
  </div>`;
}
function tacticalLeerAcabadosSeleccionados(calculadoraId, prefijoId){
  return tacticalAcabadosDisponibles(calculadoraId).filter(a => {
    const el = document.getElementById(`${prefijoId}-${a.id}`);
    return el && el.checked;
  });
}
function tacticalCostoAcabadosCustom(seleccionados, areaM2, cantidad){
  let costoTotal = 0;
  const lineas = seleccionados.map(a => {
    const costo = areaM2*cantidad*a.precioM2;
    costoTotal += costo;
    return { nombre: a.nombre, costo };
  });
  return { costoTotal, lineas };
}

/* ---- IMANES (Volantes) -- lámina Imán C5 100x60cm de la que se cortan las piezas,
   y corte por láser (Conde 2026-08-14, precio de corte láser aún sin definir por Conde
   -- placeholder editable en el Panel de Precios hasta que él lo ajuste). ---- */
const PRECIOS_IMAN_C5_LAMINA_COP = (TACTICAL_PRECIOS_OVERRIDE.imanC5Lamina != null) ? TACTICAL_PRECIOS_OVERRIDE.imanC5Lamina : 12000;
const PRECIOS_CORTE_LASER_IMAN_COP = (TACTICAL_PRECIOS_OVERRIDE.corteLaserIman != null) ? TACTICAL_PRECIOS_OVERRIDE.corteLaserIman : 500;

/* ---- COSTOS GENERALES (aplican a toda cotización) ---- */
const PRECIOS_DISENO_COSTO_NORMAL = (TACTICAL_PRECIOS_OVERRIDE.disenoNormal != null) ? TACTICAL_PRECIOS_OVERRIDE.disenoNormal : 40000;
const PRECIOS_DISENO_COSTO_REDUCIDO = (TACTICAL_PRECIOS_OVERRIDE.disenoReducido != null) ? TACTICAL_PRECIOS_OVERRIDE.disenoReducido : 20000;
const PRECIOS_ESCUDO_BAJOS_MONTOS_UMBRAL = (TACTICAL_PRECIOS_OVERRIDE.escudoUmbral != null) ? TACTICAL_PRECIOS_OVERRIDE.escudoUmbral : 150000;
const PRECIOS_FONDO_SEGURIDAD_TRAMOS = TACTICAL_PRECIOS_OVERRIDE.fondoSeguridad || [[500000,0.09],[1000000,0.07],[3000000,0.05],[Infinity,0.03]];

/* ---- Metadatos para el Panel de Precios (hub) ---- */
const PRECIOS_CAMPOS_PANEL = [
  {grupo:"Papel / Sustratos", tipo:"sustratos", clave:"sustratos", base:PRECIOS_BASE_SUSTRATOS},
  {grupo:"Impresión Offset — Plancha (CTP)", tipo:"nivel1", clave:"offsetCtp", base:{medio_pliego:22000, cuarto:11000, octavo:9000}, etiquetas:{medio_pliego:"Medio pliego", cuarto:"Cuarto de pliego", octavo:"Octavo de pliego"}},
  {grupo:"Impresión Offset — Millar (tiro)", tipo:"nivel1", clave:"offsetMillar", base:{medio_pliego_color:25000, medio_pliego_policromia_4x0:100000, cuarto:16000, octavo:12000}, etiquetas:{medio_pliego_color:"Medio pliego (1-2 tintas)", medio_pliego_policromia_4x0:"Medio pliego policromía 4x0", cuarto:"Cuarto de pliego", octavo:"Octavo de pliego"}},
  {grupo:"Impresión Offset — Recargo fondo pleno", tipo:"nivel1", clave:"offsetRecargoFondoPleno", base:{medio_pliego:90000, cuarto:50000, octavo:50000}, etiquetas:{medio_pliego:"Medio pliego", cuarto:"Cuarto de pliego", octavo:"Octavo de pliego"}},
  {grupo:"Impresión Digital — Cuadernos ($/clic)", tipo:"nivel2", clave:"digitalClicCuadernos", base:{ carta:{color:750, negro:350}, octavo:{color:900, negro:450}, pliego_max:{color:1000, negro:550} }},
  {grupo:"Impresión Digital — Otras líneas ($/clic)", tipo:"nivel2", clave:"digitalClicOtrasLineas", base:{ carta:{color:1000, negro:250}, octavo:{color:1400, negro:350}, pliego_max:{color:2200, negro:550} }},
  {grupo:"Acabados", tipo:"simple", customAcabados:true, campos:[
    {clave:"plastificadoM2", etiqueta:"Plastificado ($/m²)", base:950},
    {clave:"plastificadoPiso", etiqueta:"Plastificado (piso mínimo OT)", base:30000},
    {clave:"colaminadoM2", etiqueta:"Colaminado ($/m²)", base:900},
  ]},
  {grupo:"Imanes (Volantes)", tipo:"simple", campos:[
    {clave:"imanC5Lamina", etiqueta:"Lámina Imán C5 100x60cm ($/lámina)", base:12000},
    {clave:"corteLaserIman", etiqueta:"Corte láser imán ($/pieza -- AJUSTAR con proveedor real)", base:500},
  ]},
  {grupo:"Costos generales", tipo:"simple", campos:[
    {clave:"disenoNormal", etiqueta:"Diseño (costo normal)", base:40000},
    {clave:"disenoReducido", etiqueta:"Diseño (costo reducido)", base:20000},
    {clave:"escudoUmbral", etiqueta:"Umbral escudo bajos montos", base:150000},
    {clave:"offsetToleranciaMerma", etiqueta:"Tolerancia de merma por millar (unidades)", base:180},
  ]},
];

/* ---- NUMERACIÓN DE COTIZACIONES / ÓRDENES DE PRODUCCIÓN (OT) ----
   Formato: OT-AAMM-CC (año 2 dígitos + mes 2 dígitos + consecutivo, mínimo 2 dígitos, sin tope).
   El consecutivo NO se reinicia cada mes -- sigue sumando durante todo el año y solo vuelve a 01
   el 1 de enero. Ej: primera cotización de agosto 2026 -> OT-2608-01; si en septiembre ya van 15
   -> OT-2609-16; primera cotización de 2027 -> OT-2701-01. Compartido por las 8 calculadoras + el
   hub para que el número de OT/cotización sea el mismo consecutivo único en todo el ERP (Conde
   2026-08-12).
   Migrado a Supabase 2026-08-20 (Conde: "falta migrar algo más?" -> este era el hueco real que
   quedaba): antes cada navegador contaba por su cuenta en localStorage -- dos personas en
   dispositivos distintos el mismo mes podían generar el mismo número de OT sin darse cuenta. Ahora
   usa el RPC atómico `siguiente_ot()` (ya existe en Supabase desde el arreglo de Contabilidad,
   mismo criterio que siguiente_numero() para FV/CC/etc., ver schema.sql) -- un solo consecutivo
   real por año, sin importar cuántos dispositivos lo pidan al mismo tiempo. Por eso ahora es
   asíncrona (antes no lo era) -- todo el que la llama debe usar await. Si por algún motivo la
   llamada a Supabase falla (sin internet, etc.) cae de respaldo al contador local viejo, para no
   dejar a alguien sin poder generar su Orden de Producción en ese momento. */
async function tacticalSiguienteOT(fecha){
  try{
    const { data, error } = await tacticalSupabase.rpc('siguiente_ot');
    if(error) throw error;
    return data;
  } catch(e){
    console.error('No se pudo generar el número de OT desde Supabase, se usó el contador local de respaldo:', e);
    fecha = fecha || new Date();
    const anio = fecha.getFullYear();
    const yy = String(anio).slice(-2);
    const mm = String(fecha.getMonth()+1).padStart(2,'0');
    const counterKey = 'tactical_ot_counter_' + anio;
    const n = (parseInt(localStorage.getItem(counterKey)||'0', 10) || 0) + 1;
    localStorage.setItem(counterKey, String(n));
    const cc = String(n).padStart(2,'0');
    return `OT-${yy}${mm}-${cc}`;
  }
}

// Título corto para CRM/Kanban: siempre arranca con el formato corto automático (cantidad +
// producto + referencia) para que las fichas de producción sean escaneables de un vistazo; si el
// usuario escribió una descripción propia en el campo editable, se agrega después del guion, visible
// solo al expandir la tarjeta (Conde 2026-08-13).
function tacticalTituloCorto(auto, textoLargo){
  const largo = (textoLargo||'').trim();
  return (largo && largo !== auto) ? `${auto} — ${largo}` : auto;
}

// Fototeca de Productos: foto fija de referencia por línea (o variante), subida una sola vez
// desde el hub (vista "Fototeca") y reutilizada automáticamente en el PDF de cada cotización
// de esa línea, sin que el usuario tenga que hacer nada por cotización (Conde 2026-08-12).
// Desde 2026-08-19 vive en Supabase (tabla fototeca_items) -- se lee de "tacticalFototecaCache"
// (precargada en memoria al iniciar sesión, ver tactical-supabase.js), no de localStorage,
// porque esta función se llama de forma síncrona justo al generar un PDF.
function tacticalObtenerFotoProducto(clave){
  return (typeof tacticalFototecaCache !== 'undefined' && tacticalFototecaCache[clave]) ? tacticalFototecaCache[clave].foto : null;
}
// Link de video (YouTube) opcional por ficha de la Fototeca -- cada foto puede o no tener video,
// independiente de la foto misma (Conde 2026-08-13).
function tacticalObtenerVideoProducto(clave){
  return (typeof tacticalFototecaCache !== 'undefined' && tacticalFototecaCache[clave]) ? tacticalFototecaCache[clave].video : null;
}

// Líneas base para etiquetar fichas nuevas de la Fototeca (variantes: "Cuaderno con inserto",
// "Cuaderno con caucho", etc.) -- así cada calculadora puede listar solo las variantes que le
// corresponden, sin mezclar las de otras líneas (Conde 2026-08-13).
const TACTICAL_LINEAS_BASE = [
  {clave:'cuadernos', label:'Cuadernos'},
  {clave:'carpetas', label:'Carpetas'},
  {clave:'cajas', label:'Cajas'},
  {clave:'bolsas', label:'Bolsas'},
  {clave:'volantes', label:'Volantes / Afiches / Plegables'},
  {clave:'rompecabezas', label:'Rompecabezas (B2B)'},
  {clave:'cubo_rubik', label:'Cubo Rubik'},
];
// Migrado a Supabase 2026-08-20: esta función leía una clave de localStorage
// (tactical_fototeca_custom_v1) que ya nadie llenaba desde que Fototeca se migró a Supabase
// 2026-08-19 -- siempre devolvía [] en silencio (bug latente, encontrado en una auditoría general,
// no reportado por Conde). Ahora lee de tacticalFototecaCache (tactical-supabase.js), la misma
// cache en memoria precargada al login que ya usa tacticalObtenerFotoProducto/VideoProducto.
function tacticalListarVariantesFoto(lineaBase){
  const cache = (typeof tacticalFototecaCache !== 'undefined') ? tacticalFototecaCache : {};
  return Object.keys(cache)
    .filter(clave => cache[clave].esCustom && cache[clave].lineaBase === lineaBase)
    .map(clave => ({ clave, label: cache[clave].label }));
}

// Compresión adaptativa de imágenes subidas/pegadas (Fototeca, galería del Kanban, etc.): recorta
// resolución y baja calidad JPEG hasta que el resultado pese menos de maxBytes, para que una foto
// en alta resolución no infle localStorage (límite típico del navegador: 5-10MB por sitio, y hay
// muchas imágenes acumulándose entre Fototeca + galerías de fichas). 400KB es un tope razonable
// por imagen -- deja margen para decenas de fotos sin acercarse al límite (Conde 2026-08-13).
const TACTICAL_IMG_MAX_BYTES = 200 * 1024;
function tacticalComprimirImagen(img, maxBytes){
  maxBytes = maxBytes || TACTICAL_IMG_MAX_BYTES;
  let dim = 900;
  let calidad = 0.82;
  let dataUrl;
  for(let intento=0; intento<9; intento++){
    const scale = Math.min(1, dim/Math.max(img.width, img.height));
    const cw = Math.max(1, Math.round(img.width*scale)), ch = Math.max(1, Math.round(img.height*scale));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    dataUrl = c.toDataURL('image/jpeg', calidad);
    const bytesAprox = dataUrl.length * 0.75;
    if(bytesAprox <= maxBytes) break;
    if(calidad > 0.4) calidad -= 0.12;
    else dim = Math.round(dim*0.82);
  }
  return dataUrl;
}

/* ==========================================
   ASISTENTE DE AYUDA (chat de preguntas frecuentes, sin IA)
   Base de conocimiento + buscador por palabras clave, compartido entre el hub
   y las 8 calculadoras (Conde 2026-08-14). No usa ningún servicio externo ni API key:
   compara las palabras de la pregunta contra las keywords de cada respuesta.
   ========================================== */
const TACTICAL_AYUDA_KB = [
  { id:'cuadernos_tapa_troquelada', titulo:'Carátula troquelada (Cuadernos)',
    keywords:['caratula','tapa','troquelada','troquelado','troquel','ventana','calado','cuaderno'],
    respuesta:'En el Cotizador de Cuadernos, en la sección de datos de la tapa, marca la casilla <b>"Troquelado"</b> dentro de "Acabados de tapa" (junto a Plastificado, UV Parcial, Estampado, Colaminado, Fondo Pleno). El sistema suma automáticamente el costo de troquel por millar al total. Puedes combinar el troquelado con otros acabados marcando varias casillas a la vez.' },
  { id:'cuadernos_tapa_dura_blanda', titulo:'Tapa dura vs tapa blanda (Cuadernos)',
    keywords:['tapa','dura','blanda','semidura','cuaderno','portada'],
    respuesta:'Al elegir la línea del cuaderno puedes seleccionar el tipo de tapa (dura, blanda o semidura). Si eliges línea "Escolar" la opción de tapa dura se oculta automáticamente (esa línea solo maneja semidura/blanda). Para cuadernos con tapa dura y más de 100 unidades, el sistema activa solo automáticamente la impresión de respaldo si aplica.' },
  { id:'cuadernos_insertos', titulo:'Insertos (con caucho / intercalados)',
    keywords:['insertos','caucho','intercalados','seguidos','cuaderno'],
    respuesta:'En el Cotizador de Cuadernos hay una opción para agregar insertos "intercalados" o "seguidos". Si eliges intercalados, el sistema suma automáticamente +50% de alce al costo porque implica más operaciones de armado.' },
  { id:'pedido_vs_comparacion', titulo:'¿Pedido o Comparación? ¿Cuál uso?',
    keywords:['pedido','comparacion','comparar','diferencia','varios','productos','opciones','sumar','elegir'],
    respuesta:'Usa <b>"📦 Agregar a un pedido"</b> cuando el cliente va a comprar VARIOS productos distintos y quieres UN SOLO total que los sume todos (ej: cuadernos + carpetas para el mismo cliente).<br>Usa <b>"🆚 Agregar como opción a comparar"</b> cuando el cliente todavía no decide y quiere ver 2 o más opciones del MISMO pedido con precios SEPARADOS para elegir una (ej: cuaderno con insertos vs sin insertos). No se suman entre sí.' },
  { id:'como_comparar', titulo:'Cómo armar una cotización comparativa (2+ opciones)',
    keywords:['comparar','comparativa','opciones','cliente','elige','varias'],
    respuesta:'1. Calcula la primera opción y presiona <b>"🆚 Agregar como opción a comparar"</b>.<br>2. Cambia los datos (ej: quita los insertos, cambia cantidad) y vuelve a presionar el mismo botón para agregar la segunda opción.<br>3. Cuando tengas todas las opciones, presiona <b>"✅ Generar PDF comparativo"</b> en el panel morado que aparece arriba. El PDF muestra cada opción con su precio por separado para que el cliente elija.' },
  { id:'aprobar_opcion_ganadora', titulo:'Aprobar solo 1 opción de una comparativa (producción)',
    keywords:['aprobar','ganado','ganador','elegir','opcion','produccion','kanban','orden'],
    respuesta:'Cuando el cliente ya eligió, busca el negocio en el CRM (Embudo de Ventas) y presiona el botón <b>"Ganado"</b>. Si la cotización tenía varias opciones comparativas, se abre un panel para que elijas cuál ganó. Al confirmar, el sistema crea la ficha de Kanban y la Orden de Producción SOLO con los datos de esa opción elegida (no de las demás).' },
  { id:'generar_ot_produccion', titulo:'Cómo generar la Orden de Producción',
    keywords:['orden','produccion','ot','generar'],
    respuesta:'La Orden de Producción se genera al presionar <b>"💾 Guardar y Generar PDF Cliente"</b> (crea el número de OT) o al <b>"Cerrar pedido"</b>/marcar <b>"Ganado"</b> un negocio del CRM. Desde ahí puedes reimprimir la Orden de Producción desde el Kanban o desde el buscador de cotizaciones.' },
  { id:'condiciones_comerciales', titulo:'Cambiar las condiciones comerciales de una cotización',
    keywords:['condiciones','comerciales','pago','plazo','editar','terminos'],
    respuesta:'En la sección "7. Condiciones Comerciales" del cotizador hay un cuadro de texto editable con las condiciones por defecto ya escritas. Puedes borrar, agregar o cambiar cualquier línea (ej: forma de pago) ANTES de guardar la cotización — cada cotización guarda sus propias condiciones, no afecta a las demás.' },
  { id:'eliminar_cotizacion', titulo:'Eliminar una cotización guardada',
    keywords:['eliminar','borrar','quitar','cotizacion','registro','error'],
    respuesta:'En el buscador de "Todas las Cotizaciones" (dentro del CRM), cada fila tiene un botón 🗑️ junto al de "Ver PDF". Al presionarlo se elimina esa cotización del registro y de la ficha del CRM.' },
  { id:'kanban_mover_reordenar', titulo:'Mover o reordenar fichas del Kanban',
    keywords:['kanban','mover','arrastrar','ordenar','reordenar','columna','ficha'],
    respuesta:'Puedes arrastrar cualquier ficha del Kanban con el cursor: si la sueltas sobre otra columna, cambia de estado; si la sueltas sobre otra ficha de la MISMA columna, se reordena (sube o baja) en esa posición.' },
  { id:'kanban_foto_video', titulo:'Foto y video en una ficha del Kanban',
    keywords:['foto','imagen','video','kanban','ficha','miniatura'],
    respuesta:'Cada ficha del Kanban puede tener varias fotos: pégalas con Ctrl+V o súbelas como archivo dentro de la ficha expandida. La primera foto cargada se usa automáticamente como miniatura de la tarjeta. Si el producto tiene un video (YouTube) cargado en la Fototeca, el botón "▶ Ver video" aparece solo en el PDF.' },
  { id:'fototeca_video', titulo:'Agregar un video (YouTube) a un producto',
    keywords:['video','youtube','link','fototeca','producto'],
    respuesta:'En el Hub, entra a "Fototeca de Productos". Cada ficha de línea tiene un campo para pegar el link de YouTube del video, independiente de la foto. Ese video aparece automáticamente como botón "▶ Ver video del producto" en los PDF de esa línea.' },
  { id:'fototeca_variante', titulo:'Variante de foto por línea (ej: 4 tipos de cuaderno)',
    keywords:['variante','tipo de foto','fototeca','linea','insertos','caucho'],
    respuesta:'En la Fototeca puedes crear fichas nuevas con "Crear nueva ficha", ponerles un nombre (ej: "Cuaderno con caucho") y asignarlas a la línea que corresponda. Luego, en el cotizador de esa línea, aparece un selector "Variante de foto" donde eliges cuál variante usar para esa cotización específica.' },
  { id:'foto_personalizada', titulo:'Foto personalizada solo para una cotización',
    keywords:['foto','personalizada','muestra','especial','unica','puntual','cotizacion'],
    respuesta:'Debajo de la descripción para el cliente hay una zona "Foto personalizada para esta cotización": puedes pegar (Ctrl+V) o subir una imagen que se usará SOLO en esa cotización puntual (no se guarda en la Fototeca ni afecta otras cotizaciones). Tiene prioridad sobre la variante de foto y sobre la foto automática de la línea.' },
  { id:'buscar_cliente', titulo:'Buscar o autocompletar un cliente existente',
    keywords:['cliente','buscar','autocompletar','existente','identificacion'],
    respuesta:'Al escribir el nombre o la identificación del cliente en el formulario, aparece una lista de sugerencias (datalist) con los clientes ya guardados. Al seleccionarlo se autocompletan sus datos de contacto.' },
  { id:'vendedor_asignar', titulo:'Asignar el vendedor a cargo de una cotización',
    keywords:['vendedor','asignar','comercial','encargado'],
    respuesta:'En el formulario de cada cotizador hay un campo "Vendedor a cargo" con la lista de vendedores de la empresa. Ese dato queda guardado en la cotización y permite filtrar el Dashboard y los Reportes por vendedor.' },
  { id:'dashboard_periodo', titulo:'Ver el Dashboard por mes, trimestre o año',
    keywords:['dashboard','periodo','mensual','trimestral','semestral','anual','historico','inteligencia','ventas'],
    respuesta:'En "Inteligencia de Ventas (Dashboard)" hay un selector de periodo (Mensual/Trimestral/Semestral/Anual) con flechas ◀ ▶ para navegar meses o periodos anteriores sin perder el histórico. Los KPIs (pipeline, ganadas, tasa de cierre) se recalculan según el periodo elegido.' },
  { id:'pedido_multiproducto', titulo:'Un pedido con varios productos distintos',
    keywords:['pedido','multiproducto','varios','productos','combinar','junto'],
    respuesta:'Calcula el primer producto y presiona "📦 Agregar a un pedido". Ve a otra calculadora (o la misma) y calcula el siguiente producto para el MISMO cliente, y vuelve a presionar "Agregar a un pedido". Cuando tengas todos, presiona "✅ Cerrar pedido y guardar en CRM" para generar UN solo total, UNA OT y una ficha de Kanban con todas las líneas.' },
  { id:'panel_precios', titulo:'Cambiar precios de insumos sin tocar código',
    keywords:['precio','precios','panel','actualizar','insumo','papel','material'],
    respuesta:'En el Hub entra a "Panel de Precios". Ahí puedes editar el valor de papeles, materiales y otros insumos base — el cambio aplica automáticamente a las 8 calculadoras porque todas leen del mismo archivo de precios compartido.' },
  { id:'rompecabezas_multitamano', titulo:'Un pedido de rompecabezas con varios tamaños',
    keywords:['rompecabezas','tamano','tamanos','varios','carrito','pedido'],
    respuesta:'En el módulo de Rompecabezas, configura el primer rompecabezas y presiona "➕ Agregar otro rompecabezas a este pedido" para sumar otro tamaño o forma distinta (ej: 2 de 50x33 y 1 de 66x50) al mismo carrito. Al guardar el pedido, todos quedan en una sola orden con una línea de Kanban por cada tamaño.' },
  { id:'cubo_rubik_caja_tintas', titulo:'Cubo Rubik: caja y tintas',
    keywords:['cubo','rubik','caja','tintas','con caja','sin caja'],
    respuesta:'En la calculadora de Cubo Rubik puedes marcar si el pedido lleva caja o no ("con caja"/"sin caja") y seleccionar las tintas de impresión de la caja. El precio y la foto de referencia se ajustan automáticamente según esa elección.' },
  { id:'bolsas_caras', titulo:'Bolsas: caras iguales o diferentes',
    keywords:['bolsas','caras','iguales','diferentes','frente','atras'],
    respuesta:'En la calculadora de Bolsas puedes indicar si el diseño de ambas caras es igual o diferente. Si son diferentes, el sistema calcula el material y los pliegos necesarios para cada cara por separado.' },
  { id:'whatsapp_cliente', titulo:'Enviar la cotización por WhatsApp',
    keywords:['whatsapp','enviar','mensaje','cliente'],
    respuesta:'Después de generar el PDF hay un botón de WhatsApp que abre la app instalada (o WhatsApp Business) con un mensaje ya redactado para el cliente, listo para adjuntar el PDF y enviar.' },
  { id:'acceso_rapido', titulo:'Moverme entre herramientas sin perder lo que estoy haciendo',
    keywords:['navegar','moverme','otra','herramienta','acceso','rapido','menu'],
    respuesta:'Usa el botón redondo ☰ flotante en la esquina inferior derecha: abre un menú para ir al Hub Principal, Calculadora de Costos, Kanban, CRM, Reportes o Contabilidad sin cerrar lo que tengas abierto.' },
];

function tacticalNormalizarTexto(s){
  return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

function tacticalBuscarAyuda(pregunta){
  const q = tacticalNormalizarTexto(pregunta);
  const palabras = q.split(/[^a-z0-9]+/).filter(w=>w.length>2);
  if(!palabras.length) return [];
  const resultados = TACTICAL_AYUDA_KB.map(entry=>{
    let score = 0;
    const kwNorm = entry.keywords.map(k=>tacticalNormalizarTexto(k));
    for(const p of palabras){
      for(const k of kwNorm){
        if(k===p) score += 3;
        else if(k.length>3 && (k.includes(p) || p.includes(k))) score += 1;
      }
    }
    if(tacticalNormalizarTexto(entry.titulo).includes(q)) score += 2;
    return {entry, score};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
  return resultados.slice(0,3).map(r=>r.entry);
}

/* ==========================================
   PLANO DE CORTE (diagrama de cuadrícula para la Orden de Producción)
   Toma el objeto planoCorte que ya devuelve costoMaterialPliegos() en cada motor
   ({piezaAncho, piezaAlto, pliegoAncho, pliegoAlto, columnas, filas, rotado, piezasPorPliego})
   y lo dibuja como SVG proporcional -- compartido para no repetir el dibujo en cada
   herramienta (Conde 2026-08-14, pidió letra chica y máxima densidad de información). ---- */
// Conde 2026-08-20: "un color marcará el corte a 50x70 y otro color las 8 páginas en tamaño
// 50x70" -- dos colores separados: ROJO para el corte del pliego a su tamaño final (el
// contorno exterior), AZUL para el montaje de impresión (la cuadrícula de piezas dentro de
// ese mismo pliego). Antes ambos usaban el mismo color oscuro y no se distinguían.
const TACTICAL_COLOR_CORTE_PLIEGO = '#c0392b';
const TACTICAL_COLOR_MONTAJE_PIEZAS = '#1e5fa8';
function tacticalDibujarPlanoCorteSVG(pc, maxAnchoPx){
  if(!pc || !pc.pliegoAncho || !pc.pliegoAlto || !pc.columnas || !pc.filas) return '';
  maxAnchoPx = maxAnchoPx || 170;
  const escala = maxAnchoPx / Math.max(pc.pliegoAncho, pc.pliegoAlto);
  const w = pc.pliegoAncho*escala, h = pc.pliegoAlto*escala;
  const piezaW = (pc.rotado ? pc.piezaAlto : pc.piezaAncho)*escala;
  const piezaH = (pc.rotado ? pc.piezaAncho : pc.piezaAlto)*escala;
  let rects = '';
  for(let fila=0; fila<pc.filas; fila++){
    for(let col=0; col<pc.columnas; col++){
      const x = col*piezaW, y = fila*piezaH;
      rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(piezaW-1.2,0.5).toFixed(1)}" height="${Math.max(piezaH-1.2,0.5).toFixed(1)}" fill="#eef2f7" stroke="${TACTICAL_COLOR_MONTAJE_PIEZAS}" stroke-width="1"/>`;
    }
  }
  // El contorno del pliego (corte) se dibuja al final, encima de la cuadrícula, para que se vea
  // claro incluso donde coincide con el borde de las piezas de las orillas.
  const contornoCorte = `<rect x="0.9" y="0.9" width="${Math.max(w-1.8,0.5).toFixed(1)}" height="${Math.max(h-1.8,0.5).toFixed(1)}" fill="none" stroke="${TACTICAL_COLOR_CORTE_PLIEGO}" stroke-width="1.8"/>`;
  return `<svg width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" style="background:#fff; display:block;">${rects}${contornoCorte}</svg>`;
}
function tacticalPlanoCorteTexto(pc){
  if(!pc) return '';
  return `<span style="color:${TACTICAL_COLOR_CORTE_PLIEGO}; font-weight:bold;">■</span> Corte del pliego: ${pc.pliegoAncho}x${pc.pliegoAlto}cm<br><span style="color:${TACTICAL_COLOR_MONTAJE_PIEZAS}; font-weight:bold;">■</span> Montaje: ${pc.piezasPorPliego} pieza(s) de ${pc.piezaAncho}x${pc.piezaAlto}cm (${pc.columnas}x${pc.filas}${pc.rotado?', rotado':''})`;
}

/* ==========================================
   NOMBRE DE MÁQUINA (fracción de pliego offset, o digital)
   Mismo mapeo usado en el Hub (COT_NOMBRE_MAQUINA) -- compartido para que las demás
   calculadoras muestren el mismo texto en su Orden de Producción (Conde 2026-08-18). ---- */
const TACTICAL_NOMBRE_MAQUINA = { octavo:"Octavo", cuarto:"Cuarto", medio_pliego:"Medio Pliego", digital:"Digital (Konica)" };

/* ==========================================
   ORDEN DE PRODUCCIÓN -- documento interno reutilizable (compartido entre las calculadoras
   de línea única: Bolsas, Cajas, Carpetas, Volantes, Rompecabezas, Cubo Rubik, Producto Libre).
   Mismo layout de 2 columnas (texto + plano de corte) y Recomendaciones al final que ya se usa
   en el Hub (Cuadernos) y en la Orden de Producción del Kanban, para que Conde vea siempre el
   mismo formato sin importar de qué línea venga (Conde 2026-08-18: "faltan los demás productos").
   cfg = {
     logoB64, ot, tipoDocTexto (default "ORDEN DE PRODUCCIÓN"), cliente, fechaEntrega,
     filasTabla: [[label, value], [label, value], ...] -- 2 por fila, se agrupan de a 2 automáticamente,
     bloques: [{ titulo, lineasTexto: ['Máquina: <strong>..</strong> — ...', ...], planoCorte }, ...],
     piePagina (opcional, string HTML libre -- ej. armado/encuadernación),
     recomendaciones: [texto, ...] (opcional),
   } ---- */
// Conde 2026-08-20: después de 2 rondas de "más grande" el texto quedó desproporcionado (cada
// bloque con un tamaño de fuente distinto) -- pidió UN solo tamaño fijo para todo: 15px. Se deja
// TACTICAL_OP_FONT_SIZE como única constante para que si en el futuro hay que ajustarlo, sea un
// solo cambio en vez de perseguir cada rem suelto otra vez.
const TACTICAL_OP_FONT_SIZE = '15px';
function tacticalOPDocumentoHtml(cfg){
  const F = TACTICAL_OP_FONT_SIZE;
  const filas = cfg.filasTabla || [];
  let filasHtml = '';
  for(let i=0; i<filas.length; i+=2){
    const [l1,v1] = filas[i];
    const par2 = filas[i+1];
    filasHtml += `<tr><th style="padding:4px 10px;">${l1}</th><td style="padding:4px 10px;"${!par2?' colspan="3"':''}><strong>${v1}</strong></td>${par2?`<th style="padding:4px 10px;">${par2[0]}</th><td style="padding:4px 10px;"><strong>${par2[1]}</strong></td>`:''}</tr>`;
  }
  const bloquesHtml = (cfg.bloques||[]).map(b => {
    const pc = b.planoCorte;
    return `
      <div style="border:1px solid #d7dee5; border-radius:3px; padding:7px 14px; margin-bottom:14px; break-inside:avoid; display:flex; gap:14px; align-items:center; font-size:${F};">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:bold; line-height:1.3;">${b.titulo||''}</div>
          ${(b.lineasTexto||[]).map(txt=>`<div style="color:#4a5568; line-height:1.4;">${txt}</div>`).join('')}
        </div>
        ${pc ? `<div style="flex-shrink:0; display:flex; gap:12px; align-items:center;">${tacticalDibujarPlanoCorteSVG(pc,140)}<div style="color:#4a5568; max-width:220px; line-height:1.35;">${tacticalPlanoCorteTexto(pc)}</div></div>` : ''}
      </div>`;
  }).join('');
  const recomendaciones = cfg.recomendaciones || [];
  const recsHtml = recomendaciones.length ? `
    <div class="doc-section-title" style="font-size:${F}; padding:6px 14px; margin:14px 0 7px;">⚠️ Recomendaciones de Producción</div>
    ${recomendaciones.map(txt=>`<div style="background:#fff3cd; color:#7a5b00; border:1px solid #f0d98c; border-radius:4px; padding:8px 16px; font-size:${F}; margin-bottom:8px;">${txt}</div>`).join('')}
  ` : '';
  return `
    <div class="doc-header" style="padding-bottom:7px; margin-bottom:7px; font-size:${F};">
      <div><img src="${cfg.logoB64}" style="height:60px; margin-bottom:4px; display:block;" alt="Tactical Marketing"><div class="doc-tipo" style="background:var(--secondary,#4a5568); font-size:${F}; padding:4px 14px;">${cfg.tipoDocTexto||'ORDEN DE PRODUCCIÓN'} ${cfg.ot||''} — USO INTERNO</div></div>
      <div class="doc-empresa-datos" style="font-size:${F};">${new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <table class="doc-table" style="font-size:${F}; margin-bottom:7px;">
      <tr><th style="padding:4px 10px;">N° de OT</th><td style="font-weight:bold; padding:4px 10px;">${cfg.ot||'-'}</td><th style="padding:4px 10px;">Cliente</th><td style="padding:4px 10px;"><strong>${cfg.cliente||'-'}</strong></td></tr>
      ${filasHtml}
      <tr><th style="padding:4px 10px;">Entrega</th><td colspan="3" style="padding:4px 10px;"><strong>${cfg.fechaEntrega||'Por definir'}</strong></td></tr>
    </table>
    <div class="doc-section-title" style="font-size:${F}; padding:6px 14px; margin:7px 0 7px;">Insumos, montajes y plano de corte</div>
    ${bloquesHtml}
    ${cfg.piePagina ? `<div class="doc-section-title" style="font-size:${F}; padding:6px 14px; margin:7px 0 7px;">Armado / Terminado</div><p style="font-size:${F}; margin:4px 0;">${cfg.piePagina}</p>` : ''}
    ${recsHtml}
  `;
}

/* ==========================================
   CAMPOS NUMÉRICOS CON SEPARADOR DE MILES (Conde 2026-08-20: "en este momento 1000 es asi
   quiero que sea 1.000 para asi evitar errores"). <input type="number"> del navegador NO puede
   mostrar puntos de miles (los rechaza), así que estos campos son type="text" con estas 2
   funciones: tacticalFormatearMiles(this) se pone en oninput para reformatear mientras se
   escribe, y tacticalLeerNumeroFormateado(id) se usa en vez de parseFloat(...value) para leerlo
   de vuelta (le quita los puntos antes de convertir a número -- parseFloat("1.000") solo daría 1
   si no se le quitan primero). ---- */
function tacticalFormatearMiles(input){
  const cursorDesdeElFinal = input.value.length - input.selectionStart;
  const soloDigitos = input.value.replace(/[^\d]/g, '');
  const numero = soloDigitos === '' ? '' : parseInt(soloDigitos, 10).toLocaleString('es-CO');
  input.value = numero;
  const nuevaPos = Math.max(0, input.value.length - cursorDesdeElFinal);
  input.setSelectionRange(nuevaPos, nuevaPos);
}
function tacticalLeerNumeroFormateado(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  return parseFloat(String(el.value).replace(/\./g,'')) || 0;
}

/* ==========================================
   RECOMENDACIONES DE PRODUCCIÓN -- editables desde el Panel de Precios (Conde 2026-08-20).
   Cada calculadora sigue definiendo su propio RECOMENDACIONES_PRODUCCION (array de
   {id, aplica, texto}) tal como ya existía -- esta función solo se intercala justo antes del
   .filter(reg=>reg.aplica(r)) de cada una, para (a) reemplazar el texto de una recomendación
   existente si Conde le puso un override por su id, y (b) agregar las recomendaciones nuevas que
   Conde haya creado para esa línea (siempre se muestran, sin condición -- más simple que dejarlo
   crear condiciones propias). Las entradas cuyo "texto" es una función (ej. el aviso dinámico de
   Cajas que depende de r.troquel.nota) no se pueden sobreescribir con un texto fijo -- se dejan
   igual, el override solo aplica a texto=string. */
function tacticalAplicarRecomendacionesOverride(lista, calculadoraId){
  const cache = (typeof tacticalRecomendacionesCache !== 'undefined') ? tacticalRecomendacionesCache : {overrides:{}, custom:[]};
  const overrides = cache.overrides || {};
  const conOverride = lista.map(reg => {
    if(!reg.id || typeof reg.texto !== 'string') return reg;
    const textoNuevo = overrides[reg.id];
    return textoNuevo ? {...reg, texto: textoNuevo} : reg;
  });
  const customDeEstaCalculadora = (cache.custom||[])
    .filter(c => c.calculadora === calculadoraId)
    .map(c => ({ id: c.id, aplica: () => true, texto: c.texto }));
  return [...conOverride, ...customDeEstaCalculadora];
}
