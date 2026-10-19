/* Revisión del archivo (preflight reducido) para Montajes y Montaje de Cuaderno.
   Solo avisa: no corrige nada y NO bloquea (es una prueba de impresión, no el archivo final).
   Umbrales de Conde (2026-10-19): imágenes bajo 150 ppp en rojo; texto en varias tintas (negro enriquecido) siempre, sin importar el tamaño;
   trazos mínimo 0,15 mm; texto claro/sobre fondo oscuro mínimo 6 pt.
   Lee la estructura del PDF con pdf-lib (colores, tintas, imágenes, fuentes, trazos, texto). Necesita montajes_ajuste_pdf.js (tokenizador). */
(function (root) {
  'use strict';
  var PDFLib = root.PDFLib || (typeof require !== 'undefined' ? require('pdf-lib') : null);
  var Aj = root.MontajesAjuste || (typeof require !== 'undefined' ? require('./montajes_ajuste_pdf.js') : null);
  var PT = 72 / 25.4;
  var MIN_PPP = 150, BUENO_PPP = 300, MIN_TRAZO_MM = 0.15, MIN_TEXTO_CLARO_PT = 6;
  var N = PDFLib.PDFName;

  function latin1(u8) { var s = '', n = 0x8000; for (var i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return s; }
  function mul(a, b) { return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]]; }
  function esc(m) { return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); }
  function nomDe(o) { if (!o) return ''; var s = o.toString ? o.toString() : String(o); return s.charAt(0) === '/' ? s.slice(1) : s; }
  function numDe(o, d) { return (o && o.asNumber) ? o.asNumber() : d; }
  function dec(stream) { try { return latin1(PDFLib.decodePDFRawStream(stream).decode()); } catch (e) { return ''; } }
  function dic(o) { return o && o.dict ? o.dict : (o instanceof PDFLib.PDFDict ? o : null); }

  /* ---------------- espacios de color ---------------- */
  var STD14 = /^(Helvetica|Times|Courier|Symbol|ZapfDingbats|Arial|TimesNewRoman)/i;
  function claseCS(cs, ctx, prof) {
    // devuelve { t:'GRAY'|'RGB'|'CMYK'|'SPOT'|'LAB'|'PAT'|'OTRO', n, names }
    prof = prof || 0; if (prof > 4 || !cs) return { t: 'OTRO', n: 0, names: [] };
    var r = ctx.lookup(cs);
    if (r instanceof PDFLib.PDFName) {
      var s = nomDe(r);
      if (s === 'DeviceGray' || s === 'G' || s === 'CalGray') return { t: 'GRAY', n: 1, names: [] };
      if (s === 'DeviceRGB' || s === 'RGB' || s === 'CalRGB') return { t: 'RGB', n: 3, names: [] };
      if (s === 'DeviceCMYK' || s === 'CMYK') return { t: 'CMYK', n: 4, names: [] };
      if (s === 'Pattern') return { t: 'PAT', n: 0, names: [] };
      return { t: 'OTRO', n: 0, names: [] };
    }
    if (r instanceof PDFLib.PDFArray && r.size() > 0) {
      var tipo = nomDe(ctx.lookup(r.get(0)));
      if (tipo === 'ICCBased') {
        var st = ctx.lookup(r.get(1)), d = dic(st), n = d ? numDe(ctx.lookup(d.get(N.of('N'))), 3) : 3;
        return n === 1 ? { t: 'GRAY', n: 1, names: [] } : n === 4 ? { t: 'CMYK', n: 4, names: [] } : { t: 'RGB', n: 3, names: [], icc: true };
      }
      if (tipo === 'Separation') return { t: 'SPOT', n: 1, names: [nomDe(ctx.lookup(r.get(1)))] };
      if (tipo === 'DeviceN') {
        var arr = ctx.lookup(r.get(1)), names = [];
        if (arr instanceof PDFLib.PDFArray) for (var i = 0; i < arr.size(); i++) names.push(nomDe(ctx.lookup(arr.get(i))));
        return { t: 'SPOT', n: names.length, names: names };
      }
      if (tipo === 'Indexed') return claseCS(r.get(1), ctx, prof + 1);
      if (tipo === 'Lab') return { t: 'LAB', n: 3, names: [] };
      if (tipo === 'CalRGB') return { t: 'RGB', n: 3, names: [] };
      if (tipo === 'CalGray') return { t: 'GRAY', n: 1, names: [] };
      if (tipo === 'Pattern') return { t: 'PAT', n: 0, names: [] };
    }
    return { t: 'OTRO', n: 0, names: [] };
  }
  var PROC = { Cyan: 'C', Magenta: 'M', Yellow: 'Y', Black: 'K' };
  function luminancia(c) {
    if (!c) return 0;
    if (c.t === 'GRAY') return c.v[0];
    if (c.t === 'RGB') return 0.3 * c.v[0] + 0.59 * c.v[1] + 0.11 * c.v[2];
    if (c.t === 'CMYK') { var k = 1 - c.v[3]; return 0.3 * (1 - c.v[0]) * k + 0.59 * (1 - c.v[1]) * k + 0.11 * (1 - c.v[2]) * k; }
    if (c.t === 'SPOT') return 1 - (c.v[0] || 0);
    return 0.5;
  }
  function esBlanco(c) { return c && ((c.t === 'GRAY' && c.v[0] > 0.98) || (c.t === 'RGB' && c.v[0] > 0.98 && c.v[1] > 0.98 && c.v[2] > 0.98) || (c.t === 'CMYK' && c.v[0] + c.v[1] + c.v[2] + c.v[3] < 0.02)); }

  /* ---------------- recorrido del contenido ---------------- */
  function nuevaPagina(i) {
    return { pagina: i + 1, colores: { texto: {}, vector: {}, imagen: {} }, inks: { C: false, M: false, Y: false, K: false }, spots: {}, imagenes: [], fuentes: {},
      enriquecido: { n: 0, min: 1e9, max: 0 }, finos: { n: 0, min: 1e9 }, claro: { n: 0, min: 1e9 }, fuera: { n: 0 }, inline: 0, textos: 0 };
  }
  function contar(o, k) { o[k] = (o[k] || 0) + 1; }
  function marcarColor(pg, cat, c) {
    if (!c || esBlanco(c)) return;
    var clave = c.t === 'CMYK' ? ((c.v[0] + c.v[1] + c.v[2]) < 0.01 ? 'K' : 'CMYK') : c.t;
    contar(pg.colores[cat], clave);
    if (c.t === 'CMYK') { ['C', 'M', 'Y', 'K'].forEach(function (x, i) { if (c.v[i] > 0.005) pg.inks[x] = true; }); }
    else if (c.t === 'GRAY') { if (c.v[0] < 0.995) pg.inks.K = true; }
    else if (c.t === 'SPOT') c.names.forEach(function (nm) { if (PROC[nm]) pg.inks[PROC[nm]] = true; else if (nm !== 'None' && nm !== 'All') pg.spots[nm] = true; });
  }

  function recorrer(txt, res, ctm0, pg, cfg, prof, gs0) {
    var ctx = cfg.ctx, tb = cfg.trim;
    var re = /\bBI\b[\s\S]*?\sID\s[\s\S]*?\sEI\b/g, m, nin = 0;
    txt = txt.replace(re, function () { nin++; return ' '; }); pg.inline += nin;
    var toks = Aj._t.tokenizar(txt), opd = [], ctm = ctm0.slice();
    var gs = gs0 ? JSON.parse(JSON.stringify(gs0)) : { fcs: { t: 'GRAY', n: 1, names: [] }, scs: { t: 'GRAY', n: 1, names: [] }, fill: { t: 'GRAY', v: [0] }, stroke: { t: 'GRAY', v: [0] }, lw: 1, fs: 0, font: null, tr: 0, lead: 0 };
    var pila = [], tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0];
    var rF = res && res.lookupMaybe ? res.lookupMaybe(N.of('Font'), PDFLib.PDFDict) : null;
    var rC = res && res.lookupMaybe ? res.lookupMaybe(N.of('ColorSpace'), PDFLib.PDFDict) : null;
    var rX = res && res.lookupMaybe ? res.lookupMaybe(N.of('XObject'), PDFLib.PDFDict) : null;
    function nums() { return opd.map(function (t) { return parseFloat(t.v); }); }
    function setCS(nombre) {
      var cl = null;
      if (nombre === 'DeviceGray' || nombre === 'DeviceRGB' || nombre === 'DeviceCMYK' || nombre === 'Pattern') cl = claseCS(N.of(nombre), ctx);
      else if (rC) { var o = rC.get(N.of(nombre)); if (o) cl = claseCS(o, ctx); }
      return cl || { t: 'OTRO', n: 0, names: [] };
    }
    function colorDe(cs, v) {
      if (cs.t === 'PAT' || cs.t === 'OTRO') return { t: cs.t, v: v };
      if (cs.t === 'SPOT' && cs.n === 4 && cs.names.every(function (x) { return PROC[x]; })) { var cv = [0, 0, 0, 0]; cs.names.forEach(function (x, i) { cv[{ C: 0, M: 1, Y: 2, K: 3 }[PROC[x]]] = v[i] || 0; }); return { t: 'CMYK', v: cv }; }
      return { t: cs.t, v: v, names: cs.names };
    }
    function textoMostrar() {
      if (gs.tr === 3) return;
      var ef = gs.fs * esc(tm) * esc(ctm), pos = [tm[4] * ctm[0] + tm[5] * ctm[2] + ctm[4], tm[4] * ctm[1] + tm[5] * ctm[3] + ctm[5]];
      pg.textos++;
      var c = gs.fill; marcarColor(pg, 'texto', c);
      if (c && c.t === 'CMYK' && c.v.filter(function (x) { return x > 0.005; }).length >= 2) { pg.enriquecido.n++; pg.enriquecido.min = Math.min(pg.enriquecido.min, ef); pg.enriquecido.max = Math.max(pg.enriquecido.max, ef); }
      if (c && (esBlanco(c) || luminancia(c) > 0.6)) { if (ef < MIN_TEXTO_CLARO_PT) { pg.claro.n++; pg.claro.min = Math.min(pg.claro.min, ef); } }
      if (tb && (pos[0] < tb.x - 0.5 || pos[0] > tb.x + tb.w + 0.5 || pos[1] < tb.y - 0.5 || pos[1] > tb.y + tb.h + 0.5)) pg.fuera.n++;
      if (gs.font) pg.fuentes[gs.font.id] = gs.font;
    }
    function fuente(nombre) {
      var fd = rF ? rF.lookupMaybe(N.of(nombre), PDFLib.PDFDict) : null; if (!fd) return { id: nombre, nombre: nombre, incrustada: false, desconocida: true };
      var base = nomDe(ctx.lookup(fd.get(N.of('BaseFont')))) || nombre, sub = nomDe(ctx.lookup(fd.get(N.of('Subtype')))), emb = false, fdesc = fd;
      if (sub === 'Type3') emb = true;
      else {
        if (sub === 'Type0') { var de = ctx.lookup(fd.get(N.of('DescendantFonts'))); if (de instanceof PDFLib.PDFArray && de.size()) fdesc = ctx.lookup(de.get(0)); }
        var d = fdesc && fdesc.lookupMaybe ? fdesc.lookupMaybe(N.of('FontDescriptor'), PDFLib.PDFDict) : null;
        if (d) emb = !!(d.get(N.of('FontFile')) || d.get(N.of('FontFile2')) || d.get(N.of('FontFile3')));
      }
      return { id: base, nombre: base.replace(/^[A-Z]{6}\+/, ''), incrustada: emb, estandar: STD14.test(base.replace(/^[A-Z]{6}\+/, '')) };
    }
    function pintaTrazo() {
      var w = gs.lw * esc(ctm); if (esBlanco(gs.stroke)) return;
      marcarColor(pg, 'vector', gs.stroke);
      if (w / PT < MIN_TRAZO_MM) { pg.finos.n++; pg.finos.min = Math.min(pg.finos.min, w / PT); }
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t !== 'op') { opd.push(t); continue; }
      var o = t.v, a;
      switch (o) {
        case 'q': pila.push({ ctm: ctm.slice(), gs: JSON.parse(JSON.stringify(gs)) }); break;
        case 'Q': var p = pila.pop(); if (p) { ctm = p.ctm; gs = p.gs; } break;
        case 'cm': a = nums(); if (a.length === 6) ctm = mul(a, ctm); break;
        case 'w': a = nums(); gs.lw = a[0] || 0; break;
        case 'g': a = nums(); gs.fcs = claseCS(N.of('DeviceGray'), ctx); gs.fill = { t: 'GRAY', v: a }; break;
        case 'G': a = nums(); gs.scs = claseCS(N.of('DeviceGray'), ctx); gs.stroke = { t: 'GRAY', v: a }; break;
        case 'rg': a = nums(); gs.fcs = claseCS(N.of('DeviceRGB'), ctx); gs.fill = { t: 'RGB', v: a }; break;
        case 'RG': a = nums(); gs.scs = claseCS(N.of('DeviceRGB'), ctx); gs.stroke = { t: 'RGB', v: a }; break;
        case 'k': a = nums(); gs.fcs = claseCS(N.of('DeviceCMYK'), ctx); gs.fill = { t: 'CMYK', v: a }; break;
        case 'K': a = nums(); gs.scs = claseCS(N.of('DeviceCMYK'), ctx); gs.stroke = { t: 'CMYK', v: a }; break;
        case 'cs': gs.fcs = setCS(nomDe(opd[0] && opd[0].v)); gs.fill = colorDe(gs.fcs, gs.fcs.t === 'SPOT' ? [1] : gs.fcs.t === 'CMYK' ? [0, 0, 0, 1] : [0, 0, 0].slice(0, Math.max(1, gs.fcs.n))); break;
        case 'CS': gs.scs = setCS(nomDe(opd[0] && opd[0].v)); gs.stroke = colorDe(gs.scs, gs.scs.t === 'SPOT' ? [1] : gs.scs.t === 'CMYK' ? [0, 0, 0, 1] : [0, 0, 0].slice(0, Math.max(1, gs.scs.n))); break;
        case 'sc': case 'scn': a = nums().filter(function (x) { return !isNaN(x); }); gs.fill = colorDe(gs.fcs, a); break;
        case 'SC': case 'SCN': a = nums().filter(function (x) { return !isNaN(x); }); gs.stroke = colorDe(gs.scs, a); break;
        case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = [1, 0, 0, 1, 0, 0]; break;
        case 'Tf': gs.font = fuente(nomDe(opd[0] && opd[0].v)); gs.fs = parseFloat(opd[1] && opd[1].v) || 0; break;
        case 'Tr': gs.tr = parseInt(opd[0] && opd[0].v, 10) || 0; break;
        case 'TL': gs.lead = parseFloat(opd[0] && opd[0].v) || 0; break;
        case 'Td': a = nums(); tlm = mul([1, 0, 0, 1, a[0] || 0, a[1] || 0], tlm); tm = tlm.slice(); break;
        case 'TD': a = nums(); gs.lead = -(a[1] || 0); tlm = mul([1, 0, 0, 1, a[0] || 0, a[1] || 0], tlm); tm = tlm.slice(); break;
        case 'T*': tlm = mul([1, 0, 0, 1, 0, -gs.lead], tlm); tm = tlm.slice(); break;
        case 'Tm': a = nums(); if (a.length === 6) { tm = a; tlm = a.slice(); } break;
        case 'Tj': case 'TJ': textoMostrar(); break;
        case "'": case '"': tlm = mul([1, 0, 0, 1, 0, -gs.lead], tlm); tm = tlm.slice(); textoMostrar(); break;
        case 'S': case 's': pintaTrazo(); break;
        case 'B': case 'B*': case 'b': case 'b*': marcarColor(pg, 'vector', gs.fill); pintaTrazo(); break;
        case 'f': case 'F': case 'f*': marcarColor(pg, 'vector', gs.fill); break;
        case 'sh': marcarColor(pg, 'vector', gs.fill); break;
        case 'Do':
          var xo = rX ? rX.lookup(N.of(nomDe(opd[0] && opd[0].v))) : null, xd = dic(xo);
          if (xd) {
            var sub = nomDe(ctx.lookup(xd.get(N.of('Subtype'))));
            if (sub === 'Image') {
              var W = numDe(ctx.lookup(xd.get(N.of('Width'))), 0), H = numDe(ctx.lookup(xd.get(N.of('Height'))), 0);
              var mask = ctx.lookup(xd.get(N.of('ImageMask'))), bpc = numDe(ctx.lookup(xd.get(N.of('BitsPerComponent'))), 8);
              var cl = claseCS(xd.get(N.of('ColorSpace')), ctx), wpt = Math.hypot(ctm[0], ctm[1]), hpt = Math.hypot(ctm[2], ctm[3]);
              if (mask && mask.toString && mask.toString() === 'true') { /* máscara de 1 bit: no se mide */ }
              else {
                marcarColor(pg, 'imagen', { t: cl.t, v: cl.t === 'CMYK' ? [0, 0, 0, 1] : [0.5], names: cl.names });
                if (cl.t === 'CMYK') { pg.inks.C = pg.inks.M = pg.inks.Y = pg.inks.K = true; }
                if (wpt > 2 && hpt > 2 && W > 0 && H > 0 && bpc > 1) pg.imagenes.push({ ppp: Math.min(W / (wpt / 72), H / (hpt / 72)), w: W, h: H, cs: cl.t });
              }
            } else if (sub === 'Form' && prof < 8 && xo.dict) {
              var mx = xd.lookupMaybe(N.of('Matrix'), PDFLib.PDFArray), mat = [1, 0, 0, 1, 0, 0];
              if (mx && mx.size() === 6) mat = [0, 1, 2, 3, 4, 5].map(function (k) { return numDe(ctx.lookup(mx.get(k)), 0); });
              var rr = xd.lookupMaybe(N.of('Resources'), PDFLib.PDFDict) || res;
              recorrer(dec(xo), rr, mul(mat, ctm), pg, cfg, prof + 1, gs);
            }
          }
          break;
        default: break;
      }
      opd = [];
    }
  }

  /* ---------------- API ---------------- */
  async function revisar(bytes, opts) {
    opts = opts || {};
    var doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    var pages = doc.getPages(), out = [], max = Math.min(pages.length, opts.maxPaginas || 60);
    for (var i = 0; i < max; i++) {
      var page = pages[i], pg = nuevaPagina(i);
      var mb = page.getMediaBox(), tb = page.getTrimBox(), conTrim = Math.abs(tb.width - mb.width) > 0.5 || Math.abs(tb.height - mb.height) > 0.5;
      pg.rot = page.getRotation().angle || 0;
      var caja = conTrim ? tb : mb;
      pg.ancho = caja.width / PT; pg.alto = caja.height / PT; pg.conTrim = conTrim;
      try {
        var txt = Aj._t.leerContenido(doc, page), res = page.node.Resources();
        recorrer(txt, res, [1, 0, 0, 1, 0, 0], pg, { ctx: doc.context, trim: conTrim ? { x: tb.x, y: tb.y, w: tb.width, h: tb.height } : { x: mb.x, y: mb.y, w: mb.width, h: mb.height } }, 0, null);
      } catch (e) { pg.error = e.message; }
      out.push(pg);
    }
    return out;
  }

  /* ---------------- hallazgos (lo que ve el diseñador) ---------------- */
  function rangos(v) {
    var s = [], i = 0; v = v.slice().sort(function (a, b) { return a - b; });
    while (i < v.length) { var j = i; while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++; s.push(j > i + 1 ? v[i] + '–' + v[j] : v.slice(i, j + 1).join(', ')); i = j + 1; }
    return s.join(', ');
  }
  var r1 = function (x) { return String(Math.round(x * 10) / 10).replace('.', ','); };
  // paginas: arreglo de resultados de revisar() (ya con etiquetas opcionales en .etiqueta)
  function hallazgos(paginas) {
    var H = [], grupos = {};
    function add(sev, cod, titulo, pag, detalle) { var g = grupos[cod] || (grupos[cod] = { sev: sev, cod: cod, titulo: titulo, paginas: [], detalles: [] }); g.paginas.push(pag); if (detalle && g.detalles.indexOf(detalle) < 0) g.detalles.push(detalle); }
    paginas.forEach(function (p) {
      var n = p.etiqueta || p.pagina;
      if (p.error) { add('amarillo', 'ERR', 'No se pudo revisar el contenido de estas páginas', n, p.error); return; }
      // 4 resolución
      if (p.imagenes.length) {
        var mn = Math.min.apply(null, p.imagenes.map(function (x) { return x.ppp; }));
        if (mn < MIN_PPP) add('rojo', 'PPP', 'Imagen con muy baja resolución (menos de ' + MIN_PPP + ' ppp)', n, r1(mn) + ' ppp');
        else if (mn < BUENO_PPP) add('amarillo', 'PPP2', 'Imagen con resolución justa (ideal ' + BUENO_PPP + ' ppp)', n, Math.round(mn) + ' ppp');
      }
      // 1 espacios de color
      var rgb = []; ['texto', 'vector', 'imagen'].forEach(function (c) { if (p.colores[c].RGB) rgb.push({ texto: 'texto', vector: 'gráficas', imagen: 'imágenes' }[c]); });
      if (rgb.length) add('rojo', 'RGB', 'Hay color RGB (se convertirá al imprimir y el color puede cambiar)', n, rgb.join(', '));
      var otros = []; ['texto', 'vector', 'imagen'].forEach(function (c) { if (p.colores[c].LAB || p.colores[c].OTRO) otros.push(c); });
      if (otros.length) add('amarillo', 'LAB', 'Usa un espacio de color poco común (Lab u otro)', n, otros.join(', '));
      // 2 tintas
      var sp = Object.keys(p.spots);
      if (sp.length) add('amarillo', 'SPOT', 'Usa tintas directas (no son CMYK)', n, sp.join(', '));
      // 5 fuentes
      Object.keys(p.fuentes).forEach(function (k) {
        var f = p.fuentes[k]; if (f.incrustada) return;
        if (f.estandar) add('amarillo', 'FNT2', 'Fuente estándar sin incrustar (puede cambiar de aspecto)', n, f.nombre);
        else add('rojo', 'FNT', 'Fuente sin incrustar (se reemplazará y cambia el diseño)', n, f.nombre);
      });
      // 9 texto en varias tintas
      if (p.enriquecido.n) add('amarillo', 'ENR', 'Texto formado por varias tintas (el registro lo puede mostrar borroso); mejor en una sola tinta', n, p.enriquecido.n + ' textos, de ' + r1(p.enriquecido.min) + ' a ' + r1(p.enriquecido.max) + ' pt');
      // 14 rotación
      if (p.rot) add('amarillo', 'ROT', 'Página con rotación (revisa que no salga girada en el montaje)', n, p.rot + '°');
      // 16 trazos
      if (p.finos.n) add('amarillo', 'FINO', 'Trazos más finos de ' + String(MIN_TRAZO_MM).replace('.', ',') + ' mm (pueden no imprimir)', n, p.finos.n + ' trazos, el más fino ' + r1(p.finos.min < 1e8 ? p.finos.min : 0).replace(/^0$/, '0') + ' mm');
      // 17 texto claro pequeño
      if (p.claro.n) add('amarillo', 'CLARO', 'Texto claro (o en negativo) menor de ' + MIN_TEXTO_CLARO_PT + ' pt', n, p.claro.n + ' textos, el menor ' + r1(p.claro.min) + ' pt');
      // 19 fuera del trim
      if (p.fuera.n) add('rojo', 'FUERA', 'Texto fuera del formato final (en la zona que se corta)', n, p.fuera.n + ' textos');
    });
    // 20 coherencia del lote
    var tam = {}; paginas.forEach(function (p) { if (p.error) return; var k = r1(p.ancho) + ' × ' + r1(p.alto); (tam[k] = tam[k] || []).push(p.etiqueta || p.pagina); });
    var ks = Object.keys(tam);
    if (ks.length > 1) {
      var det = ks.map(function (k) { return k + ' mm (' + tam[k].length + ')'; }).join(' · ');
      H.push({ sev: 'rojo', cod: 'LOTE', titulo: 'Las páginas no tienen todas el mismo tamaño', paginas: [], detalles: [det], lote: true });
    }
    var orden = { rojo: 0, amarillo: 1, info: 2 };
    Object.keys(grupos).forEach(function (k) { H.push(grupos[k]); });
    // información: tintas y espacios de color usados
    var inks = { C: false, M: false, Y: false, K: false }, spots = {}, esp = {};
    paginas.forEach(function (p) { if (p.error) return; Object.keys(inks).forEach(function (k) { if (p.inks[k]) inks[k] = true; }); Object.keys(p.spots).forEach(function (k) { spots[k] = true; }); ['texto', 'vector', 'imagen'].forEach(function (c) { Object.keys(p.colores[c]).forEach(function (k) { esp[k] = true; }); }); });
    var usadas = Object.keys(inks).filter(function (k) { return inks[k]; }).concat(Object.keys(spots));
    var NOM = { K: 'Negro puro', CMYK: 'CMYK (varias tintas)', GRAY: 'Gris', RGB: 'RGB', SPOT: 'Tinta directa', LAB: 'Lab', PAT: 'Patrón', OTRO: 'Otro' };
    H.push({ sev: 'info', cod: 'TINTAS', titulo: 'Tintas que usa el archivo', paginas: [], detalles: [usadas.length ? usadas.join(' + ') : 'Ninguna detectada'] });
    H.push({ sev: 'info', cod: 'ESP', titulo: 'Espacios de color presentes', paginas: [], detalles: [Object.keys(esp).map(function (k) { return NOM[k] || k; }).join(' · ') || 'Ninguno'] });
    H.sort(function (a, b) { return orden[a.sev] - orden[b.sev]; });
    H.forEach(function (g) { g.rangoPaginas = g.paginas.length ? rangos(g.paginas.filter(function (x) { return typeof x === 'number'; })) + (g.paginas.some(function (x) { return typeof x !== 'number'; }) ? g.paginas.filter(function (x) { return typeof x !== 'number'; }).join(', ') : '') : ''; });
    return H;
  }

  var API = { revisar: revisar, hallazgos: hallazgos, UMBRALES: { MIN_PPP: MIN_PPP, BUENO_PPP: BUENO_PPP, MIN_TRAZO_MM: MIN_TRAZO_MM, MIN_TEXTO_CLARO_PT: MIN_TEXTO_CLARO_PT } };
  root.MontajesPreflight = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
