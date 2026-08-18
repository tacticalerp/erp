// ==========================================
// precios_promocionales.js
// Tablas de marcación (logo) digitalizadas para la línea PROMOCIONALES.
// Fuente: catálogos reales de los proveedores de marcación (no son precios de Tactical,
// son lo que Tactical paga a quien pone el logo en el producto comprado a un distribuidor).
//   - PROMOS: "PROMOS LISTA DE PRECIOS MARCAS.pdf" (marcación propia de catalogospromocionales.com)
//   - SIMA:   "SIMA LISTA DE PRECIOS FINAL Y ORIGINAL SIMA PROM.pdf" (TampoScreen.col — proveedor
//             independiente de marcación, usado sobre todo para PromoOpción pero sirve para cualquier
//             producto que llegue físicamente a ellos).
// v1 cubre las técnicas que más se repiten en el historial real de cotizaciones (Excel de la persona
// que cotiza): Tampografía, Screen/Serigrafía, Sublimación, DTF UV/Textil. Faltan por digitalizar:
// Láser, Bordado, Rotary/Digital, Litoresina/Repujado (menos frecuentes) y el catálogo de BOTONPROMO
// (Conde no lo ha subido aún) y el de "Bolsatex" (proveedor de bolsas que también marca, sin lista de
// precios todavía). Para esos casos la calculadora deja siempre un campo manual de respaldo.
// ==========================================

function promoBuscarPorTramo(tabla, cantidad){
  const tramo = tabla.tramos.find(tr => cantidad <= tr.hasta) || tabla.tramos[tabla.tramos.length - 1];
  return Math.max(tramo.precio * cantidad, tabla.minima);
}

// Calcula el costo total de marcación para una tabla + número de tintas + cantidad.
// tabla.tipo === 'porTinta'         -> cada número de tinta tiene su propia fila completa (tabla.porTinta[n])
// tabla.tipo === 'tinta1MasAdicional' -> tabla.tinta1 (primera tinta) + tabla.adicional × (tintas-1)
function promoCalcularMarca(tabla, tintas, cantidad){
  if(!tabla) return null;
  if(tabla.tipo === 'porTinta'){
    const t = tabla.porTinta[tintas] || tabla.porTinta[Object.keys(tabla.porTinta).pop()];
    if(!t) return null;
    return promoBuscarPorTramo(t, cantidad);
  }
  if(tabla.tipo === 'tinta1MasAdicional'){
    const base = promoBuscarPorTramo(tabla.tinta1, cantidad);
    if(tintas <= 1) return base;
    const adicPorUnidad = promoBuscarPorTramo(tabla.adicional, cantidad);
    return base + adicPorUnidad * (tintas - 1);
  }
  return null;
}

