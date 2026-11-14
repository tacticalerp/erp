/* ============ VERSIÓN PROFESIONAL DEL DESGLOSE (compartido entre calculadoras) ============
   Conde 2026-11-13: "que en la versión profesional vea los insumos como aparece en Litoplan y que
   los pueda editar". Cada calculadora arma su desglose renglón por renglón con tacticalAvzCrear():
   cada renglón tiene cantidad, unidad, unitario y valor (igual que la tabla de Litoplan), y en la
   versión profesional se puede escribir un PRECIO UNITARIO distinto SOLO para esa cotización (sin
   porcentajes: Conde los quitó porque confunden). Los precios de lista no cambian (esos se editan
   en el Panel de Precios).

   Uso dentro del motor de una calculadora:
     const avz = tacticalAvzCrear(p.ajustes);
     const costoPapel = avz.linea('mat', 'Insumos', 'Papel ...', nPliegos, 'pliego', precioPliego);
     avz.total('Costo directo total', costoDirecto, 'tDirecto');
     avz.fijo('Fondo de Seguridad (7%, automático)', fondo, 'fondo');   // renglón que no se edita
     return { ..., lineas: avz.lineas, nAjustes: avz.nAjustes() };

   Los ajustes se guardan POR CANTIDAD (tacticalAvz.porCantidad[cantidad]) porque una misma
   cotización puede llevar hasta 3 cantidades y un descuento conseguido para 3.000 unidades no
   aplica a 1.000. tacticalAvz.ajustes apunta siempre a los de la cantidad que se está viendo. */
// Conde 2026-11-13 (auditoría): "Versión profesional" NO se recuerda de una herramienta a otra ni
// de una sesión a la siguiente -- si quedaba guardada en localStorage, la próxima persona que
// abriera cualquier calculadora en ese navegador (aunque fuera otro día) veía el desglose técnico
// completo sin haberlo pedido, justo lo que esta sesión buscaba evitar para quien no cotiza a
// fondo. Cada página arranca siempre en modo sencillo; el usuario la activa si la necesita, y solo
// para lo que calcule de ahí en adelante en esa misma página.
window.tacticalAvz = { ajustes:{}, porCantidad:{}, profesional:false, cmpEditando:null, abierto:false, notasAbiertas:{} };

function tacticalAvzAjustesDe(cantidad){
  const P = window.tacticalAvz.porCantidad, k = String(cantidad);
  if(!P[k]) P[k] = {};
  return P[k];
}
// La página lo llama antes de calcular: deja tacticalAvz.ajustes apuntando a los de esa cantidad.
function tacticalAvzUsarCantidad(cantidad){ window.tacticalAvz.ajustes = tacticalAvzAjustesDe(cantidad); return window.tacticalAvz.ajustes; }
function tacticalAvzCopiaAjustes(cantidad){ return JSON.parse(JSON.stringify(cantidad!=null ? tacticalAvzAjustesDe(cantidad) : window.tacticalAvz.ajustes)); }
function tacticalAvzCargarAjustes(ajustes, cantidad){
  const copia = JSON.parse(JSON.stringify(ajustes || {}));
  if(cantidad!=null){ window.tacticalAvz.porCantidad[String(cantidad)] = copia; }
  window.tacticalAvz.ajustes = copia;
}
function tacticalAvzReiniciar(){ window.tacticalAvz.porCantidad = {}; window.tacticalAvz.ajustes = {}; }

function tacticalAvzCrear(ajustes){
  const aj = ajustes || {};
  const lineas = [];
  return {
    lineas,
    // Renglón editable. valorForzado: cuando el valor no es cantidad x unitario exacto (ej. un mínimo por trabajo).
    linea(id, grupo, concepto, cantidad, unidad, unitario, valorForzado){
      const l = {tipo:'linea', id, grupo, concepto, cantidad, unidad, unitario, valor:(valorForzado!=null ? valorForzado : cantidad*unitario)};
      l.base = l.valor; l.unitarioBase = l.unitario;
      const a = aj[id];
      if(a && a.valor!=null && !isNaN(a.valor)){
        if(a.tipo==='pct'){ l.valor = l.base*(1+a.valor/100); l.unitario = l.cantidad ? l.valor/l.cantidad : l.valor; }   // compatibilidad con cotizaciones guardadas antes de quitar el %
        else { l.unitario = a.valor; l.valor = l.cantidad*a.valor; }
        l.ajustado = true; l.ajuste = a;
      }
      lineas.push(l);
      return l.valor;
    },
    fijo(concepto, valor, id){ lineas.push({tipo:'fijo', id:id||concepto, concepto, valor}); return valor; },
    total(concepto, valor, id){ lineas.push({tipo:'total', id:id||concepto, concepto, valor}); return valor; },
    nAjustes(){ return lineas.filter(l => l.ajustado).length; },
  };
}

function tacticalAvzEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function tacticalAvzCop(n){ return "$" + Math.round(n).toLocaleString("es-CO"); }
function tacticalAvzNum(n){ return (Math.round(n*100)/100).toLocaleString('es-CO'); }

