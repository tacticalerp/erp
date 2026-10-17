/* Ajuste de PDF/.ai para Montajes -- "Medida y cuadrícula".
   Lee el contenido de la página (los .ai de Illustrator son PDF por dentro), reconoce la cuadrícula (un trazo recto por línea),
   la lleva a un formato final más chico quitando solo las líneas necesarias y recoloca encabezado, pie y marca de agua.
   Conde 2026-10-16: márgenes de cuadrícula mínimo 13 mm del lado del anillado y 7 mm en los demás (+1 o 2 mm).
   Funciona en el navegador (PDFLib global) y en Node (require('pdf-lib')) para poder probarlo.
   Reglas aprendidas con archivos reales (Previtec): el .ai trae /PieceInfo (Illustrator abre el arte viejo si queda), Illustrator ancla la
   mesa de trabajo en (0,0) y muestra como máscara gigante el recorte de página, y no importa bien los degradados DeviceN. */
(function (root) {
  'use strict';
  var PDFLib = root.PDFLib || (typeof require !== 'undefined' ? require('pdf-lib') : null);
  var PT = 72 / 25.4;

  /* ---------------- tokenizador / serializador de contenido ---------------- */
  function latin1(u8) { var s = '', n = 0x8000; for (var i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return s; }
  function esWs(c) { return c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0'; }
  function esDelim(c) { return '()<>[]{}/%'.indexOf(c) >= 0; }
  function saltarCadena(txt, j) { var d = 1; j++; var n = txt.length; while (j < n && d > 0) { if (txt[j] === '\\') j += 2; else { if (txt[j] === '(') d++; else if (txt[j] === ')') d--; j++; } } return j; }
  function tokenizar(txt) {
    var toks = [], i = 0, n = txt.length;
    while (i < n) {
      var c = txt[i];
      if (esWs(c)) { i++; continue; }
      if (c === '%') { while (i < n && txt[i] !== '\n' && txt[i] !== '\r') i++; continue; }
      if (c === '(') { var j = saltarCadena(txt, i); toks.push({ t: 'str', v: txt.slice(i, j) }); i = j; continue; }
      if (c === '<') {
        if (txt[i + 1] === '<') {
          var d = 1, k = i + 2;
          while (k < n && d > 0) {
            if (txt.substr(k, 2) === '<<') { d++; k += 2; } else if (txt.substr(k, 2) === '>>') { d--; k += 2; } else if (txt[k] === '(') k = saltarCadena(txt, k); else k++;
          }
          toks.push({ t: 'dict', v: txt.slice(i, k) }); i = k; continue;
        }
        var e = txt.indexOf('>', i); toks.push({ t: 'str', v: txt.slice(i, e + 1) }); i = e + 1; continue;
      }
      if (c === '[') {
        var dd = 1, m = i + 1;
        while (m < n && dd > 0) { if (txt[m] === '(') m = saltarCadena(txt, m); else if (txt[m] === '[') { dd++; m++; } else if (txt[m] === ']') { dd--; m++; } else m++; }
        toks.push({ t: 'arr', v: txt.slice(i, m) }); i = m; continue;
      }
      if (c === '/') { var q = i + 1; while (q < n && !esWs(txt[q]) && !esDelim(txt[q])) q++; toks.push({ t: 'name', v: txt.slice(i, q) }); i = q; continue; }
      var z = i; while (z < n && !esWs(txt[z]) && !esDelim(txt[z])) z++;
      if (z === i) { i++; continue; }
      var w = txt.slice(i, z); i = z;
      toks.push(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w) ? { t: 'num', v: w } : { t: 'op', v: w });
    }
    return toks;
  }
  function aOperaciones(txt) {
    var toks = tokenizar(txt), ops = [], a = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t !== 'op') { a.push(t); continue; }
      if (t.v === 'BI') {                                   // imagen en línea: se conserva tal cual
        var iniTxt = txt.indexOf('BI', 0);                  // (no se esperan en estos archivos; si aparece se marca como no soportado)
        throw new Error('imagen en línea no soportada');
      }
      ops.push({ o: t.v, a: a }); a = [];
    }
    return ops;
  }
  function serializar(ops) { return ops.map(function (op) { return op.a.map(function (t) { return t.v; }).join(' ') + (op.a.length ? ' ' : '') + op.o; }).join('\n'); }
  function num(v) { return { t: 'num', v: String(Math.round(v * 10000) / 10000) }; }
  function nom(n) { return { t: 'name', v: n }; }
  function op(o, args) { return { o: o, a: (args || []) }; }

  /* ---------------- contenido de la página ---------------- */
  function leerContenido(doc, page) {
    var c = page.node.Contents(), partes = [];
    if (!c) return '';
    function dec(s) { return latin1(PDFLib.decodePDFRawStream(s).decode()); }
    if (c instanceof PDFLib.PDFArray) { for (var i = 0; i < c.size(); i++) partes.push(dec(doc.context.lookup(c.get(i)))); }
    else partes.push(dec(c));
    return partes.join('\n');
  }

  /* ---------------- geometría ---------------- */
  function mul(a, b) { return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]]; }
  function ap(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function escala(m) { return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); }
  var PAINT = { S: 1, s: 1, f: 1, F: 1, 'f*': 1, B: 1, b: 1, 'B*': 1, 'b*': 1, n: 1, sh: 1 };
  var COLOR = { scn: 1, SCN: 1, sc: 1, SC: 1, k: 1, K: 1, g: 1, G: 1 };

  // Bloques de un nivel de anidación q...Q con sus puntos absolutos (pt), recortes y colores
  function segmentar(ops, nivel) {
    var ctm = [1, 0, 0, 1, 0, 0], pila = [], pts = [], segs = [], depth = 0, cur = null;
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i].o, a = ops[i].a.map(function (t) { return parseFloat(t.v); });
      if (o === 'q') { pila.push(ctm.slice()); depth++; if (depth === nivel) cur = { ini: i, pts: [], clip: [], ops: {}, colors: [] }; }
      else if (o === 'Q') { ctm = pila.pop() || [1, 0, 0, 1, 0, 0]; if (depth === nivel && cur) { cur.fin = i; segs.push(cur); cur = null; } depth--; }
      else if (o === 'cm') ctm = mul(a, ctm);
      else if (o === 'm' || o === 'l') pts.push(ap(ctm, a[0], a[1]));
      else if (o === 'c') { pts.push(ap(ctm, a[0], a[1]), ap(ctm, a[2], a[3]), ap(ctm, a[4], a[5])); }
      else if (o === 'v' || o === 'y') { pts.push(ap(ctm, a[0], a[1]), ap(ctm, a[2], a[3])); }
      else if (o === 're') { pts.push(ap(ctm, a[0], a[1]), ap(ctm, a[0] + a[2], a[1] + a[3])); }
      else if (PAINT[o]) { if (cur) { if (o === 'n') cur.clip = cur.clip.concat(pts); else cur.pts = cur.pts.concat(pts); cur.ops[o] = (cur.ops[o] || 0) + 1; } pts = []; }
      else if (COLOR[o]) { if (cur) cur.colors.push([o, a.filter(function (x) { return !isNaN(x); })]); }
    }
    return segs;
  }
  // Estilo de trazo vigente en cada operador S (color, espacio de color y grosor efectivo en pt)
  function estilosDeTrazo(ops) {
    var ctm = [1, 0, 0, 1, 0, 0], st = { w: 1, cs: null, op: null, args: null }, pila = [], est = {};
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i].o;
      if (o === 'q') pila.push({ ctm: ctm.slice(), st: Object.assign({}, st) });
      else if (o === 'Q') { var p = pila.pop(); if (p) { ctm = p.ctm; st = p.st; } }
      else if (o === 'cm') ctm = mul(ops[i].a.map(function (t) { return parseFloat(t.v); }), ctm);
      else if (o === 'w') st.w = parseFloat(ops[i].a[0].v);
      else if (o === 'CS') { st.cs = ops[i].a[0].v; st.op = null; }
      else if (o === 'SCN' || o === 'SC') { st.op = o; st.args = ops[i].a.map(function (t) { return t.v; }); }
      else if (o === 'K' || o === 'G' || o === 'RG') { st.op = o; st.cs = null; st.args = ops[i].a.map(function (t) { return t.v; }); }
      else if (o === 'S') est[i] = { cs: st.cs, op: st.op, args: st.args, ew: st.w * escala(ctm), esc: escala(ctm) };
    }
    return est;
  }

  /* ---------------- reconocer la cuadrícula ---------------- */
  function agrupar(v, tol) { var g = []; v.forEach(function (x) { if (g.length && Math.abs(x - g[g.length - 1][g[g.length - 1].length - 1]) <= tol) g[g.length - 1].push(x); else g.push([x]); }); return g.map(function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }); }
  function esFranja(b) {      // franjas planas que dejó el ajuste de medida en lugar de un degradado (sh)
    return (b.ops.f || 0) >= 40 && b.colors.length >= 40 && b.colors.every(function (c) { return c[0] === 'k'; });
  }
  function leerHint(page) {
    try { var a = page.node.lookupMaybe(PDFLib.PDFName.of('MontajesFrame'), PDFLib.PDFArray); if (!a) return null; return [0, 1, 2, 3].map(function (i) { return a.lookup(i, PDFLib.PDFNumber).asNumber(); }); } catch (e) { return null; }
  }
  function estructura(ops, Hpt, Wpt, hint) {
    // si todo el contenido está envuelto en un solo q...Q (lo deja el ajuste de medida) se baja un nivel
    var base = 1, segs;
    while (base < 6) { segs = segmentar(ops, base); if (segs.length === 1 && segs[0].ini <= 2 * base && segs[0].fin >= ops.length - 1 - base) base++; else break; }
    var bloques = segmentar(ops, base), hijos = segmentar(ops, base + 1), r = { ok: false };
    var Hmm = Hpt / PT;
    function bbox(s) { var P = s.pts.length ? s.pts : s.clip, xs = P.map(function (p) { return p[0] / PT; }), ys = P.map(function (p) { return Hmm - p[1] / PT; }); return [Math.min.apply(null, xs), Math.max.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, ys)]; }
    var marco = null, bsh = [], otrosBloques = [];
    bloques.forEach(function (b) {
      if (!b.pts.length && !b.ops.sh) return;
      var cian = b.colors.some(function (c) { return c[1].length === 4 && Math.abs(c[1][0] - 0.756) < 0.01; });
      var soloS = Object.keys(b.ops).every(function (k) { return k === 'n' || k === 'S'; });
      if (cian && soloS) { marco = b; return; }
      if (b.ops.sh || esFranja(b)) { bsh.push(b); return; }
      otrosBloques.push(b);
    });
    // líneas de la cuadrícula: trazos rectos y largos, un trazo por línea
    var lineas = [], hijosNoLinea = [];
    hijos.forEach(function (s) {
      if (!s.pts.length) return;
      var b = bbox(s), solo = Object.keys(s.ops).length === 1 && s.ops.S;
      if (solo && (b[1] - b[0] < 0.3 || b[3] - b[2] < 0.3) && Math.max(b[1] - b[0], b[3] - b[2]) > 20) lineas.push({ s: s, b: b }); else hijosNoLinea.push({ s: s, b: b });
    });
    var vx = lineas.filter(function (l) { return l.b[1] - l.b[0] < 0.3; }).map(function (l) { return Math.round((l.b[0] + l.b[1]) / 2 * 100) / 100; }).sort(function (a, b) { return a - b; });
    var hy = lineas.filter(function (l) { return l.b[3] - l.b[2] < 0.3; }).map(function (l) { return Math.round((l.b[2] + l.b[3]) / 2 * 100) / 100; }).sort(function (a, b) { return a - b; });
    vx = agrupar(vx, 0.3); hy = agrupar(hy, 0.3);
    if (lineas.length < 8 || vx.length < 4 || hy.length < 4) { r.motivo = 'No reconozco una cuadrícula de trazos rectos en esta página.'; return r; }
    var px = (vx[vx.length - 1] - vx[0]) / (vx.length - 1), py = (hy[hy.length - 1] - hy[0]) / (hy.length - 1);
    var gx0 = vx[0], gx1 = vx[vx.length - 1], gy0 = hy[0], gy1 = hy[hy.length - 1];
    var frame;
    if (marco) { var f = bbox(marco); frame = { x0: f[0], x1: f[1], y0: f[2], y1: f[3], guia: true }; }
    else if (hint) frame = { x0: hint[0], y0: hint[1], x1: hint[2], y1: hint[3], guia: true };
    else frame = { x0: 0, x1: Wpt / PT, y0: 0, y1: Hmm, guia: false };
    // marca de agua = bloques cuyo contenido cae dentro de la cuadrícula; el resto (logo, pie…) se trata por segmentos
    var bwm = [], bresto = [];
    otrosBloques.forEach(function (b) {
      if (lineas.some(function (l) { return l.s.ini >= b.ini && l.s.fin <= b.fin; })) { bresto.push(b); return; }     // bloque de la cuadrícula: sus demás piezas (logo, pie) se tratan por segmentos
      var bb = bbox(b), dentro = bb[0] >= gx0 - 5 && bb[1] <= gx1 + 5 && bb[2] >= gy0 - 5 && bb[3] <= gy1 + 5;
      (dentro ? bwm : bresto).push(b);
    });
    var otros = hijosNoLinea.filter(function (x) { return bresto.some(function (b) { return x.s.ini >= b.ini && x.s.fin <= b.fin; }); });
    r = { ok: true, base: base, bloques: bloques, hijos: hijos, marco: marco, bwm: bwm, bsh: bsh, frame: frame, lineas: lineas, otros: otros, vx: vx, hy: hy, px: px, py: py, bbox: bbox, Hmm: Hmm,
      gx0: gx0, gx1: gx1, gy0: gy0, gy1: gy1 };
    r.margenes = { izq: gx0 - frame.x0, der: frame.x1 - gx1, arriba: gy0 - frame.y0, abajo: frame.y1 - gy1 };
    return r;
  }

  /* ---------------- plan del ajuste ---------------- */
  function planear(est, p) {
    var minA = p.minAnillo || 13, minO = p.minOtros || 7;
    var ring = (p.anillo === 'der') ? 'der' : (p.anillo === 'arriba' ? 'arriba' : 'izq');
    var L = ring === 'izq' ? Math.max(p.mmAnillo, minA) : Math.max(p.mmOtros, minO);
    var R = ring === 'der' ? Math.max(p.mmAnillo, minA) : Math.max(p.mmOtros, minO);
    var ncols = Math.max(1, Math.round((p.W - L - R) / est.px));
    var px = (p.W - L - R) / ncols;
    var T0 = est.margenes.arriba, B0 = est.margenes.abajo;
    if (ring === 'arriba') { T0 = Math.max(T0, minA, p.mmAnillo); B0 = Math.max(B0, minO); }   // anillado arriba: el margen superior no baja de 13 mm y el inferior no de 7
    var nrows = Math.max(1, Math.round((p.H - T0 - B0) / est.py));
    var cambio = (px / est.px - 1) * 100;
    return { L: L, R: R, ncols: ncols, nrows: nrows, px: px, py: est.py, gw: ncols * px, gh: nrows * est.py, T0: T0, cambioPaso: cambio,
      colsAntes: est.vx.length - 1, filasAntes: est.hy.length - 1 };
  }

  /* ---------------- aplicar al contenido ---------------- */
  function kDegradado(doc, page) {
    var N = PDFLib.PDFName, res = page.node.Resources();
    var sh = res && res.lookupMaybe(N.of('Shading'), PDFLib.PDFDict);
    return function (nombre, t) {
      try {
        var sd = sh.lookup(N.of(nombre.slice(1)), PDFLib.PDFDict);
        var f = sd.lookup(N.of('Function'), PDFLib.PDFDict);
        function val(arr) { return arr.lookup(0, PDFLib.PDFNumber).asNumber(); }
        function ev(fd, t0) {
          var tipo = fd.lookup(N.of('FunctionType'), PDFLib.PDFNumber).asNumber();
          if (tipo === 2) { var c0 = val(fd.lookup(N.of('C0'), PDFLib.PDFArray)), c1 = val(fd.lookup(N.of('C1'), PDFLib.PDFArray)); return c0 + (c1 - c0) * t0; }
          if (tipo === 3) {
            var b = []; var ba = fd.lookupMaybe(N.of('Bounds'), PDFLib.PDFArray); if (ba) for (var i = 0; i < ba.size(); i++) b.push(ba.lookup(i, PDFLib.PDFNumber).asNumber());
            var fs = fd.lookup(N.of('Functions'), PDFLib.PDFArray), idx = 0; while (idx < b.length && t0 > b[idx]) idx++;
            var lo = idx > 0 ? b[idx - 1] : 0, hi = idx < b.length ? b[idx] : 1;
            return ev(fs.lookup(idx, PDFLib.PDFDict), hi <= lo ? 0 : (t0 - lo) / (hi - lo));
          }
          throw new Error('función no soportada');
        }
        return ev(f, t);
      } catch (e) { return null; }
    };
  }

  function aplicarAOps(ops, est, plan, p, kdeg) {
    var Hmm = est.Hmm, fr = est.frame, MM = PT;
    var estilos = estilosDeTrazo(ops);
    var borrar = {}, insertar = {};
    function rango(a, b) { for (var i = a; i <= b; i++) borrar[i] = true; }
    function trasl(tx, ty) { return [op('cm', [num(1), num(0), num(0), num(1), num(tx * MM), num(-ty * MM)])]; }
    var T0 = est.margenes.arriba, L0 = est.margenes.izq;
    var dgx = (plan.L + plan.gw) - (L0 + (est.gx1 - est.gx0));
    var dL = plan.L - L0;
    var dfoot = p.H - (fr.y1 - fr.y0);
    var nHead = 0, nFoot = 0;
    est.otros.forEach(function (x) {
      var b = x.b, cx = (b[0] + b[1]) / 2;
      var cy = (b[2] + b[3]) / 2, arriba = cy <= est.gy0 + 0.8, abajo = cy >= est.gy1 - 0.8;   // por el centro: el logo circular del pie invade un poco la cuadrícula
      var relx = cx - fr.x0, W0 = fr.x1 - fr.x0;
      var dx;
      if (relx < 0.4 * W0) dx = dL; else if (relx > 0.6 * W0) dx = dgx; else dx = (dL + dgx) / 2;
      if (arriba) { insertar[x.s.ini] = (insertar[x.s.ini] || []).concat(trasl(dx, 0)); nHead++; }
      else if (abajo) { insertar[x.s.ini] = (insertar[x.s.ini] || []).concat(trasl(dx, dfoot)); nFoot++; }
    });
    // marca de agua: bloques de relleno y degradados que quedan dentro de la cuadrícula
    var wmBloques = est.bwm.slice(), shWm = [], shHead = [];
    est.bsh.forEach(function (b) { var bb = est.bbox(b); if (bb[2] >= est.gy0 && bb[3] <= est.gy1) shWm.push(b); else shHead.push(b); });
    var todosWm = wmBloques.concat(shWm);
    var cwm = todosWm.map(function (b) { return est.bbox(b); });
    var wdx = 0, wdy = 0;
    if (cwm.length) {
      var wx0 = Math.min.apply(null, cwm.map(function (a) { return a[0]; })), wx1 = Math.max.apply(null, cwm.map(function (a) { return a[1]; }));
      var wy0 = Math.min.apply(null, cwm.map(function (a) { return a[2]; })), wy1 = Math.max.apply(null, cwm.map(function (a) { return a[3]; }));
      wdx = (fr.x0 + plan.L + plan.gw / 2) - (wx0 + wx1) / 2; wdy = (fr.y0 + plan.T0 + plan.gh / 2) - (wy0 + wy1) / 2;
      todosWm.forEach(function (b) { insertar[b.ini] = (insertar[b.ini] || []).concat(trasl(wdx, wdy)); });
    }
    shHead.forEach(function (b) { insertar[b.ini] = (insertar[b.ini] || []).concat(trasl(dgx, 0)); });
    // estilos de las líneas que se van a reconstruir
    function clave(s) { return JSON.stringify([s.cs, s.op, s.args, Math.round(s.ew * 100) / 100]); }
    function estiloDe(l) { for (var i = l.s.ini; i <= l.s.fin; i++) if (ops[i].o === 'S' && estilos[i]) return estilos[i]; return null; }
    var vL = est.lineas.filter(function (l) { return l.b[1] - l.b[0] < 0.3; }), hL = est.lineas.filter(function (l) { return l.b[3] - l.b[2] < 0.3; });
    var extremos = [Math.round(est.vx[0] * 100) / 100, Math.round(est.vx[est.vx.length - 1] * 100) / 100];
    var interior = [], borde = [];
    vL.forEach(function (l) { var x = (l.b[0] + l.b[1]) / 2; (Math.abs(x - est.vx[0]) < 0.3 || Math.abs(x - est.vx[est.vx.length - 1]) < 0.3 ? borde : interior).push(estiloDe(l)); });
    hL.forEach(function (l) { var y = (l.b[2] + l.b[3]) / 2; (Math.abs(y - est.hy[0]) < 0.3 || Math.abs(y - est.hy[est.hy.length - 1]) < 0.3 ? borde : interior).push(estiloDe(l)); });
    function masComun(arr) { var c = {}, mejor = null, n = 0; arr.forEach(function (s) { if (!s) return; var k = clave(s); c[k] = (c[k] || 0) + 1; if (c[k] > n) { n = c[k]; mejor = s; } }); return mejor; }
    var stInt = masComun(interior), stBor = masComun(borde) || stInt;
    est.lineas.forEach(function (l) { rango(l.s.ini, l.s.fin); });
    if (est.marco) rango(est.marco.ini, est.marco.fin);                 // guía celeste de Illustrator: no se imprime
    // recortes de página completa (re W n del tamaño de la página original): Illustrator los muestra como una máscara gigante
    var W0 = null;
    for (var i = 0; i < ops.length - 2; i++) {
      if (ops[i].o === 're' && ops[i + 1].o === 'W' && ops[i + 2].o === 'n') {
        var w = Math.abs(parseFloat(ops[i].a[2].v)), h = Math.abs(parseFloat(ops[i].a[3].v));
        if (est.Wpt && Math.abs(w - est.Wpt) < 1 && Math.abs(h - est.Hpt) < 1) { borrar[i] = borrar[i + 1] = borrar[i + 2] = true; }
      }
    }
    // degradados (sh) -> franjas planas de K (Illustrator no los importa bien)
    var porSh = {};
    for (var j = 0; j < ops.length; j++) {
      if (ops[j].o === 'sh') {
        var nombre = ops[j].a[0].v, ok = true, tramos = [], N = 48;
        for (var q = 0; q < N; q++) { var kk = kdeg(nombre, (q + 0.5) / N); if (kk === null) { ok = false; break; } tramos.push(Math.max(0, kk)); }
        if (ok) {
          if (j > 0 && ops[j - 1].o === 'BX') borrar[j - 1] = true; if (ops[j + 1] && ops[j + 1].o === 'EX') borrar[j + 1] = true;
          var nuevos = [];
          tramos.forEach(function (kk, q) { var t0 = q / N, t1 = (q + 1) / N; nuevos.push(op('k', [num(0), num(0), num(0), num(kk)]), op('re', [num(t0), num(0), num(t1 - t0 + (q < N - 1 ? 0.004 : 0)), num(1)]), op('f')); });
          porSh[j] = nuevos;
        }
      }
    }
    // reescribir
    var nuevo = [];
    for (var m = 0; m < ops.length; m++) {
      if (borrar[m]) continue;
      if (porSh[m]) { porSh[m].forEach(function (x) { nuevo.push(x); }); continue; }
      nuevo.push(ops[m]);
      if (insertar[m]) insertar[m].forEach(function (x) { nuevo.push(x); });
    }
    // cuadrícula nueva
    var shx = 0, shy = 0;   // traslación de las envolturas previas: la cuadrícula nueva se dibuja dentro de ellas
    if (est.base > 1) for (var kk0 = 0; kk0 < est.base - 1; kk0++) { var cw0 = ops[2 * kk0 + 1]; if (cw0 && cw0.o === 'cm') { shx += parseFloat(cw0.a[4].v); shy += parseFloat(cw0.a[5].v); } }
    var X = function (x) { return num(x * MM - shx); }, Y = function (y) { return num((Hmm - y) * MM - shy); };
    var gx = fr.x0 + plan.L, gy = fr.y0 + plan.T0, gw = plan.gw, gh = plan.gh;
    var gIni = nuevo.length;
    nuevo.push(op('q'));
    function estilo(st) {
      if (!st) return;
      if (st.cs) nuevo.push(op('CS', [nom(st.cs)]));
      if (st.op) nuevo.push(op(st.op, st.args.map(function (v) { return { t: 'num', v: v }; })));
      nuevo.push(op('w', [num(st.ew)]));
    }
    function linea(xa, ya, xb, yb, st) { nuevo.push(op('q')); estilo(st); nuevo.push(op('m', [X(xa), Y(ya)]), op('l', [X(xb), Y(yb)]), op('S'), op('Q')); }
    for (var c = 0; c <= plan.ncols; c++) linea(gx + c * plan.px, gy, gx + c * plan.px, gy + gh, (c === 0 || c === plan.ncols) ? stBor : stInt);
    for (var r = 0; r <= plan.nrows; r++) linea(gx, gy + r * plan.py, gx + gw, gy + r * plan.py, (r === 0 || r === plan.nrows) ? stBor : stInt);
    nuevo.push(op('Q'));
    var gridOps = nuevo.splice(gIni);
    // origen de la página en (0,0): Illustrator ancla la mesa de trabajo ahí
    var ox = fr.x0 * MM, oy = (Hmm - fr.y0 - p.H) * MM, final;
    var cmT = op('cm', [num(1), num(0), num(0), num(1), num(-ox), num(-oy)]);
    if (est.base > 1) {      // ya viene envuelto por un ajuste anterior: se suma la traslación dentro de la misma envoltura (no se anidan más)
      var kw = 2 * (est.base - 1), ncl = est.base - 1;
      final = nuevo.slice(0, kw).concat([cmT], nuevo.slice(kw, nuevo.length - ncl), gridOps, nuevo.slice(nuevo.length - ncl));
    } else final = [op('q'), cmT].concat(nuevo, gridOps, [op('Q')]);
    return { ops: final, resumen: { encabezado: nHead, pie: nFoot, lineasQuitadas: est.lineas.length, marcaAguaMm: [wdx, wdy] } };
  }

  /* ---------------- API ---------------- */
  async function analizar(bytes) {
    var doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    var out = [];
    var pages = doc.getPages();
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i], sz = page.getSize(), txt, ops;
      try { txt = leerContenido(doc, page); ops = aOperaciones(txt); }
      catch (e) { out.push({ ok: false, motivo: 'No pude leer el contenido de la página (' + e.message + ').' }); continue; }
      var est = estructura(ops, sz.height, sz.width, leerHint(page));
      if (!est.ok) { out.push({ ok: false, motivo: est.motivo }); continue; }
      out.push({ ok: true, columnas: est.vx.length - 1, filas: est.hy.length - 1, pasoX: est.px, pasoY: est.py, margenes: est.margenes,
        ancho: est.gx1 - est.gx0, alto: est.gy1 - est.gy0, pagina: { w: est.frame.x1 - est.frame.x0, h: est.frame.y1 - est.frame.y0, conGuia: est.frame.guia } });
    }
    return out;
  }

  // params: { W, H (mm), anillo:'izq'|'der', mmAnillo, mmOtros }
  async function aplicar(bytes, p) {
    var N = PDFLib.PDFName;
    var doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    var informe = [];
    var pages = doc.getPages();
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i], sz = page.getSize(), ops, est;
      try { ops = aOperaciones(leerContenido(doc, page)); est = estructura(ops, sz.height, sz.width, leerHint(page)); }
      catch (e) { informe.push({ pagina: i + 1, ok: false, motivo: 'No pude leer el contenido (' + e.message + ').' }); continue; }
      if (!est.ok) { informe.push({ pagina: i + 1, ok: false, motivo: est.motivo }); continue; }
      est.Wpt = sz.width; est.Hpt = sz.height;
      var plan = planear(est, p);
      if (plan.gw > p.W || plan.gh > p.H) { informe.push({ pagina: i + 1, ok: false, motivo: 'La cuadrícula no cabe en el formato pedido.' }); continue; }
      var res = aplicarAOps(ops, est, plan, p, kDegradado(doc, page));
      var contenido = serializar(res.ops);
      var bytesC = new Uint8Array(contenido.length); for (var k = 0; k < contenido.length; k++) bytesC[k] = contenido.charCodeAt(k) & 255;
      var stream = doc.context.flateStream ? doc.context.flateStream(bytesC) : doc.context.stream(bytesC);
      page.node.set(N.of('Contents'), doc.context.register(stream));
      var Wp = p.W * PT, Hp = p.H * PT;
      page.setMediaBox(0, 0, Wp, Hp); page.setCropBox(0, 0, Wp, Hp); page.setTrimBox(0, 0, Wp, Hp); page.setBleedBox(0, 0, Wp, Hp); page.setArtBox(0, 0, Wp, Hp);
      ['PieceInfo', 'Thumb', 'LastModified', 'MontajesFrame'].forEach(function (k) { page.node.delete(N.of(k)); });
      informe.push({ pagina: i + 1, ok: true, antes: { columnas: plan.colsAntes, filas: plan.filasAntes, pasoX: est.px, margenes: est.margenes },
        despues: { columnas: plan.ncols, filas: plan.nrows, pasoX: plan.px, cambioPasoPct: plan.cambioPaso, margenIzq: plan.L, margenDer: plan.R, margenArriba: plan.T0, margenAbajo: p.H - plan.T0 - plan.gh },
        piezas: res.resumen });
    }
    ['PieceInfo', 'Metadata'].forEach(function (k) { doc.catalog.delete(N.of(k)); });
    var salida = await doc.save();
    return { bytes: salida, informe: informe };
  }

  // Cálculo del plan a partir de lo que devolvió analizar() (para mostrar el antes y el después sin tocar el archivo)
  function simular(a, p) {
    return planear({ px: a.pasoX, py: a.pasoY, margenes: a.margenes, vx: { length: a.columnas + 1 }, hy: { length: a.filas + 1 } }, p);
  }
  /* ---------------- Receta de tinta ---------------- */
  // Plantilla de Conde "Plantilla cuadernos color y línea.ai"
  var RECETAS = {
    coolgray: { nombre: 'Cool Gray', linea: 0.2, kLinea: 0.35, borde: 0.35, kBorde: 0.35, kMarca: 0.22, kLogo: 0.90 },
    negra:    { nombre: 'Negro',     linea: 0.25, kLinea: 0.20, borde: 0.35, kBorde: 0.60, kMarca: 0.09, kLogo: 0.50 }
  };
  function aK(args) {      // mezcla de C/M/Y con K -> K puro equivalente
    var c = args[0], m = args[1], y = args[2], k = args[3];
    return Math.min(1, k + 0.9 * (c + m + y) / 3);
  }
  function kTok(k) { return num(Math.round(k * 10000) / 10000); }

  async function recetaTinta(bytes, p) {
    var N = PDFLib.PDFName, R = RECETAS[p.tinta] || RECETAS.coolgray;
    var doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    var informe = [], pages = doc.getPages();
    for (var pi = 0; pi < pages.length; pi++) {
      var page = pages[pi], sz = page.getSize(), ops, est;
      try { ops = aOperaciones(leerContenido(doc, page)); est = estructura(ops, sz.height, sz.width, leerHint(page)); }
      catch (e) { informe.push({ pagina: pi + 1, ok: false, motivo: 'No pude leer el contenido (' + e.message + ').' }); continue; }
      if (!est.ok) { informe.push({ pagina: pi + 1, ok: false, motivo: est.motivo }); continue; }
      est.Wpt = sz.width; est.Hpt = sz.height;
      var kdeg = kDegradado(doc, page), estil = estilosDeTrazo(ops);
      var borrar = {}, antes = {}, despuesQ = {}, cambio = {}, cuenta = { lineas: 0, bordes: 0, logo: 0, marca: 0, mezclas: 0, rgb: 0, franjas: 0 };
      function ins(mapa, i, lista) { mapa[i] = (mapa[i] || []).concat(lista); }
      // a) cuadrícula: grosor y tono de la receta (el borde exterior lleva el suyo)
      est.lineas.forEach(function (l) {
        var vert = l.b[1] - l.b[0] < 0.3, c = vert ? (l.b[0] + l.b[1]) / 2 : (l.b[2] + l.b[3]) / 2, ext = vert ? [est.vx[0], est.vx[est.vx.length - 1]] : [est.hy[0], est.hy[est.hy.length - 1]];
        var borde = Math.abs(c - ext[0]) < 0.3 || Math.abs(c - ext[1]) < 0.3;
        var kRec = borde ? R.kBorde : R.kLinea, propio = false;
        for (var j = l.s.ini; j <= l.s.fin; j++) if ((ops[j].o === 'SCN' || ops[j].o === 'K') && ops[j].a.length === 4) { cambio[j] = [num(0), num(0), num(0), kTok(kRec)]; propio = true; }
        for (var i = l.s.ini; i <= l.s.fin; i++) if (ops[i].o === 'S' && estil[i]) {
          var esc = estil[i].esc || 1, extra = [op('w', [num((borde ? R.borde : R.linea) * PT / esc)])];
          if (!propio) extra.unshift(op('K', [num(0), num(0), num(0), kTok(kRec)]));
          ins(antes, i, extra);
          if (borde) cuenta.bordes++; else cuenta.lineas++;
          break;
        }
      });
      // b) logo del encabezado
      est.otros.forEach(function (x) {
        var cy = (x.b[2] + x.b[3]) / 2;
        if (cy <= est.gy0 + 0.8) { ins(despuesQ, x.s.ini, [op('k', [num(0), num(0), num(0), kTok(R.kLogo)])]); cuenta.logo++; }
      });
      // c) marca de agua: los tonos claros pasan al de la receta
      est.bwm.forEach(function (b) {
        for (var i = b.ini + 1; i < b.fin; i++) {
          var o = ops[i].o;
          if ((o === 'scn' || o === 'SCN' || o === 'k' || o === 'K') && ops[i].a.length === 4) {
            var a4 = ops[i].a.map(function (t) { return parseFloat(t.v); });
            var claro = a4[3] < 0.35 && (a4[0] + a4[1] + a4[2]) < 0.5;     // tonos claros de la marca de agua (también sirve si ya traía una receta)
            cambio[i] = [num(0), num(0), num(0), kTok(claro ? R.kMarca : a4[3])]; cuenta.marca++;
          }
        }
      });
      // d) degradados -> franjas planas con el tono máximo de la receta (marca de agua o logo según dónde estén)
      var porSh = {};
      est.bsh.forEach(function (b) {
        var bb = est.bbox(b), objetivo = (bb[2] >= est.gy0 && bb[3] <= est.gy1) ? R.kMarca : R.kLogo;
        if (esFranja(b)) {
          var mx = 0; for (var i = b.ini; i <= b.fin; i++) if (ops[i].o === 'k') mx = Math.max(mx, parseFloat(ops[i].a[3].v));
          if (mx > 0) for (var j = b.ini; j <= b.fin; j++) if (ops[j].o === 'k') cambio[j] = [num(0), num(0), num(0), kTok(parseFloat(ops[j].a[3].v) * objetivo / mx)];
          cuenta.franjas++;
        } else {
          for (var q = b.ini; q <= b.fin; q++) if (ops[q].o === 'sh') {
            var nombre = ops[q].a[0].v, tramos = [], ok = true, NN = 48, mx2 = 0;
            for (var s0 = 0; s0 < NN; s0++) { var kk = kdeg(nombre, (s0 + 0.5) / NN); if (kk === null) { ok = false; break; } tramos.push(Math.max(0, kk)); mx2 = Math.max(mx2, kk); }
            if (!ok) continue;
            if (ops[q - 1] && ops[q - 1].o === 'BX') borrar[q - 1] = true; if (ops[q + 1] && ops[q + 1].o === 'EX') borrar[q + 1] = true;
            var nuevos = [];
            tramos.forEach(function (kk, s1) { var t0 = s1 / NN, t1 = (s1 + 1) / NN; nuevos.push(op('k', [num(0), num(0), num(0), kTok(mx2 > 0 ? kk * objetivo / mx2 : 0)]), op('re', [num(t0), num(0), num(t1 - t0 + (s1 < NN - 1 ? 0.004 : 0)), num(1)]), op('f')); });
            porSh[q] = nuevos; cuenta.franjas++;
          }
        }
      });
      var pistaMarco = null;
      if (est.marco) { for (var mi = est.marco.ini; mi <= est.marco.fin; mi++) borrar[mi] = true; pistaMarco = [est.frame.x0, est.frame.y0, est.frame.x1, est.frame.y1]; }   // guía celeste de Illustrator: no se imprime
      // e) recorte de página completa y origen (compatibilidad con Illustrator)
      for (var ci = 0; ci < ops.length - 2; ci++) {
        if (ops[ci].o === 're' && ops[ci + 1].o === 'W' && ops[ci + 2].o === 'n') {
          var w = Math.abs(parseFloat(ops[ci].a[2].v)), h = Math.abs(parseFloat(ops[ci].a[3].v));
          if (Math.abs(w - sz.width) < 1 && Math.abs(h - sz.height) < 1) { borrar[ci] = borrar[ci + 1] = borrar[ci + 2] = true; }
        }
      }
      // f) reescribir; y lo que quede con mezcla de C/M/Y pasa a K puro; se cuentan colores RGB (no se convierten)
      var nuevo = [];
      for (var m = 0; m < ops.length; m++) {
        if (borrar[m]) continue;
        if (porSh[m]) { porSh[m].forEach(function (x) { nuevo.push(x); }); continue; }
        if (antes[m]) antes[m].forEach(function (x) { nuevo.push(x); });
        var oo = ops[m];
        if (cambio[m]) oo = { o: oo.o, a: cambio[m] };
        else if ((oo.o === 'scn' || oo.o === 'SCN' || oo.o === 'k' || oo.o === 'K') && oo.a.length === 4) {
          var v4 = oo.a.map(function (t) { return parseFloat(t.v); });
          if (v4[0] + v4[1] + v4[2] > 0.001) { oo = { o: oo.o, a: [num(0), num(0), num(0), kTok(aK(v4))] }; cuenta.mezclas++; }
        } else if (oo.o === 'rg' || oo.o === 'RG') cuenta.rgb++;
        nuevo.push(oo);
        if (despuesQ[m]) despuesQ[m].forEach(function (x) { nuevo.push(x); });
      }
      var mb = page.getMediaBox(), final = nuevo;
      if (Math.abs(mb.x) > 0.01 || Math.abs(mb.y) > 0.01) final = [op('q'), op('cm', [num(1), num(0), num(0), num(1), num(-mb.x), num(-mb.y)])].concat(nuevo, [op('Q')]);
      var contenido = serializar(final), bc = new Uint8Array(contenido.length);
      for (var z = 0; z < contenido.length; z++) bc[z] = contenido.charCodeAt(z) & 255;
      var stream = doc.context.flateStream ? doc.context.flateStream(bc) : doc.context.stream(bc);
      page.node.set(N.of('Contents'), doc.context.register(stream));
      if (Math.abs(mb.x) > 0.01 || Math.abs(mb.y) > 0.01) { page.setMediaBox(0, 0, mb.width, mb.height); page.setCropBox(0, 0, mb.width, mb.height); page.setTrimBox(0, 0, mb.width, mb.height); page.setBleedBox(0, 0, mb.width, mb.height); page.setArtBox(0, 0, mb.width, mb.height); }
      ['PieceInfo', 'Thumb', 'LastModified'].forEach(function (k) { page.node.delete(N.of(k)); });
      if (pistaMarco && !(Math.abs(mb.x) > 0.01 || Math.abs(mb.y) > 0.01)) page.node.set(N.of('MontajesFrame'), doc.context.obj(pistaMarco));
      informe.push({ pagina: pi + 1, ok: true, receta: R.nombre, lineas: cuenta.lineas, bordes: cuenta.bordes, logo: cuenta.logo, marca: cuenta.marca, franjas: cuenta.franjas, mezclas: cuenta.mezclas, rgb: cuenta.rgb });
    }
    ['PieceInfo', 'Metadata'].forEach(function (k) { doc.catalog.delete(N.of(k)); });
    return { bytes: await doc.save(), informe: informe };
  }

  root.MontajesAjuste = { analizar: analizar, aplicar: aplicar, simular: simular, receta: recetaTinta, RECETAS: RECETAS, _t: { planear: planear, tokenizar: tokenizar, aOperaciones: aOperaciones, serializar: serializar, estructura: estructura, leerContenido: leerContenido } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MontajesAjuste;
})(typeof window !== 'undefined' ? window : globalThis);