const PROMO_MARCACION_BASE = {
  promos: {
    nombre: "Promos (marcación propia — catalogospromocionales.com)",
    tecnicas: {
      tampografia: {
        nombre: "Tampografía",
        categorias: {
          boligrafos_plasticos: { nombre: "Bolígrafos plásticos", tipo:'porTinta', porTinta: {
            1: {minima:93500, tramos:[{hasta:4999,precio:94},{hasta:19999,precio:83},{hasta:Infinity,precio:77}]},
            2: {minima:154000, tramos:[{hasta:4999,precio:154},{hasta:19999,precio:121},{hasta:Infinity,precio:110}]},
            3: {minima:198000, tramos:[{hasta:4999,precio:198},{hasta:19999,precio:154},{hasta:Infinity,precio:121}]},
            4: {minima:264000, tramos:[{hasta:4999,precio:253},{hasta:19999,precio:187},{hasta:Infinity,precio:187}]},
          }},
          boligrafos_metalicos: { nombre: "Bolígrafos metálicos (solo láser)", tipo:'porTinta', porTinta: {
            1: {minima:146700, tramos:[{hasta:4999,precio:146},{hasta:19999,precio:129},{hasta:Infinity,precio:121}]},
            2: {minima:241500, tramos:[{hasta:4999,precio:242},{hasta:19999,precio:190},{hasta:Infinity,precio:173}]},
            3: {minima:310500, tramos:[{hasta:4999,precio:311},{hasta:19999,precio:242},{hasta:Infinity,precio:190}]},
            4: {minima:414000, tramos:[{hasta:4999,precio:397},{hasta:19999,precio:294},{hasta:Infinity,precio:294}]},
          }},
          termos_producto_complejo_5x5: { nombre: "Termos — empaque/desempaque complejo hasta 5x5 o 5.5x4cm", tipo:'porTinta', porTinta: {
            1: {minima:145730, tramos:[{hasta:4999,precio:145},{hasta:19999,precio:112},{hasta:Infinity,precio:102}]},
            2: {minima:230130, tramos:[{hasta:4999,precio:228},{hasta:19999,precio:177},{hasta:Infinity,precio:167}]},
            3: {minima:324300, tramos:[{hasta:4999,precio:322},{hasta:19999,precio:238},{hasta:Infinity,precio:228}]},
            4: {minima:414415, tramos:[{hasta:4999,precio:410},{hasta:19999,precio:307},{hasta:Infinity,precio:281}]},
          }},
          termos_producto_complejo_9x9: { nombre: "Termos — empaque/desempaque complejo hasta 9x9 o 5x9cm", tipo:'porTinta', porTinta: {
            1: {minima:146700, tramos:[{hasta:4999,precio:146},{hasta:19999,precio:129},{hasta:Infinity,precio:121}]},
            2: {minima:241500, tramos:[{hasta:4999,precio:242},{hasta:19999,precio:190},{hasta:Infinity,precio:173}]},
            3: {minima:310500, tramos:[{hasta:4999,precio:311},{hasta:19999,precio:242},{hasta:Infinity,precio:190}]},
            4: {minima:414000, tramos:[{hasta:4999,precio:397},{hasta:19999,precio:294},{hasta:Infinity,precio:294}]},
          }},
          antiestres_tratamiento: { nombre: "Antiestrés y productos con tratamiento (solo 1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:153965, tramos:[{hasta:4999,precio:153},{hasta:19999,precio:132},{hasta:Infinity,precio:132}]},
          }},
          silicona: { nombre: "Productos de silicona (tinta negra o blanca)", tipo:'porTinta', porTinta: {
            1: {minima:207200, tramos:[{hasta:4999,precio:207},{hasta:Infinity,precio:186}]},
          }},
        }
      },
      screen: {
        nombre: "Screen / Serigrafía",
        categorias: {
          circular_termos: { nombre: "Serigrafía circular en termos (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:170000, tramos:[{hasta:2000,precio:170},{hasta:Infinity,precio:145}]},
          }},
          carros_sillas_plegables: { nombre: "Carros y sillas plegables (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:253000, tramos:[{hasta:500,precio:1265},{hasta:Infinity,precio:1127}]},
          }},
          bolsas_algodon_textiles: { nombre: "Bolsas de algodón y textiles", tipo:'porTinta', porTinta: {
            1: {minima:216000, tramos:[{hasta:300,precio:1094},{hasta:500,precio:1005},{hasta:1000,precio:770},{hasta:2000,precio:581},{hasta:5000,precio:554},{hasta:Infinity,precio:513}]},
            2: {minima:275400, tramos:[{hasta:300,precio:1350},{hasta:500,precio:1148},{hasta:1000,precio:959},{hasta:2000,precio:756},{hasta:5000,precio:702},{hasta:Infinity,precio:581}]},
            3: {minima:334800, tramos:[{hasta:300,precio:1620},{hasta:500,precio:1377},{hasta:1000,precio:1161},{hasta:2000,precio:918},{hasta:5000,precio:891},{hasta:Infinity,precio:716}]},
            4: {minima:392850, tramos:[{hasta:300,precio:1890},{hasta:500,precio:1715},{hasta:1000,precio:1364},{hasta:2000,precio:1107},{hasta:5000,precio:1013},{hasta:Infinity,precio:824}]},
            5: {minima:452250, tramos:[{hasta:300,precio:2120},{hasta:500,precio:1823},{hasta:1000,precio:1580},{hasta:2000,precio:1283},{hasta:5000,precio:1256},{hasta:Infinity,precio:945}]},
            6: {minima:511650, tramos:[{hasta:300,precio:2403},{hasta:500,precio:2079},{hasta:1000,precio:1755},{hasta:2000,precio:1458},{hasta:5000,precio:1296},{hasta:Infinity,precio:1053}]},
          }, notaTintaAdicional:"Tinta adicional (más de 6): $78.300 mínima / $405,$351,$284,$216,$216,$216 según tramo"},
          bolsas_cambrel_sporty_hasta8x8: { nombre: "Bolsas Cambrel/Sporty Bags — logo hasta 8x8 (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:218500, tramos:[{hasta:Infinity,precio:284}]},
          }, nota:"Mínima aplica hasta 760 unid., desde 760 rige el precio unitario"},
          bolsas_cambrel_sporty_mayor8x8: { nombre: "Bolsas Cambrel/Sporty Bags — logo mayor a 8x8 (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:218500, tramos:[{hasta:Infinity,precio:345}]},
          }, nota:"Mínima aplica hasta 644 unid."},
          screen_complejo_empaque: { nombre: "Screen complejo — empaque y desempaque (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:280370, tramos:[{hasta:700,precio:632},{hasta:Infinity,precio:550}]},
          }},
          toalla_microfibra: { nombre: "Toalla microfibra (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:287500, tramos:[{hasta:1000,precio:702},{hasta:Infinity,precio:667}]},
          }},
          paraguas_1_casco: { nombre: "Paraguas 1 casco", tipo:'tinta1MasAdicional',
            tinta1: {minima:260000, tramos:[{hasta:500,precio:1306},{hasta:1000,precio:1235},{hasta:Infinity,precio:1102}]},
            adicional: {minima:213696, tramos:[{hasta:500,precio:986},{hasta:1000,precio:950},{hasta:Infinity,precio:855}]},
          },
          paraguas_2_cascos: { nombre: "Paraguas 2 cascos (misma marca)", tipo:'tinta1MasAdicional',
            tinta1: {minima:332416, tramos:[{hasta:300,precio:2136},{hasta:500,precio:2020},{hasta:Infinity,precio:1924}]},
            adicional: {minima:206030, tramos:[{hasta:300,precio:1898},{hasta:500,precio:1804},{hasta:Infinity,precio:1686}]},
          },
          paraguas_4_cascos: { nombre: "Paraguas 4 cascos (misma marca)", tipo:'tinta1MasAdicional',
            tinta1: {minima:380000, tramos:[{hasta:300,precio:3800},{hasta:500,precio:3600},{hasta:Infinity,precio:3445}]},
            adicional: {minima:231308, tramos:[{hasta:300,precio:3562},{hasta:500,precio:3443},{hasta:Infinity,precio:3207}]},
          },
        }
      },
      sublimacion: {
        nombre: "Sublimación",
        categorias: {
          general: { nombre: "Sublimación (impresión por cm² + planchado)", tipo:'formula',
            minimaSoloImpresion: 88000,
            tarifaCm2: [{hasta:9000,precio:1.87},{hasta:Infinity,precio:1.65}],
            planchado: {gorra:440, padMouse:385, complejo:660},
          },
          microfibra_ho177: { nombre: "Microfibra HO-177 (1 tinta)", tipo:'porTinta', porTinta: {
            1: {minima:99560, tramos:[{hasta:Infinity,precio:902}]},
          }},
        }
      },
      dtf_textil: {
        nombre: "DTF Textil",
        categorias: {
          general: { nombre: "DTF Textil (impresión por cm² + planchado)", tipo:'formula',
            minimaSoloImpresion: 88000,
            tarifaCm2: [{hasta:9000,precio:14},{hasta:Infinity,precio:12}],
            planchado: {gorra:418, morral:660, variedades:495},
          }
        }
      },
      dtf_uv: {
        nombre: "DTF UV",
        categorias: {
          general: { nombre: "DTF UV (impresión por cm² + pegue)", tipo:'formula',
            minimaSoloImpresion: 88000,
            tarifaCm2: [{hasta:9000,precio:20},{hasta:Infinity,precio:19}],
            planchado: {termo:440, complejo:440},
          }
        }
      },
      grabado_laser: {
        nombre: "Grabado láser",
        categorias: {
          marca_1min: { nombre: "Marca hasta 1 minuto", tipo:'porTinta', porTinta: {
            1: {minima:163350, tramos:[{hasta:Infinity,precio:903}]},
          }, nota:"Más de 1 min: 1:00-1:29min=$998, 1:30-2:29min=$1.425, 2:30+ cotizar. Personalización $2.875, líquido oxidante $1.404"},
        }
      },
      mugs_termos_rotary: {
        nombre: "Mugs y termos (impresión digital/rotary)",
        categorias: {
          una_cara: { nombre: "1 cara", tipo:'porTinta', porTinta: {
            1: {minima:140185, tramos:[{hasta:750,precio:1000},{hasta:Infinity,precio:863}]},
          }},
          contorno: { nombre: "Contorno", tipo:'porTinta', porTinta: {
            1: {minima:172785, tramos:[{hasta:750,precio:1078},{hasta:Infinity,precio:1005}]},
          }, nota:"Personalización $594"},
        }
      },
      otras_tecnicas: {
        nombre: "Otras técnicas",
        categorias: {
          bordado: { nombre: "Bordado (mínima + por puntada)", tipo:'formula', minima:172400, porPuntada:0.30 },
          litoresina: { nombre: "Litoresina (identificadores/USB)", tipo:'porTinta', porTinta: {
            1: {minima:216000, tramos:[{hasta:Infinity,precio:756}]},
          }},
          repujado: { nombre: "Repujado", tipo:'porTinta', porTinta: {
            1: {minima:219000, tramos:[{hasta:Infinity,precio:436}]},
          }, nota:"Personalización $2.930"},
        }
      },
    }
  },

  sima: {
    nombre: "SIMA / TampoScreen.col (proveedor independiente de marcación)",
    tecnicas: {
      tampografia: {
        nombre: "Tampografía",
        categorias: {
          boligrafos_sin_tratamiento: { nombre: "Bolígrafos sin tratamiento", tipo:'porTinta', porTinta: {
            1: {minima:85000, tramos:[{hasta:4999,precio:85},{hasta:19999,precio:75},{hasta:Infinity,precio:70}]},
            2: {minima:140000, tramos:[{hasta:4999,precio:140},{hasta:19999,precio:110},{hasta:Infinity,precio:100}]},
          }, nota:"2 tintas: solo bolígrafos metálicos con láser. Sin bolsa individual incluida."},
          boligrafos_con_tratamiento: { nombre: "Bolígrafos con tratamiento (piel durazno/grip goma/trigo)", tipo:'porTinta', porTinta: {
            1: {minima:127500, tramos:[{hasta:4999,precio:127},{hasta:19999,precio:112},{hasta:Infinity,precio:105}]},
            2: {minima:210000, tramos:[{hasta:4999,precio:210},{hasta:19999,precio:165},{hasta:Infinity,precio:150}]},
          }},
          antiestres_menor10x10: { nombre: "Productos antiestrés (menor a 10x10cm)", tipo:'porTinta', porTinta: {
            1: {minima:153000, tramos:[{hasta:4999,precio:153},{hasta:19999,precio:131},{hasta:Infinity,precio:129}]},
          }},
          ecologicos_tinta_normal: { nombre: "Ecológicos — bambú/madera/cartón (tinta normal, no trigo)", tipo:'porTinta', porTinta: {
            1: {minima:127500, tramos:[{hasta:4999,precio:127},{hasta:19999,precio:112},{hasta:Infinity,precio:105}]},
            2: {minima:210000, tramos:[{hasta:4999,precio:210},{hasta:19999,precio:165},{hasta:Infinity,precio:150}]},
          }},
          variedades_tratamiento_pequeno: { nombre: "Variedades con tratamiento — producto pequeño (<5x5cm)", tipo:'porTinta', porTinta: {
            1: {minima:142560, tramos:[{hasta:4999,precio:141},{hasta:19999,precio:122},{hasta:Infinity,precio:102}]},
            2: {minima:228690, tramos:[{hasta:4999,precio:224},{hasta:19999,precio:211},{hasta:Infinity,precio:201}]},
          }},
          variedades_tratamiento_grande: { nombre: "Variedades con tratamiento — producto grande (hasta 10x10cm)", tipo:'porTinta', porTinta: {
            1: {minima:167270, tramos:[{hasta:4999,precio:166},{hasta:19999,precio:128},{hasta:Infinity,precio:116}]},
            2: {minima:264150, tramos:[{hasta:4999,precio:261},{hasta:19999,precio:203},{hasta:Infinity,precio:191}]},
          }},
          metalicos_ceramicos: { nombre: "Metálicos-cerámicos (<10x10cm, logo máx 4.5cm)", tipo:'porTinta', porTinta: {
            1: {minima:180000, tramos:[{hasta:5000,precio:500},{hasta:Infinity,precio:450}]},
            2: {minima:290000, tramos:[{hasta:5000,precio:950},{hasta:Infinity,precio:850}]},
          }, nota:"No aplica bolígrafos metálicos ni accesorios plásticos"},
        }
      },
      screen: {
        nombre: "Screen / Serigrafía",
        categorias: {
          paraguas_1_casco: { nombre: "Paraguas 1 casco", tipo:'tinta1MasAdicional',
            tinta1: {minima:202950, tramos:[{hasta:500,precio:1235},{hasta:1000,precio:1102},{hasta:Infinity,precio:1010}]},
            adicional: {minima:352950, tramos:[{hasta:500,precio:986},{hasta:1000,precio:950},{hasta:Infinity,precio:855}]},
            nota:"Doble mano +50%. Empaque bolsa/forro individual $100. Cambio de tinta $30.000",
          },
          paraguas_2_cascos: { nombre: "Paraguas 2 cascos", tipo:'tinta1MasAdicional',
            tinta1: {minima:332416, tramos:[{hasta:300,precio:2136},{hasta:500,precio:2020},{hasta:Infinity,precio:1924}]},
            adicional: {minima:206030, tramos:[{hasta:300,precio:1898},{hasta:500,precio:1804},{hasta:Infinity,precio:1686}]},
          },
          paraguas_4_cascos: { nombre: "Paraguas 4 cascos", tipo:'tinta1MasAdicional',
            tinta1: {minima:380000, tramos:[{hasta:300,precio:2550},{hasta:500,precio:2500},{hasta:Infinity,precio:2450}]},
            adicional: {minima:231308, tramos:[{hasta:300,precio:1552},{hasta:500,precio:1502},{hasta:Infinity,precio:1452}]},
            nota:"Personalización $14.000 adicional por unidad",
          },
          bolsas_cambrel_sporty_hasta8x8: { nombre: "Bolsas Cambrel/Sporty Bags — logo hasta 8x8", tipo:'porTinta', porTinta: {
            1: {minima:208000, tramos:[{hasta:Infinity,precio:280}]},
            2: {minima:364000, tramos:[{hasta:Infinity,precio:477}]},
          }, nota:"Mínima hasta 760 unid. Blanco doble pasada en logo = 50% total. Muestra física $40.000"},
          bolsas_cambrel_sporty_mayor8x8: { nombre: "Bolsas Cambrel/Sporty Bags — logo mayor a 8x8", tipo:'porTinta', porTinta: {
            1: {minima:218000, tramos:[{hasta:Infinity,precio:340}]},
            2: {minima:381500, tramos:[{hasta:Infinity,precio:592}]},
          }, nota:"Mínima hasta 644 unid."},
          bolsas_metalizadas_yute_algodon: { nombre: "Bolsas metalizadas / yute / algodón", tipo:'porTinta', porTinta: {
            1: {minima:230000, tramos:[{hasta:Infinity,precio:360}]},
            2: {minima:398500, tramos:[{hasta:Infinity,precio:618}]},
          }, nota:"Mínima hasta 644 unid. No recomendado detalles pequeños en yute"},
          bolsas_plegables: { nombre: "Bolsas plegables (logo + planchado[+doblada])", tipo:'formula',
            minima:167400, logo:465, planchada:400, doblada:200,
            nota:"Total = logo + planchada (+ doblada si aplica). Ej: 465+400=865",
          },
          carros_sillas_plegables: { nombre: "Carros y sillas plegables", tipo:'porTinta', porTinta: {
            1: {minima:250000, tramos:[{hasta:500,precio:1250},{hasta:Infinity,precio:1245}]},
          }},
        }
      },
      sublimacion: {
        nombre: "Sublimación",
        categorias: {
          mugs: { nombre: "Mugs", tipo:'porTinta', porTinta: {
            1: {minima:35000, tramos:[{hasta:50,precio:2900},{hasta:100,precio:2850},{hasta:250,precio:2800},{hasta:500,precio:2750},{hasta:Infinity,precio:2700}]},
          }, nota:"Muestra física $15.000. Personalizada +10u $3.500"},
          pad_mouse: { nombre: "Pad Mouse", tipo:'porTinta', porTinta: {
            1: {minima:34000, tramos:[{hasta:25,precio:3400},{hasta:50,precio:2950},{hasta:100,precio:2450},{hasta:250,precio:2280},{hasta:500,precio:2150},{hasta:Infinity,precio:2050}]},
          }, nota:"Muestra física $15.000. Personalizada +10u $3.400"},
          litoresina: { nombre: "Litoresina (identificadores/USB)", tipo:'porTinta', porTinta: {
            1: {minima:216000, tramos:[{hasta:285,precio:756},{hasta:Infinity,precio:756}]},
          }},
        }, nota:"Camisas/sombrillas/paños sublimables: cotización previa (artículo complejo)."
      },
    },
    recargos: { servicioExpress: 0.35, danoReservado: 0.01 },
  },
};