// Conde 2026-11-13: "que los datos queden en un acordeón que se expanda al hacer clic pero que no
// se visualicen de inmediato, pues esa información confunde a los que no saben a profundidad de
// cotizar" -- aplica a TODAS las calculadoras (comparten esta función). Siempre visibles: el
// interruptor "Versión profesional" y el aviso de ajustes; la tabla del desglose (sencilla o
// profesional) queda dentro de un <details> cerrado por defecto. Al activar la versión profesional
// se abre solo, porque para eso se activó; el usuario puede cerrarlo otra vez si quiere.
function tacticalAvzHtml(lineas){
  const pro = window.tacticalAvz.profesional;
  const nAj = (lineas||[]).filter(l => l.ajustado).length;
  const E = tacticalAvzEsc, C = tacticalAvzCop;
  let h = `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:8px 0 4px;">
    <label style="font-weight:600; color:var(--azul,#1e3a5f); cursor:pointer; margin:0;"><input type="checkbox"${pro?' checked':''} onchange="tacticalAvzToggle(this.checked)" style="margin-right:6px;">Versión profesional <span title="Ver insumos con cantidad y unitario, y editar precios." style="cursor:help; font-weight:normal; color:var(--texto-suave,#5a6472);">ⓘ</span></label>
    ${nAj>0 ? `<span style="color:#b45309; font-weight:600;">${nAj} renglón(es) ajustado(s) a mano</span> <button type="button" data-ui="cancel" onclick="tacticalAvzRestablecerTodo()">Quitar ajustes</button>` : ''}
    ${pro ? `<span title="Los ajustes aplican solo a esta cotización y a esta cantidad, y se guardan con ella. Los precios de lista se cambian en el Panel de Precios." style="cursor:help; color:var(--texto-suave,#5a6472); font-size:0.78rem;">ⓘ Sobre estos ajustes</span>` : ''}
  </div>`;
  h += `<details id="tactical-avz-detalle"${window.tacticalAvz.abierto?' open':''} ontoggle="window.tacticalAvz.abierto=this.open" style="margin-top:4px;">
    <summary style="cursor:pointer; font-weight:600; color:var(--azul,#1e3a5f);">Ver el desglose de costos</summary>
    <div style="margin-top:8px;">${tacticalAvzTablaHtml(lineas, pro)}</div>
  </details>`;
  return h;
}
function tacticalAvzTablaHtml(lineas, pro){
  const E = tacticalAvzEsc, C = tacticalAvzCop;
  const claseTabla = (window.tacticalCantCfg && window.tacticalCantCfg.claseTabla) || 'resultado-tabla';
  let h = `<div style="overflow-x:auto;"><table class="${claseTabla} tactical-avz-tabla"${pro?' style="font-size:0.82rem;"':''}>`;
  if(pro) h += `<tr style="font-weight:bold;"><td>Insumo / proceso</td><td class="num">Cantidad</td><td class="num">Unitario</td><td class="num">Valor</td><td class="num" title="Escribe un precio unitario distinto solo para esta cotización">Nuevo unitario</td><td></td></tr>`;
  const cols = pro ? 6 : 2;
  let grupo = null;
  // En la versión profesional los renglones se juntan por grupo (Insumos, Procesos, Generales) dentro
  // de cada tramo entre totales, para que no se repitan los títulos de grupo.
  let ordenadas = lineas || [];
  if(pro){
    ordenadas = [];
    let tramo = [];
    const cerrarTramo = () => {
      const grupos = [];
      tramo.filter(x => x.tipo==='linea').forEach(x => { if(!grupos.includes(x.grupo)) grupos.push(x.grupo); });
      grupos.forEach(g => tramo.filter(x => x.tipo==='linea' && x.grupo===g).forEach(x => ordenadas.push(x)));
      tramo.filter(x => x.tipo!=='linea').forEach(x => ordenadas.push(x));
      tramo = [];
    };
    (lineas||[]).forEach(x => { if(x.tipo==='total'){ cerrarTramo(); ordenadas.push(x); } else tramo.push(x); });
    cerrarTramo();
  }
  ordenadas.forEach(l => {
    if(l.tipo==='total'){
      h += pro ? `<tr class="sub" style="font-weight:bold;"><td colspan="3">${E(l.concepto)}</td><td class="num">${C(l.valor)}</td><td colspan="2"></td></tr>`
               : `<tr class="sub" style="font-weight:bold;"><td>${E(l.concepto)}</td><td class="num">${C(l.valor)}</td></tr>`;
      grupo = null; return;
    }
    if(l.tipo==='fijo'){
      h += pro ? `<tr><td colspan="3">${E(l.concepto)}</td><td class="num">${C(l.valor)}</td><td colspan="2"></td></tr>`
               : `<tr><td>${E(l.concepto)}</td><td class="num">${C(l.valor)}</td></tr>`;
      return;
    }
    if(pro && l.grupo!==grupo){ grupo = l.grupo; h += `<tr class="detalle"><td colspan="${cols}" style="font-weight:600;">${E(grupo)}</td></tr>`; }
    const marca = l.ajustado ? ` <span style="color:#b45309; font-weight:600;">(ajustado)</span>` : '';
    const fondo = l.ajustado ? ' style="background:#fff7e6;"' : '';
    if(!pro){
      h += `<tr${fondo}><td>${E(l.concepto)}${marca}</td><td class="num">${l.ajustado?`<s style="color:var(--texto-suave,#5a6472);">${C(l.base)}</s> `:''}${C(l.valor)}</td></tr>`;
      return;
    }
    const a = l.ajuste;
    // Conde 2026-11-13: "que la ventana de motivo del ajuste se expanda solo si se necesita, por lo
    // demás que esté oculta" -- el campo de texto queda escondido por defecto; un enlace pequeño lo
    // abre. Si ya hay un motivo guardado, se ve como texto corto junto a "(ajustado)" sin necesidad
    // de abrir nada; el enlace cambia a "editar motivo" para poder corregirlo.
    const notaTexto = (l.ajustado && a && a.nota || '').trim();
    const notaAbierta = !!window.tacticalAvz.notasAbiertas[l.id];
    const notaPreview = notaTexto ? ` <span style="color:var(--texto-suave,#5a6472); font-weight:normal; font-size:11px;">— ${E(notaTexto)}</span>` : '';
    // Conde 2026-11-13: "quita 1 trabajo pues siempre será 1 trabajo, sobra la palabra" -- cuando la
    // cantidad es 1 y la unidad es "trabajo" (el caso de casi todos los procesos y generales) no
    // aporta nada verlo escrito; si la unidad es otra (pliego, clic, millar, envío...) sí se muestra,
    // porque ahí la cantidad y la unidad sí son información real.
    const cantidadTexto = (l.cantidad===1 && l.unidad==='trabajo') ? '' : `${tacticalAvzNum(l.cantidad)} <span style="color:var(--texto-suave,#5a6472);">${E(l.unidad)}</span>`;
    h += `<tr${fondo}>
      <td>${E(l.concepto)}${marca}${notaPreview}</td>
      <td class="num">${cantidadTexto}</td>
      <td class="num">${l.ajustado?`<s style="color:var(--texto-suave,#5a6472);">${C(l.unitarioBase)}</s> `:''}${C(l.unitario)}</td>
      <td class="num">${l.ajustado?`<s style="color:var(--texto-suave,#5a6472);">${C(l.base)}</s> `:''}<strong>${C(l.valor)}</strong></td>
      <td class="num"><input type="number" style="width:96px;" value="${a&&a.tipo!=='pct'?a.valor:''}" placeholder="$" onchange="tacticalAvzAjustar('${l.id}',this.value)"></td>
      <td style="white-space:nowrap;">${l.ajustado?`<button type="button" data-ui="none" title="Volver al precio de lista" onclick="tacticalAvzRestablecer('${l.id}')" style="padding:2px 8px;">↺</button> <button type="button" data-ui="none" title="${notaAbierta?'Ocultar motivo':(notaTexto?'Editar motivo':'Agregar motivo')}" onclick="tacticalAvzToggleNota('${l.id}')" style="padding:2px 6px; font-size:11px;">✎</button>`:''}</td>
    </tr>`;
    if(l.ajustado && notaAbierta){
      h += `<tr style="background:#fff7e6;"><td colspan="${cols}"><input type="text" style="width:100%; box-sizing:border-box; font-size:0.8rem;" placeholder="Motivo del ajuste (opcional, ej. tinta especial, descuento del proveedor)" value="${E(notaTexto)}" oninput="tacticalAvzNota('${l.id}',this.value)"></td></tr>`;
    }
  });
  h += `</table></div>`;
  return h;
}

function tacticalAvzRecalcular(){
  const c = window.tacticalCantCfg;
  if(c && c.recalcular) return c.recalcular();
  if(typeof calcular === 'function') calcular(true);
}
function tacticalAvzToggle(activo){
  window.tacticalAvz.profesional = !!activo;
  if(activo) window.tacticalAvz.abierto = true;   // se activó para ver el detalle: abrir el acordeón de una vez
  tacticalAvzRecalcular();
}
function tacticalAvzAjustar(id, valor){
  const v = parseFloat(valor), A = window.tacticalAvz.ajustes;
  if(valor==='' || isNaN(v) || v<0) delete A[id];
  else A[id] = {tipo:'unit', valor:v, nota:(A[id] && A[id].nota) || ''};
  tacticalAvzRecalcular();
}
// La nota no cambia el cálculo: se guarda en el estado y en los parámetros de la última cotización calculada, sin redibujar (para no perder el foco al escribir).
function tacticalAvzNota(id, nota){
  const A = window.tacticalAvz.ajustes;
  if(A[id]) A[id].nota = nota;
  const pUlt = (typeof tacticalCantEst === 'function') ? tacticalCantEst().p : null;
  if(pUlt && pUlt.ajustes && pUlt.ajustes[id]) pUlt.ajustes[id].nota = nota;
}
function tacticalAvzRestablecer(id){ delete window.tacticalAvz.ajustes[id]; tacticalAvzRecalcular(); }
function tacticalAvzRestablecerTodo(){ Object.keys(window.tacticalAvz.ajustes).forEach(k => delete window.tacticalAvz.ajustes[k]); tacticalAvzRecalcular(); }
function tacticalAvzToggleNota(id){ window.tacticalAvz.notasAbiertas[id] = !window.tacticalAvz.notasAbiertas[id]; tacticalAvzRecalcular(); }

