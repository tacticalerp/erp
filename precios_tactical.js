// Conde 2026-08-24: miniatura de pestaña (favicon) para las 10 herramientas -- "ERP" en blanco,
// fuente condensada y pesada, dentro de un recuadro rojo corporativo (var(--primary) = #cc0000 en
// el CSS de cada página, repetido acá literal porque este script corre antes de que exista el
// <style> de la página). SVG inline (sin archivo aparte que pedir/mantener) -- se inyecta una sola
// vez acá porque este archivo se carga en las 10 herramientas, así no hay que repetir el <link> en
// cada una ni arriesgarse a que alguna quede desactualizada.
(function tacticalInyectarFavicon(){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>`
    + `<rect width='64' height='64' rx='12' fill='%23cc0000'/>`
    + `<text x='32' y='42' font-family='Arial Narrow,Helvetica Neue,Arial,sans-serif' font-weight='900' `
    + `font-size='25' letter-spacing='-1' fill='white' text-anchor='middle'>ERP</text></svg>`;
  let link = document.querySelector("link[rel~='icon']");
  if(!link){ link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + svg;
})();
// ==========================================
// Conde 2026-08-21: "se están aprobando y se omite la fecha" -- el prompt() de texto libre para la
// fecha de entrega de la Orden de Producción se podía cancelar o dejar vacío sin darse cuenta
// (quedaba "Por definir" en silencio). Ventana FLOTANTE obligatoria: sin click afuera para cerrar,
// sin tecla Escape, "Confirmar" no deja pasar sin una fecha válida -- la única salida es "Cancelar"
// (que aborta TODA la acción, no genera nada sin fecha). Se usa en las 8 calculadoras + el Hub
// porque este archivo se carga en todas. Devuelve una Promesa: la fecha "AAAA-MM-DD" elegida, o
// null si se canceló (quien llama debe entonces detenerse, no seguir con un valor vacío).
function tacticalPedirFechaFlotante(titulo){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(26,32,44,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:10px; padding:24px; max-width:360px; width:100%; box-shadow:0 12px 40px rgba(0,0,0,0.35); text-align:center; font-family:'Segoe UI', Tahoma, sans-serif;">
        <div style="font-size:2rem; margin-bottom:4px;">📅</div>
        <div style="font-weight:800; font-size:1.05rem; color:#1a202c; margin-bottom:4px;">${titulo}</div>
        <div style="font-size:0.85rem; color:#718096; margin-bottom:16px;">Dato obligatorio — sin fecha no se genera el documento.</div>
        <input type="date" id="tactical-fecha-flotante-input" style="width:100%; box-sizing:border-box; font-size:1.1rem; padding:10px; border:2px solid #cbd5e0; border-radius:6px; margin-bottom:6px;">
        <div id="tactical-fecha-flotante-error" style="color:#c0392b; font-size:0.8rem; min-height:1.2em; margin-bottom:10px;"></div>
        <div style="display:flex; gap:8px;">
          <button type="button" id="tactical-fecha-flotante-cancelar" style="flex:1; padding:10px; border:1px solid #cbd5e0; background:#fff; color:#4a5568; border-radius:6px; font-weight:700; cursor:pointer;">Cancelar</button>
          <button type="button" id="tactical-fecha-flotante-confirmar" style="flex:1; padding:10px; border:none; background:#cc0000; color:#fff; border-radius:6px; font-weight:700; cursor:pointer;">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#tactical-fecha-flotante-input');
    const errorEl = overlay.querySelector('#tactical-fecha-flotante-error');
    setTimeout(() => input.focus(), 0);
    function cerrar(valor){ overlay.remove(); resolve(valor); }
    overlay.querySelector('#tactical-fecha-flotante-cancelar').onclick = () => cerrar(null);
    overlay.querySelector('#tactical-fecha-flotante-confirmar').onclick = () => {
      if(!input.value){ errorEl.textContent = 'Elige el día, mes y año antes de continuar.'; return; }
      cerrar(input.value);
    };
  });
}
// Conde 2026-08-28 (módulo Comercial): "que se aclare para evitar aprobaciones erradas" -- ventana
// flotante genérica de sí/no, mismo patrón visual que tacticalPedirFechaFlotante de arriba. Usada
// para los botones ✓/✕ de aprobar/cancelar una cotización directo desde la tabla (evita que un
// clic accidental en botones chicos y cercanos dispare la aprobación/pérdida de un negocio real).
// opts: {titulo, mensaje, color, textoBoton, icono} -- icono es una clave de TACTICAL_SVG_ICONOS
// (ver ticon() más abajo). Devuelve una Promesa<boolean> -- true si confirmó, false si canceló.
function tacticalConfirmarFlotante(opts){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(26,32,44,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:10px; padding:24px; max-width:380px; width:100%; box-shadow:0 12px 40px rgba(0,0,0,0.35); text-align:center; font-family:'Segoe UI', Tahoma, sans-serif;">
        <div style="display:flex; justify-content:center; margin-bottom:10px; color:${opts.color};">${ticon(opts.icono, {size:42, noMargin:true})}</div>
        <div style="font-weight:800; font-size:1.05rem; color:#1a202c; margin-bottom:6px;">${opts.titulo}</div>
        <div style="font-size:0.85rem; color:#718096; margin-bottom:18px;">${opts.mensaje||''}</div>
        <div style="display:flex; gap:8px;">
          <button type="button" id="tactical-confirmar-flotante-no" style="flex:1; padding:10px; border:1px solid #cbd5e0; background:#fff; color:#4a5568; border-radius:6px; font-weight:700; cursor:pointer;">Cancelar</button>
          <button type="button" id="tactical-confirmar-flotante-si" style="flex:1; padding:10px; border:none; background:${opts.color}; color:#fff; border-radius:6px; font-weight:700; cursor:pointer;">${opts.textoBoton||'Confirmar'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    function cerrar(valor){ overlay.remove(); resolve(valor); }
    overlay.querySelector('#tactical-confirmar-flotante-no').onclick = () => cerrar(false);
    overlay.querySelector('#tactical-confirmar-flotante-si').onclick = () => cerrar(true);
  });
}
// Conde 2026-08-28 (módulo Comercial): "en la casilla de observaciones aparezca 1 SEP al iniciar
// la casilla" -- código corto día+mes (sin año, sin ceros a la izquierda) para la fecha de
// seguimiento elegida con el ícono de reloj. Compartido porque tanto el Hub como (a futuro)
// cualquier calculadora podrían necesitar el mismo formato.
function tacticalFormatoDiaMes(fechaISO){
  if(!fechaISO) return '';
  const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  if(!anio || !mes || !dia) return '';
  return `${dia} ${MESES[mes-1]}`;
}
// Inserta/actualiza el código de fecha al INICIO de un texto de Observaciones ya existente, sin
// duplicarlo si ya había uno puesto por una fecha de seguimiento anterior (lo reemplaza).
function tacticalAplicarCodigoFechaSeguimiento(textoActual, fechaISO){
  const codigo = tacticalFormatoDiaMes(fechaISO);
  const limpio = (textoActual || '').replace(/^\d{1,2} [A-ZÁÉÍÓÚÑ]{3}\s*-?\s*/, '').trim();
  return limpio ? `${codigo} - ${limpio}` : codigo;
}
// Conde 2026-08-28: "ese módulo está pensado en simplicidad visual" -- el botón ✕ de Comercial
// obligaba a saltar a la vista de CRM para ver el panel de "¿por qué se perdió?" (vivía como un
// <div> fijo dentro de esa vista, no como ventana flotante). Se convierte al mismo patrón de
// tacticalConfirmarFlotante -- ahora funciona igual sin importar en qué vista esté parado quien
// lo llama. Devuelve el motivo (string) elegido, o null si canceló.
function tacticalPedirMotivoPerdidaFlotante(){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(26,32,44,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:10px; padding:24px; max-width:380px; width:100%; box-shadow:0 12px 40px rgba(0,0,0,0.35); font-family:'Segoe UI', Tahoma, sans-serif;">
        <div style="font-weight:800; font-size:1.05rem; color:#1a202c; margin-bottom:14px;">¿Por qué se perdió este negocio?</div>
        <select id="tactical-motivo-perdida-select" style="width:100%; box-sizing:border-box; padding:10px; border:2px solid #cbd5e0; border-radius:6px; margin-bottom:10px; font-size:0.95rem;">
          <option value="Precio">Por Precio (Competencia más barata)</option>
          <option value="Tiempo Cotización">Tiempo de entrega de cotización tardó mucho</option>
          <option value="Tiempo Producto">Tiempo de entrega del producto muy largo</option>
          <option value="Cliente no respondió">El cliente cotizó y no respondió</option>
          <option value="Otra">Otra razón...</option>
        </select>
        <input type="text" id="tactical-motivo-perdida-otra" placeholder="Escriba la razón..." style="display:none; width:100%; box-sizing:border-box; padding:10px; border:2px solid #cbd5e0; border-radius:6px; margin-bottom:10px; font-size:0.95rem;">
        <div style="display:flex; gap:8px; margin-top:6px;">
          <button type="button" id="tactical-motivo-perdida-cancelar" style="flex:1; padding:10px; border:1px solid #cbd5e0; background:#fff; color:#4a5568; border-radius:6px; font-weight:700; cursor:pointer;">Cancelar</button>
          <button type="button" id="tactical-motivo-perdida-confirmar" style="flex:1; padding:10px; border:none; background:#cc0000; color:#fff; border-radius:6px; font-weight:700; cursor:pointer;">Confirmar Cierre Perdido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const sel = overlay.querySelector('#tactical-motivo-perdida-select');
    const otra = overlay.querySelector('#tactical-motivo-perdida-otra');
    sel.onchange = () => { otra.style.display = sel.value === 'Otra' ? 'block' : 'none'; };
    function cerrar(valor){ overlay.remove(); resolve(valor); }
    overlay.querySelector('#tactical-motivo-perdida-cancelar').onclick = () => cerrar(null);
    overlay.querySelector('#tactical-motivo-perdida-confirmar').onclick = () => {
      let motivo = sel.value;
      if(motivo === 'Otra') motivo = otra.value.trim() || 'Razón no especificada';
      cerrar(motivo);
    };
  });
}
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
  { id:'rompecabezas_aprobar_pedido', titulo:'Aprobar un pedido de Rompecabezas (B2C)',
    keywords:['aprobar','pago','confirmar','pedido','rompecabezas','b2c'],
    respuesta:'En la pestaña "Buscar / Aprobar Pedidos" busca al cliente (por nombre, celular o correo) y presiona <b>"✅ Aprobar (pagó)"</b> en su fila. Esto crea automáticamente la ficha de Kanban del pedido y calcula la fecha de entrega. Solo comercial y administrador ven esta pestaña.' },
  { id:'rompecabezas_buscar_pedido', titulo:'Buscar un pedido de Rompecabezas ya guardado',
    keywords:['buscar','pedido','rompecabezas','cliente','historico'],
    respuesta:'En la pestaña "Buscar / Aprobar Pedidos", el buscador filtra por nombre, celular o correo del cliente. Sin escribir nada, solo se muestran los pedidos de los últimos 45 días — escribe algo para buscar en todo el histórico.' },
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
// Conde 2026-08-21: revisando una cotización real notó que se armaba TODO el pliego en una sola
// orientación (ej. pieza 42x28cm en un pliego 100x70cm daba 4 piezas), cuando mezclando corte
// horizontal y vertical en el mismo pliego caben más (5 en ese mismo ejemplo -- confirmado que es
// exactamente lo que ilustraba la calculadora de pliegos que mandó). tacticalMejorLayoutPliego()
// prueba una sola orientación Y 4 variantes de "franja principal + sobrante en la otra
// orientación" (por ancho o por alto, empezando sin rotar o rotado), y devuelve la que más piezas
// saque. El resultado ya no es un solo grid -- puede tener una "secundaria" (la franja sobrante).
function tacticalMejorLayoutPliego(pa, pal, pw, ph){
  function grid(pw_, ph_, x, y, boxW, boxH, rotado){
    const cols = Math.floor(boxW/pw_), filas = Math.floor(boxH/ph_);
    return { x, y, piezaAncho:pa, piezaAlto:pal, columnas:cols, filas, rotado, piezas:cols*filas };
  }
  const candidatos = [];
  // Sin mezclar: toda la hoja en una sola orientación (como antes).
  candidatos.push({ total: grid(pa,pal,0,0,pw,ph,false).piezas, principal: grid(pa,pal,0,0,pw,ph,false), secundaria: null });
  candidatos.push({ total: grid(pal,pa,0,0,pw,ph,true).piezas, principal: grid(pal,pa,0,0,pw,ph,true), secundaria: null });
  // Mezclando: franja principal ocupa cols*ancho (o filas*alto), el sobrante se llena con la
  // pieza en la OTRA orientación.
  [[pa,pal,false],[pal,pa,true]].forEach(([bw,bh,rot])=>{
    const principal = grid(bw,bh,0,0,pw,ph,rot);
    const usadoAncho = principal.columnas*bw;
    const sobranteAncho = pw - usadoAncho;
    const otroW = rot?pa:pal, otroH = rot?pal:pa;
    const secundaria = grid(otroW,otroH,usadoAncho,0,sobranteAncho,ph,!rot);
    candidatos.push({ total: principal.piezas+secundaria.piezas, principal, secundaria: secundaria.piezas>0?secundaria:null });

    const principal2 = grid(bw,bh,0,0,pw,ph,rot);
    const usadoAlto = principal2.filas*bh;
    const sobranteAlto = ph - usadoAlto;
    const secundaria2 = grid(otroW,otroH,0,usadoAlto,pw,sobranteAlto,!rot);
    candidatos.push({ total: principal2.piezas+secundaria2.piezas, principal: principal2, secundaria: secundaria2.piezas>0?secundaria2:null });
  });
  candidatos.sort((x,y)=>y.total-x.total);
  return candidatos[0];
}
// Conde 2026-08-24: "la maquina puede alimentar desde 24x17 hasta 50x25... y todos los
// intermedios" -- confirmó que cada máquina litográfica NO imprime solo su tamaño máximo de
// catálogo (octavo/cuarto/medio pliego), sino cualquier medida intermedia dentro de un rango.
// Antes, el material se cortaba SIEMPRE al tamaño máximo de la máquina aunque la pieza real fuera
// mucho más chica (ej. un volante de 36x23cm en máquina "cuarto" -- 35x50cm -- solo aprovechaba
// una pequeña parte de esa hoja, el resto se desperdiciaba: con el pliego madre de 70x100cm eso
// eran 4 piezas de 35x50cm por pliego, cuando cortando SOLO lo que la pieza necesita (24x36.5cm,
// con el mismo margen de pinza de esa máquina) caben 6 -- 34% menos papel para el mismo trabajo,
// mismas pasadas de máquina). tacticalCorteMontajeOffset() calcula esa medida ajustada: envuelve
// justo las piezas de esa pasada (ya calculadas por planoImpresionOffset de cada calculadora) más
// el margen de pinza real de esa máquina (la diferencia entre su tamaño completo y su área
// imprimible, YA definida por calculadora en OFFSET_FORMATOS_CM/OFFSET_FORMATOS_IMPRESION_CM --
// no es un margen inventado nuevo, es el mismo que ya se usaba), sin bajar del mínimo real que esa
// máquina puede alimentar ni pasarse de su máximo de catálogo.
const TACTICAL_OFFSET_MINIMO_CM = { octavo: [14, 21], cuarto: [17, 24], medio_pliego: [25, 35] };
function tacticalCorteMontajeOffset(fraccion, plano, formatosCm, formatosImpresionCm){
  function ordenar2(a, b){ return a <= b ? [a, b] : [b, a]; }
  const anchoUtil = plano.columnas * (plano.rotado ? plano.piezaAlto : plano.piezaAncho);
  const altoUtil = plano.filas * (plano.rotado ? plano.piezaAncho : plano.piezaAlto);
  const [fChico, fGrande] = ordenar2(...formatosCm[fraccion]);
  const [fiChico, fiGrande] = ordenar2(...formatosImpresionCm[fraccion]);
  const margenChico = fChico - fiChico, margenGrande = fGrande - fiGrande;
  const [utilChico, utilGrande] = ordenar2(anchoUtil, altoUtil);
  const [minChico, minGrande] = TACTICAL_OFFSET_MINIMO_CM[fraccion];
  const anchoCorte = Math.min(fChico, Math.max(utilChico + margenChico, minChico));
  const altoCorte = Math.min(fGrande, Math.max(utilGrande + margenGrande, minGrande));
  return [anchoCorte, altoCorte];
}
// planoCorte = {piezaAncho, piezaAlto, pliegoAncho, pliegoAlto, columnas, filas, rotado,
// piezasPorPliego, secundaria?:{x,y,piezaAncho,piezaAlto,columnas,filas,rotado}} -- "secundaria"
// es opcional (solo aparece cuando mezclar orientaciones sacó más piezas que una sola).
function tacticalDibujarPlanoCorteSVG(pc, maxAnchoPx){
  if(!pc || !pc.pliegoAncho || !pc.pliegoAlto || !pc.columnas || !pc.filas) return '';
  maxAnchoPx = maxAnchoPx || 170;
  const escala = maxAnchoPx / Math.max(pc.pliegoAncho, pc.pliegoAlto);
  const w = pc.pliegoAncho*escala, h = pc.pliegoAlto*escala;
  function dibujarGrid(piezaAncho, piezaAlto, columnas, filas, rotado, offX, offY){
    const piezaW = (rotado ? piezaAlto : piezaAncho)*escala;
    const piezaH = (rotado ? piezaAncho : piezaAlto)*escala;
    let rects = '';
    for(let fila=0; fila<filas; fila++){
      for(let col=0; col<columnas; col++){
        const x = offX + col*piezaW, y = offY + fila*piezaH;
        rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(piezaW-1.2,0.5).toFixed(1)}" height="${Math.max(piezaH-1.2,0.5).toFixed(1)}" fill="#eef2f7" stroke="${TACTICAL_COLOR_MONTAJE_PIEZAS}" stroke-width="1"/>`;
      }
    }
    return rects;
  }
  let rects = dibujarGrid(pc.piezaAncho, pc.piezaAlto, pc.columnas, pc.filas, pc.rotado, 0, 0);
  if(pc.secundaria){
    const s = pc.secundaria;
    rects += dibujarGrid(s.piezaAncho, s.piezaAlto, s.columnas, s.filas, s.rotado, s.x*escala, s.y*escala);
    // Línea punteada marcando dónde se divide el pliego entre las 2 franjas mezcladas.
    if(s.x>0) rects += `<line x1="${(s.x*escala).toFixed(1)}" y1="0" x2="${(s.x*escala).toFixed(1)}" y2="${h.toFixed(1)}" stroke="${TACTICAL_COLOR_MONTAJE_PIEZAS}" stroke-width="0.8" stroke-dasharray="2,1.5"/>`;
    if(s.y>0) rects += `<line x1="0" y1="${(s.y*escala).toFixed(1)}" x2="${w.toFixed(1)}" y2="${(s.y*escala).toFixed(1)}" stroke="${TACTICAL_COLOR_MONTAJE_PIEZAS}" stroke-width="0.8" stroke-dasharray="2,1.5"/>`;
  }
  // El contorno del pliego (corte) se dibuja al final, encima de la cuadrícula, para que se vea
  // claro incluso donde coincide con el borde de las piezas de las orillas.
  const contornoCorte = `<rect x="0.9" y="0.9" width="${Math.max(w-1.8,0.5).toFixed(1)}" height="${Math.max(h-1.8,0.5).toFixed(1)}" fill="none" stroke="${TACTICAL_COLOR_CORTE_PLIEGO}" stroke-width="1.8"/>`;
  return `<svg width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" style="background:#fff; display:block;">${rects}${contornoCorte}</svg>`;
}
function tacticalPlanoCorteTexto(pc){
  if(!pc) return '';
  const franjaTxt = pc.secundaria
    ? ` — franja 1: ${pc.columnas}x${pc.filas}${pc.rotado?' rotado':''}, franja 2: ${pc.secundaria.columnas}x${pc.secundaria.filas}${pc.secundaria.rotado?' rotado':''} (mezclando corte horizontal y vertical)`
    : ` (${pc.columnas}x${pc.filas}${pc.rotado?', rotado':''})`;
  return `<span style="color:${TACTICAL_COLOR_CORTE_PLIEGO}; font-weight:bold;">■</span> Corte del pliego: ${pc.pliegoAncho}x${pc.pliegoAlto}cm<br><span style="color:${TACTICAL_COLOR_MONTAJE_PIEZAS}; font-weight:bold;">■</span> Montaje: ${pc.piezasPorPliego} pieza(s) de ${pc.piezaAncho}x${pc.piezaAlto}cm${franjaTxt}`;
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
// Conde 2026-08-20: 15px seguía viéndose desproporcionado impreso en hoja completa, y el
// documento se estaba yendo a 4 páginas para un producto de una sola línea -- pidió 12.5px fijo
// Y una plantilla más compacta (paddings/márgenes/imágenes más chicos) para que cualquier
// producto, aunque tenga varias partes (Cuadernos: Carátula+Taco+Guardas), quepa en 1 hoja.
const TACTICAL_OP_FONT_SIZE = '12.5px';
function tacticalOPDocumentoHtml(cfg){
  const F = TACTICAL_OP_FONT_SIZE;
  const filas = cfg.filasTabla || [];
  let filasHtml = '';
  for(let i=0; i<filas.length; i+=2){
    const [l1,v1] = filas[i];
    const par2 = filas[i+1];
    filasHtml += `<tr><th style="padding:3px 8px;">${l1}</th><td style="padding:3px 8px;"${!par2?' colspan="3"':''}><strong>${v1}</strong></td>${par2?`<th style="padding:3px 8px;">${par2[0]}</th><td style="padding:3px 8px;"><strong>${par2[1]}</strong></td>`:''}</tr>`;
  }
  const bloquesHtml = (cfg.bloques||[]).map(b => {
    const pc = b.planoCorte;
    return `
      <div style="border:1px solid #d7dee5; border-radius:3px; padding:4px 9px; margin-bottom:6px; break-inside:avoid; display:flex; gap:9px; align-items:center; font-size:${F};">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:bold; line-height:1.2;">${b.titulo||''}</div>
          ${(b.lineasTexto||[]).map(txt=>`<div style="color:#4a5568; line-height:1.25;">${txt}</div>`).join('')}
        </div>
        ${pc ? `<div style="flex-shrink:0; display:flex; gap:8px; align-items:center;">${tacticalDibujarPlanoCorteSVG(pc,85)}<div style="color:#4a5568; max-width:150px; line-height:1.2;">${tacticalPlanoCorteTexto(pc)}</div></div>` : ''}
      </div>`;
  }).join('');
  const recomendaciones = cfg.recomendaciones || [];
  const recsHtml = recomendaciones.length ? `
    <div class="doc-section-title" style="font-size:${F}; padding:3px 9px; margin:6px 0 4px;">⚠️ Recomendaciones de Producción</div>
    ${recomendaciones.map(txt=>`<div style="background:#fff3cd; color:#7a5b00; border:1px solid #f0d98c; border-radius:4px; padding:4px 9px; font-size:${F}; margin-bottom:4px;">${txt}</div>`).join('')}
  ` : '';
  return `
    <div class="doc-header" style="padding-bottom:4px; margin-bottom:4px; font-size:${F};">
      <div><img src="${cfg.logoB64}" style="height:36px; margin-bottom:2px; display:block;" alt="Tactical Marketing"><div class="doc-tipo" style="background:var(--secondary,#4a5568); font-size:${F}; padding:2px 9px;">${cfg.tipoDocTexto||'ORDEN DE PRODUCCIÓN'} ${cfg.ot||''} — USO INTERNO</div></div>
      <div class="doc-empresa-datos" style="font-size:${F};">${new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <table class="doc-table" style="font-size:${F}; margin-bottom:4px;">
      <tr><th style="padding:3px 8px;">N° de OT</th><td style="font-weight:bold; padding:3px 8px;">${cfg.ot||'-'}</td><th style="padding:3px 8px;">Cliente</th><td style="padding:3px 8px;"><strong>${cfg.cliente||'-'}</strong></td></tr>
      ${filasHtml}
      <tr><th style="padding:3px 8px;">Entrega</th><td colspan="3" style="padding:3px 8px;"><strong>${cfg.fechaEntrega||'Por definir'}</strong></td></tr>
    </table>
    <div class="doc-section-title" style="font-size:${F}; padding:3px 9px; margin:4px 0 4px;">Insumos, montajes y plano de corte</div>
    ${bloquesHtml}
    ${cfg.piePagina ? `<div class="doc-section-title" style="font-size:${F}; padding:3px 9px; margin:4px 0 4px;">Armado / Terminado</div><p style="font-size:${F}; margin:2px 0;">${cfg.piePagina}</p>` : ''}
    ${recsHtml}
  `;
}

/* ==========================================
   ÍCONOS DE LÍNEA (Conde 2026-08-27): "quiero que los iconos que usas en todo el ERP los
   reemplaces por iconos de este tipo de diseño" -- trazo delgado, sin relleno, un solo color
   (hereda el color del texto donde se ponga). Se arranca por el directorio de Clientes como piloto
   -- si el estilo te gusta, se sigue con el resto del ERP (son cientos de emojis regados en las 10
   herramientas, mejor confirmar el look en un lugar chico antes de cambiar todo).
   Uso: ticon('trash') o ticon('trash', {size:18, color:'#c53030'}) -- ver TACTICAL_SVG_ICONOS abajo
   para los nombres disponibles.
   ========================================== */
const TACTICAL_SVG_ICONOS = {
  trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
  idcard: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>',
  target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
  palette: '<path d="M12 21a9 9 0 1 1 0-18c4.97 0 9 3.58 9 7.5 0 2.1-1.57 3.5-3.5 3.5H16a1.5 1.5 0 0 0-1 2.6c.36.36.5.86.5 1.4 0 1.11-.9 2-2 2z"></path><circle cx="7.5" cy="10.5" r="1.2"></circle><circle cx="10.5" cy="7" r="1.2"></circle><circle cx="15" cy="7.5" r="1.2"></circle>',
  check: '<polyline points="20 6 9 17 4 12"></polyline>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
  paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>',
  factory: '<path d="M2 20h20"></path><path d="M4 20V10l6 4v-4l6 4V6l4 3v11"></path>',
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path>',
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  puzzle: '<path d="M4 7h3.5a1.5 1.5 0 0 0 0-3A1.5 1.5 0 0 1 9 2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5A1.5 1.5 0 0 1 13.5 1a1.5 1.5 0 0 1 0 3H17a1 1 0 0 1 1 1v3.5a1.5 1.5 0 0 1-3 0A1.5 1.5 0 0 0 13.5 10a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 1 1.5 1.5V18a1 1 0 0 1-1 1h-3.5a1.5 1.5 0 0 1 0-3A1.5 1.5 0 0 0 9 14.5 1.5 1.5 0 0 0 7.5 16a1.5 1.5 0 0 1-3 0V13a1 1 0 0 1 1-1h1.5a1.5 1.5 0 0 0 0-3H5a1 1 0 0 1-1-1V7z"></path>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
  barChart: '<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  shoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>',
  bulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"></path>',
  truck: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="11" x2="8" y2="11"></line><line x1="12" y1="11" x2="12" y2="11"></line><line x1="16" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="8" y2="15"></line><line x1="12" y1="15" x2="12" y2="15"></line><line x1="16" y1="15" x2="16" y2="19"></line><line x1="8" y1="19" x2="8" y2="19"></line><line x1="12" y1="19" x2="12" y2="19"></line>',
  trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  messageCircle: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
  gift: '<polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>',
  award: '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>',
  refresh: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>',
  recycle: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"></path><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"></path><path d="m14 16-3 3 3 3"></path><path d="M8.293 13.596 7.196 9.5 3.1 10.598"></path><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 12.001 3a1.784 1.784 0 0 1 1.563.892l3.821 6.62"></path><path d="m13.378 9.633 4.096 1.098 1.097-4.096"></path>',
  creditCard: '<rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-3-3z"></path>',
  chevronUp: '<polyline points="18 15 12 9 6 15"></polyline>',
  chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path><path d="m21 3 1 11h-2"></path><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"></path><path d="M3 4h8"></path>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line>',
  slash: '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>',
  building: '<rect x="4" y="2" width="16" height="20"></rect><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line><path d="M10 22v-4h4v4"></path>',
  // Conde 2026-08-28: reemplaza el ícono genérico de "libro" para Cuadernos -- cuaderno de espiral
  // reconocible (tapa + argollas), redibujado en el mismo estilo de línea delgada del resto.
  notebook: '<rect x="7" y="2" width="15" height="20" rx="1"></rect><circle cx="4" cy="5" r="1.2"></circle><circle cx="4" cy="9" r="1.2"></circle><circle cx="4" cy="13" r="1.2"></circle><circle cx="4" cy="17" r="1.2"></circle><circle cx="4" cy="21" r="1.2"></circle>',
  // Reloj -- botón de "programar seguimiento" en Comercial.
  clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
};
function ticon(nombre, opts){
  opts = opts || {};
  const p = TACTICAL_SVG_ICONOS[nombre];
  if(!p) return '';
  const size = opts.size || 14;
  const color = opts.color || 'currentColor';
  const margin = opts.noMargin ? '' : 'margin-right:4px;';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0; ${margin}">${p}</svg>`;
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

/* ==========================================
   DICTADO POR VOZ + ORTOGRAFÍA (Conde 2026-08-24): un botón "🎤 Dictar por voz" que agrega, al
   final de lo ya escrito, lo que se diga en voz alta -- usa el reconocimiento de voz nativo del
   navegador (Web Speech API), sin servidor ni costo aparte. Solo funciona en Chrome (Android o
   escritorio) -- Safari/iPhone no lo soporta; si el navegador no lo tiene, simplemente no aparece
   el botón (el campo se sigue escribiendo a mano normal, no se rompe nada). También activa el
   corrector ortográfico nativo del navegador (spellcheck) en el mismo campo -- eso sí funciona en
   cualquier navegador. Se activa solo, en todo campo con class="tactical-campo-dictado" -- no hace
   falta llamarlo a mano en cada calculadora, corre una vez al cargar la página.
   ========================================== */
// CSS del botón inyectado por JS (una sola vez) en vez de pedirle a las 10 herramientas que
// agreguen las mismas reglas cada una en su <style> -- todo el feature queda autocontenido aquí.
(function tacticalInyectarEstiloDictado(){
  const style = document.createElement('style');
  style.textContent = `
    .tactical-dictado-btn{ display:inline-flex; align-items:center; gap:4px; margin-top:4px; padding:4px 10px; border-radius:14px; border:1px solid #cbd5e0; background:#f7fafc; color:#4a5568; font-size:11.5px; cursor:pointer; font-family:inherit; }
    .tactical-dictado-btn:hover{ background:#edf2f7; }
    .tactical-dictado-btn.escuchando{ background:#fde8e8; border-color:#c53030; color:#c53030; animation: tactical-dictado-pulso 1s infinite; }
    @keyframes tactical-dictado-pulso{ 0%{opacity:1;} 50%{opacity:0.55;} 100%{opacity:1;} }
  `;
  document.head.appendChild(style);
})();
function tacticalInicializarDictado(){
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  document.querySelectorAll('.tactical-campo-dictado').forEach(campo => {
    campo.setAttribute('spellcheck', 'true');
    if(!RecognitionCtor || campo.dataset.dictadoListo) return;
    campo.dataset.dictadoListo = '1';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tactical-dictado-btn';
    btn.title = 'Dictar por voz (agrega al final de lo que ya está escrito)';
    btn.textContent = '🎤 Dictar por voz';
    campo.insertAdjacentElement('afterend', btn);

    const rec = new RecognitionCtor();
    rec.lang = 'es-CO';
    rec.continuous = false;
    rec.interimResults = false;
    let escuchando = false;

    btn.addEventListener('click', () => {
      if(escuchando){ rec.stop(); return; }
      try{ rec.start(); } catch(e){ /* ya estaba corriendo -- se ignora, onstart/onend resuelven el estado */ }
    });
    rec.onstart = () => { escuchando = true; btn.classList.add('escuchando'); btn.textContent = '🔴 Escuchando... (toca para detener)'; };
    rec.onend = () => { escuchando = false; btn.classList.remove('escuchando'); btn.textContent = '🎤 Dictar por voz'; };
    rec.onerror = (e) => {
      escuchando = false; btn.classList.remove('escuchando'); btn.textContent = '🎤 Dictar por voz';
      if(e.error !== 'no-speech' && e.error !== 'aborted') console.error('Error de dictado por voz:', e.error);
    };
    rec.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      const actual = campo.value;
      const necesitaEspacio = actual && !/[\s\n]$/.test(actual);
      campo.value = actual + (necesitaEspacio ? ' ' : '') + texto;
      campo.dispatchEvent(new Event('input', {bubbles:true}));
      campo.focus();
    };
  });
}
document.addEventListener('DOMContentLoaded', tacticalInicializarDictado);

/* ==========================================
   EDITAR COTIZACIÓN GUARDADA (Conde 2026-08-27): al editar y volver a guardar, NUNCA se pisa ni se
   borra la cotización original -- se crea una nueva con el mismo OT + una letra de versión ("OT-
   2608-34" -> "OT-2608-34-B" -> "...-C", etc.). Mismo criterio que ya usaba Cuadernos (Hub) para su
   propio cotOtBase/cotSiguienteSufijoOT -- se comparten acá con nombre distinto (prefijo "tactical")
   para que las 8 calculadoras los reusen sin duplicar la lógica, sin chocar con las funciones del
   Hub (que se queda con las suyas, intactas).
   ========================================== */
function tacticalCotOtBase(ot){
  const m = /^(.*)-([A-Z])$/.exec(ot||'');
  return m ? m[1] : (ot||'');
}
// Revisa TODAS las oportunidades (activas y cerradas) que compartan el mismo OT base, y devuelve la
// letra de versión siguiente a la más alta ya usada (empieza en "B" -- la original, sin letra, es
// implícitamente "A"). dbOpps/dbHistorial: los arrays db_opps/db_historial_cierres de la calculadora.
function tacticalCotSiguienteSufijoOT(otBase, dbOpps, dbHistorial){
  let maxCode = 'A'.charCodeAt(0);
  [...(dbOpps||[]), ...(dbHistorial||[])].forEach(o => {
    if(!o.ot || o.ot === otBase) return;
    const m = new RegExp('^' + otBase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '-([A-Z])$').exec(o.ot);
    if(m) maxCode = Math.max(maxCode, m[1].charCodeAt(0));
  });
  return String.fromCharCode(maxCode + 1);
}
