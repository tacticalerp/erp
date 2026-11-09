/* =====================================================================================
   TACTICAL-UI.JS — interfaz unificada del ERP (Conde 2026-11-09)
   "Que los botones con la misma función tengan el mismo color y forma en todo el ERP, y que todo lo que se
   despliega use la misma flecha, para simplificar el aprendizaje."

   1) BOTONES POR FUNCIÓN. Cada botón se clasifica por lo que hace (por su texto/título/ícono) y recibe SIEMPRE el mismo
      color, borde y ícono, en cualquier herramienta:
        Eliminar / Quitar ........ borde rojo, fondo blanco, ícono papelera
        Guardar / Confirmar ...... verde, ícono disquete (guardar) o check (confirmar)
        Agregar / Nuevo .......... azul, ícono +
        Editar ................... ámbar, ícono lápiz
        Cancelar / Cerrar ........ blanco con borde gris, ícono X (Volver: flecha izquierda)
        Descargar / Imprimir ..... gris pizarra, ícono descarga / impresora
      Los botones se detectan solos, también los que se dibujan por JavaScript (MutationObserver). Para excluir uno:
      data-ui="none". Para forzar una función: data-ui="del|ok|add|edit|cancel|dl".
   2) FLECHA ÚNICA PARA LO QUE SE DESPLIEGA: un chevron que apunta a la derecha cuando está cerrado y hacia abajo cuando
      está abierto (acordeones .arrow, <details>/<summary>, botones "Ver detalle ▼", tareas ▶, etc.). Las flechas ◀ ▶ de
      paginar y ▲ ▼ de subir/bajar NO se tocan (no despliegan nada).
   ===================================================================================== */