/* ---- INSUMOS EXTRA (ítems personalizados que el usuario anexa) ----
   Conde 2026-11-13: "que en el modo profesional pueda anexar item y los pueda personalizar
   completamente y que esos item aparezcan como adicionales en la orden de producción ej. carátula
   estampada 2 clisé de 40.000, y 2 tirajes de estampado de 100.000, esto reemplazaría todos donde
   esté la opción de extra, se suprime esa ventana". Conde: "esos extra son un insumo más, se
   programan igual que el papel, la impresión o cualquier otro insumo de fabricación, así lo
   trabajo en Litoplan" -- por eso NO es un cargo aparte con su propio IVA como el viejo "Extra al
   cliente": entra al costo directo como cualquier otro renglón (avz.linea), se marca con la
   utilidad/comisión de siempre, y por lo mismo aparece en la tabla de insumos (versión
   profesional) y en la Orden de Producción -- nunca como línea aparte del PDF del cliente.
   Siempre disponible (no hace falta activar "Versión profesional" para usarlo; ver
   tacticalAvzExtrasMontar). Uso dentro del motor de una calculadora:
     let costoExtras = 0;
     (p.extras||[]).forEach((ex,i) => costoExtras += avz.linea('extra'+i, 'Procesos', ex.desc, ex.cantidad, ex.unidad||'u', ex.unitario));
     const costoDirecto = ... + costoExtras;
   Al leer los params: extras: tacticalAvzExtrasLeer(). Al recargar una cotización guardada (editar
   o duplicar): tacticalAvzExtrasCargar(p.extras). */
window.tacticalAvz.extras = [];
window.tacticalAvz.extrasContId = null;
let tacticalAvzExtrasSeq = 0;
function tacticalAvzExtrasHtml(){
  const E = tacticalAvzEsc;
  const filas = window.tacticalAvz.extras.map(e => `
    <div class="fila" style="margin-top:6px;">
      <div class="campo" style="flex:2;"><input type="text" placeholder="Descripción (ej. Clisé de estampado)" value="${E(e.desc)}" oninput="tacticalAvzExtraEditar('${e.id}','desc',this.value)"></div>
      <div class="campo chico"><input type="number" placeholder="Cant." min="0" value="${e.cantidad||''}" oninput="tacticalAvzExtraEditar('${e.id}','cantidad',this.value)"></div>
      <div class="campo chico"><input type="number" placeholder="Valor unitario" value="${e.unitario||''}" oninput="tacticalAvzExtraEditar('${e.id}','unitario',this.value)"></div>
      <button type="button" data-ui="none" title="Quitar" onclick="tacticalAvzExtraQuitar('${e.id}')" style="padding:4px 10px; align-self:center;">✕</button>
    </div>`).join('');
  return `<div style="margin-top:10px; border-top:1px solid var(--borde); padding-top:8px;">
    <label style="font-weight:600; font-size:0.85rem;">Insumos extra <span title="Algo puntual que no está en el catálogo (clisés, estampado, troquel especial, etc.) -- se cobra y se marca igual que cualquier otro insumo de fabricación, y sale en la Orden de Producción." style="cursor:help; font-weight:normal; color:var(--texto-suave,#5a6472);">ⓘ</span></label>
    <div>${filas}</div>
    <button type="button" data-ui="none" onclick="tacticalAvzExtraAgregar()" style="margin-top:6px;">+ Agregar insumo extra</button>
  </div>`;
}
function tacticalAvzExtrasRedibujar(){
  const cont = window.tacticalAvz.extrasContId && document.getElementById(window.tacticalAvz.extrasContId);
  if(cont) cont.innerHTML = tacticalAvzExtrasHtml();
}
function tacticalAvzExtrasMontar(contId){
  window.tacticalAvz.extrasContId = contId;
  window.tacticalAvz.extras = [];
  tacticalAvzExtrasRedibujar();
}
function tacticalAvzExtraAgregar(){
  window.tacticalAvz.extras.push({id:'avzex'+(++tacticalAvzExtrasSeq), desc:'', cantidad:1, unitario:0});
  tacticalAvzExtrasRedibujar();
}
function tacticalAvzExtraQuitar(id){
  window.tacticalAvz.extras = window.tacticalAvz.extras.filter(e => e.id!==id);
  tacticalAvzExtrasRedibujar();
}
// No redibuja la lista al escribir (perdería el foco) -- solo al agregar/quitar/cargar.
function tacticalAvzExtraEditar(id, campo, valor){
  const e = window.tacticalAvz.extras.find(x => x.id===id);
  if(!e) return;
  e[campo] = (campo==='cantidad'||campo==='unitario') ? (parseFloat(valor)||0) : valor;
}
function tacticalAvzExtrasLeer(){
  return window.tacticalAvz.extras.filter(e => e.cantidad>0 && (e.desc||'').trim()).map(e => ({desc:e.desc.trim(), cantidad:e.cantidad, unitario:e.unitario}));
}
function tacticalAvzExtrasCargar(lista){
  window.tacticalAvz.extras = (lista||[]).map(e => ({id:'avzex'+(++tacticalAvzExtrasSeq), desc:e.desc||'', cantidad:e.cantidad||1, unitario:e.unitario||0}));
  tacticalAvzExtrasRedibujar();
}

/* ---- LISTA DE INSUMOS PARA LA ORDEN DE PRODUCCIÓN ----
   Conde 2026-11-13: "es indispensable tener el listado de insumos para la orden de producción".
   Sale del mismo desglose: insumos y procesos con su cantidad y unidad, SIN precios (la OP la ve
   producción). Los costos generales (diseño, sherpa, transporte) no son insumos y no se listan. */
function tacticalAvzInsumos(lineas){
  return (lineas||[]).filter(l => l.tipo==='linea' && l.grupo!=='Generales' && l.cantidad>0)
    .map(l => ({grupo:l.grupo, concepto:l.concepto, cantidad:Math.round(l.cantidad*100)/100, unidad:l.unidad}));
}
function tacticalAvzInsumosTextos(insumos){
  return (insumos||[]).map(i => `${tacticalAvzEsc(i.concepto)}: <strong>${tacticalAvzNum(i.cantidad)} ${tacticalAvzEsc(i.unidad)}</strong>`);
}
// Bloque listo para tacticalOPDocumentoHtml (null si no hay insumos).
function tacticalAvzBloqueInsumosOP(lineas){
  const ins = tacticalAvzInsumos(lineas);
  return ins.length ? { titulo:'Insumos y procesos de esta orden (cantidades a pedir o programar)', lineasTexto: tacticalAvzInsumosTextos(ins) } : null;
}
// Para la OP que arma el Hub desde la ficha del Kanban (recibe la lista ya guardada en la ficha).
// Bloque completo (con título) para órdenes de producción que se arman como HTML directo (Cuadernos en el Hub).
function tacticalAvzInsumosOPBloqueHtml(lineas){
  const ins = tacticalAvzInsumos(lineas);
  if(!ins.length) return '';
  const F = (typeof TACTICAL_OP_FONT_SIZE!=='undefined') ? TACTICAL_OP_FONT_SIZE : '12px';
  return `<div style="border:1px solid #d7dee5; border-radius:3px; padding:4px 9px; margin-bottom:6px; break-inside:avoid; font-size:${F};">
    <div style="font-weight:bold;">Insumos y procesos de esta orden (cantidades a pedir o programar)</div>
    ${tacticalAvzInsumosTextos(ins).map(t => `<div style="color:#4a5568; line-height:1.25;">${t}</div>`).join('')}</div>`;
}
function tacticalAvzInsumosOPHtml(insumos){
  if(!insumos || !insumos.length) return '';
  return `<div style="margin-top:3px; padding-top:3px; border-top:1px dashed #d7dee5; color:#4a5568; line-height:1.3;"><strong>Insumos y procesos:</strong> ${tacticalAvzInsumosTextos(insumos).join(' · ')}</div>`;
}

