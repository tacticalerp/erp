// ==========================================================================
// TACTICAL ERP -- Bot Tactical (Edge Function de Supabase)
// Backend del asistente conversacional embebido en el ERP (widget de chat).
// Mismo patrón ya usado en supabase/functions/send-reports e index.ts de
// send-backup (Edge Function de Supabase) -- acá vive la llamada a la API
// de Anthropic, para que la clave NUNCA quede expuesta en el navegador.
//
// SESIÓN 1 -- alcance intencionalmente chico: recibe un mensaje, verifica que
// quien pregunta esté realmente logueado en el ERP, le pregunta a Claude con
// un system prompt de soporte técnico neutral (NO la personalidad de Derek,
// que es un proyecto aparte), y devuelve la respuesta.
//
// SESIÓN 2 (Conde 2026-09-03, "que falta para que el solo cotice?" -- piloto
// en Volantes/Afiches/Plegables, línea estándar solamente, no Imán ni Kit
// multi-ítem todavía): el bot YA puede calcular un precio real, no solo dar
// datos técnicos fijos. La cuenta la hace CÓDIGO determinístico (el motor de
// cálculo real de Volantes, portado 1:1 desde calculadora_volantes.html +
// precios_tactical.js), NUNCA Claude "a mano" -- Claude solo conversa, arma
// los parámetros, y llama la herramienta cotizar_volante. Si el usuario
// confirma que quiere guardar la cotización, se llama guardar_cotizacion_
// volante, que RECALCULA (no reusa un número que Claude haya podido alterar)
// y escribe en Supabase con la sesión del propio usuario (mismo permiso/RLS
// que tiene navegando el ERP -- no se usa SERVICE_ROLE).
//
// A diferencia de send-reports/send-backup (que corren solas por cron, sin
// usuario), esta función la llama el navegador -- por eso valida el token de
// sesión del usuario (Authorization: Bearer <access_token>) con el cliente
// ANON antes de contestar nada.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// CORS: esta función SÍ la llama el navegador directo (a diferencia de
// send-reports/send-backup, que solo corren por cron) -- sin estas
// cabeceras, el navegador bloquea la respuesta antes de que el widget la vea.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Vendedores de la empresa -- misma lista que VENDEDORES en precios_tactical.js. Duplicada acá a
// mano (el backend no puede leer el archivo del navegador) -- si Conde agrega/cambia un vendedor
// hay que actualizarlo también acá.
const VENDEDORES = ["Norely Sarmiento", "Helver Conde"];

// ==========================================================================
// MOTOR DE COTIZACIÓN -- VOLANTES/AFICHES/PLEGABLES (línea estándar)
// ==========================================================================
// Portado 1:1 desde calculadora_volantes.html (funciones cotizarVolante y todas sus dependientes)
// + precios_tactical.js (tabla de papeles, layout de pliegos, corte de montaje offset). Esto NO es
// una reinterpretación de la fórmula -- es el mismo texto de las funciones reales, para que el
// precio que da el bot sea IDÉNTICO al que da la calculadora. Se ejecuta con `new Function` (mismo
// motor V8 que usa el navegador) en vez de reescribirlo a mano en TypeScript, justamente para no
// arriesgar un error de transcripción en una fórmula que ya tiene meses de ajustes finos.
//
// LO QUE NO ESTÁ PORTADO TODAVÍA (fuera de alcance de este piloto):
// - Imán y Kit multi-ítem (los otros 2 modos de esta misma calculadora).
// - Acabados personalizados (checkboxes del Panel de Precios) -- siempre da 0 costo extra por eso.
// - Overrides de precio del Panel de Precios (localStorage del navegador de Conde, el backend no
//   tiene acceso) -- usa siempre los precios BASE. Mismo límite ya explicado para el catálogo de
//   papeles de DATOS_TECNICOS_REALES más abajo.
// Si Conde ajusta la fórmula real en calculadora_volantes.html/precios_tactical.js, este bloque
// hay que actualizarlo también a mano para que no se desincronice.
//
// Fuente: PRECIOS_BASE_SUSTRATOS de precios_tactical.js (línea por línea, sin overrides).
const PRECIOS_BASE_SUSTRATOS: Record<string, { p6090: number | null; p70100: number | null }> = {
  "Bond__60": { p6090: 177.30, p70100: 229.50 },
  "Bond__70": { p6090: 206.10, p70100: 267.30 },
  "Bond__75": { p6090: 221.40, p70100: 287.10 },
  "Bond__90": { p6090: 265.50, p70100: 343.80 },
  "Bond__115": { p6090: null, p70100: 459.00 },
  "Propalcote__80": { p6090: null, p70100: 308.70 },
  "Propalcote__90": { p6090: 267.30, p70100: 348.30 },
  "Propalcote__115": { p6090: 343.80, p70100: 448.20 },
  "Propalcote__150": { p6090: 472.50, p70100: 612.90 },
  "Propalcote__200": { p6090: 603.90, p70100: 810.00 },
  "Propalcote__240": { p6090: 807.00, p70100: 1050.00 },
  "Propalcote__300": { p6090: 910.80, p70100: 1182.60 },
  "Propalcote__350": { p6090: null, p70100: 1381.50 },
  "Cartulina C11__190": { p6090: null, p70100: 684.00 },
  "Cartulina C12__205": { p6090: 580.50, p70100: 753.30 },
  "Cartulina C14__225": { p6090: 637.20, p70100: 826.20 },
  "Cartulina C16__255": { p6090: 722.70, p70100: 936.90 },
  "Cartulina C18__275": { p6090: 779.40, p70100: 1009.80 },
  "Cartulina C20__305": { p6090: 864.00, p70100: 1120.50 },
  "Cartulina C22__330": { p6090: null, p70100: 1212.30 },
  "Eart Pact__70": { p6090: 218.49, p70100: 277.31 },
  "Bristol Color__150": { p6090: null, p70100: 613.45 },
  "Bristol Blanca__140": { p6090: null, p70100: 554.62 },
  "Kraft Cartón__335": { p6090: null, p70100: 924.37 },
  "Kraft__98": { p6090: null, p70100: 352.94 },
  "Kraft__120": { p6090: null, p70100: 369.75 },
  "Book Cream__56.2": { p6090: 184.87, p70100: 218.49 },
};

// Encuentra la clave exacta "Nombre__Gramaje" que espera el motor, tolerando mayúsculas/minúsculas
// y espacios de más en el nombre que Claude arme a partir de la conversación.
function resolverSustrato(nombreCrudo: string, gramaje: number): string {
  const exacta = `${nombreCrudo}__${gramaje}`;
  if (PRECIOS_BASE_SUSTRATOS[exacta] !== undefined) return exacta;
  const nombreNorm = nombreCrudo.trim().toLowerCase();
  const claves = Object.keys(PRECIOS_BASE_SUSTRATOS);
  const encontrada = claves.find((k) => {
    const [n, g] = k.split("__");
    return n.toLowerCase() === nombreNorm && Number(g) === Number(gramaje);
  });
  if (encontrada) return encontrada;
  throw new Error(
    `No encontré el papel "${nombreCrudo} ${gramaje}g" en el catálogo de Volantes. Papeles disponibles: ` +
      claves.map((k) => k.replace("__", " ") + "g").join(", "),
  );
}