// ==========================================
// Overrides desde el Panel de Precios del hub (mismo patrón que precios_tactical.js:
// TACTICAL_PRECIOS_OVERRIDE / tactical_precios_override_v1). Como este árbol es mucho más
// profundo y heterogéneo (proveedor -> técnica -> categoría -> tinta -> tramo) que las tablas
// planas de precios_tactical.js, el override no se guarda por "grupo" fijo sino como un mapa
// plano { "ruta.con.puntos": valorNuevo }, y se aplica recorriendo el árbol genéricamente en
// vez de tener un merge a mano por cada forma distinta de tabla.
// ==========================================
function promoLeerOverrides(){
  try{ return JSON.parse(localStorage.getItem('tactical_precios_promo_override_v1')) || {}; }
  catch(e){ return {}; }
}
function promoAplicarOverrides(base, overrides){
  const clone = JSON.parse(JSON.stringify(base));
  Object.keys(overrides||{}).forEach(path => {
    const partes = path.split('.');
    let nodo = clone;
    for(let i=0;i<partes.length-1;i++){
      if(nodo == null) return;
      nodo = nodo[partes[i]];
    }
    const ultima = partes[partes.length-1];
    if(nodo && typeof nodo[ultima] === 'number') nodo[ultima] = overrides[path];
  });
  return clone;
}
const PROMO_MARCACION = promoAplicarOverrides(PROMO_MARCACION_BASE, promoLeerOverrides());

// Recorre PROMO_MARCACION_BASE y devuelve cada precio editable (todo leaf numérico salvo
// "hasta", que es el límite estructural del tramo, no un precio) — lo usa el Panel de Precios
// del hub para construir el editor sin tener que conocer de antemano la forma de cada tabla.
function promoListarCamposEditables(){
  const filas = [];
  (function walk(nodo, ruta, miga){
    if(nodo === null || typeof nodo !== 'object') return;
    Object.keys(nodo).forEach(key => {
      if(key === 'hasta') return;
      const val = nodo[key];
      const nuevaMiga = miga.concat(key);
      if(typeof val === 'number'){
        filas.push({ path: ruta.concat(key).join('.'), miga: nuevaMiga, valor: val, contexto: nodo });
      } else if(val && typeof val === 'object'){
        walk(val, ruta.concat(key), nuevaMiga);
      }
    });
  })(PROMO_MARCACION_BASE, [], []);
  return filas;
}