/* ---- VENTANA PARA COMPARAR CANTIDADES ----
   Conde 2026-11-13: "en una sola imagen ver todos los insumos para 1.000, 2.000 y 3.000 unidades,
   con división por filas de color; toco el insumo de 3.000 y lo modifico porque obtuve un descuento
   por esa cantidad". Una columna por cantidad; cada celda se edita por separado (precio unitario).
   La página define window.tacticalAvzCompararDatos(), que recalcula y devuelve:
     { titulo, subtitulo, columnas:[{cantidad, lineas, resumen:[{label, valor, fuerte}]}],
       accionTexto, accionFn }   // accionFn: nombre de la función global del botón principal */
const TACTICAL_AVZ_COLOR_GRUPO = { Insumos:'#e6f4ee', Procesos:'#eeedfb', Generales:'#f1f1ee' };
function tacticalAvzCompararAbrir(){
  let ov = document.getElementById('tactical-avz-cmp');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'tactical-avz-cmp';
    ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:99990; display:flex; align-items:flex-start; justify-content:center; padding:24px 12px; overflow:auto;';
    ov.addEventListener('mousedown', e => { if(e.target===ov) tacticalAvzCompararCerrar(); });
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  window.tacticalAvz.cmpEditando = null;
  tacticalAvzCompararRender();
}
function tacticalAvzCompararCerrar(){
  const ov = document.getElementById('tactical-avz-cmp');
  if(ov) ov.style.display = 'none';
  window.tacticalAvz.cmpEditando = null;
  tacticalAvzRecalcular();   // la vista principal queda al día con lo que se haya ajustado
}
function tacticalAvzCompararRender(){
  const ov = document.getElementById('tactical-avz-cmp');
  if(!ov || ov.style.display==='none' || typeof window.tacticalAvzCompararDatos!=='function') return;
  const E = tacticalAvzEsc, C = tacticalAvzCop;
  let d;
  try{ d = window.tacticalAvzCompararDatos(); }
  catch(err){ ov.innerHTML = `<div style="background:#fff; border-radius:8px; padding:20px; max-width:520px;">No se pudo calcular: ${E(err.message)}<br><br><button type="button" onclick="tacticalAvzCompararCerrar()">Cerrar</button></div>`; return; }
  const cols = d.columnas || [];
  // Filas: todos los renglones que aparezcan en alguna cantidad, en el orden de la primera donde salen.
  const claves = [];
  cols.forEach(c => { let prev = -1; (c.lineas||[]).forEach(l => { const i = claves.indexOf(l.id); if(i<0){ claves.splice(prev+1, 0, l.id); prev = prev+1; } else prev = i; }); });
  const nAj = cols.reduce((a,c) => a + (c.lineas||[]).filter(l => l.ajustado).length, 0);
  const anchoCol = Math.floor(62/Math.max(cols.length,1));
  let h = `<div style="background:#fff; border-radius:10px; width:100%; max-width:${cols.length>2?1040:860}px; padding:16px 18px; box-shadow:0 10px 40px rgba(0,0,0,0.3); font-size:13px; color:#1a202c;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:6px;">
      <div><div style="font-size:16px; font-weight:700; color:#1e3a5f;">${E(d.titulo||'Comparar cantidades')}</div><div style="color:#5a6472; font-size:12px;">${E(d.subtitulo||'')} Toca un valor para cambiar su precio unitario solo en esa cantidad.</div></div>
      <div style="display:flex; gap:8px; align-items:center; flex-shrink:0;">
        ${nAj>0 ? `<button type="button" data-ui="cancel" onclick="tacticalAvzCompararQuitarAjustes()">Quitar ajustes (${nAj})</button>` : ''}
        <button type="button" data-ui="cancel" onclick="tacticalAvzCompararCerrar()">Cerrar</button>
      </div>
    </div>
    <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:11px; color:#5a6472; margin-bottom:6px;">
      ${Object.keys(TACTICAL_AVZ_COLOR_GRUPO).map(g => `<span><span style="display:inline-block; width:10px; height:10px; background:${TACTICAL_AVZ_COLOR_GRUPO[g]}; border:1px solid #cbd5e0; margin-right:4px;"></span>${g}</span>`).join('')}
      <span><span style="display:inline-block; width:10px; height:10px; background:#fff3cd; border:1px solid #f0d98c; margin-right:4px;"></span>Ajustado a mano</span>
    </div>
    <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
      <colgroup><col style="width:38%">${cols.map(()=>`<col style="width:${anchoCol}%">`).join('')}</colgroup>
      <tr><th style="text-align:left; padding:6px 8px; border-bottom:2px solid #1e3a5f;">Insumo o proceso</th>${cols.map(c => `<th style="text-align:right; padding:6px 8px; border-bottom:2px solid #1e3a5f;">${Number(c.cantidad).toLocaleString('es-CO')} u.</th>`).join('')}</tr>`;
  const celda = 'padding:5px 8px; border-bottom:1px solid #e2e8f0; vertical-align:top;';
  claves.forEach(id => {
    const porCol = cols.map(c => (c.lineas||[]).find(l => l.id===id) || null);
    const ref = porCol.find(Boolean);
    if(ref.tipo!=='linea'){
      const fuerte = ref.tipo==='total';
      h += `<tr style="background:${fuerte?'#eef2f7':'#fff'}; ${fuerte?'font-weight:700;':''}"><td style="${celda}">${E(ref.concepto.replace(/\s*\([^)]*%[^)]*\)/,''))}</td>${porCol.map(l => `<td style="${celda} text-align:right;">${l?C(l.valor):''}</td>`).join('')}</tr>`;
      return;
    }
    h += `<tr style="background:${TACTICAL_AVZ_COLOR_GRUPO[ref.grupo]||'#eaf2fb'};"><td style="${celda}">${E(ref.concepto)}</td>`;
    porCol.forEach((l, k) => {
      if(!l){ h += `<td style="${celda} text-align:right; color:#a0aec0;">no aplica</td>`; return; }
      const clave = id+'|'+cols[k].cantidad;
      if(window.tacticalAvz.cmpEditando===clave){
        h += `<td style="${celda} text-align:right; background:#fff;"><input type="number" id="tactical-avz-cmp-input" value="${Math.round(l.unitario*100)/100}" style="width:100%; box-sizing:border-box; text-align:right;" aria-label="Nuevo precio unitario">
          <div style="font-size:11px; color:#5a6472;">precio por ${E(l.unidad)} · Enter para aplicar</div></td>`;
        return;
      }
      const distinto = l.concepto!==ref.concepto ? `<div style="font-size:11px; color:#5a6472;">${E(l.concepto)}</div>` : '';
      h += `<td style="${celda} text-align:right; cursor:pointer;${l.ajustado?' background:#fff3cd;':''}" title="Tocar para cambiar el precio unitario" onclick="tacticalAvzCompararEditar('${id}','${cols[k].cantidad}')">
        <strong>${C(l.valor)}</strong>
        <div style="font-size:11px; color:#5a6472;">${tacticalAvzNum(l.cantidad)} ${E(l.unidad)} x ${l.ajustado?`<s>${C(l.unitarioBase)}</s> `:''}${C(l.unitario)}</div>${distinto}</td>`;
    });
    h += `</tr>`;
  });
  const etiquetas = [];
  cols.forEach(c => (c.resumen||[]).forEach(x => { if(!etiquetas.includes(x.label)) etiquetas.push(x.label); }));
  etiquetas.forEach(lb => {
    const fila = cols.map(c => (c.resumen||[]).find(x => x.label===lb) || null);
    const fuerte = fila.some(x => x && x.fuerte);
    h += `<tr style="${fuerte?'font-weight:700; color:#b91c1c; font-size:14px;':'font-weight:600;'}"><td style="${celda}">${E(lb)}</td>${fila.map(x => `<td style="${celda} text-align:right;">${x?C(x.valor):''}</td>`).join('')}</tr>`;
  });
  h += `</table>
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
      ${d.accionFn ? `<button type="button" data-ui="ok" onclick="${d.accionFn}()">${E(d.accionTexto||'Guardar')}</button>` : ''}
    </div></div>`;
  ov.innerHTML = h;
  const inp = document.getElementById('tactical-avz-cmp-input');
  if(inp){
    inp.focus(); inp.select();
    let hecho = false;
    const aplicar = () => { if(hecho) return; hecho = true; tacticalAvzCompararAplicar(inp.value); };
    inp.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); aplicar(); } else if(e.key==='Escape'){ hecho = true; window.tacticalAvz.cmpEditando = null; tacticalAvzCompararRender(); } });
    inp.addEventListener('blur', aplicar);
  }
}
function tacticalAvzCompararEditar(id, cantidad){ window.tacticalAvz.cmpEditando = id+'|'+cantidad; tacticalAvzCompararRender(); }
function tacticalAvzCompararAplicar(valor){
  const ed = window.tacticalAvz.cmpEditando; if(!ed) return;
  const corte = ed.lastIndexOf('|'), id = ed.slice(0, corte), cantidad = ed.slice(corte+1);
  const A = tacticalAvzAjustesDe(cantidad), v = parseFloat(valor);
  if(valor==='' || isNaN(v) || v<0) delete A[id];
  else A[id] = {tipo:'unit', valor:v, nota:(A[id] && A[id].nota) || ''};
  window.tacticalAvz.cmpEditando = null;
  // Si el precio escrito es el mismo de lista, no queda marcado como ajuste.
  try{
    const d = window.tacticalAvzCompararDatos();
    const col = (d.columnas||[]).find(c => String(c.cantidad)===String(cantidad));
    const l = col && (col.lineas||[]).find(x => x.id===id);
    if(l && l.ajustado && Math.abs(l.unitario - l.unitarioBase) < 0.005) delete A[id];
  }catch(e){}
  tacticalAvzCompararRender();
}
function tacticalAvzCompararQuitarAjustes(){
  try{ (window.tacticalAvzCompararDatos().columnas||[]).forEach(c => { const A = tacticalAvzAjustesDe(c.cantidad); Object.keys(A).forEach(k => delete A[k]); }); }catch(e){}
  tacticalAvzCompararRender();
}