// Cuerpo del motor -- se interpola PRECIOS_BASE_SUSTRATOS ya resuelto como SUSTRATOS al inicio, y
// termina en "return cotizarVolante(p);" para poder invocarlo con new Function('p', MOTOR_JS).
const MOTOR_VOLANTES_JS = `
const SUSTRATOS = ${JSON.stringify(PRECIOS_BASE_SUSTRATOS)};
const PLIEGOS_CM = {"60x90":[60,90], "70x100":[70,100]};

const PRECIOS_OFFSET_CTP_COP = {medio_pliego:22000, cuarto:11000, octavo:9000};
const PRECIOS_OFFSET_MILLAR_COP = {medio_pliego_color:25000, medio_pliego_policromia_4x0:100000, cuarto:16000, octavo:12000};
const PRECIOS_OFFSET_TOLERANCIA_MERMA_MILLAR = 180;
const PRECIOS_DIGITAL_CLIC_OTRAS_LINEAS = { carta:{color:1000, negro:250}, octavo:{color:1400, negro:350}, pliego_max:{color:2200, negro:550} };
const PRECIOS_PLASTIFICADO_COP_M2 = 950;
const PRECIOS_PLASTIFICADO_PISO_COP = 30000;
const PRECIOS_DISENO_COSTO_NORMAL = 40000;
const PRECIOS_DISENO_COSTO_REDUCIDO = 20000;
const PRECIOS_ESCUDO_BAJOS_MONTOS_UMBRAL = 150000;
const PRECIOS_FONDO_SEGURIDAD_TRAMOS = [[500000,0.09],[1000000,0.07],[3000000,0.05],[Infinity,0.03]];

function tacticalMejorLayoutPliego(pa, pal, pw, ph){
  function grid(pw_, ph_, x, y, boxW, boxH, rotado){
    const cols = Math.floor(boxW/pw_), filas = Math.floor(boxH/ph_);
    return { x, y, piezaAncho:pa, piezaAlto:pal, columnas:cols, filas, rotado, piezas:cols*filas };
  }
  const candidatos = [];
  candidatos.push({ total: grid(pa,pal,0,0,pw,ph,false).piezas, principal: grid(pa,pal,0,0,pw,ph,false), secundaria: null });
  candidatos.push({ total: grid(pal,pa,0,0,pw,ph,true).piezas, principal: grid(pal,pa,0,0,pw,ph,true), secundaria: null });
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
const TACTICAL_OFFSET_MINIMO_CM = { octavo: [14, 21], cuarto: [17, 24], medio_pliego: [25, 35] };
function tacticalCorteMontajeOffset(fraccion, plano, formatosCm, formatosImpresionCm){
  function ordenar2_(a, b){ return a <= b ? [a, b] : [b, a]; }
  const anchoUtil = plano.columnas * (plano.rotado ? plano.piezaAlto : plano.piezaAncho);
  const altoUtil = plano.filas * (plano.rotado ? plano.piezaAncho : plano.piezaAlto);
  const [fChico, fGrande] = ordenar2_(...formatosCm[fraccion]);
  const [fiChico, fiGrande] = ordenar2_(...formatosImpresionCm[fraccion]);
  const margenChico = fChico - fiChico, margenGrande = fGrande - fiGrande;
  const [utilChico, utilGrande] = ordenar2_(anchoUtil, altoUtil);
  const [minChico, minGrande] = TACTICAL_OFFSET_MINIMO_CM[fraccion];
  const anchoCorte = Math.min(fChico, Math.max(utilChico + margenChico, minChico));
  const altoCorte = Math.min(fGrande, Math.max(utilGrande + margenGrande, minGrande));
  return [anchoCorte, altoCorte];
}

const PLASTIFICADO_COP_M2 = PRECIOS_PLASTIFICADO_COP_M2;
const PLASTIFICADO_PISO_COP = PRECIOS_PLASTIFICADO_PISO_COP;
const DIGITAL_GRAMAJE_MAX = 240;
const DIGITAL_PINZA_MM = 5;
const DIGITAL_CLIC_COP = PRECIOS_DIGITAL_CLIC_OTRAS_LINEAS;
const DIGITAL_DESCUENTO_VOLUMEN = [[9,0.0],[50,0.10],[200,0.18],[400,0.26],[Infinity,0.30]];
const DIGITAL_FORMATOS_CM = {carta:[21.5,28], octavo:[25,35], pliego_max:[33,50]};
const DIGITAL_MERMA_HOJAS = {policromia:20, negro:10, promedio:18};
const OFFSET_CTP_COP = PRECIOS_OFFSET_CTP_COP;
const OFFSET_MILLAR_COP = PRECIOS_OFFSET_MILLAR_COP;
const OFFSET_FORMATOS_CM = {medio_pliego:[50,70], cuarto:[35,50], octavo:[25,35]};
const OFFSET_FORMATOS_IMPRESION_CM = {medio_pliego:[49,69.5], cuarto:[34,49.5], octavo:[24.5,34]};
const OFFSET_MERMA_HOJAS = [[1000,100],[2000,130],[Infinity,160]];
const OFFSET_MERMA_FACTOR_2_MAS_TINTAS = 1.30;
const OFFSET_RECARGO_RETIRO_MEDIO_PLIEGO_POLICROMIA_PCT = 0.30;
const ESCUDO_BAJOS_MONTOS_UMBRAL = PRECIOS_ESCUDO_BAJOS_MONTOS_UMBRAL;
const DISENO_COSTO_NORMAL = PRECIOS_DISENO_COSTO_NORMAL;
const DISENO_COSTO_REDUCIDO = PRECIOS_DISENO_COSTO_REDUCIDO;
const FONDO_SEGURIDAD_TRAMOS = PRECIOS_FONDO_SEGURIDAD_TRAMOS;
const SHERPA_BASE_COP = 20000;

const VOLANTE_TAMANOS = [
  {clase:"carta",  maxAncho:21.5, maxAlto:28, refileMillar500:10000, empaqueMillar1000:5000},
  {clase:"25x35",  maxAncho:25,   maxAlto:35, refileMillar500:10000, empaqueMillar1000:8000},
  {clase:"50x35",  maxAncho:35,   maxAlto:50, refileMillar500:15000, empaqueMillar1000:12000},
  {clase:"50x70",  maxAncho:50,   maxAlto:70, refileMillar500:null,  empaqueMillar1000:15000},
];
const VOLANTE_REFILE_DESCUENTO_CANTIDAD_UMBRAL = 2000;
const VOLANTE_REFILE_DESCUENTO_PCT = 0.40;
const VOLANTE_EMPAQUE_CANTIDAD_MINIMA = 1000;
const VOLANTE_EMPAQUE_DESCUENTO_POR_MILLAR_PCT = 0.08;
const VOLANTE_EMPAQUE_DESCUENTO_TOPE_PCT = 0.50;
const VOLANTE_PLEGADO_COP_MILLAR = 30000;
const VOLANTE_TRANSPORTE_MOTO_COP = 15000;
const VOLANTE_TRANSPORTE_VEHICULO_COP = 45000;
const VOLANTE_TRANSPORTE_CANTIDAD_MOTO_CARTA = 2000;
const VOLANTE_TRANSPORTE_CANTIDAD_MOTO_MEDIO = 1500;

function piezasPorPliego(pa,pal,pw,ph){
  const sinRotar = Math.floor(pw/pa)*Math.floor(ph/pal);
  const rotada = Math.floor(pw/pal)*Math.floor(ph/pa);
  return Math.max(sinRotar,rotada,0);
}
function ordenar2(a,b){ return a<=b ? [a,b] : [b,a]; }

function costoMaterialPliegos(pa,pal,sustratoNombre,gramaje,piezasNecesarias,mermaHojas=0,tablaSustratos=SUSTRATOS){
  const key = sustratoNombre+"__"+gramaje;
  const precios = tablaSustratos[key];
  if(!precios) throw new Error("Sustrato no encontrado: "+sustratoNombre+" "+gramaje+"g");
  const piezasTotales = piezasNecesarias + mermaHojas;
  let mejores=[];
  const precioMap = {"60x90":precios.p6090, "70x100":precios.p70100};
  for(const formato of Object.keys(PLIEGOS_CM)){
    const [pw,ph]=PLIEGOS_CM[formato];
    const precioPliego = precioMap[formato];
    if(precioPliego==null) continue;
    const layout = tacticalMejorLayoutPliego(pa,pal,pw,ph);
    const nPorPliego = layout.total;
    if(nPorPliego===0) continue;
    const nPliegos = Math.ceil(piezasTotales/nPorPliego);
    const costoTotal = nPliegos*precioPliego;
    mejores.push([costoTotal, formato, nPorPliego, nPliegos, precioPliego, layout, pw, ph]);
  }
  if(mejores.length===0) throw new Error("La pieza "+pa+"x"+pal+"cm no cabe en ningún pliego disponible para "+sustratoNombre+" "+gramaje+"g");
  mejores.sort((x,y)=>x[0]-y[0]);
  const [costoTotal, formato, nPorPliego, nPliegos, precioPliego, layout, pliegoAncho, pliegoAlto] = mejores[0];
  const planoCorte = {piezaAncho:pa, piezaAlto:pal, pliegoAncho, pliegoAlto, columnas:layout.principal.columnas, filas:layout.principal.filas, rotado:layout.principal.rotado, piezasPorPliego:nPorPliego, secundaria:layout.secundaria};
  return {formato, piezasPorPliego:nPorPliego, nPliegos, precioPliego, costoTotal, planoCorte};
}

function planoImpresionOffset(piezaAncho, piezaAlto, fraccion){
  const [pliegoAncho, pliegoAlto] = OFFSET_FORMATOS_IMPRESION_CM[fraccion];
  const colsSinRotar = Math.floor(pliegoAncho/piezaAncho), filasSinRotar = Math.floor(pliegoAlto/piezaAlto);
  const nSinRotar = colsSinRotar*filasSinRotar;
  const colsRotada = Math.floor(pliegoAncho/piezaAlto), filasRotada = Math.floor(pliegoAlto/piezaAncho);
  const nRotada = colsRotada*filasRotada;
  const rotado = nRotada > nSinRotar;
  if(nSinRotar===0 && nRotada===0){
    return { piezaAncho, piezaAlto, pliegoAncho, pliegoAlto, columnas:1, filas:1, rotado:false, piezasPorPliego:1 };
  }
  return {
    piezaAncho, piezaAlto, pliegoAncho, pliegoAlto,
    columnas: rotado?colsRotada:colsSinRotar, filas: rotado?filasRotada:filasSinRotar, rotado,
    piezasPorPliego: rotado?nRotada:nSinRotar,
  };
}

function claseFormatoDigital(ancho,alto){
  const [a,b]=ordenar2(ancho,alto);
  if(a<=21.5 && b<=28) return "carta";
  if(a<=25 && b<=35) return "octavo";
  if(a<=33 && b<=50) return "pliego_max";
  return null;
}
function elegibleDigital(ancho,alto,gramaje,cantidadUnidades=1){
  if(gramaje>DIGITAL_GRAMAJE_MAX) return false;
  if(cantidadUnidades>200) return false;
  return claseFormatoDigital(ancho,alto)!==null;
}
function descuentoVolumenDigital(cantidadUnidades){
  for(const [tope,pct] of DIGITAL_DESCUENTO_VOLUMEN){
    if(cantidadUnidades<=tope) return pct;
  }
  return 0.0;
}
function mermaDigitalHojas(cantTintas){
  return cantTintas>=2 ? DIGITAL_MERMA_HOJAS.policromia : DIGITAL_MERMA_HOJAS.negro;
}
function costoImpresionDigital(nPaginas,caras,esColor,ancho,alto,cantidadUnidades=1){
  const claseMin=claseFormatoDigital(ancho,alto);
  if(claseMin===null) return null;
  const ordenClasesDigital=['carta','octavo','pliego_max'];
  const clasesViables=ordenClasesDigital.slice(ordenClasesDigital.indexOf(claseMin));
  const margenCm=DIGITAL_PINZA_MM/10;
  const descuento=descuentoVolumenDigital(cantidadUnidades);
  let opciones=[];
  for(const clase of clasesViables){
    const [sheetW,sheetH]=DIGITAL_FORMATOS_CM[clase];
    let piezasPorClic=piezasPorPliego(ancho,alto,sheetW,sheetH-margenCm);
    if(piezasPorClic===0) piezasPorClic=1;
    const nClics=Math.ceil(nPaginas/piezasPorClic)*caras;
    const precioClic=DIGITAL_CLIC_COP[clase][esColor?"color":"negro"];
    const total=nClics*precioClic*(1-descuento);
    opciones.push({total, nClics, precioClic, clase, piezasPorClic});
  }
  opciones.sort((x,y)=>x.total-y.total);
  const mejor=opciones[0];
  return {total:mejor.total, via:"digital", nClics:mejor.nClics, precioClic:mejor.precioClic, descuentoPct:descuento, clase:mejor.clase, piezasPorClic:mejor.piezasPorClic};
}

function fraccionPliegoOffset(ancho,alto,esPolicromia=false){
  const [a,b]=ordenar2(ancho,alto);
  if(a<=24.5 && b<=34 && !esPolicromia) return "octavo";
  if(a<=34 && b<=49.5) return "cuarto";
  return "medio_pliego";
}
function mermaOffsetHojas(nHojasFisicas,cantTintas){
  let base=OFFSET_MERMA_HOJAS[OFFSET_MERMA_HOJAS.length-1][1];
  for(const [tope,merma] of OFFSET_MERMA_HOJAS){
    if(nHojasFisicas<=tope){ base=merma; break; }
  }
  if(cantTintas>=2) base*=OFFSET_MERMA_FACTOR_2_MAS_TINTAS;
  return base;
}
function millaresConTolerancia(nPasadas){
  if(nPasadas<=0) return 0;
  const base=Math.ceil(nPasadas/1000);
  if(base<=1) return 1;
  const resto=nPasadas-(base-1)*1000;
  return resto<=PRECIOS_OFFSET_TOLERANCIA_MERMA_MILLAR ? base-1 : base;
}
function costoImpresionOffset(nPiezasFinales,tintasTiro,tintasRetiro,esPolicromia,ancho,alto){
  const fraccion=fraccionPliegoOffset(ancho,alto,esPolicromia);
  const [sheetW,sheetH]=OFFSET_FORMATOS_IMPRESION_CM[fraccion];
  let piezasPorPasada=piezasPorPliego(ancho,alto,sheetW,sheetH);
  if(piezasPorPasada===0) piezasPorPasada=1;
  const nPasadas=Math.ceil(nPiezasFinales/piezasPorPasada);
  const millares=millaresConTolerancia(nPasadas);

  function costoTrabajo(nTintas){
    const nPlanchas=Math.max(nTintas,1);
    const costoCtp=OFFSET_CTP_COP[fraccion]*nPlanchas;
    let costoMillar;
    if(fraccion==="medio_pliego" && esPolicromia && nTintas>=4){
      costoMillar=OFFSET_MILLAR_COP.medio_pliego_policromia_4x0*millares;
    } else if(fraccion==="medio_pliego"){
      costoMillar=OFFSET_MILLAR_COP.medio_pliego_color*nPlanchas*millares;
    } else {
      costoMillar=OFFSET_MILLAR_COP[fraccion]*nPlanchas*millares;
    }
    return {nPlanchas, costoCtp, costoMillar, total:costoCtp+costoMillar};
  }

  const tiroJob = costoTrabajo(tintasTiro);
  let retiroJob = null, recargoRetiro = false, total = tiroJob.total;
  if(tintasRetiro>0){
    if(tintasTiro!==tintasRetiro){
      retiroJob = costoTrabajo(tintasRetiro);
      total += retiroJob.total;
    } else if(esPolicromia){
      total += tiroJob.total*OFFSET_RECARGO_RETIRO_MEDIO_PLIEGO_POLICROMIA_PCT;
      recargoRetiro = true;
    }
  }
  const nPlanchas = tiroJob.nPlanchas + (retiroJob?retiroJob.nPlanchas:0);
  return {total, via:"offset", fraccion, nPlanchas, nMillares:millares, tiroJob, retiroJob, recargoRetiro, piezasPorPasada, nPasadas};
}

function precioVentaDesdeSubtotal(subtotal,utilidadPct=0.40,comisionPct=0.03){
  return subtotal*(1+utilidadPct)*(1+comisionPct);
}
function disenoYPreprensa(montoOt){
  if(montoOt<ESCUDO_BAJOS_MONTOS_UMBRAL) return DISENO_COSTO_REDUCIDO;
  return DISENO_COSTO_NORMAL;
}
function tramoFondoSeguridad(costoDirecto){
  for(const [tope,pct] of FONDO_SEGURIDAD_TRAMOS){
    if(costoDirecto<=tope) return pct;
  }
  return FONDO_SEGURIDAD_TRAMOS[FONDO_SEGURIDAD_TRAMOS.length-1][1];
}
function claseTamanoComercial(ancho,alto){
  const [a,b]=ordenar2(ancho,alto);
  for(const t of VOLANTE_TAMANOS){
    const [ta,tb]=ordenar2(t.maxAncho,t.maxAlto);
    if(a<=ta && b<=tb) return t;
  }
  return null;
}
function costoRefileComercial(tamano, cantidad){
  if(!tamano || tamano.refileMillar500==null) return 0;
  let costo = Math.ceil(cantidad/500)*tamano.refileMillar500;
  if(cantidad>VOLANTE_REFILE_DESCUENTO_CANTIDAD_UMBRAL) costo *= (1-VOLANTE_REFILE_DESCUENTO_PCT);
  return costo;
}
function costoEmpaqueComercial(tamano, cantidad){
  if(!tamano || cantidad<VOLANTE_EMPAQUE_CANTIDAD_MINIMA) return 0;
  const nMillares = Math.ceil(cantidad/1000);
  const millaresAdicionales = Math.max(0, nMillares-1);
  const descuentoPct = Math.min(millaresAdicionales*VOLANTE_EMPAQUE_DESCUENTO_POR_MILLAR_PCT, VOLANTE_EMPAQUE_DESCUENTO_TOPE_PCT);
  return nMillares*tamano.empaqueMillar1000*(1-descuentoPct);
}
function costoPlegado(esPlegable, cantidad){
  if(!esPlegable) return 0;
  return Math.ceil(cantidad/1000)*VOLANTE_PLEGADO_COP_MILLAR;
}
function costoTransporteComercial(claseNombre, cantidad){
  if(claseNombre==="carta" && cantidad<VOLANTE_TRANSPORTE_CANTIDAD_MOTO_CARTA) return {via:"moto", total:VOLANTE_TRANSPORTE_MOTO_COP};
  if((claseNombre==="25x35"||claseNombre==="50x35") && cantidad<VOLANTE_TRANSPORTE_CANTIDAD_MOTO_MEDIO) return {via:"moto", total:VOLANTE_TRANSPORTE_MOTO_COP};
  return {via:"vehículo", total:VOLANTE_TRANSPORTE_VEHICULO_COP};
}

function cotizarVolante(p){
  const tamano = claseTamanoComercial(p.ancho, p.alto);
  if(!tamano) throw new Error("El tamaño "+p.ancho+"x"+p.alto+"cm excede 50x70cm -- fuera de la tabla de Papelería Comercial.");

  const [sustratoNombre, gramajeStr] = p.sustrato.split("__");
  const gramaje = parseFloat(gramajeStr);
  const cantTintas = Math.max(p.tintasTiro, p.tintasRetiro, 1);
  const esPolicromia = p.tintasTiro>=4 || p.tintasRetiro>=4;
  const esColor = cantTintas>=2;

  let impDigital = null;
  if(elegibleDigital(p.ancho, p.alto, gramaje, p.cantidad)){
    const merma = mermaDigitalHojas(cantTintas);
    impDigital = costoImpresionDigital(p.cantidad+merma, p.tintasRetiro>0?2:1, esColor, p.ancho, p.alto, p.cantidad);
  }
  const mermaOffset = mermaOffsetHojas(p.cantidad, cantTintas);
  const impOffset = costoImpresionOffset(p.cantidad+mermaOffset, p.tintasTiro, p.tintasRetiro, esPolicromia, p.ancho, p.alto);
  const usaDigital = !!(impDigital && impDigital.total < impOffset.total);
  const detalleImpresion = usaDigital ? impDigital : impOffset;

  const piezasConMerma = p.cantidad + (usaDigital ? mermaDigitalHojas(cantTintas) : mermaOffset);

  let anchoMontajeImpresion, altoMontajeImpresion, nPliegosImpresion;
  if(usaDigital){
    [anchoMontajeImpresion, altoMontajeImpresion] = DIGITAL_FORMATOS_CM[detalleImpresion.clase];
    nPliegosImpresion = Math.ceil(piezasConMerma/detalleImpresion.piezasPorClic);
  } else {
    const planoImp = planoImpresionOffset(p.ancho, p.alto, detalleImpresion.fraccion);
    [anchoMontajeImpresion, altoMontajeImpresion] = tacticalCorteMontajeOffset(detalleImpresion.fraccion, planoImp, OFFSET_FORMATOS_CM, OFFSET_FORMATOS_IMPRESION_CM);
    nPliegosImpresion = detalleImpresion.nPasadas;
  }
  const detalleMaterial = costoMaterialPliegos(anchoMontajeImpresion, altoMontajeImpresion, sustratoNombre, gramaje, nPliegosImpresion, 0);

  const costoRefile = costoRefileComercial(tamano, p.cantidad);
  const costoEmpaque = costoEmpaqueComercial(tamano, p.cantidad);
  const costoPlegadoTotal = costoPlegado(p.esPlegable, p.cantidad);

  const areaMontajeImpresionM2 = (anchoMontajeImpresion*altoMontajeImpresion)/10000;
  let costoPlastificado = 0;
  if(p.plastificado){
    costoPlastificado = Math.max(areaMontajeImpresionM2*nPliegosImpresion*p.carasPlastificado*PLASTIFICADO_COP_M2, PLASTIFICADO_PISO_COP);
  }
  // Acabados personalizados (Panel de Precios): no soportado por el bot todavía.
  const acabadosCustomCosto = {costoTotal:0, lineas:[]};

  const extraDesc = (p.extraDesc||'').trim();
  const extraCosto = p.extraCosto||0;
  const costoDirecto = detalleMaterial.costoTotal + detalleImpresion.total + costoRefile + costoEmpaque + costoPlegadoTotal + costoPlastificado + acabadosCustomCosto.costoTotal + extraCosto;

  const disenoCop = disenoYPreprensa(costoDirecto);
  const fondoSeguridadPct = tramoFondoSeguridad(costoDirecto);
  const fondoSeguridadCop = costoDirecto*fondoSeguridadPct;
  const sherpaCop = SHERPA_BASE_COP;
  const transporte = costoTransporteComercial(tamano.clase, p.cantidad);

  const subtotal = costoDirecto + disenoCop + fondoSeguridadCop + sherpaCop + transporte.total;

  const precioVentaTotal = precioVentaDesdeSubtotal(subtotal, p.utilidadPct, p.comisionPct);
  const precioVentaUnitario = precioVentaTotal/p.cantidad;
  const aplicaIva = p.tipoCliente !== 'personalizado';
  const ivaTotal = aplicaIva ? precioVentaTotal*0.19 : 0;
  const precioFinalTotal = precioVentaTotal+ivaTotal;
  const gananciaTotal = precioVentaTotal - subtotal;
  const gananciaUnitaria = gananciaTotal/p.cantidad;

  return {
    aplicaIva, tamano, usaDigital, detalleImpresion, detalleMaterial,
    plastificado:p.plastificado, carasPlastificado:p.carasPlastificado, costoPlastificado,
    costoRefile, costoEmpaque, costoPlegadoTotal, extraDesc, extraCosto, costoDirecto,
    disenoCop, fondoSeguridadPct, fondoSeguridadCop, sherpaCop, transporte,
    subtotal, precioVentaTotal, precioVentaUnitario, ivaTotal, precioFinalTotal,
    gananciaTotal, gananciaUnitaria,
  };
}

return cotizarVolante(p);
`;

