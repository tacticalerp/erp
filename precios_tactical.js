// ==========================================
// precios_tactical.js
// Fuente única de precios de insumos compartidos entre las 8 herramientas de Tactical ERP.
// Se carga con <script src="precios_tactical.js"></script> ANTES del script principal de
// cada archivo. Los valores base de aquí abajo son los ya validados en el motor del hub
// (TACTICAL_ERP_HUB.html). Conde puede sobreescribirlos sin tocar código desde el
// Panel de Precios del hub (vista "precios") — esos cambios quedan en localStorage bajo
// la clave tactical_precios_override_v1 y tienen prioridad sobre los valores base.
// ==========================================

function tacticalLeerOverridesPrecios(){
  try{ return JSON.parse(localStorage.getItem('tactical_precios_override_v1')) || {}; }
  catch(e){ return {}; }
}
const TACTICAL_PRECIOS_OVERRIDE = tacticalLeerOverridesPrecios();

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
};
const PRECIOS_SUSTRATOS_MAESTRO = tacticalMergeNivel2(PRECIOS_BASE_SUSTRATOS, TACTICAL_PRECIOS_OVERRIDE.sustratos);
function tacticalSeleccionarSustratos(claves){
  const out = {};
  claves.forEach(k => { out[k] = PRECIOS_SUSTRATOS_MAESTRO[k] || {p6090:null, p70100:null}; });
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
  {grupo:"Acabados", tipo:"simple", campos:[
    {clave:"plastificadoM2", etiqueta:"Plastificado ($/m²)", base:950},
    {clave:"plastificadoPiso", etiqueta:"Plastificado (piso mínimo OT)", base:30000},
    {clave:"colaminadoM2", etiqueta:"Colaminado ($/m²)", base:900},
  ]},
  {grupo:"Costos generales", tipo:"simple", campos:[
    {clave:"disenoNormal", etiqueta:"Diseño (costo normal)", base:40000},
    {clave:"disenoReducido", etiqueta:"Diseño (costo reducido)", base:20000},
    {clave:"escudoUmbral", etiqueta:"Umbral escudo bajos montos", base:150000},
    {clave:"offsetToleranciaMerma", etiqueta:"Tolerancia de merma por millar (unidades)", base:180},
  ]},
];