/* ============ HASTA 3 CANTIDADES EN UNA COTIZACIÓN (genérico, Conde 2026-11-13) ============
   Cada cantidad se calcula completa por separado (su propia máquina, merma, transporte y descuentos
   por volumen) y tiene sus propios ajustes de precio. Al guardar sale UN PDF con una sola
   descripción del producto y una tabla de cantidades y precios, y queda en el CRM como cotización de
   varias opciones (opcionesComparativa): así el Hub pregunta cuál cantidad aprobó el cliente al
   marcarla como Ganada. También se guarda el desglose para poder reabrirla con "editar cotización".

   Cada calculadora define:
     window.tacticalCantCfg = {
       linea: 'rompecabezas',
       cotizar: p => resultado,                       // el motor de la calculadora
       paramsPara: (p, cantidad, pBase) => p,          // opcional: ajustar parámetros que dependen de la cantidad
       tituloComun: (p, r) => 'Rompecabezas de 10 x 10 cm',   // nombre corto del producto, SIN la cantidad
       fichaTecnica: (p, r) => ({maquina, material, nPliegos, planoCorte, recomendaciones}),
       paramsGuardar: p => p,                         // opcional: completar lo que se guarda para reabrir la cotización
       // Solo si la página no usa los nombres estándar de las calculadoras (caso de Cuadernos en el Hub):
       estado: () => ({p, r}),        // última cotización calculada (por defecto ultimoParams / ultimoResultado)
       recalcular: () => {...},       // por defecto calcular(true)
       ids: {cant2, cant3, empresa, encargado, telefono, correo, tipo, identificacion, vendedor, desc},
       fn: {siguienteOT, otBase, sufijo, editandoId, editandoOt, cancelarEdicion, condiciones, plazo, foto, video, mayusculas, guardarDesglose, despues},
       claseTabla: 'doc-table',
     };
   y tiene en el formulario los campos de cantidad 2 y 3 (in-cantidad2 / in-cantidad3 por defecto). */