// Ejecuta el motor real (new Function = mismo V8 que usa el navegador, sin reinterpretar la
// fórmula). Cualquier throw de adentro (tamaño fuera de tabla, papel no encontrado, etc.) sube tal
// cual para que el llamador lo convierta en un mensaje claro para el usuario.
function ejecutarCotizarVolante(p: Record<string, unknown>): any {
  // deno-lint-ignore no-explicit-any
  const fn = new Function("p", MOTOR_VOLANTES_JS) as (p: any) => any;
  return fn(p);
}

// Arma el objeto "p" que espera cotizarVolante() a partir de lo que Claude mandó por la
// herramienta -- valida el papel contra el catálogo real (con tolerancia de mayúsculas/espacios).
function construirParamsVolante(input: any) {
  const nombre = String(input.sustrato_nombre || "").trim();
  const gramaje = Number(input.sustrato_gramaje);
  const sustratoKey = resolverSustrato(nombre, gramaje);
  const plastificado = !!input.plastificado;
  return {
    ancho: Number(input.ancho_cm),
    alto: Number(input.alto_cm),
    cantidad: Number(input.cantidad),
    sustrato: sustratoKey,
    tintasTiro: Number(input.tintas_tiro) || 0,
    tintasRetiro: Number(input.tintas_retiro) || 0,
    esPlegable: !!input.es_plegable,
    plastificado,
    carasPlastificado: plastificado ? Number(input.caras_plastificado) || 1 : 1,
    extraDesc: input.extra_desc || "",
    extraCosto: Number(input.extra_costo) || 0,
    utilidadPct: input.utilidad_pct != null ? Number(input.utilidad_pct) : 0.40,
    comisionPct: input.comision_pct != null ? Number(input.comision_pct) : 0.03,
    tipoCliente: input.tipo_cliente,
  };
}