(function(){
  if(window.__tacticalUI) return; window.__tacticalUI = true;

  /* ---------- íconos (Feather, trazo 2) ---------- */
  const IC = {
    del:  '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>',
    check:'<polyline points="20 6 9 17 4 12"></polyline>',
    add:  '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
    x:    '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    back: '<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>',
    dl:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
    print:'<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',
  };
  function svg(n){ return '<svg class="ui-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0; margin-right:4px;">' + IC[n] + '</svg>'; }

  /* ---------- estilos ---------- */
  const CHEV = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>\")";
  const CSS = `
    :root{ --ui-chev:${CHEV}; }
    .ui-b{ border-radius:6px !important; font-weight:600 !important; }
    .ui-b:hover:not(:disabled){ filter:brightness(.93); }
    .ui-b:disabled{ opacity:.5; cursor:default; }
    .ui-b:focus-visible{ outline:2px solid #2563eb; outline-offset:2px; }
    .ui-b-del   { background:#fff !important; color:#dc2626 !important; border:1.5px solid #dc2626 !important; }
    .ui-b-ok    { background:#15803d !important; color:#fff !important; border:1.5px solid #166534 !important; }
    .ui-b-add   { background:#2563eb !important; color:#fff !important; border:1.5px solid #1d4ed8 !important; }
    .ui-b-edit  { background:#b45309 !important; color:#fff !important; border:1.5px solid #92400e !important; }
    .ui-b-cancel{ background:#fff !important; color:#475569 !important; border:1.5px solid #94a3b8 !important; }
    .ui-b-dl    { background:#334155 !important; color:#fff !important; border:1.5px solid #1e293b !important; }
    /* flecha única de lo que se despliega: cerrado = derecha, abierto = abajo */
    .ui-chev{ display:inline-block; width:14px; height:14px; margin:0 4px; vertical-align:-2px; background:currentColor; -webkit-mask:var(--ui-chev) center/contain no-repeat; mask:var(--ui-chev) center/contain no-repeat; transition:transform .15s; }
    .ui-chev[data-open="1"]{ transform:rotate(90deg); }
    [data-ui-chev]{ font-size:0 !important; line-height:0 !important; }
    [data-ui-chev]::before{ content:''; display:inline-block; width:16px; height:16px; vertical-align:middle; background:currentColor; -webkit-mask:var(--ui-chev) center/contain no-repeat; mask:var(--ui-chev) center/contain no-repeat; transition:transform .15s; }
    [data-ui-chev][data-open="1"]::before{ transform:rotate(90deg); }
    .task-toggle[data-ui-chev]::before{ width:12px; height:12px; }
    details > summary{ list-style:none; }
    details > summary::-webkit-details-marker{ display:none; }
    details > summary::before{ content:'' !important; display:inline-block !important; width:16px !important; height:16px !important; margin-right:8px; flex-shrink:0; vertical-align:middle; font-size:0 !important; background:currentColor !important; -webkit-mask:var(--ui-chev) center/contain no-repeat; mask:var(--ui-chev) center/contain no-repeat; transition:transform .15s; transform:none; }
    details[open] > summary::before{ transform:rotate(90deg) !important; }
  `;
  function inyectarEstilos(){
    if(document.getElementById('tactical-ui-css')) return;
    const st = document.createElement('style'); st.id = 'tactical-ui-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- clasificación de botones ---------- */
  const OMITIR = '#tactical-login-overlay, .tq-pick, [data-ui="none"], .nav-btn-hub, .kb-ico, .kanban-foto-del, .kb-carr-quitar, .kb-lb-cerrar, .pj-mini, .pj-chip, .comercial-vendedor-tab, .cm-chip, .kanban-scroll-btn, .btn-stage, .task-toggle, .kb-mini, .kb-ver-detalle, .accordion-header, .x, #tactical-hub-btn, #tactical-toasts';
  const SIMBOLOS = /[\u{1F000}-\u{1FFFF}←-⯿☀-➿️‍+×✕✖✓✔]/gu;
  const INICIO_SIMBOLOS = /^[\s+×✕✖✓✔\u{1F000}-\u{1FFFF}←-⯿☀-➿️‍]+/u;
  function etiqueta(b){ return (b.textContent || '').replace(SIMBOLOS, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function soloIconoPapelera(b){ return !!b.querySelector('svg polyline[points="3 6 5 6 21 6"]'); }
  function funcionDe(b){
    const forz = b.getAttribute('data-ui');
    if(forz && ['del','ok','add','edit','cancel','dl'].indexOf(forz) >= 0) return forz;
    const l = etiqueta(b);
    const tit = (b.getAttribute('title') || '').toLowerCase();
    if(!l){
      if(soloIconoPapelera(b) || /^(eliminar|borrar|quitar)/.test(tit)) return 'del';
      if(/^(editar|modificar)/.test(tit)) return 'edit';
      if(/^(descargar|exportar|imprimir)/.test(tit)) return 'dl';
      if(/^(guardar|confirmar|aprobar)/.test(tit)) return 'ok';
      return null;
    }
    if(/^cancelar (pedido|comparaci|cotizaci|y empezar)/.test(l)) return 'del';
    if(/^(eliminar|borrar|vaciar)\b/.test(l)) return 'del';
    if(/^quitar( (esta|este|todos|todas|el|la|los|las))?( (hoja|hojas|archivo|archivos|pieza|piezas|ítem|item|ítems|línea|linea|producto|productos|foto|fotos|fila|insumo|del pedido))?$/.test(l)) return 'del';
    if(/^(cancelar|cerrar|descartar)\b(?! (pedido|a |sesi))/.test(l) && !/^cerrar pedido/.test(l)) return 'cancel';
    if(l === 'volver') return 'cancel';
    if(/^(guardar|registrar|aprobar|confirmar|cerrar pedido|actualizar cliente|aplicar cambios)/.test(l)) return 'ok';
    if(l.length > 2 && !/limpiar|nueva cotizaci/.test(l) && (/^(agregar|añadir|anexar|nuevo|nueva|crear nuev)/.test(l) || /^\s*\+/.test((b.textContent || '').trim()))) return 'add';
    if(/^(editar|modificar|corregir)\b/.test(l)) return 'edit';
    if(/^(descargar|exportar|imprimir|generar (pdf|jpg|png|orden de producci|plano|svg|dxf))/.test(l)) return 'dl';
    return null;
  }
  function iconoDe(fn, l){
    if(fn === 'del') return 'del';
    if(fn === 'ok') return /^(guardar|registrar)/.test(l) ? 'save' : 'check';
    if(fn === 'add') return 'add';
    if(fn === 'edit') return 'edit';
    if(fn === 'cancel') return /^volver/.test(l) ? 'back' : 'x';
    if(fn === 'dl') return /^imprimir/.test(l) ? 'print' : 'dl';
    return null;
  }
  const TODAS = ['ui-b', 'ui-b-del', 'ui-b-ok', 'ui-b-add', 'ui-b-edit', 'ui-b-cancel', 'ui-b-dl'];
  function quitarEstilo(b){ if(b.classList.contains('ui-b')){ TODAS.forEach(c => b.classList.remove(c)); const ic = b.querySelector(':scope > .ui-ic'); if(ic) ic.remove(); delete b.dataset.uiFn; } }
  function boton(b){
    if(b.closest(OMITIR)) return;
    const fn = funcionDe(b);
    if(!fn){ quitarEstilo(b); return; }
    const l = etiqueta(b);
    TODAS.forEach(c => { if(c !== 'ui-b' && c !== 'ui-b-' + fn) b.classList.remove(c); });
    b.classList.add('ui-b', 'ui-b-' + fn);
    b.dataset.uiFn = fn;
    const nomIcono = iconoDe(fn, l);
    // quitar el ícono/emoji de adelante que no sea el estándar
    let p = b.firstChild;
    while(p){
      const sig = p.nextSibling;
      if(p.nodeType === 1 && p.tagName.toLowerCase() === 'svg'){
        if(!p.classList.contains('ui-ic')) p.remove(); else break;
      } else if(p.nodeType === 3){
        const t = p.textContent.replace(INICIO_SIMBOLOS, '');
        if(t !== p.textContent){ if(t.trim() === '') p.remove(); else p.textContent = t; }
        if(!p.parentNode) { p = sig; continue; }
        break;
      } else break;
      p = sig;
    }
    const ya = b.firstElementChild && b.firstElementChild.classList && b.firstElementChild.classList.contains('ui-ic') && b.firstElementChild.dataset.n === nomIcono;
    if(!ya){
      const viejo = b.querySelector(':scope > .ui-ic'); if(viejo) viejo.remove();
      b.insertAdjacentHTML('afterbegin', svg(nomIcono).replace('class="ui-ic"', 'class="ui-ic" data-n="' + nomIcono + '"'));
      if(!l) { const ic = b.querySelector(':scope > .ui-ic'); if(ic) ic.style.marginRight = '0'; }
    }
  }

  /* ---------- flechas de lo que se despliega ---------- */
  const GLIFOS = '▼►▶▸▾▴▲';
  const RE_INI = new RegExp('^\\s*([' + GLIFOS + '])\\s*(?=\\S)');
  const RE_FIN = new RegExp('(?<=\\S)\\s*([▼▾▴▲▸])\\s*$');
  function abiertoPorGlifo(g, texto){
    if('▸►▶'.indexOf(g) >= 0) return '0';
    if('▴▲▼'.indexOf(g) >= 0) return '1';
    // ▾: "Ver…/Mostrar…/¿…?" = cerrado; el resto (menús, "Nueva Ficha ▾") = flecha hacia abajo
    return /^\s*(ver|mostrar|abrir|¿)/i.test(texto) ? '0' : '1';
  }
  function flechas(root){
    // 1) elementos que solo contienen la flecha: se oculta el glifo (el JS de la página lo sigue leyendo) y se dibuja el chevron
    const conRaiz = (sel) => { const l = [...root.querySelectorAll(sel)]; if(root.matches && root.matches(sel)) l.unshift(root); return l; };
    conRaiz('.arrow, .task-toggle, [id$="-flecha"]').forEach(el => {
      const t = (el.textContent || '').trim();
      if(t.length > 2) return;
      const g = t.charAt(0); if(GLIFOS.indexOf(g) < 0) return;
      el.setAttribute('data-ui-chev', '1'); el.setAttribute('data-open', abiertoPorGlifo(g, ''));
    });
    // 2) texto con flecha pegada ("▼ Ver detalle", "Ver los 3 productos ▾", "Nueva Ficha ▾")
    conRaiz('button, summary, a, span[onclick], div[onclick], .kb-ver-detalle').forEach(el => {
      if(el.closest('[data-ui="none"], .kb-mini, .kanban-scroll-btn')) return;
      el.childNodes.forEach(n => {
        if(n.nodeType !== 3) return;
        const tx = n.textContent;
        let m = RE_INI.exec(tx), pos = 'ini';
        if(!m){ m = RE_FIN.exec(tx); pos = 'fin'; }
        if(!m) return;
        const g = m[1];
        const resto = tx.replace(m[0], '');
        const span = document.createElement('span'); span.className = 'ui-chev'; span.setAttribute('data-open', abiertoPorGlifo(g, el.textContent.replace(g, '')));
        if(pos === 'ini'){ n.textContent = resto; el.insertBefore(span, n); }
        else { n.textContent = tx.slice(0, m.index) + ' '; el.insertBefore(span, n.nextSibling); }
      });
    });
  }

  function escanear(n){
    if(!n || n.nodeType !== 1) return;
    if(n.closest && n.closest('#tactical-toasts, #tactical-ui-css')) return;
    if(n.matches && n.matches('button')) boton(n);
    const up = n.closest ? n.closest('button') : null; if(up && up !== n) boton(up);
    n.querySelectorAll('button').forEach(boton);
    flechas(n);
    if(n.parentElement && n.parentElement !== document.body) { /* el padre puede ser un botón o encabezado cuyo texto cambió */ if(n.parentElement.matches('button')) boton(n.parentElement); }
  }

  /* ---------- observador (también para lo que dibuja el JavaScript) ---------- */
  const pend = new Set(); let timer = null;
  const obs = new MutationObserver(ms => {
    for(const m of ms){
      if(m.type === 'childList'){ m.addedNodes.forEach(n => { if(n.nodeType === 1) pend.add(n); else if(n.nodeType === 3 && n.parentElement) pend.add(n.parentElement); }); if(m.target && m.target.nodeType === 1) pend.add(m.target); }
      else if(m.type === 'characterData' && m.target.parentElement) pend.add(m.target.parentElement);
    }
    if(!timer) timer = setTimeout(procesar, 60);
  });
  function observar(){ obs.observe(document.documentElement, {childList:true, subtree:true, characterData:true}); }
  function procesar(){
    timer = null; obs.disconnect();
    try{ pend.forEach(n => { if(n.isConnected) escanear(n); }); } catch(e){ console.error('tactical-ui:', e); }
    pend.clear(); observar();
  }
  function iniciar(){
    inyectarEstilos();
    obs.disconnect();
    try{ escanear(document.body); } catch(e){ console.error('tactical-ui:', e); }
    observar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.tacticalUIEscanear = function(root){ obs.disconnect(); try{ escanear(root || document.body); } finally { observar(); } };
})();

/* =====================================================================================
   EXTRAS DE USABILIDAD (Conde 2026-11-09, pendientes de la auditoría)
   a) Botones y campos más grandes en celular (mínimo ~40 px) sin tocar las pantallas compactas a propósito (Kanban, Tareas).
   b) Barra fija con el TOTAL en las calculadoras cuando el resultado queda fuera de la pantalla (celular / pantalla angosta).
   c) Los errores de validación marcan el campo o el botón que falta (borde rojo + desplazamiento), no solo muestran el aviso.
   ===================================================================================== */
(function(){
  /* ---- a) objetivos táctiles en celular ---- */
  const CSS2 = `
    @media (max-width: 768px){
      .ui-b, .btn-action:not(.kb-mini):not(.kb-ico):not(.kb-btn-refrescar), .btn-submit, .btn-primario, .btn-add, .btn-add-item, .btn.gris, .btn.verde, .btn.rojo, .comercial-vendedor-tab, .cm-chip{ min-height:40px; }
      .btn.mini{ min-height:36px; }
      input[type=checkbox], input[type=radio]{ width:20px; height:20px; }
      select, input[type=text], input[type=number], input[type=date], input[type=email], input[type=tel]{ min-height:40px; }
      #view-tareas select, #view-tareas input, #view-kanban select, #view-kanban input[type=text]{ min-height:0; }
    }
    .ui-total-bar{ display:none; position:fixed; left:0; right:0; bottom:0; z-index:9000; background:#1a202c; color:#fff; padding:10px 76px calc(10px + env(safe-area-inset-bottom)) 14px; box-shadow:0 -6px 20px rgba(0,0,0,.35); align-items:center; gap:12px; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
    .ui-total-bar.ui-visible{ display:flex; }
    .ui-total-bar .t{ flex:1; min-width:0; line-height:1.25; }
    .ui-total-bar .t small{ display:block; color:#a0aec0; font-size:.72rem; }
    .ui-total-bar .t b{ font-size:1.15rem; }
    .ui-total-bar button{ background:#cc0000; color:#fff; border:0; border-radius:6px; padding:10px 14px; font-weight:700; font-size:.9rem; min-height:40px; cursor:pointer; white-space:nowrap; }
    .ui-error-campo{ outline:2px solid #dc2626 !important; outline-offset:2px; border-radius:4px; }
  `;
  function estilos(){
    if(document.getElementById('tactical-ui-css2')) return;
    const st = document.createElement('style'); st.id = 'tactical-ui-css2'; st.textContent = CSS2;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---- b) barra de total ---- */
  const esCalc = /calculadora_[a-z_]+\.html/i.test(location.pathname);
  function copTxt(n){ return '$' + Math.round(n).toLocaleString('es-CO'); }
  function iniciarBarra(){
    const res = document.getElementById('resultado-contenido'); if(!res) return;
    const bar = document.createElement('div'); bar.className = 'ui-total-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<div class="t"><small id="ui-total-sub"></small><b id="ui-total-val"></b></div><button type="button" id="ui-total-ir">Ver resultado ↓</button>';
    document.body.appendChild(bar);
    let enPantalla = true, hayResultado = false;
    function pintar(){
      let r = null; try{ r = (typeof ultimoResultado !== 'undefined') ? ultimoResultado : null; }catch(e){}
      hayResultado = !!(r && r.precioFinalTotal);
      if(hayResultado){
        document.getElementById('ui-total-val').textContent = copTxt(r.precioFinalTotal) + ' (IVA incl.)';
        document.getElementById('ui-total-sub').textContent = 'Total de la cotización' + (r.precioVentaUnitario ? ' · unitario ' + copTxt(r.precioVentaUnitario) + ' + IVA' : '');
      }
      bar.classList.toggle('ui-visible', hayResultado && !enPantalla && window.innerWidth <= 900);
    }
    document.getElementById('ui-total-ir').addEventListener('click', function(){ res.scrollIntoView({behavior:'smooth', block:'start'}); });
    new MutationObserver(pintar).observe(res, {childList:true, subtree:true});
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ enPantalla = es[0].isIntersecting; pintar(); }, {threshold:0.05}).observe(res);
    }
    window.addEventListener('resize', pintar);
    pintar();
  }

  /* ---- c) marcar el campo que falta ---- */
  const REGLAS = [
    [/cliente o el encargado|empresa o el contacto|nombre de la empresa|escribe al menos el cliente/i, ['#in-cli-empresa', '#in-cli-encargado', '#cot-cli-empresa', '#cot-cli-encargado', '#cli-empresa', '#cli-contacto']],
    [/vendedor/i, ['#in-vendedor', '#cot-vendedor']],
    [/presiona .?calcular/i, ['button[onclick*="calcular"]', 'button[onclick*="cotCalcular"]']],
    [/cantidad/i, ['#in-cantidad', '#cot-cantidad']],
    [/guardar y generar pdf/i, ['button[onclick*="uardarYGenerar"], button[onclick*="guardarYGenerarPDF"]']],
  ];
  function visible(el){ return el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  window.tacticalResaltarCampo = function(el){
    if(!el) return;
    document.querySelectorAll('.ui-error-campo').forEach(x => x.classList.remove('ui-error-campo'));
    el.classList.add('ui-error-campo');
    try{ el.scrollIntoView({block:'center', behavior:'smooth'}); if(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.focus({preventScroll:true}); }catch(e){}
    const quitar = function(){ el.classList.remove('ui-error-campo'); el.removeEventListener('input', quitar); el.removeEventListener('change', quitar); el.removeEventListener('click', quitar); };
    el.addEventListener('input', quitar); el.addEventListener('change', quitar); el.addEventListener('click', quitar);
    setTimeout(quitar, 8000);
  };
  function engancharAvisos(){
    if(typeof window.tacticalAviso !== 'function' || window.tacticalAviso.__ui) return false;
    const orig = window.tacticalAviso;
    window.tacticalAviso = function(msg, tipo){
      orig.apply(this, arguments);
      try{
        const m = String(msg == null ? '' : msg);
        const t = tipo || (/^\s*(⚠|❌)|no se pudo|debe |escribe|ingresa|elige|selecciona|primero|falta/i.test(m) ? 'error' : '');
        if(t !== 'error') return;
        for(const [re, sels] of REGLAS){
          if(!re.test(m)) continue;
          for(const s of sels){ const el = [...document.querySelectorAll(s)].find(visible); if(el){ window.tacticalResaltarCampo(el); return; } }
        }
      }catch(e){}
    };
    window.tacticalAviso.__ui = true;
    return true;
  }

  function iniciar(){
    estilos();
    if(esCalc) iniciarBarra();
    if(!engancharAvisos()){ let n = 0; const t = setInterval(function(){ if(engancharAvisos() || ++n > 40) clearInterval(t); }, 250); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* =====================================================================================
   SOLO ADMIN/COMERCIAL VEN COSTOS (Conde 2026-11-09: "los costos los ve comercial y administrador")
   En las calculadoras, para cualquier otro rol (o mientras no se sepa el rol) el resultado muestra solo el precio de venta,
   IVA y precio final: se ocultan el desglose de costos, el costo directo, los gastos y la ganancia.
   ===================================================================================== */
(function(){
  if(!/calculadora_[a-z_]+\.html/i.test(location.pathname)) return;
  const VEN = ['administrador', 'comercial'];
  const PERMITIDAS = /^(precio de venta|iva\b|precio final|total con iva|extra\b|ajuste adicional)/i;
  function css(){
    if(document.getElementById('tactical-ui-css3')) return;
    const st = document.createElement('style'); st.id = 'tactical-ui-css3';
    st.textContent = 'body.ui-sin-costos .ui-fila-costo{ display:none !important; }';
    (document.head || document.documentElement).appendChild(st);
  }
  function marcar(){
    const res = document.getElementById('resultado-contenido'); if(!res) return;
    res.querySelectorAll('tr').forEach(tr => {
      const c = tr.cells && tr.cells[0]; if(!c) return;
      const tx = (c.textContent || '').replace(/\s+/g, ' ').trim();
      const costo = !PERMITIDAS.test(tx) || /ganancia/i.test(tx);
      tr.classList.toggle('ui-fila-costo', costo);
    });
  }
  function aplicar(){
    const p = window.tacticalUsuarioPerfil;
    if(p && p.rol) document.body.classList.toggle('ui-sin-costos', VEN.indexOf(p.rol) < 0);
  }
  function iniciar(){
    css();
    document.body.classList.add('ui-sin-costos');   // cerrado por defecto hasta conocer el rol
    const res = document.getElementById('resultado-contenido');
    if(res){ new MutationObserver(marcar).observe(res, {childList:true, subtree:true}); marcar(); }
    let n = 0; const t = setInterval(function(){ aplicar(); if((window.tacticalUsuarioPerfil && window.tacticalUsuarioPerfil.rol) || ++n > 120) clearInterval(t); }, 500);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