function tacticalCantEst(){
  const c = window.tacticalCantCfg || {};
  if(c.estado) return c.estado();
  return { p: (typeof ultimoParams!=='undefined') ? ultimoParams : null, r: (typeof ultimoResultado!=='undefined') ? ultimoResultado : null };
}
function tacticalCantId(k){
  const d = {cant2:'in-cantidad2', cant3:'in-cantidad3', empresa:'in-cli-empresa', encargado:'in-cli-encargado', telefono:'in-cli-telefono', correo:'in-cli-correo',
    tipo:'in-cli-tipo', identificacion:'in-cli-identificacion', vendedor:'in-vendedor', desc:'in-descCliente'};
  const c = window.tacticalCantCfg || {};
  return (c.ids && c.ids[k]) || d[k];
}
function tacticalCantLeer(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  return parseInt(String(el.value||'').replace(/\D/g,''), 10) || 0;
}
function tacticalCantExtra(){
  const p = tacticalCantEst().p;
  if(!p) return [];
  const out = [];
  ['cant2','cant3'].forEach(k => { const c = tacticalCantLeer(tacticalCantId(k)); if(c>0 && c!==p.cantidad && !out.includes(c)) out.push(c); });
  return out;
}
function tacticalCantParams(c){
  const cfg = window.tacticalCantCfg, base = tacticalCantEst().p;
  const p = {...base, cantidad:c, ajustes: tacticalAvzCopiaAjustes(c)};
  return (cfg.paramsPara && c!==base.cantidad) ? cfg.paramsPara(p, c, base) : p;
}
function tacticalCantColumnas(){
  const cfg = window.tacticalCantCfg, base = tacticalCantEst().p;
  if(!cfg || !base) return [];
  return [base.cantidad, ...tacticalCantExtra()].sort((a,b) => a-b).map(c => { const p = tacticalCantParams(c); return {cantidad:c, p, r:cfg.cotizar(p)}; });
}
// Se llama al final de calcular(): si hay más de una cantidad agrega el resumen de precios y los botones.
function tacticalCantRender(cont){
  const cfg = window.tacticalCantCfg;
  if(!cfg || tacticalCantExtra().length===0) return;
  let cols;
  try{ cols = tacticalCantColumnas(); } catch(err){ cont.insertAdjacentHTML('beforeend', `<div class="error-box" style="color:#b91c1c;">No se pudieron calcular las otras cantidades: ${tacticalAvzEsc(err.message)}</div>`); return; }
  const C = tacticalAvzCop;
  let h = `<div style="margin-top:12px; padding:10px 12px; border:1px solid var(--borde,#d7dee5); border-radius:6px; background:#f8fafc;">
    <div style="font-weight:700; color:var(--azul,#1e3a5f); margin-bottom:6px;">Precios por cantidad</div>
    <table class="${cfg.claseTabla||'resultado-tabla'} tactical-avz-tabla"><tr style="font-weight:bold;"><td>Cantidad</td><td class="num">Unitario (sin IVA)</td><td class="num">Total (sin IVA)</td></tr>`;
  cols.forEach(c => { h += `<tr><td>${c.cantidad.toLocaleString('es-CO')} unidades${c.r.nAjustes>0?` <span style="color:#b45309;">(${c.r.nAjustes} ajuste(s))</span>`:''}</td><td class="num">${C(c.r.precioVentaUnitario)}</td><td class="num">${C(c.r.precioVentaTotal)}</td></tr>`; });
  h += `</table>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
      <button type="button" class="btn-action" data-ui="none" onclick="tacticalAvzCompararAbrir()">Comparar insumos de las ${cols.length} cantidades</button>
      <button type="button" class="btn-action" data-ui="ok" onclick="tacticalCantGuardar()">Guardar y generar PDF con las ${cols.length} cantidades</button>
    </div></div>`;
  cont.insertAdjacentHTML('beforeend', h);
}
window.tacticalAvzCompararDatos = function(){
  const cfg = window.tacticalCantCfg, cols = tacticalCantColumnas();
  return {
    titulo: 'Comparar cantidades', subtitulo: cols[0] ? cfg.tituloComun(cols[0].p, cols[0].r)+'.' : '',
    columnas: cols.map(c => ({ cantidad:c.cantidad, lineas:c.r.lineas, resumen:[
      {label:'Precio de venta (sin IVA)', valor:c.r.precioVentaTotal},
      {label:'Precio unitario (sin IVA)', valor:c.r.precioVentaUnitario, fuerte:true},
    ]})),
    accionTexto: `Guardar y generar PDF con las ${cols.length} cantidades`, accionFn: 'tacticalCantGuardar',
  };
};
// Parámetros a guardar: los de la cantidad principal + las otras cantidades y los ajustes de cada una.
function tacticalCantParamsGuardar(p){
  return {...p, cantidadesExtra: tacticalCantExtra(), ajustesPorCantidad: JSON.parse(JSON.stringify(window.tacticalAvz.porCantidad))};
}
// Al reabrir una cotización guardada: vuelven las cantidades 2 y 3 y los ajustes de cada cantidad.
function tacticalCantCargar(p){
  tacticalAvzReiniciar();
  if(p.ajustesPorCantidad) window.tacticalAvz.porCantidad = JSON.parse(JSON.stringify(p.ajustesPorCantidad));
  else tacticalAvzCargarAjustes(p.ajustes, p.cantidad);
  const extra = p.cantidadesExtra || [];
  ['cant2','cant3'].forEach((k,i) => { const el = document.getElementById(tacticalCantId(k)); if(el) el.value = extra[i] ? Number(extra[i]).toLocaleString('es-CO') : ''; });
  tacticalAvzSincronizarCantidadesExtra();   // si esta cotización trae otras cantidades, mostrarlas (no quedan ocultas detrás del enlace)
}
// PDF de varias cantidades: UNA descripción y una tabla de cantidades y precios (Conde: "si es el mismo
// producto una sola descripción es mucho mejor, solo cambios en cantidades y precios").
function tacticalCantPdfHtml(d){
  const C = tacticalAvzCop, E = tacticalAvzEsc;
  const neg = (typeof cotTextoConNegrilla==='function') ? cotTextoConNegrilla : E;
  const cli = d.cli || {};
  const fecha = d.fecha || new Date();
  const fechaStr = fecha.toLocaleDateString('es-CO', {year:'numeric', month:'long', day:'numeric'});
  const validoHasta = (typeof fechaMasDias==='function') ? fechaMasDias(fecha, 30) : '';
  const info = (typeof TACTICAL_INFO!=='undefined') ? TACTICAL_INFO : {nit:'', direccion:'', web:'', telefono:'', correo:''};
  const conIva = d.opciones.every(o => o.resultado.aplicaIva!==false);
  const filas = d.opciones.map(o => `<tr>
      <td style="font-weight:bold;">${Number(o.params.cantidad).toLocaleString('es-CO')} unidades</td>
      <td style="text-align:right;">${C(o.resultado.precioVentaUnitario)}</td>
      <td style="text-align:right;">${C(o.resultado.precioVentaTotal)}</td>
      ${conIva ? `<td style="text-align:right;">${C(o.resultado.ivaTotal)}</td>` : ''}
      <td style="text-align:right; font-weight:bold;">${C(o.resultado.precioFinalTotal)}</td></tr>`).join('');
  const vend = d.vendedor ? `<div style="font-size:0.74rem; color:#5f6e84; margin-top:10px;">Cotización elaborada por: <strong>${E(d.vendedor)}</strong>${(typeof VENDEDORES!=='undefined' && VENDEDORES[d.vendedor] && VENDEDORES[d.vendedor].telefono) ? ' — Cel: '+VENDEDORES[d.vendedor].telefono : ''}</div>` : '';
  return `
    <div class="doc-header">
      <div><img src="${typeof TACTICAL_LOGO_B64!=='undefined'?TACTICAL_LOGO_B64:''}" style="height:68px; margin-bottom:8px; display:block;" alt="Tactical Marketing"><div class="doc-tipo">COTIZACIÓN ${E(d.ot)}</div></div>
      <div class="doc-empresa-datos">${info.nit}<br>${info.direccion}<br>${info.web}<br>${info.telefono}</div>
    </div>
    <div class="doc-cliente-destacado">
      <div class="doc-cliente-nombre">${E(cli.empresa||'Cliente')}</div>
      <div class="doc-cliente-meta">Atención: ${E(cli.nombre||'-')} &nbsp;·&nbsp; ${E(cli.wp||'-')} &nbsp;·&nbsp; ${E(cli.correo||'-')}</div>
      <div class="doc-cliente-fechas">Fecha de emisión: ${fechaStr} &nbsp;|&nbsp; Válida hasta: ${validoHasta} (30 días calendario)</div>
    </div>
    <div class="doc-cta">✅ <strong>Elige la cantidad que prefieras.</strong> Para aprobar, responde confirmando el número <strong>${E(d.ot)}</strong> y la cantidad, por WhatsApp al ${info.telefono} o al correo ${info.correo}.</div>
    <div class="doc-section-title">${E(d.titulo||'Producto')}</div>
    <div style="display:flex; gap:12px; align-items:flex-start; margin:6px 0 8px;">
      ${d.fotoUrl ? `<img src="${d.fotoUrl}" style="max-width:120px; max-height:120px; border:1px solid #d7dee5; border-radius:4px; flex-shrink:0;">` : ''}
      <div style="font-size:0.88rem; line-height:1.45;">${neg(d.descripcion||'')}${d.videoUrl ? `<div style="margin-top:6px;"><a href="${d.videoUrl}" style="display:inline-block; background:#cc0000; color:#fff; text-decoration:none; padding:4px 10px; border-radius:4px; font-size:0.72rem; font-weight:bold;">▶ Ver video del producto</a></div>` : ''}</div>
    </div>
    <table class="doc-table">
      <tr><th style="text-align:left;">Cantidad</th><th style="text-align:right;">Valor unitario</th><th style="text-align:right;">Subtotal</th>${conIva?'<th style="text-align:right;">IVA (19%)</th>':''}<th style="text-align:right;">Total</th></tr>
      ${filas}
    </table>
    ${conIva ? '' : '<div style="font-size:11px; color:#6b7280;">Cliente Cuenta de Cobro: no se calcula IVA.</div>'}
    <div class="doc-section-title">Condiciones Comerciales</div>
    <p style="font-size:0.85rem; margin:4px 0;"><strong>Plazo de entrega:</strong> ${E(d.plazo||'A convenir')}</p>
    <div class="doc-condiciones"><ul>${(d.condiciones||[]).map(c=>`<li>${c}</li>`).join('')}</ul></div>
    ${vend}`;
}
async function tacticalCantGuardar(){
  const cfg = window.tacticalCantCfg;
  const est = tacticalCantEst();
  if(!cfg || !est.r){ alert("Primero presiona 'Calcular Cotización'."); return; }
  // Funciones de la página: por defecto las de las calculadoras; el Hub (Cuadernos) pasa las suyas en cfg.fn.
  const F = Object.assign({
    siguienteOT: () => siguienteOT(),
    otBase: x => tacticalCotOtBase(x),
    sufijo: b => tacticalCotSiguienteSufijoOT(b, db_opps),
    editandoId: () => (typeof cotEditandoId!=='undefined' ? cotEditandoId : null),
    editandoOt: () => (typeof cotEditandoOtOriginal!=='undefined' ? cotEditandoOtOriginal : ''),
    cancelarEdicion: () => { if(typeof cotCancelarEdicion==='function') cotCancelarEdicion(); },
    condiciones: () => leerCondicionesComerciales(),
    plazo: () => leerPlazoEntrega(),
    foto: () => fotoParaCotizacion(cfg.linea),
    video: () => videoParaCotizacion(cfg.linea),
    mayusculas: false,
    guardarDesglose: reg => tacticalSyncCotizacionCalc(reg),
    despues: () => { if(typeof refrescarDatalistClientes==='function') refrescarDatalistClientes(); if(typeof fotoPersonalReiniciar==='function') fotoPersonalReiniciar(); },
  }, cfg.fn || {});
  let cols;
  try{ cols = tacticalCantColumnas(); } catch(err){ alert('No se pudieron calcular las cantidades: '+err.message); return; }
  if(cols.length<2){ alert('Escribe al menos una segunda cantidad (Cantidad 2 o Cantidad 3) y vuelve a calcular.'); return; }
  const val = k => (document.getElementById(tacticalCantId(k))||{value:''}).value.trim();
  const may = t => F.mayusculas ? t.toUpperCase() : t;
  const empresa = may(val('empresa')), encargado = may(val('encargado')), telefono = val('telefono'), correo = val('correo');
  const tipo = val('tipo'), identificacion = val('identificacion'), vendedor = val('vendedor');
  const ventana = document.getElementById('tactical-avz-cmp');
  if(ventana) ventana.style.display = 'none';
  if(!tacticalExigirVendedor(tacticalCantId('vendedor'))) return;
  if(!empresa && !encargado){ alert("Ingresa al menos el Cliente o el Encargado antes de guardar."); return; }
  const empresaDef = may('Cliente Particular'), encargadoDef = may('Sin contacto directo');
  let cli = db_clientes.find(c => (correo && c.correo && c.correo.toLowerCase()===correo.toLowerCase()) || (String(c.empresa||'').toLowerCase()===(empresa||empresaDef).toLowerCase() && String(c.nombre||'').toLowerCase()===(encargado||encargadoDef).toLowerCase()));
  if(!cli){
    cli = { id: crypto.randomUUID(), empresa: empresa || empresaDef, nombre: encargado || encargadoDef, wp: telefono||'', correo: correo||'', clase: 'nuevo', ltv: 0, tipo, identificacion };
    db_clientes.push(cli);
  } else {
    if(telefono) cli.wp = telefono;
    if(correo) cli.correo = correo;
    if(tipo) cli.tipo = tipo;
    if(identificacion) cli.identificacion = identificacion;
  }
  tacticalSyncClientes(db_clientes);

  // Número: si se está editando una cotización guardada sale como versión nueva (OT-0001-B), igual que al guardar una sola cantidad.
  let ot;
  const editando = F.editandoId();
  if(editando){
    const original = db_opps.find(o => o.id===editando);
    const otBase = F.otBase((original && original.ot) || F.editandoOt() || '');
    ot = otBase ? (otBase+'-'+F.sufijo(otBase)) : await F.siguienteOT();
  } else ot = await F.siguienteOT();

  const principal = cols.find(c => c.cantidad===est.p.cantidad) || cols[0];
  const titulo = cfg.tituloComun(principal.p, principal.r);
  const descripcion = val('desc');
  const foto = F.foto(), video = F.video();
  const opciones = cols.map(c => ({
    titulo: `${c.cantidad.toLocaleString('es-CO')} ${titulo}`, params: c.p, resultado: c.r, fotoUrl: foto, videoUrl: video,
    fichaTecnica: Object.assign({}, cfg.fichaTecnica ? cfg.fichaTecnica(c.p, c.r) : {}, {insumos: tacticalAvzInsumos(c.r.lineas)}),
  }));
  const montoRef = Math.round(Math.min(...opciones.map(o => o.resultado.precioFinalTotal)));
  const desc = `${titulo} (${cols.map(c => c.cantidad.toLocaleString('es-CO')).join(' / ')} u.)`;
  const opp = { id: crypto.randomUUID(), ot, idCli: cli.id, nombreCli: tacticalNombreCliente(cli), desc, vendedor, monto: montoRef, etapa:'cot', linea: cfg.linea,
    cantidad: cols[0].cantidad, opcionesComparativa: opciones, multiCantidad: true, descComun: descripcion, tituloComun: titulo, fotoUrl: foto, videoUrl: video };
  db_opps.push(opp);
  const oppOk = await tacticalSyncOpps(db_opps);
  const condiciones = F.condiciones(), plazo = F.plazo();
  const desgloseOk = await F.guardarDesglose({
    id: opp.id, linea: cfg.linea, ot, idOpp: opp.id, idCli: cli.id,
    cliente: {empresa: cli.empresa, encargado: cli.nombre, telefono: cli.wp, correo: cli.correo},
    vendedor, desc: tacticalTituloCorto(`${est.p.cantidad} ${titulo}`, descripcion),
    params: tacticalParamsConDuplicado(cfg.paramsGuardar ? cfg.paramsGuardar(tacticalCantParamsGuardar(est.p)) : tacticalCantParamsGuardar(est.p)), resultado: est.r,
    condicionesComerciales: condiciones, plazoEntrega: plazo,
  });
  F.cancelarEdicion();
  F.despues();
  tacticalAnunciarCotizacionGuardada(oppOk, ot, cli.empresa, montoRef, (desgloseOk===false ? 'El desglose editable no se pudo guardar (la cotización sí quedó en el CRM).' : null), 'Cotización de varias cantidades');
  document.getElementById('print-area').innerHTML = tacticalCantPdfHtml({ ot, cli, fecha: new Date(), titulo, descripcion, opciones, vendedor, plazo, condiciones, fotoUrl: foto, videoUrl: video });
  document.getElementById('print-area').style.display = 'block';
  tacticalImprimirConTitulo(`${cli.empresa||'Cliente'} - ${ot}`);
}