function formatearCop(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

// Herramienta 1: solo calcula, no guarda nada.
async function herramientaCotizarVolante(input: any) {
  try {
    const p = construirParamsVolante(input);
    if (!p.ancho || !p.alto || !p.cantidad) {
      return { ok: false, error: "Faltan ancho, alto o cantidad." };
    }
    if (!["corporativo", "personalizado"].includes(p.tipoCliente)) {
      return { ok: false, error: "tipo_cliente debe ser 'corporativo' o 'personalizado' -- pregúntale al usuario cuál es." };
    }
    const r = ejecutarCotizarVolante(p);
    return {
      ok: true,
      desglose: {
        tamano_clase: r.tamano.clase,
        via_impresion: r.usaDigital ? "digital" : "offset (" + r.detalleImpresion.fraccion + ")",
        formato_material: r.detalleMaterial.formato,
        pliegos_material: r.detalleMaterial.nPliegos,
        costo_material_cop: formatearCop(r.detalleMaterial.costoTotal),
        costo_impresion_cop: formatearCop(r.detalleImpresion.total),
        costo_refile_cop: formatearCop(r.costoRefile),
        costo_empaque_cop: formatearCop(r.costoEmpaque),
        costo_plegado_cop: formatearCop(r.costoPlegadoTotal),
        costo_plastificado_cop: formatearCop(r.costoPlastificado),
        proceso_adicional: r.extraCosto > 0 ? { desc: r.extraDesc, costo_cop: formatearCop(r.extraCosto) } : null,
        costo_directo_total_cop: formatearCop(r.costoDirecto),
        diseno_preprensa_cop: formatearCop(r.disenoCop),
        fondo_seguridad_cop: formatearCop(r.fondoSeguridadCop),
        sherpa_cop: formatearCop(r.sherpaCop),
        transporte_cop: formatearCop(r.transporte.total) + " (" + r.transporte.via + ")",
        subtotal_cop: formatearCop(r.subtotal),
        precio_venta_total_sin_iva_cop: formatearCop(r.precioVentaTotal),
        precio_venta_unitario_sin_iva_cop: formatearCop(r.precioVentaUnitario),
        aplica_iva: r.aplicaIva,
        iva_cop: formatearCop(r.ivaTotal),
        precio_final_total_cop: formatearCop(r.precioFinalTotal),
        precio_final_unitario_cop: formatearCop(r.precioFinalTotal / p.cantidad),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Herramienta 2: RECALCULA (no confía en ningún número que Claude haya podido repetir mal) y
// escribe en Supabase usando la sesión del propio usuario logueado (mismo permiso/RLS que tiene
// navegando el ERP normalmente -- no SERVICE_ROLE).
// deno-lint-ignore no-explicit-any
async function herramientaGuardarCotizacionVolante(input: any, supabaseUser: any) {
  try {
    const p = construirParamsVolante(input);
    if (!["corporativo", "personalizado"].includes(p.tipoCliente)) {
      return { ok: false, error: "tipo_cliente debe ser 'corporativo' o 'personalizado'." };
    }
    if (!input.cliente_empresa || !String(input.cliente_empresa).trim()) {
      return { ok: false, error: "Falta el nombre del cliente/empresa." };
    }
    if (!VENDEDORES.includes(input.vendedor)) {
      return { ok: false, error: "vendedor debe ser uno de: " + VENDEDORES.join(", ") };
    }
    const r = ejecutarCotizarVolante(p);

    const empresa = String(input.cliente_empresa).trim();
    const encargado = (input.cliente_encargado || "").trim() || "Sin contacto directo";
    const telefono = (input.cliente_telefono || "").trim();
    const correo = (input.cliente_correo || "").trim();

    // Buscar cliente existente (mismo criterio que las calculadoras: por correo, o por empresa+nombre).
    // deno-lint-ignore no-explicit-any
    let cli: any = null;
    if (correo) {
      const { data } = await supabaseUser.from("clientes").select("*").ilike("correo", correo).limit(1);
      if (data && data.length) cli = data[0];
    }
    if (!cli) {
      const { data } = await supabaseUser.from("clientes").select("*").ilike("empresa", empresa).ilike("nombre", encargado).limit(1);
      if (data && data.length) cli = data[0];
    }
    if (!cli) {
      cli = {
        id: crypto.randomUUID(), empresa, nombre: encargado, telefono, correo,
        clase: "nuevo", tipo: p.tipoCliente, identificacion: "", ltv: 0, solo_b2c: false,
      };
      const { error } = await supabaseUser.from("clientes").insert(cli);
      if (error) return { ok: false, error: "No se pudo crear el cliente: " + error.message };
    } else {
      // deno-lint-ignore no-explicit-any
      const upd: any = {};
      if (telefono) upd.telefono = telefono;
      if (correo) upd.correo = correo;
      if (p.tipoCliente) upd.tipo = p.tipoCliente;
      if (Object.keys(upd).length) await supabaseUser.from("clientes").update(upd).eq("id", cli.id);
    }

    const { data: ot, error: otError } = await supabaseUser.rpc("siguiente_ot");
    if (otError || !ot) return { ok: false, error: "No se pudo generar el número de OT: " + (otError?.message || "sin dato") };

    const nombreCli = cli.nombre && cli.nombre.toLowerCase() !== cli.empresa.toLowerCase()
      ? `${cli.empresa} - ${cli.nombre}` : cli.empresa;
    const desc = `${p.cantidad} Volante/Afiche ${p.ancho}x${p.alto}cm`;
    const oppId = crypto.randomUUID();
    const [sustratoNombre, gramajeStr] = String(p.sustrato).split("__");

    const opp = {
      id: oppId, ot, id_cliente: cli.id, nombre_cli: nombreCli,
      descripcion: desc, vendedor: input.vendedor, monto: Math.round(r.precioFinalTotal),
      etapa: "cot", linea: "volantes", cantidad: p.cantidad,
      maquina: r.usaDigital ? "digital" : r.detalleImpresion.fraccion,
      material: `${sustratoNombre} ${gramajeStr}g`,
      n_pliegos: r.detalleMaterial.nPliegos,
      plano_corte: r.detalleMaterial.planoCorte || null,
    };
    const { error: oppError } = await supabaseUser.from("opps").insert(opp);
    if (oppError) return { ok: false, error: "No se pudo guardar el negocio en el CRM: " + oppError.message };

    const cotizacion = {
      id: oppId, linea: "volantes", ot, opp_id: oppId, id_cliente: cli.id,
      vendedor: input.vendedor, descripcion: desc,
      cliente_empresa: cli.empresa, cliente_encargado: cli.nombre, cliente_telefono: cli.telefono, cliente_correo: cli.correo,
      params: p, resultado: r,
    };
    const { error: cotError } = await supabaseUser.from("cotizaciones_calculadoras").insert(cotizacion);
    if (cotError) {
      // El negocio ya quedó -- avisar honestamente que el desglose editable no se guardó, sin
      // fingir que todo salió perfecto (mismo criterio que el resto del ERP).
      return {
        ok: true, ot, precio_final_total_cop: formatearCop(r.precioFinalTotal), cliente: cli.empresa,
        aviso: "El negocio quedó guardado en el CRM, pero el desglose editable no se pudo guardar -- avísale a Helver.",
      };
    }
    return { ok: true, ot, precio_final_total_cop: formatearCop(r.precioFinalTotal), cliente: cli.empresa };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Definición de herramientas para Claude (Anthropic tool use).
const TOOLS: Anthropic.Tool[] = [
  {
    name: "cotizar_volante",
    description:
      "Calcula el precio REAL de un volante/afiche/plegable con el motor de cálculo real de Tactical (línea Volantes, modo estándar -- no Imán ni Kit multi-ítem). Úsala SIEMPRE que necesites dar un precio de esta línea -- nunca calcules el precio con tu propio razonamiento, esta herramienta es la única fuente confiable. Antes de llamarla, junta con el usuario: tamaño, cantidad, papel (nombre+gramaje), tintas (tiro/retiro), si es plegable, si lleva plastificado, y si el cliente es corporativo o personalizado (esto último cambia si se cobra IVA -- pregúntalo siempre si no te lo han dicho).",
    input_schema: {
      type: "object",
      properties: {
        ancho_cm: { type: "number", description: "Ancho de la pieza terminada, en cm (máximo 50cm en cualquier lado)" },
        alto_cm: { type: "number", description: "Alto de la pieza terminada, en cm" },
        cantidad: { type: "integer", description: "Cantidad de unidades" },
        sustrato_nombre: { type: "string", description: "Nombre del papel tal como está en el catálogo, ej: Propalcote, Bond, Cartulina C14" },
        sustrato_gramaje: { type: "number", description: "Gramaje del papel, ej: 150" },
        tintas_tiro: { type: "integer", description: "Tintas en la cara frontal: 0-3 = tintas planas, 4 = full color/policromía" },
        tintas_retiro: { type: "integer", description: "Tintas en la cara trasera (0 si es a una sola cara)" },
        es_plegable: { type: "boolean", description: "Si lleva algún doblez" },
        plastificado: { type: "boolean" },
        caras_plastificado: { type: "integer", description: "1 o 2, solo si plastificado=true" },
        tipo_cliente: { type: "string", enum: ["corporativo", "personalizado"], description: "corporativo=factura electrónica (paga IVA), personalizado=cuenta de cobro (NO paga IVA)" },
        extra_desc: { type: "string", description: "Opcional: descripción de un proceso adicional puntual" },
        extra_costo: { type: "number", description: "Opcional: costo en COP de ese proceso adicional" },
      },
      required: ["ancho_cm", "alto_cm", "cantidad", "sustrato_nombre", "sustrato_gramaje", "tintas_tiro", "tintas_retiro", "es_plegable", "plastificado", "tipo_cliente"],
    },
  },
  {
    name: "guardar_cotizacion_volante",
    description:
      "Guarda en el CRM del ERP (como negocio nuevo, etapa 'Cotizado') la cotización de Volantes que se acaba de calcular con cotizar_volante -- vuelve a calcular internamente con los MISMOS datos técnicos para no depender de un número que hayas repetido. SOLO llámala después de que el usuario confirme EXPLÍCITAMENTE que quiere guardarla -- si dijo que era solo un dato suelto / de referencia / una vuelta, NO la llames. Necesitas también el nombre del cliente y a qué vendedor se asigna -- pregúntalos si aún no los tienes.",
    input_schema: {
      type: "object",
      properties: {
        ancho_cm: { type: "number" },
        alto_cm: { type: "number" },
        cantidad: { type: "integer" },
        sustrato_nombre: { type: "string" },
        sustrato_gramaje: { type: "number" },
        tintas_tiro: { type: "integer" },
        tintas_retiro: { type: "integer" },
        es_plegable: { type: "boolean" },
        plastificado: { type: "boolean" },
        caras_plastificado: { type: "integer" },
        tipo_cliente: { type: "string", enum: ["corporativo", "personalizado"] },
        extra_desc: { type: "string" },
        extra_costo: { type: "number" },
        cliente_empresa: { type: "string", description: "Nombre de la empresa o persona del cliente" },
        cliente_encargado: { type: "string", description: "Persona de contacto, opcional" },
        cliente_telefono: { type: "string", description: "Opcional" },
        cliente_correo: { type: "string", description: "Opcional" },
        vendedor: { type: "string", enum: VENDEDORES, description: "A qué vendedor se asigna este negocio" },
      },
      required: ["ancho_cm", "alto_cm", "cantidad", "sustrato_nombre", "sustrato_gramaje", "tintas_tiro", "tintas_retiro", "es_plegable", "plastificado", "tipo_cliente", "cliente_empresa", "vendedor"],
    },
  },
];

// deno-lint-ignore no-explicit-any
async function ejecutarHerramienta(nombre: string, input: any, supabaseUser: any): Promise<any> {
  if (nombre === "cotizar_volante") return await herramientaCotizarVolante(input);
  if (nombre === "guardar_cotizacion_volante") return await herramientaGuardarCotizacionVolante(input, supabaseUser);
  return { ok: false, error: "Herramienta desconocida: " + nombre };
}

// Datos técnicos REALES de Tactical (sacados directo del motor de cálculo del ERP -- precios_tactical.js
// y las calculadoras, no son un valor genérico de la industria). Conde 2026-09-01: primer dato real
// conectado al bot, para que no compita con la respuesta genérica que cualquier IA ya da gratis.
// Conde 2026-09-03: sumó el catálogo de papeles/cartulinas (Panel de Precios) y los troqueles de
// Cajas, Carpetas y Bolsas (Rompecabezas ya estaba desde el 09-01).
// Si Conde ajusta alguno de estos valores en el motor de precios, hay que actualizarlo también acá a
// mano -- no se leen automáticamente todavía (eso sería la siguiente mejora de este mismo mecanismo).
const DATOS_TECNICOS_REALES = `
- Margen de pinza en impresión DIGITAL: 5mm (0.5cm). Aplica en Bolsas, Carpetas, Cajas, Rompecabezas, Volantes, Cubo Rubik y Cuadernos.
- Área real de impresión en OFFSET (litografía) por formato de máquina -- estos son los valores validados y en uso en Volantes, Rompecabezas, Carpetas y Cuadernos (el margen de pinza NO es uniforme entre formatos, cada uno pierde un ancho distinto por lado):
  - Octavo: pliego de 25x35cm -> área imprimible real 24.5x34cm.
  - Cuarto: pliego de 35x50cm -> área imprimible real 34x49.5cm.
  - Medio pliego: pliego de 50x70cm -> área imprimible real 49x69.5cm.
  (Esto es solo para calcular cuántas piezas caben por pasada de impresión -- el tamaño de pliego que se compra/corta sigue siendo el tamaño completo de arriba, sin este descuento.)
- Carpetas: además del margen de pinza normal, se suma 1cm extra obligatorio al ALTO del montaje.

CATÁLOGO DE ROMPECABEZAS (línea B2C -- sacado directo de modulo_montajes_rompecabezas.html):

Troquelados (mayorista, mínimo 50 unidades -- SIN precio de lista fijo, siempre se cotiza con un asesor humano, no inventes un precio para esto):
6f: 10x10cm o 18.3x11.7cm | 12f: 18x14cm o 27x23cm | 21f: 20x10cm | 24f: 17x11cm | 30f: 21.5x17cm, 28x20cm o 30x22cm | 48f: 21.5x28cm | 70f: 49x33.5cm | 208f: 43x29.5cm | 252f: 48x33.5cm | 500f: 48x34cm | 1000f: 68x48cm

Láser Rectangular (precio de lista real en COP, venta directa):
20f 24x16cm $49.000 | 30f 32x24cm $55.000 | 80f 32x24cm $65.000 | 100f 32x32cm $73.000 | 150f 32x32cm $83.000 | 100f 50x33cm $85.000 | 200f 50x33cm $99.000 | 300f 50x33cm $125.000 | 500f 50x33cm $142.000 | 200f 66x50cm $139.000 | 300f 66x50cm $149.000 | 500f 66x50cm $159.000 | 1000f 66x50cm $189.000 | 1000f 100x66cm $219.000 | 1500f 100x66cm $240.000 | 2000f 100x66cm $259.000 | 3000f 100x66cm $329.000 | 4000f 90x130cm $380.000 | 5000f 90x130cm $490.000

Láser Portarretrato:
30f 25x16cm $65.000 | 50f 28x22cm $79.000 | 80f 28x22cm $95.000 | 90f 12x17cm (marco de madera) $65.000 | 200f 33x50cm $129.000

Láser Corazón:
30f 32x24cm $75.000 | 60f 32x24cm $85.000 | 90f 32x24cm $95.000 | 160f 50x33cm $110.000 | 90f 32x24cm (corazón + portarretrato) $125.000

Láser Círculo:
50f (diámetro 32cm) $73.000 | 110f (diámetro 32cm) $83.000 | 700f (diámetro 60cm) $219.000

Nota importante sobre esta línea: los precios de Rompecabezas Láser SÍ son precio de lista fijo (no dependen de una fórmula variable), por eso se pueden dar directo. Aplica 20% de descuento automático en cada unidad PAR del pedido (2a, 4a, 6a...) si preguntan por varias unidades. El resto de líneas del ERP (Cuadernos, Carpetas, Bolsas, Cajas, Cubo Rubik, Promocionales) NO tienen precio de lista fijo -- sus precios dependen de cantidad/material/tintas y requieren el motor de cálculo real, que todavía no está conectado a este bot (Volantes SÍ ya está conectado, ver la herramienta cotizar_volante).

CATÁLOGO DE PAPELES Y CARTULINAS (precio por PLIEGO completo, en COP -- sacado de precios_tactical.js, PRECIOS_BASE_SUSTRATOS. "N/D" = ese gramaje no se maneja en ese tamaño de pliego. OJO: si Conde cambió alguno de estos precios desde el Panel de Precios del Hub, ese ajuste vive en el navegador de Conde y NO se refleja acá automáticamente -- si el precio se ve muy distinto a lo que él recuerda, acláraselo en vez de insistir en el valor de esta lista):
Bond 60g: pliego 60x90 $177 | pliego 70x100 $230
Bond 70g: pliego 60x90 $206 | pliego 70x100 $267
Bond 75g: pliego 60x90 $221 | pliego 70x100 $287
Bond 90g: pliego 60x90 $266 | pliego 70x100 $344
Bond 115g: pliego 60x90 N/D | pliego 70x100 $459
Propalcote 80g: pliego 60x90 N/D | pliego 70x100 $309
Propalcote 90g: pliego 60x90 $267 | pliego 70x100 $348
Propalcote 115g: pliego 60x90 $344 | pliego 70x100 $448
Propalcote 150g: pliego 60x90 $473 | pliego 70x100 $613
Propalcote 200g: pliego 60x90 $604 | pliego 70x100 $810
Propalcote 240g: pliego 60x90 $807 | pliego 70x100 $1.050
Propalcote 300g: pliego 60x90 $911 | pliego 70x100 $1.183
Propalcote 350g: pliego 60x90 N/D | pliego 70x100 $1.382
Cartulina C11 190g: pliego 60x90 N/D | pliego 70x100 $684
Cartulina C12 205g: pliego 60x90 $581 | pliego 70x100 $753
Cartulina C14 225g: pliego 60x90 $637 | pliego 70x100 $826
Cartulina C16 255g: pliego 60x90 $723 | pliego 70x100 $937
Cartulina C18 275g: pliego 60x90 $779 | pliego 70x100 $1.010
Cartulina C20 305g: pliego 60x90 $864 | pliego 70x100 $1.121
Cartulina C22 330g: pliego 60x90 N/D | pliego 70x100 $1.212
Eart Pact 70g: pliego 60x90 $218 | pliego 70x100 $277
Bristol Color 150g: pliego 60x90 N/D | pliego 70x100 $613
Bristol Blanca 140g: pliego 60x90 N/D | pliego 70x100 $555
Kraft Cartón 335g: pliego 60x90 N/D | pliego 70x100 $924
Kraft 98g: pliego 60x90 N/D | pliego 70x100 $353
Kraft 120g: pliego 60x90 N/D | pliego 70x100 $370
Book Cream 56.2g: pliego 60x90 $185 | pliego 70x100 $218
Adhesivo Ritrama Corriente 160g: pliego 60x90 N/D | pliego 70x100 $1.597
Adhesivo Ritrama Seguridad 160g: pliego 60x90 N/D | pliego 70x100 $1.916
Adhesivo Ritrama Vinilo Blanco 220g: pliego 60x90 N/D | pliego 70x100 $5.008
Adhesivo Ritrama Transparente 160g: pliego 60x90 N/D | pliego 70x100 $5.008
Adhesivo Ritrama Polipropileno 220g: pliego 60x90 N/D | pliego 70x100 $4.484
Adhesivo Ritrama Bond 160g: pliego 60x90 N/D | pliego 70x100 $2.147
Adhesivo Arclad PXH K80 160g: pliego 60x90 N/D | pliego 70x100 $1.479
Adhesivo Arclad Corriente P3 160g: pliego 60x90 N/D | pliego 70x100 $1.672
Adhesivo Arclad Hotmelt 160g: pliego 60x90 N/D | pliego 70x100 $2.013
Adhesivo Arclad P4 160g: pliego 60x90 N/D | pliego 70x100 $2.269
(Estos son precio de INSUMO -- lo que Tactical paga por el pliego de papel, no el precio de venta al cliente. Si preguntan "cuánto vale un cuaderno/caja/etc" con esto no alcanza, hace falta el motor de cálculo completo -- para Volantes SÍ hay motor real, usa la herramienta cotizar_volante.)

CATÁLOGO DE TROQUELES -- CAJAS (calculadora_cajas.html, TROQUELES_CAJAS. Medidas en cm: ancho x alto x largo es la medida de la caja armada; "montaje impreso" es el tamaño de la pieza ya troquelada/plana que hay que imprimir):
CJB1-1: 7x1x15 -- montaje impreso 19.5x17 -- 1 cavidad
CJB1-2: 12.5x3.7x20.5 -- montaje impreso 32.5x31.5 -- 1 cavidad
CJB1-3: 14.5x4.2x15 -- montaje impreso 27x40.5 -- 1 cavidad
CJB1-4: 19.5x1.3x12.5 -- montaje impreso 22.7x17.5 -- 1 cavidad
CJB1-5: 8x4x8 -- montaje impreso 25x19 -- 1 cavidad
CJB1-6: 7.5x7.5x7.5 -- montaje impreso 31x25 -- 1 cavidad
CJB1-7: 6.3x6x6.3 -- montaje impreso 26x21 -- 1 cavidad
CJB1-8: 7x15.3x7 -- montaje impreso 29.5x29.5 -- 1 cavidad
CJB1-9: 22.5x3x15 -- montaje impreso 39.5x35 -- 1 cavidad
CJB1-10: 20x4x13.5 -- montaje impreso 49.5x34.5 -- 1 cavidad
CJB1-11: 4.5x4.7x4.5 -- montaje impreso 18.5x21 -- 1 cavidad
CJB1-12: 23.7x9x8 -- montaje impreso 45x20 -- 1 cavidad
CJB1-13: 5.8x5.8x5.8 -- montaje impreso 24.5x20 -- 1 cavidad
CJB1-14: 25x15x7.5 -- montaje impreso 66.5x30.5 -- 1 cavidad
CJB1-15: 6x24x6 -- montaje impreso 50x25.5 -- 2 cavidades (tubo, 2 cajas por golpe de troquel)
CJB1-16: 4.3x9.5x4.3 -- montaje impreso 28x28 -- 1 cavidad (tiene una medida alternativa de 5.3cm con montaje 22x21cm -- confirmar con Conde cuál usar)
CJB1-17: 9x2.5x9 -- montaje impreso 24x21.5 -- 1 cavidad
CJB1-18: 8x2x17.8 -- montaje impreso 35x27 -- 3 cavidades (3 cajas por golpe de troquel)
CJB1-19: 23.5x5.5x25 -- montaje impreso 67.5x48.5 -- 1 cavidad
CJB1-20: 26x8x26 -- montaje impreso 77x52 -- 1 cavidad (excede medio pliego 50x70, necesita máquina de pliego completo -- cotizar manual con proveedor externo)
CJB1-21: 15.5x4x11 -- montaje impreso 23x20 -- 3 cavidades (3 cajas por golpe de troquel, montaje alterno 50x14cm)

CATÁLOGO DE TROQUELES -- CARPETAS (calculadora_carpetas.html, TROQUELES_CARPETAS. Medidas en cm; "ancho x alto" es la carpeta cerrada, "montaje impreso" el tamaño de la pieza plana a imprimir):
CARP-001: 1 bolsillo (profundidad 8) -- 30x23 -- montaje impreso 46.5x38.5
CARP-002: 2 bolsillos (profundidad 3.5) -- 30x22.5 -- montaje impreso 49x34
CARP-003: 2 bolsillos (profundidad 10) -- 32x22.5 -- montaje impreso 56x45
CARP-004: 1 bolsillo (profundidad 6.5) -- 30.5x23 -- montaje impreso 47.5x37
CARP-005: 1 bolsillo (profundidad 10) -- 30x22.7 -- montaje impreso 47x40
CARP-006: 1 bolsillo (profundidad 8) -- 33x23 -- montaje impreso 48x41
CARP-007: 1 bolsillo (profundidad 5) -- 29x22.5 -- montaje impreso 47x34
CARP-008: 1 bolsillo (profundidad 4) -- 30.5x23 -- montaje impreso 47.5x34.5
CARP-009: 2 bolsillos (profundidad 10) -- 30.5x24.2 -- montaje impreso 51x40.8
CARP-010: 1 bolsillo (profundidad 5) -- 28.3x22.2 -- montaje impreso 47.5x33.5
CARP-011: 1 bolsillo (profundidad 3) -- 29x22.5 -- montaje impreso 69x32 (carpeta de 3 cuerpos)

CATÁLOGO DE TROQUELES -- BOLSAS (calculadora_bolsas.html, TROQUELES_BOLSAS. Medidas en cm: ancho x alto x profundo es la bolsa armada; "montaje impreso" el tamaño de la pieza plana a imprimir; "por2" indica si el troquel corta 2 bolsas por golpe):
BOLS-001: 33x25x13 -- montaje impreso 47.5x37 -- por2
BOLS-002: 25x25x10 -- montaje impreso 34x36 -- por2
BOLS-003: 21.5x37x9 -- montaje impreso 33x46.5 -- por2
BOLS-004: 45x34x13 -- montaje impreso 60x46 -- por2
BOLS-005: 27x33x6 -- montaje impreso 35x41 -- por2
BOLS-006: 24x19x7 -- montaje impreso 63.5x22.5 -- 1 sola pieza (no por2)
BOLS-007: 25x19x10 -- montaje impreso 38x31 -- por2 (trapecio 25/19.5cm, toma el ancho mayor)
BOLS-008: 33x20.5x6 -- montaje impreso 41x30.5 -- por2
BOLS-009: 30x33.5x13 -- montaje impreso 50.5x42.5 -- por2
BOLS-010: 38x35x12 -- montaje impreso 52x45 -- por2
BOLS-011: 30.5x53.5x16 -- montaje impreso 48x67.5 -- por2 (botellera)
BOLS-012: 24x32x10 -- montaje impreso 50x70 -- 1 sola pieza
BOLS-013: 21.5x30x12 -- montaje impreso 44x69 -- 1 sola pieza
BOLS-014: 25x30x8.5 -- montaje impreso 68.5x49.5 -- 1 sola pieza
BOLS-015: 25x35x8.5 -- montaje impreso 69x50 -- 1 sola pieza
BOLS-016: 34.5x25x6 -- montaje impreso 56x50 -- por2
`.trim();

// System prompt de Bot Tactical: soporte técnico neutral, distinto a Derek (coach de Bezalel en
// Telegram, personalidad confrontativa -- proyecto separado, no confundir). Se le dice
// explícitamente qué NO puede hacer todavía para que no invente que ya sabe crear tareas,
// cotizaciones, o consultar datos reales del ERP -- eso llega en sesiones futuras.
const SYSTEM_PROMPT = `Eres "Bot Tactical", el asistente interno del ERP de Tactical Marketing Group (empresa de impresión y productos promocionales en Colombia).

Tu tono es neutral, profesional y directo -- como el soporte técnico interno de una empresa, no un coach ni un vendedor. Sin emojis excesivos, sin lenguaje motivacional.

Ayudas a los empleados con dudas técnicas de producción (sangrado, formatos de archivo, especificaciones de impresión) y, para la línea de Volantes/Afiches/Plegables, ya puedes calcular un precio REAL.

COTIZAR VOLANTES/AFICHES/PLEGABLES (línea estándar solamente -- NO Imán ni Kit multi-ítem, esos todavía no):
Cuando alguien te pida un precio de esta línea, junta conversacionalmente los datos que te faltan (tamaño, cantidad, papel+gramaje, tintas tiro/retiro, si es plegable, si lleva plastificado, y si el cliente es corporativo o personalizado -- esto último SIEMPRE pregúntalo si no te lo han dicho, cambia si se cobra IVA) y usa la herramienta cotizar_volante -- NUNCA calcules el precio con tu propio razonamiento, esa herramienta es la única fuente confiable del número real.

Después de mostrar el resultado, SIEMPRE pregunta: "¿Quieres que guarde esta cotización en el CRM como un negocio nuevo, o era solo un dato suelto de referencia?". Si el usuario confirma que la guardes, pídele el nombre del cliente (si no lo sabes) y a qué vendedor se asigna, y usa la herramienta guardar_cotizacion_volante. Si dice que era solo para consultar / de referencia / una vuelta rápida, NO la guardes -- deja el número ahí y sigue.

DATOS TÉCNICOS REALES DE TACTICAL (usa estos valores exactos cuando la pregunta sea sobre ellos -- son el dato real del motor de cálculo, no un promedio de la industria; si alguien pregunta "cuánto es el margen de pinza" sin más contexto, dale estos valores en vez de un rango genérico):
${DATOS_TECNICOS_REALES}

Para cualquier otra duda técnica que NO esté en esa lista, puedes usar tu conocimiento general de la industria gráfica, pero acláralo explícitamente (ej. "esto es un estándar general de la industria, no un valor confirmado de Tactical -- confírmalo con Helver antes de usarlo en producción").

IMPORTANTE -- todavía NO tienes estas capacidades, aunque el proyecto las va a incluir más adelante:
- Fuera de la lista de datos técnicos de arriba, no tienes acceso al resto de la documentación interna de Tactical ni a la biblioteca de videos de procesos todavía.
- No puedes cotizar de verdad ninguna línea aparte de Volantes/Afiches/Plegables estándar (Cuadernos, Carpetas, Bolsas, Cajas, Cubo Rubik, Promocionales, Rompecabezas mayorista, y los modos Imán/Kit multi-ítem de Volantes siguen sin motor real conectado).
- No puedes crear ni borrar tareas.
- No puedes consultar el resto del ERP (Kanban, finanzas, etc.) más allá de guardar una cotización de Volantes.
Si te preguntan por algo de esa lista, dilo con honestidad ("todavía no tengo esa función conectada") en vez de inventar una respuesta o fingir que lo hiciste.

Si una pregunta necesita resolución humana que no puedes dar con conocimiento general, sugiere escalar a **Helver** (si es un tema de producción/técnico) o a **Norely** (si es administrativo/comercial) -- nunca digas "Bezalel", ese nombre es de otro proyecto interno y el equipo no lo reconoce.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // --- 1. Verificar que quien pregunta tiene una sesión real en el ERP ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No autenticado." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    // Cliente CON la sesión del usuario (no ANON pelado, no SERVICE_ROLE) -- lo que guardar_
    // cotizacion_volante escriba pasa por el MISMO RLS/permiso que ese usuario tiene navegando el
    // ERP normalmente.
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // --- 2. Leer el mensaje + historial corto que manda el widget ---
    const body = await req.json();
    const mensaje = (body?.mensaje || "").toString().trim();
    const historial: Array<{ role: string; content: string }> = Array.isArray(body?.historial)
      ? body.historial
      : [];
    if (!mensaje) {
      return new Response(JSON.stringify({ error: "Mensaje vacío." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- 3. Conversación con Claude, con bucle de herramientas ---
    // deno-lint-ignore no-explicit-any
    const mensajesClaude: any[] = [
      ...historial
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: mensaje },
    ];

    let textoFinal = "";
    const MAX_VUELTAS_HERRAMIENTAS = 6;
    for (let vuelta = 0; vuelta < MAX_VUELTAS_HERRAMIENTAS; vuelta++) {
      const respuesta = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1536,
        system: SYSTEM_PROMPT,
        // effort "medium": ahora hay que orquestar herramientas y armar parámetros correctamente,
        // no solo responder preguntas cortas de soporte -- "low" se quedaba corto para eso.
        output_config: { effort: "medium" },
        tools: TOOLS,
        messages: mensajesClaude,
      });

      const textBlocks = respuesta.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      textoFinal = textBlocks.map((b) => b.text).join("\n").trim();
      const toolUses = respuesta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      if (toolUses.length === 0) break; // Claude ya dio la respuesta final, sin pedir más herramientas.

      mensajesClaude.push({ role: "assistant", content: respuesta.content });
      const toolResults = [];
      for (const tu of toolUses) {
        const resultado = await ejecutarHerramienta(tu.name, tu.input, supabaseUser);
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(resultado) });
      }
      mensajesClaude.push({ role: "user", content: toolResults });
    }

    return new Response(JSON.stringify({ respuesta: textoFinal || "(sin respuesta)" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error en bot-tactical:", e);
    return new Response(
      JSON.stringify({ error: "Hubo un problema técnico procesando tu pregunta. Intenta de nuevo." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
