/* Tactical -- Motor de Cajas a Medida (Conde 2026-10-17).
   Genera el plano plano (corte + hendido) de cajas de cartulina/microcorrugado a partir de medidas + grosor del material.
   Sin DOM: se puede probar con Node (module.exports) y se usa en el navegador (window.CAJAS_MOTOR).
   Coordenadas en mm, y hacia abajo. Cada generador devuelve {cut:[polilineas], fold:[polilineas], info:{...}, avisos:[...]}.
   - 'bandeja'  : bandeja con tapa FEFCO 0427, deducida de las cajas de cartón de Conde (PDF "Caja bandeja para corte laser").
   - 'tuck'     : estuche con lengüetas (tuck end recto/inverso), reglas de Packmage (E=P-1.5, dust=(E+F+EX)/2, pegue 10-15).
   - 'tapafondo': tapa y fondo telescópica, bandeja de esquinas pegadas (pestañas de pegue de 10 mm a 45°).
   - 'nido'     : inserto con hueco rebajado para el objeto y ventanas para el dedo (pieza aparte, va dentro de una caja).
   Todo es BORRADOR hasta validar con muestra armada (ver avisos de cada familia). */
(function(root){
'use strict';

// Espesores: 1 punto = 0,0254 mm (C12 = 12 pt). Tolerancia de calibre de fábrica ±5%.
const CALIBRES = [
  { id:'C12',  nombre:'Cartulina C12',  mm:0.305 },
  { id:'C14',  nombre:'Cartulina C14',  mm:0.356 },
  { id:'C16',  nombre:'Cartulina C16',  mm:0.406 },
  { id:'C18',  nombre:'Cartulina C18',  mm:0.457 },
  { id:'C24',  nombre:'Cartulina C24',  mm:0.610 },
  { id:'P300', nombre:'Propalcote 300 g', mm:0.30, aprox:true },
  { id:'MICROE', nombre:'Microcorrugado E (referencia)', mm:1.5, aprox:true, grueso:true }
];

const HOJAS = [
  { id:'70x100', nombre:'Pliego 70 x 100 cm', w:1000, h:700 },
  { id:'50x70',  nombre:'1/2 pliego 50 x 70 cm', w:700, h:500 },
  { id:'35x50',  nombre:'1/4 pliego 35 x 50 cm', w:500, h:350 },
  { id:'60x90',  nombre:'Pliego 60 x 90 cm', w:900, h:600 }
];

const FAMILIAS = [
  { id:'bandeja',  num:1, nombre:'Bandeja con tapa (FEFCO 0427)', estado:'deducida de tus cajas', listo:true },
  { id:'tuck',     num:2, nombre:'Estuche con lengüetas (tuck end)', estado:'borrador sin validar', listo:true },
  { id:'tapafondo',num:3, nombre:'Tapa y fondo (telescópica)', estado:'borrador sin validar', listo:true },
  { id:'autofondo',num:4, nombre:'Fondo automático (crash lock)', estado:'próximamente', listo:false },
  { id:'dura',     num:5, nombre:'Caja dura (rígida)', estado:'próximamente', listo:false },
  { id:'manga',    num:6, nombre:'Manga (sleeve)', estado:'próximamente', listo:false },
  { id:'nido',     num:7, nombre:'Nido (inserto)', estado:'borrador sin validar', listo:true }
];

const r2 = x => Math.round(x*100)/100;
const clamp = (x,a,b) => Math.min(b, Math.max(a, x));

// Grosor efectivo = grosor del papel + holgura de corte/doblez (papel fino: 0,15 mm; cartón grueso: 0).
function espesorEfectivo(mm){
  const hol = mm >= 1 ? 0 : 0.15;
  return Math.max(0.05, Math.round((mm + hol)/0.05)*0.05);
}

function bez(p0,p1,p2,n){
  const o = [];
  for(let i=0;i<=n;i++){ const t=i/n, a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t;
    o.push([a*p0[0]+b*p1[0]+c*p2[0], a*p0[1]+b*p1[1]+c*p2[1]]); }
  return o;
}
// Redondea el vértice idx de la polilínea con curva cuadrática (d1 hacia atrás, d2 hacia adelante).
function fillet(pts, idx, d1, d2){
  const a=pts[idx-1], v=pts[idx], b=pts[idx+1];
  const toward = (p,q,d) => { const L=Math.hypot(q[0]-p[0],q[1]-p[1]); return [p[0]+(q[0]-p[0])*d/L, p[1]+(q[1]-p[1])*d/L]; };
  return bez(toward(v,a,d1), v, toward(v,b,d2), 10);
}
const mirrorX = (P,W) => P.map(([x,y]) => [W-x, y]);
const shift = (P,dx,dy) => P.map(([x,y]) => [x+dx, y+dy]);
function dedupe(P){
  const o=[]; for(const p of P){ const q=o[o.length-1]; if(!q || Math.abs(q[0]-p[0])>1e-9 || Math.abs(q[1]-p[1])>1e-9) o.push(p); } return o;
}

// ------------------------------------------------------------------ 1. BANDEJA CON TAPA (0427)
// Medidas: L ancho (largo), P profundo, A alto. 'exterior' = caja cerrada; 'interior' = lo que cabe adentro.
function bandeja(par){
  const t = par.t, avisos = [];
  let W,D,H;
  if(par.modo === 'interior'){ W = par.L+2*t; D = par.P; H = par.A; }
  else { W = par.L-2*t; D = par.P-2*t; H = par.A-t; }
  if(W<60 || D<40 || H<20) avisos.push('Caja pequeña: las lengüetas y orejas quedan muy chicas. Haz una muestra antes de producir.');
  if(par.modo!=='interior' && par.calibre && par.calibre.grueso) avisos.push('Material grueso: los descuentos de esta familia se dedujeron de cartón de 3,7 mm; valida con muestra.');
  const s = t/3.7, g = 2.0, ch = 2.0;
  const f = 1.6*t, p = Math.max(1.0, Math.round(2.3*t*10)/10), sw = r2(1.2*t);
  const Lt = Math.min(10, 0.15*D), m = 0.2*D;
  let Eb = Math.min(0.36*D, 30); Eb = Math.min(Eb, D/2-2, H-3);
  if(Eb < 8) avisos.push('El fondo es muy corto: las orejas de las paredes frontal/trasera quedan de menos de 8 mm.');
  const Ls = 0.43*H, Ew = 0.36*H, earR = [0.17*H, 0.22*H], flapR = [0.1*H, 0.072*H];
  const Ld = D+2*t, yL = -(H+Ld), lipTop = yL-H, c1 = t/2, fi = 0.25*t, dd = p/2;
  const cut = [], fold = [];
  const Xo = W+2*H+f, tb0 = D-m-Lt;
  const R1 = [[W-t,-H],[W,-H+t],[W,-H+t+g],[W+Eb,-H+t+g],[W+Eb,-g-2*t],[W+Eb-ch,-g],[W,-g],[W,0],[W+H,0],
    [W+H+f,c1],[Xo,c1],
    [Xo,m],[Xo+p,m+dd],[Xo+p,m+Lt-dd],[Xo,m+Lt],
    [Xo,tb0],[Xo+p,tb0+dd],[Xo+p,tb0+Lt-dd],[Xo,tb0+Lt],
    [Xo,D-c1],[W+H+f,D-c1],[W+H,D],[W-fi,D],[W-fi,D+g],[W+Eb-ch,D+g],
    [W+Eb,D+g+2*t],[W+Eb,D+H-t-g],[W-fi,D+H-t-g],[W-fi,D+H]];
  cut.push(R1.concat(mirrorX(R1,W).reverse()));
  for(const X0 of [0, W-sw]) for(const y0 of [m+0.5*s, tb0+0.5*s]){
    const y1 = y0+Lt-1.1*s;
    cut.push([[X0,y0],[X0+sw,y0],[X0+sw,y1],[X0,y1],[X0,y0]]);
  }
  // solapas laterales de la tapa
  const k = 0.3053, yA = yL+t;
  const flapR0 = [[t,yA],[t-Ls,yA+k*Ls],[t-Ls,-H-k*Ls],[t,-H]];
  const flap = [flapR0[0]].concat(fillet(flapR0,1,flapR[0],flapR[1]), fillet(flapR0,2,flapR[1],flapR[0]), [flapR0[3]]);
  cut.push(flap); cut.push(mirrorX(flap,W));
  // labio frontal de la tapa con orejas redondeadas
  const bx = 2.4*s, by = 3.9*s;
  const ear = [[t,yL],[0,yL-t],[-Ew,yL-t],[-Ew,lipTop+by],[-bx,lipTop+by],[0,lipTop]];
  const earp = [ear[0],ear[1]].concat(fillet(ear,2,earR[0],earR[0]), fillet(ear,3,earR[1],earR[1]), [ear[4],ear[5]]);
  cut.push(earp.concat(mirrorX(earp,W).reverse()));
  // dobleces
  fold.push([[0,0],[W,0],[W,D],[0,D],[0,0]]);
  fold.push([[t,yL],[W-t,yL],[W-t,-H],[t,-H],[t,yL]]);
  fold.push([[0,-g],[0,-H+t+g]],[[W,-g],[W,-H+t+g]]);
  fold.push([[fi,D+g],[fi,D+H-t-g]],[[W-fi,D+g],[W-fi,D+H-t-g]]);
  fold.push([[0,lipTop],[0,yL-t]],[[W,lipTop],[W,yL-t]]);
  for(const [X,sg] of [[W,1],[0,-1]]) fold.push([[X+sg*H,0],[X+sg*H,D]],[[X+sg*(H+f),c1],[X+sg*(H+f),D-c1]]);
  const info = {
    armado: { L: r2(W+2*t), P: r2(D+2*t), A: r2(H+t) },
    notas: ['Tapa articulada atrás; lengüeta del labio entra al frente.', 'Pared lateral doble: la capa exterior se pliega hacia adentro y sus dientes entran a las ranuras de la base.',
      'Orejas de pared frontal/trasera: '+r2(Eb)+' mm de ancho, a '+g+' mm de los bordes.'],
    pasos: ['Doblar la base por los hendidos rojos y levantar las cuatro paredes.','Plegar la capa exterior de cada pared lateral hacia adentro y meter sus dientes en las ranuras de la base.','Doblar las orejas de las paredes frontal y trasera hacia adentro, contra las paredes laterales.','Bajar la tapa (articulada atrás) y doblar sus dos solapas laterales hacia abajo.','Cerrar el labio frontal de la tapa y meter sus orejas redondeadas por el frente (es lo último que se arma).']
  };
  const cotas = [
    { x1:0, y1:D*0.3, x2:W, y2:D*0.3, texto:'Base '+fmt(W)+' mm' },
    { x1:W*0.12, y1:0, x2:W*0.12, y2:D, texto:'Fondo '+fmt(D)+' mm' },
    { x1:W, y1:D*0.5, x2:W+H, y2:D*0.5, texto:'Alto '+fmt(H)+' mm' }];
  return { cut, fold, info, avisos, cotas };
}

// ------------------------------------------------------------------ 2. ESTUCHE CON LENGÜETAS (tuck end)
function tuck(par){
  const t = par.t, avisos = [];
  let L,P,A;
  if(par.modo === 'exterior'){ L = par.L-2*t; P = par.P-2*t; A = par.A-2*t; } else { L = par.L; P = par.P; A = par.A; }
  const inverso = par.cierre === 'inverso';
  const pL = L+t, pP = P+t, Ap = A+2*t;           // panel = medida + 1 calibre (largo/ancho) y + 2 calibres (alto), según Packmage
  const E = Math.max(0.75*P, P-1.5);               // tapa (cover) = profundo - 1,5
  const F = clamp(0.4*P, 12, 22);                  // lengüeta
  const EX = Math.max(0.5, t);
  const G = (E+F+EX)/2;                            // aleta guardapolvo
  const r = Math.min(3, 0.08*pP);
  const Cg = par.pegue > 0 ? par.pegue : clamp(0.3*Math.min(L,P), 10, 15), bev = Math.min(4, 0.4*Cg);
  if(P < 25) avisos.push('Fondo menor de 25 mm: la lengüeta y las aletas quedan muy pequeñas; revisa con muestra.');
  if(A < 20) avisos.push('Alto menor de 20 mm: los dobleces quedan muy juntos.');
  const x2=pL, x3=pL+pP, x4=2*pL+pP, xg=2*pL+2*pP;
  const cut = [], fold = [];
  const dust = (x0,w,y0,dir) => [[x0+r,y0+dir*G],[x0+w-r,y0+dir*G],[x0+w,y0]];
  const cover = (x0,w,y0,dir) => {
    const ti = 1.0, rt = Math.min(0.6*F, 8);
    const q = [[x0,y0],[x0,y0+dir*E],[x0+ti,y0+dir*E],[x0+ti,y0+dir*(E+F)],[x0+w-ti,y0+dir*(E+F)],[x0+w-ti,y0+dir*E],[x0+w,y0+dir*E],[x0+w,y0]];
    return [q[1],q[2]].concat(fillet(q,3,rt,rt), fillet(q,4,rt,rt), [q[5],q[6],q[7]]);
  };
  // borde superior: panel 1 libre, aleta, tapa en panel 3, aleta
  cut.push([[0,0],[x2,0]].concat(dust(x2,pP,0,-1), cover(x3,pL,0,-1), dust(x4,pP,0,-1)));
  // borde inferior
  let bot = [[0,Ap]];
  if(inverso) bot = bot.concat(cover(0,pL,Ap,1), [[x2,Ap]]); else bot.push([x2,Ap]);
  bot = bot.concat(dust(x2,pP,Ap,1));
  if(inverso) bot.push([x4,Ap]); else bot = bot.concat(cover(x3,pL,Ap,1));
  bot = bot.concat(dust(x4,pP,Ap,1));
  cut.push(bot);
  cut.push([[0,0],[0,Ap]]);
  cut.push([[xg,0],[xg+Cg,bev],[xg+Cg,Ap-bev],[xg,Ap]]);
  // dobleces
  for(const x of [x2,x3,x4,xg]) fold.push([[x,0],[x,Ap]]);
  fold.push([[x2,0],[xg,0]], [[x3,-E],[x4,-E]]);
  if(inverso){ fold.push([[0,Ap],[x3,Ap]], [[x4,Ap],[xg,Ap]], [[0,Ap+E],[pL,Ap+E]]); }
  else { fold.push([[x2,Ap],[xg,Ap]], [[x3,Ap+E],[x4,Ap+E]]); }
  const info = {
    armado: { L: r2(L+2*t), P: r2(P+2*t), A: r2(A+2*t) },
    notas: [(inverso?'Cierre inverso: las lengüetas de arriba y abajo quedan en caras opuestas.':'Cierre recto: las dos lengüetas quedan en la misma cara.'),
      'Pestaña de pegue: '+r2(Cg)+' mm, va pegada por dentro del panel 1.', 'Tapa '+r2(E)+' mm + lengüeta '+r2(F)+' mm; aletas guardapolvo de '+r2(G)+' mm.'],
    pasos: ['Doblar los cuatro paneles por los hendidos verticales y cerrar el tubo pegando la pestaña de pegue por dentro del panel 1.','Doblar el fondo: aletas guardapolvo hacia adentro, luego la tapa del fondo, y meter su lengüeta.','Colocar el producto.','Cerrar arriba igual: aletas guardapolvo, tapa y lengüeta metida por dentro del panel de enfrente.']
  };
  const cotas = [
    { x1:0, y1:Ap*0.5, x2:pL, y2:Ap*0.5, texto:'Largo '+fmt(pL)+' mm' },
    { x1:x2, y1:Ap*0.5, x2:x3, y2:Ap*0.5, texto:'Fondo '+fmt(pP)+' mm' },
    { x1:pL*0.5, y1:0, x2:pL*0.5, y2:Ap, texto:'Alto '+fmt(Ap)+' mm' },
    { x1:x3+pL*0.15, y1:0, x2:x3+pL*0.15, y2:-(E+F), texto:'Tapa '+fmt(E+F)+' mm' },
    { x1:xg, y1:Ap*0.5, x2:xg+Cg, y2:Ap*0.5, texto:'Pegue '+fmt(Cg)+' mm' }];
  return { cut, fold, info, avisos, cotas };
}

// ------------------------------------------------------------------ 3. TAPA Y FONDO (telescópica)
// Bandeja de una pieza: base + 4 paredes; las paredes cortas llevan pestañas de pegue que se doblan por dentro de las largas.
function bandejaSimple(W,D,H,Fpar){
  const F = clamp(Fpar != null ? Fpar : 10, 3, Math.max(3, H/2-2));   // pestaña de pegue, a 45°
  const cut = [], fold = [];
  cut.push([[0,0],[0,-H],[W,-H],[W,0]]);
  cut.push([[0,D],[0,D+H],[W,D+H],[W,D]]);
  const left = [[0,0],[-F,-F],[-H+F,-F],[-H,0],[-H,D],[-H+F,D+F],[-F,D+F],[0,D]];
  cut.push(left); cut.push(mirrorX(left,W));
  fold.push([[0,0],[W,0],[W,D],[0,D],[0,0]]);
  fold.push([[-H,0],[0,0]],[[-H,D],[0,D]],[[W,0],[W+H,0]],[[W,D],[W+H,D]]);
  return { cut, fold, F };
}
function tapafondo(par){
  const t = par.t, h = par.hol != null ? par.hol : 0.4, avisos = [];
  let Lb,Pb,Hb;
  if(par.modo === 'interior'){ Lb = par.L; Pb = par.P; Hb = par.A; }
  else { Lb = par.L-4*t-2*h; Pb = par.P-4*t-2*h; Hb = par.A-t; }
  let Hl = par.altoTapa ? par.altoTapa : clamp(Math.round(0.35*Hb), 10, 35);
  if(Hl > Hb-2){ Hl = Math.max(6, Hb-2); avisos.push('La tapa no puede ser tan alta como la base: se limitó a '+r2(Hl)+' mm.'); }
  if(Lb<30 || Pb<20 || Hb<12) avisos.push('Caja muy pequeña: las pestañas de pegue quedan muy chicas.');
  const Ll = Lb+2*t+2*h, Pl = Pb+2*t+2*h;
  const pg = par.pegue > 0 ? par.pegue : 10;
  const A = bandejaSimple(Lb,Pb,Hb,pg), B = bandejaSimple(Ll,Pl,Hl,pg);
  if(par.pegue > 0 && B.F < par.pegue - 0.01) avisos.push('La pestaña de pegue de la tapa se ajustó a '+r2(B.F)+' mm porque la pared de la tapa es baja.');
  const gap = 10;
  const dx = Lb+Hb + gap + Hl, dy = Pb/2 - Pl/2;
  const cut = A.cut.concat(B.cut.map(P => shift(P,dx,dy))), fold = A.fold.concat(B.fold.map(P => shift(P,dx,dy)));
  const info = {
    armado: { L: r2(Ll+2*t), P: r2(Pl+2*t), A: r2(Hb+t) },
    notas: ['Base: '+r2(Lb)+' x '+r2(Pb)+' x '+r2(Hb)+' mm (por dentro). Tapa por dentro: '+r2(Ll)+' x '+r2(Pl)+' mm, pared de '+r2(Hl)+' mm.',
      'Holgura de la tapa: '+r2(h)+' mm por lado. Pestañas de pegue a 45°: '+r2(A.F)+' mm (base) y '+r2(B.F)+' mm (tapa).'],
    pasos: ['Base: levantar las cuatro paredes por los hendidos rojos.','Doblar las pestañas de las paredes cortas hacia adentro y pegarlas a la cara interior de las paredes largas.','Tapa: repetir los dos pasos anteriores con la pieza más grande.','Poner la tapa sobre la base: la tapa cubre la base por fuera.']
  };
  const cotas = [
    { x1:0, y1:Pb*0.5, x2:Lb, y2:Pb*0.5, texto:'Base '+fmt(Lb)+' mm' },
    { x1:Lb*0.12, y1:0, x2:Lb*0.12, y2:Pb, texto:'Fondo '+fmt(Pb)+' mm' },
    { x1:-Hb, y1:Pb*0.25, x2:0, y2:Pb*0.25, texto:'Alto '+fmt(Hb)+' mm' },
    { x1:dx, y1:dy+Pl*0.5, x2:dx+Ll, y2:dy+Pl*0.5, texto:'Tapa '+fmt(Ll)+' mm' },
    { x1:dx-Hl, y1:dy+Pl*0.25, x2:dx, y2:dy+Pl*0.25, texto:'Alto tapa '+fmt(Hl)+' mm' }];
  return { cut, fold, info, avisos, cotas };
}

// ------------------------------------------------------------------ 7. NIDO (inserto)
// Placa con cuatro paredes hacia abajo y un hueco rebajado para el objeto (pliegue en Z en los extremos, cortes a los lados),
// con una ventana a cada lado del hueco para meter el dedo y sacarlo. Va dentro de una caja; no lleva pegante.
// Medidas: L x P = placa; A = alto de las paredes; itemL x itemW x itemH = objeto.
function nido(par){
  const t = par.t, avisos = [];
  const Lp = par.L, Wp = par.P, H = par.A;
  const IL = par.itemL, IW = par.itemW, IH = par.itemH;
  if(!(IL > 0 && IW > 0 && IH > 0)) throw new Error('Escribe largo, ancho y alto del objeto.');
  const hol = par.hol != null ? par.hol : 1.0;
  const lenX = IL + hol, lenY = IW + hol, hi = IH;       // hueco: objeto + holgura; profundidad = alto del objeto
  if(lenX + 12 > Lp) throw new Error('El objeto no cabe a lo largo de la placa (necesita al menos '+r2(lenX+12)+' mm de largo).');
  if(lenY + 12 > Wp) throw new Error('El objeto no cabe a lo ancho de la placa (necesita al menos '+r2(lenY+12)+' mm de ancho).');
  if(lenX - 2*hi < 6) throw new Error('El hueco es muy corto para su profundidad: el objeto es muy alto frente a su largo.');
  if(hi + 2*t > H) avisos.push('El hueco es más profundo que las paredes: el piso tocaría el fondo de la caja. Sube el alto de las paredes a más de '+r2(hi+2*t)+' mm.');
  const cx = Lp/2, cy = Wp/2, xa = cx-lenX/2, xb = cx+lenX/2, ya = cy-lenY/2, yb = cy+lenY/2;
  let Tw = par.dedoA != null ? par.dedoA : 15, Tl = par.dedoL != null ? par.dedoL : 40;
  const maxTw = ya - 4, maxTl = lenX - 2*hi - 6;
  if(Tw > maxTw){ if(par.dedoA != null || maxTw < 5) avisos.push(maxTw >= 5 ? 'Las ventanas para el dedo se redujeron a '+r2(maxTw)+' mm de ancho para caber en la placa.' : 'No hay espacio para las ventanas del dedo: la placa es muy angosta alrededor del hueco.'); Tw = maxTw; }
  if(Tl > maxTl){ avisos.push('Las ventanas para el dedo se acortaron a '+r2(Math.max(0,maxTl))+' mm de largo para caber sobre el piso del hueco.'); Tl = maxTl; }
  const conVentana = Tw >= 5 && Tl >= 10;
  const cut = [], fold = [];
  cut.push([[0,-H],[Lp,-H],[Lp,0],[Lp+H,0],[Lp+H,Wp],[Lp,Wp],[Lp,Wp+H],[0,Wp+H],[0,Wp],[-H,Wp],[-H,0],[0,0],[0,-H]]);
  const lado = (yy, dir) => {
    if(!conVentana) return [[xa,yy],[xb,yy]];
    const nx0 = cx-Tl/2, nx1 = cx+Tl/2, r = Math.min(4, Tl/4, Tw/2);
    const q = [[nx0,yy],[nx0,yy+dir*Tw],[nx1,yy+dir*Tw],[nx1,yy]];
    return [[xa,yy]].concat([q[0]], fillet(q,1,r,r), fillet(q,2,r,r), [q[3]], [[xb,yy]]);
  };
  cut.push(lado(ya,-1)); cut.push(lado(yb,1));
  fold.push([[0,0],[Lp,0],[Lp,Wp],[0,Wp],[0,0]]);
  for(const x of [xa, xa+hi, xb-hi, xb]) fold.push([[x,ya],[x,yb]]);
  const info = {
    armado: { L: r2(Lp), P: r2(Wp), A: r2(H) },
    notas: ['Placa '+r2(Lp)+' x '+r2(Wp)+' mm con paredes de '+r2(H)+' mm hacia abajo (sin pegante).',
      'Hueco '+r2(lenX)+' x '+r2(lenY)+' mm, '+r2(hi)+' mm de profundo (objeto '+r2(IL)+' x '+r2(IW)+' x '+r2(IH)+' mm + '+r2(hol)+' mm de holgura).'
      + (conVentana ? ' Ventanas para el dedo: '+r2(Tl)+' x '+r2(Tw)+' mm a cada lado.' : ' Sin ventanas para el dedo.')],
    pasos: ['Doblar las cuatro paredes hacia abajo por los hendidos del borde de la placa; no llevan pegante.',
      'Hundir el hueco: doblar hacia abajo los dos hendidos de los extremos del hueco y hacia arriba los dos siguientes, hasta que el piso quede '+r2(hi)+' mm por debajo de la placa.',
      'Poner el nido dentro de la caja con las paredes hacia abajo.','Colocar el objeto en el hueco: las ventanas laterales dejan meter el dedo para sacarlo.']
  };
  const cotas = [
    { x1:0, y1:Wp*0.1, x2:Lp, y2:Wp*0.1, texto:'Placa '+fmt(Lp)+' mm' },
    { x1:Lp*0.06, y1:0, x2:Lp*0.06, y2:Wp, texto:'Ancho '+fmt(Wp)+' mm' },
    { x1:Lp, y1:Wp*0.5, x2:Lp+H, y2:Wp*0.5, texto:'Pared '+fmt(H)+' mm' },
    { x1:xa, y1:cy, x2:xb, y2:cy, texto:'Hueco '+fmt(lenX)+' x '+fmt(lenY)+' x '+fmt(hi) }];
  return { cut, fold, info, avisos, cotas };
}

// ------------------------------------------------------------------ API
function generar(familia, par){
  let r;
  if(familia === 'bandeja') r = bandeja(par);
  else if(familia === 'tuck') r = tuck(par);
  else if(familia === 'tapafondo') r = tapafondo(par);
  else if(familia === 'nido') r = nido(par);
  else throw new Error('Familia no disponible: '+familia);
  const b = bbox(r.cut, r.fold);
  r.bbox = b; r.w = r2(b.x1-b.x0); r.h = r2(b.y1-b.y0);
  return r;
}
function bbox(cut, fold){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const P of cut.concat(fold)) for(const [x,y] of P){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  return { x0,y0,x1,y1 };
}
// Cuántos planos caben en una hoja (cuadrícula normal o girada 90°), con margen de borde y separación entre planos.
function acomodo(w, h, hoja, margen, sep){
  const cuenta = (a,b) => Math.max(0, Math.floor((hoja.w-2*margen+sep)/(a+sep))) * Math.max(0, Math.floor((hoja.h-2*margen+sep)/(b+sep)));
  const n0 = cuenta(w,h), n1 = cuenta(h,w);
  return n1 > n0 ? { n:n1, girado:true, cols:Math.floor((hoja.w-2*margen+sep)/(h+sep)), filas:Math.floor((hoja.h-2*margen+sep)/(w+sep)) }
                 : { n:n0, girado:false, cols:Math.floor((hoja.w-2*margen+sep)/(w+sep)), filas:Math.floor((hoja.h-2*margen+sep)/(h+sep)) };
}

const fmt = x => x >= 10 ? String(Math.round(x)) : String(Math.round(x*10)/10);

// Hendido punteado: cada tramo recto se parte en rayas iguales (empieza y termina en raya). raya/hueco en mm.
function punteado(lista, raya, hueco){
  const out = [];
  for(const P of lista) for(let i=0;i<P.length-1;i++){
    const [x1,y1]=P[i], [x2,y2]=P[i+1], L=Math.hypot(x2-x1,y2-y1);
    if(L < 1e-6) continue;
    const n = Math.max(1, Math.round((L+hueco)/(raya+hueco)));
    const rr = (L-(n-1)*hueco)/n;
    if(n === 1 || rr <= 0.2){ out.push([[x1,y1],[x2,y2]]); continue; }
    const ux=(x2-x1)/L, uy=(y2-y1)/L;
    for(let k=0;k<n;k++){ const a=k*(rr+hueco), b=a+rr; out.push([[x1+ux*a,y1+uy*a],[x1+ux*b,y1+uy*b]]); }
  }
  return out;
}

// Cotas principales: las de cada familia (res.cotas) + el tamaño total del plano abierto.
function listaCotas(res, fs){
  const b = res.bbox, o = fs*2.2;
  return (res.cotas || []).concat([
    { x1:b.x0, y1:b.y1+o, x2:b.x1, y2:b.y1+o, texto:'Plano abierto '+fmt(res.w)+' mm' },
    { x1:b.x0-o, y1:b.y0, x2:b.x0-o, y2:b.y1, texto:fmt(res.h)+' mm' }]);
}

function aSVG(res, opt){
  opt = opt || {};
  const mg = opt.margen != null ? opt.margen : 5, tr = opt.trazo || 0.2;
  const fs = clamp(Math.max(res.w,res.h)/45, 3.2, 9), tk = fs*0.7;
  const pf = opt.punteado ? punteado(res.fold, opt.punteado.raya, opt.punteado.hueco) : res.fold;
  const b = { x0:res.bbox.x0, y0:res.bbox.y0, x1:res.bbox.x1, y1:res.bbox.y1 };
  const cotas = opt.cotas ? listaCotas(res, fs) : [];
  const caja = cotas.map(c => {
    const vert = c.x1 === c.x2, tw = c.texto.length*fs*0.58;
    const tx = vert ? c.x1-fs*0.35 : (c.x1+c.x2)/2, ty = vert ? (c.y1+c.y2)/2 : c.y1-fs*0.35;
    const bb = vert ? [tx-fs, ty-tw/2, tx+tk, ty+tw/2] : [tx-tw/2, ty-fs, tx+tw/2, ty+tk];
    return Object.assign({}, c, { vert, tx, ty, bb });
  });
  for(const c of caja){
    b.x0 = Math.min(b.x0, c.x1, c.x2, c.bb[0]); b.y0 = Math.min(b.y0, c.y1, c.y2, c.bb[1]);
    b.x1 = Math.max(b.x1, c.x1, c.x2, c.bb[2]); b.y1 = Math.max(b.y1, c.y1, c.y2, c.bb[3]);
  }
  const w = b.x1-b.x0+2*mg, h = b.y1-b.y0+2*mg;
  const X = x => (x-b.x0+mg).toFixed(3), Y = y => (y-b.y0+mg).toFixed(3);
  const pl = (P,col) => '<polyline points="'+P.map(([x,y]) => X(x)+','+Y(y)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="'+tr+'" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
  const dim = opt.preview ? '' : ' width="'+r2(w)+'mm" height="'+r2(h)+'mm"';
  const tinta = '#1e3a5f', st = ' stroke="'+tinta+'" stroke-width="0.9" vector-effect="non-scaling-stroke"/>';
  const tick = (c, x, y) => c.vert
    ? '<line x1="'+X(x-tk/2)+'" y1="'+Y(y)+'" x2="'+X(x+tk/2)+'" y2="'+Y(y)+'"'+st
    : '<line x1="'+X(x)+'" y1="'+Y(y-tk/2)+'" x2="'+X(x)+'" y2="'+Y(y+tk/2)+'"'+st;
  const cot = caja.map(c => {
    const ln = '<line x1="'+X(c.x1)+'" y1="'+Y(c.y1)+'" x2="'+X(c.x2)+'" y2="'+Y(c.y2)+'"'+st;
    const tx = parseFloat(X(c.tx)), ty = parseFloat(Y(c.ty));
    const txt = '<text x="'+tx+'" y="'+ty+'" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="'+r2(fs)+'" font-weight="700" fill="'+tinta+'" stroke="#fff" stroke-width="'+r2(fs*0.3)+'" paint-order="stroke"'+(c.vert ? ' transform="rotate(-90 '+tx+' '+ty+')"' : '')+'>'+c.texto+'</text>';
    return ln + tick(c, c.x1, c.y1) + tick(c, c.x2, c.y2) + txt;
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg"'+dim+' viewBox="0 0 '+r2(w)+' '+r2(h)+'">'
    + '<g id="HENDIDO_rojo">'+pf.map(P => pl(P,'#e5191f')).join('')+'</g>'
    + '<g id="CORTE_negro">'+res.cut.map(P => pl(P,'#000000')).join('')+'</g>'
    + (cot ? '<g id="COTAS_azul">'+cot+'</g>' : '') + '</svg>';
}

// DXF R12 con líneas (capas CORTE y HENDIDO). Y invertida (DXF es y hacia arriba). Nunca lleva cotas.
function aDXF(res, opt){
  opt = opt || {};
  const b = res.bbox, o = [];
  const add = (c,v) => { o.push(String(c)); o.push(String(v)); };
  add(0,'SECTION'); add(2,'HEADER'); add(9,'$ACADVER'); add(1,'AC1009'); add(0,'ENDSEC');
  add(0,'SECTION'); add(2,'TABLES');
  add(0,'TABLE'); add(2,'LTYPE'); add(70,1); add(0,'LTYPE'); add(2,'CONTINUOUS'); add(70,0); add(3,'Solid line'); add(72,65); add(73,0); add(40,0.0); add(0,'ENDTAB');
  add(0,'TABLE'); add(2,'LAYER'); add(70,2);
  add(0,'LAYER'); add(2,'CORTE'); add(70,0); add(62,7); add(6,'CONTINUOUS');
  add(0,'LAYER'); add(2,'HENDIDO'); add(70,0); add(62,1); add(6,'CONTINUOUS');
  add(0,'ENDTAB'); add(0,'ENDSEC');
  add(0,'SECTION'); add(2,'ENTITIES');
  const lineas = (arr,capa) => { for(const P of arr) for(let i=0;i<P.length-1;i++){
    const [x1,y1]=P[i], [x2,y2]=P[i+1]; if(x1===x2 && y1===y2) continue;
    add(0,'LINE'); add(8,capa); add(10,(x1-b.x0).toFixed(4)); add(20,(-(y1-b.y0)).toFixed(4)); add(30,0);
    add(11,(x2-b.x0).toFixed(4)); add(21,(-(y2-b.y0)).toFixed(4)); add(31,0); } };
  lineas(opt.punteado ? punteado(res.fold, opt.punteado.raya, opt.punteado.hueco) : res.fold, 'HENDIDO'); lineas(res.cut,'CORTE');
  add(0,'ENDSEC'); add(0,'EOF');
  return o.join('\r\n');
}

const API = { CALIBRES, HOJAS, FAMILIAS, espesorEfectivo, generar, acomodo, aSVG, aDXF, bbox, punteado, fmt };
if(typeof module !== 'undefined' && module.exports) module.exports = API;
root.CAJAS_MOTOR = API;
})(typeof window !== 'undefined' ? window : globalThis);