/* ---- Utilidades para armar el desglose igual en todas las calculadoras ---- */
function tacticalAvzNombreSustrato(p){
  const s = p && typeof p.sustrato==='string' ? p.sustrato : '';
  if(!s.includes('__')) return '';
  const [nombre, gramaje] = s.split('__');
  return `${nombre} ${gramaje}g`;
}
function tacticalAvzTxtImpresion(d, tintasTiro, tintasRetiro){
  if(!d) return 'Impresión';
  const t = tintasTiro!=null ? `, ${tintasTiro}x${tintasRetiro||0}` : '';
  if(d.via==='digital') return `Impresión digital (hoja ${String(d.clase||'').replace('_',' ')}${t}${d.descuentoPct!=null?`, descuento ${(d.descuentoPct*100).toFixed(0)}%`:''})`;
  return `Impresión offset (${d.fraccion||''})${t}${d.nPlanchas!=null?` — ${d.nPlanchas} plancha(s), ${d.nMillares} millar(es)`:''}`;
}
// Renglón de impresión: en digital se ve por clics (cantidad x precio del clic ya con descuento); en offset, como un trabajo.
function tacticalAvzLineaImpresion(avz, d, tintasTiro, tintasRetiro){
  const txt = tacticalAvzTxtImpresion(d, tintasTiro, tintasRetiro);
  return (d.via==='digital' && d.nClics>0) ? avz.linea('imp', 'Procesos', txt, d.nClics, 'clic', d.total/d.nClics, d.total) : avz.linea('imp', 'Procesos', txt, 1, 'trabajo', d.total);
}
// Renglón de un costo ya calculado: por unidad (unitario = costo / cantidad) o como un solo trabajo. Si el costo es 0 no se lista.
function tacticalAvzLineaCosto(avz, id, grupo, concepto, costo, cantidad, unidad){
  if(!(costo>0)) return 0;
  return cantidad>1 ? avz.linea(id, grupo, concepto, cantidad, unidad||'unidad', costo/cantidad, costo) : avz.linea(id, grupo, concepto, 1, unidad||'trabajo', costo);
}
// Renglones de "Insumos extra" (ver tacticalAvzExtrasLeer arriba): cada item entra como un renglón
// más del desglose ('extra0', 'extra1'...), para que la versión profesional lo pueda ajustar igual
// que cualquier otro insumo. Llamar antes de avz.total('Costo directo total', ...).
function tacticalAvzLineaExtras(avz, extras){
  let total = 0;
  (extras||[]).forEach((ex,i) => { total += avz.linea('extra'+i, 'Procesos', ex.desc, ex.cantidad, ex.unidad||'u', ex.unitario); });
  return total;
}
function tacticalAvzFichaTecnica(p, r, reglas){
  const d = r.detalleImpresion, mat = r.detalleMaterial || {};
  return {
    maquina: d ? (d.via==='digital' ? 'digital' : (d.fraccion||'otro')) : 'otro',
    material: tacticalAvzNombreSustrato(p) || null, nPliegos: mat.nPliegos || null, planoCorte: mat.planoCorte || null,
    recomendaciones: (reglas||[]).filter(reg => reg.aplica(r, p)).map(reg => typeof reg.texto==='function' ? reg.texto(r, p) : reg.texto),
  };
}

// Alineación de las columnas numéricas donde la página no trae la clase .num (el Hub).
(function(){
  if(typeof document==='undefined' || document.getElementById('tactical-avz-estilo')) return;
  const st = document.createElement('style');
  st.id = 'tactical-avz-estilo';
  st.textContent = '.tactical-avz-tabla td.num{ text-align:right; white-space:nowrap; }';
  (document.head || document.documentElement).appendChild(st);
})();

/* ============ CANTIDAD 2 Y 3: OCULTAS DETRÁS DE UN ENLACE (Conde 2026-11-13) ============
   "analiza una mejor forma de crear las otras cantidades, así como está ocupa mucho espacio y no
   siempre se usa" -- los dos campos siguen en el formulario tal cual (cada calculadora los declaró
   con su propio HTML), pero quedan ocultos por defecto detrás de un enlace "+ Comparar con otras
   cantidades"; un solo clic muestra las dos juntas (no hace falta un segundo clic para la tercera).
   Si al reabrir una cotización guardada esos campos ya traen valor, tacticalCantCargar() llama a
   tacticalAvzSincronizarCantidadesExtra() para mostrarlas sin que el usuario tenga que buscarlas. */
function tacticalAvzEnvolverCantidadesExtra(id2, id3){
  const el2 = document.getElementById(id2), el3 = document.getElementById(id3);
  if(!el2 || !el3 || el2.dataset.avzPlegado) return;
  el2.dataset.avzPlegado = '1';
  const cont2 = el2.closest('.campo') || el2.closest('.form-group') || el2.parentElement;
  const cont3 = el3.closest('.campo') || el3.closest('.form-group') || el3.parentElement;
  const toggle = document.createElement('a');
  toggle.href = '#';
  toggle.className = 'tactical-avz-cant-toggle';
  toggle.style.cssText = 'display:inline-block; font-size:0.82rem; font-weight:600; color:var(--azul,#1e3a5f); text-decoration:none; margin:2px 0 10px; cursor:pointer;';
  const sincronizarTexto = () => { toggle.textContent = (cont2.style.display==='none') ? '+ Cotizar más Cantidades' : '✕ Quitar otras cantidades'; };
  toggle.addEventListener('click', e => {
    e.preventDefault();
    const abrir = cont2.style.display==='none';
    cont2.style.display = abrir ? '' : 'none';
    cont3.style.display = abrir ? '' : 'none';
    if(!abrir){ el2.value=''; el3.value=''; }
    sincronizarTexto();
  });
  cont2.parentNode.insertBefore(toggle, cont2);
  const tieneValores = (el2.value||'').trim()!=='' || (el3.value||'').trim()!=='';
  cont2.style.display = tieneValores ? '' : 'none';
  cont3.style.display = tieneValores ? '' : 'none';
  sincronizarTexto();
}
function tacticalAvzSincronizarCantidadesExtra(){
  [['in-cantidad2','in-cantidad3'], ['cot-cantidad2','cot-cantidad3']].forEach(([id2,id3]) => {
    const el2 = document.getElementById(id2), el3 = document.getElementById(id3);
    if(!el2 || !el3) return;
    tacticalAvzEnvolverCantidadesExtra(id2, id3);   // por si esta página aún no las había envuelto
    if((el2.value||'').trim()==='' && (el3.value||'').trim()==='') return;
    const cont2 = el2.closest('.campo') || el2.closest('.form-group') || el2.parentElement;
    const cont3 = el3.closest('.campo') || el3.closest('.form-group') || el3.parentElement;
    cont2.style.display = ''; cont3.style.display = '';
    const toggle = cont2.previousElementSibling;
    if(toggle && toggle.classList && toggle.classList.contains('tactical-avz-cant-toggle')) toggle.textContent = '✕ Quitar otras cantidades';
  });
}
(function(){
  if(typeof document==='undefined') return;
  [['in-cantidad2','in-cantidad3'], ['cot-cantidad2','cot-cantidad3']].forEach(([id2,id3]) => tacticalAvzEnvolverCantidadesExtra(id2, id3));
})();
