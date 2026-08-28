// ==========================================================================
// tactical-supabase.js
// Cliente compartido de Supabase + funciones de sesión/login para todo el ERP.
// Se carga en el Hub (y más adelante en las 8 calculadoras) DESPUÉS del CDN
// de supabase-js y ANTES del script principal de cada página:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="tactical-supabase.js"></script>
//
// La "anon key" de abajo es segura de tener en el código -- está diseñada
// para eso (es pública por definición), la seguridad real la da Row Level
// Security en la base de datos, no que esta clave esté "escondida".
// ==========================================================================

const TACTICAL_SUPABASE_URL = 'https://qwqskcecyyeefxvuilkz.supabase.co';
const TACTICAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cXNrY2VjeXllZWZ4dnVpbGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjg1OTAsImV4cCI6MjEwMjY0NDU5MH0.kap_k25bLqJj4Q0xW60j1tljYO1SPpbPA2aafdYYxNQ';

const tacticalSupabase = supabase.createClient(TACTICAL_SUPABASE_URL, TACTICAL_SUPABASE_ANON_KEY);

// Conde 2026-08-20: clientes "particulares" (B2C -- Rompecabezas, pedidos rápidos por WhatsApp,
// etc.) se guardan con empresa===nombre porque no tienen razón social aparte. El patrón
// `${cli.empresa} - ${cli.nombre}` que arma "nombreCli" en todas las calculadoras + el Hub
// duplicaba el nombre completo ("Pedro Perez - Pedro Perez") en esos casos -- esta función
// centraliza esa construcción para mostrar el nombre una sola vez cuando empresa y nombre coinciden.
function tacticalNombreCliente(cli){
  if(!cli) return '';
  const empresa = (cli.empresa||'').trim(), nombre = (cli.nombre||'').trim();
  if(!nombre || empresa.toLowerCase() === nombre.toLowerCase()) return empresa || nombre;
  return `${empresa} - ${nombre}`;
}

// ============ STORAGE DE FOTOS (Kanban, Fototeca, B2C Rompecabezas) ============
// Conde 2026-08-23: antes toda foto se guardaba como texto base64 incrustado en la fila de la
// tabla -- competía por los 500MB de la base de datos, y se duplicaba cada vez que la misma foto
// de Fototeca se copiaba en varias cotizaciones (30 cotizaciones con la misma foto = 30 copias).
// Ahora se sube UNA vez al bucket de Storage (espacio aparte de 1GB) y las tablas solo guardan la
// URL corta -- mismos campos de texto de siempre (kanban_fotos.url, fototeca_items.foto_url,
// b2c_pedido_items.foto_thumb_url), sin migración de columnas. Requiere haber corrido
// supabase/migracion_storage_fotos.sql primero (crea el bucket + permisos).
const TACTICAL_STORAGE_BUCKET = 'tactical-fotos';

async function tacticalSubirFoto(dataUrl, ruta){
  try{
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await tacticalSupabase.storage.from(TACTICAL_STORAGE_BUCKET).upload(ruta, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
    if(error){ console.error('Error subiendo foto a Storage:', error); return null; }
    const { data } = tacticalSupabase.storage.from(TACTICAL_STORAGE_BUCKET).getPublicUrl(ruta);
    return data.publicUrl;
  } catch(e){ console.error('Error subiendo foto a Storage:', e); return null; }
}
// Las tablas solo guardan la URL pública -- para borrar hace falta la ruta interna del bucket, que
// se saca de la misma URL (siempre trae "/object/public/tactical-fotos/" antes de la ruta real) en
// vez de guardar una columna aparte solo para eso.
function tacticalRutaDesdeUrlStorage(url){
  if(!url) return null;
  const marca = `/object/public/${TACTICAL_STORAGE_BUCKET}/`;
  const i = url.indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}
async function tacticalEliminarFotosStorage(urls){
  const rutas = (urls||[]).map(tacticalRutaDesdeUrlStorage).filter(Boolean);
  if(!rutas.length) return;
  const { error } = await tacticalSupabase.storage.from(TACTICAL_STORAGE_BUCKET).remove(rutas);
  if(error) console.error('Error eliminando fotos de Storage:', error);
}
function tacticalFechaHaceMeses(meses){
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString();
}

// Limpieza real (Conde 2026-08-23): borra SOLO la foto de fichas de Kanban ya entregadas (columna
// 'postventa') y de pedidos B2C ya aprobados, ambos con más de 4 meses -- para no llenar el 1GB de
// Storage con fotos de producción que ya cumplieron su función (verificar que se hizo bien el
// trabajo). Todo lo demás del registro (cliente, producto, precio, fecha, OT) NO se toca, solo la
// foto. Nunca borra nada de Fototeca (catálogo reusado, sin fecha de vencimiento) ni de
// Contabilidad (retención legal de 10 años, y ahí no hay fotos de todos modos).
async function tacticalEjecutarLimpiezaFotos(){
  const limite = tacticalFechaHaceMeses(4);
  let fotosEliminadas = 0;

  const { data: fichasViejas, error: errF } = await tacticalSupabase
    .from('kanban_fichas').select('id, fecha_entrega, created_at').eq('columna', 'postventa');
  if(errF){ console.error('Limpieza de fotos -- error consultando fichas:', errF); }
  else {
    const idsViejas = (fichasViejas||[]).filter(f => (f.fecha_entrega || f.created_at) < limite).map(f => f.id);
    if(idsViejas.length){
      const { data: fotos, error: errP } = await tacticalSupabase
        .from('kanban_fotos').select('id, url').in('ficha_id', idsViejas);
      if(errP){ console.error('Limpieza de fotos -- error consultando fotos kanban:', errP); }
      else if(fotos && fotos.length){
        await tacticalEliminarFotosStorage(fotos.map(f=>f.url));
        const { error: errDel } = await tacticalSupabase.from('kanban_fotos').delete().in('id', fotos.map(f=>f.id));
        if(errDel) console.error('Limpieza de fotos -- error borrando filas kanban_fotos:', errDel);
        else fotosEliminadas += fotos.length;
      }
    }
  }

  const { data: pedidosViejos, error: errB } = await tacticalSupabase
    .from('b2c_pedidos').select('id, fecha_aprobado, fecha').eq('estado', 'aprobado');
  if(errB){ console.error('Limpieza de fotos -- error consultando pedidos B2C:', errB); }
  else {
    const idsViejos = (pedidosViejos||[]).filter(p => (p.fecha_aprobado || p.fecha) < limite).map(p => p.id);
    if(idsViejos.length){
      const { data: items, error: errI } = await tacticalSupabase
        .from('b2c_pedido_items').select('id, foto_thumb_url').in('pedido_id', idsViejos).not('foto_thumb_url', 'is', null);
      if(errI){ console.error('Limpieza de fotos -- error consultando items B2C:', errI); }
      else if(items && items.length){
        await tacticalEliminarFotosStorage(items.map(i=>i.foto_thumb_url));
        const { error: errUpd } = await tacticalSupabase.from('b2c_pedido_items').update({foto_thumb_url: null}).in('id', items.map(i=>i.id));
        if(errUpd) console.error('Limpieza de fotos -- error limpiando items B2C:', errUpd);
        else fotosEliminadas += items.length;
      }
    }
  }

  localStorage.setItem('tactical_purga_fotos_ultima_v1', new Date().toISOString());
  return fotosEliminadas;
}
// Se llama en window.tacticalOnLogin del Hub (solo administrador) -- corre como máximo 1 vez cada
// 24h por navegador (no hace falta más seguido, hay 4 meses de margen) para no repetir la consulta
// cada vez que el administrador entra al Hub el mismo día.
async function tacticalPurgaFotosSiToca(){
  const ultima = localStorage.getItem('tactical_purga_fotos_ultima_v1');
  if(ultima && (Date.now() - new Date(ultima).getTime()) < 24*60*60*1000) return;
  try{
    const n = await tacticalEjecutarLimpiezaFotos();
    if(n) console.log(`Limpieza de fotos: ${n} foto(s) antigua(s) eliminada(s) de Storage.`);
  } catch(e){ console.error('Error en limpieza automática de fotos:', e); }
}

async function tacticalSesionActual(){
  const { data: { session } } = await tacticalSupabase.auth.getSession();
  return session;
}

async function tacticalLogin(email, password){
  return await tacticalSupabase.auth.signInWithPassword({ email: email.trim(), password });
}

async function tacticalLogout(){
  await tacticalSupabase.auth.signOut();
  location.reload();
}

// Trae el perfil (nombre + rol) de la tabla public.usuarios para la sesión activa.
async function tacticalPerfilActual(){
  const session = await tacticalSesionActual();
  if(!session) return null;
  const { data, error } = await tacticalSupabase.from('usuarios').select('*').eq('id', session.user.id).maybeSingle();
  if(error){ console.error('Error leyendo perfil de usuario:', error); return null; }
  return data;
}

// Mensajes de error de Supabase en inglés -- se traducen los más comunes,
// el resto se muestra tal cual para no ocultar información útil de depuración.
function tacticalTraducirErrorLogin(mensaje){
  if(!mensaje) return 'Error desconocido.';
  if(mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if(mensaje.includes('Email not confirmed')) return 'Este correo no está confirmado todavía.';
  return mensaje;
}

// ============ GATE DE LOGIN (overlay de pantalla completa) ============
// Cubre toda la pantalla hasta que haya sesión válida. Se llama automático
// al cargar la página (ver el <script> al final de este archivo).
async function tacticalMostrarGateLogin(){
  const overlay = document.getElementById('tactical-login-overlay');
  const form = document.getElementById('tactical-login-form');
  const errorEl = document.getElementById('tactical-login-error');
  if(!overlay) return; // esta página todavía no tiene el overlay (migración en curso)

  // CERRADO POR DEFECTO -- se bloquea ANTES de intentar nada async, y solo se
  // desbloquea más abajo si de verdad se confirma una sesión válida. Así, si
  // la verificación de sesión falla (sin internet, bloqueo del navegador al
  // abrir el archivo local, etc.), la app queda bloqueada en vez de quedar
  // expuesta -- antes fallaba "abierto" si esta llamada tiraba un error, que
  // es justo lo contrario de lo que se busca (Conde 2026-08-18).
  overlay.style.display = 'flex';
  document.body.classList.add('tactical-bloqueado');

  let session = null;
  try{
    session = await tacticalSesionActual();
  } catch(e){
    console.error('No se pudo verificar la sesión con Supabase:', e);
    errorEl.textContent = 'No se pudo conectar con el servidor. Revisa tu conexión a internet o que estés abriendo el ERP desde una dirección web (no un archivo local) y recarga la página.';
    errorEl.style.display = 'block';
    return; // queda bloqueado -- no se muestra la app.
  }

  if(session){
    // Precios override: precios_tactical.js y precios_promocionales.js calculan sus tablas de
    // precios mezclando estos overrides de forma SÍNCRONA en cuanto el script carga -- no pueden
    // esperar una consulta async. Por eso este chequeo va aquí, ANTES de mostrar la app: si otro
    // usuario cambió un precio desde otro dispositivo, se actualiza localStorage y se recarga la
    // página UNA vez para que quede aplicado en las constantes ya calculadas (Conde 2026-08-19).
    if(!window.__tacticalPreciosSincronizados){
      window.__tacticalPreciosSincronizados = true;
      let huboCambio = false;
      try{ huboCambio = await tacticalSincronizarPreciosOverride(); }
      catch(e){ console.error('No se pudo sincronizar precios override:', e); }
      if(huboCambio){ location.reload(); return; }
    }
    let perfil = null;
    try{ perfil = await tacticalPerfilActual(); } catch(e){ console.error('No se pudo leer el perfil:', e); }
    // Expuesto globalmente para que el Hub pueda restringir vistas por rol real (Contabilidad,
    // Reportes, CRM, Precios) sin depender de contraseñas fijas en el código (Conde 2026-08-20).
    window.tacticalUsuarioPerfil = perfil;
    overlay.style.display = 'none';
    document.body.classList.remove('tactical-bloqueado');
    const nombreEl = document.getElementById('tactical-usuario-nombre');
    if(nombreEl) nombreEl.textContent = perfil ? `${perfil.nombre} (${perfil.rol})` : session.user.email;
    const barraEl = document.getElementById('tactical-usuario-barra');
    if(barraEl) barraEl.style.display = 'flex';
    // Avisa a la página (Hub) que ya hay sesión, para que cargue sus datos
    // reales desde Supabase -- cada página define window.tacticalOnLogin.
    if(typeof window.tacticalOnLogin === 'function' && !window.__tacticalOnLoginLlamado){
      window.__tacticalOnLoginLlamado = true;
      window.tacticalOnLogin();
    }
    return;
  }
  if(form && !form.dataset.wired){
    form.dataset.wired = '1';
    form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      errorEl.style.display = 'none';
      const email = document.getElementById('tactical-login-email').value;
      const password = document.getElementById('tactical-login-password').value;
      const btn = document.getElementById('tactical-login-btn');
      btn.disabled = true; btn.textContent = 'Entrando...';
      const { error } = await tacticalLogin(email, password);
      btn.disabled = false; btn.textContent = 'Entrar';
      if(error){
        errorEl.textContent = tacticalTraducirErrorLogin(error.message);
        errorEl.style.display = 'block';
        return;
      }
      tacticalMostrarGateLogin();
    });
  }
}

// ============ CLIENTES (CRM) -- primer módulo migrado a Supabase ============
// Mismo "shape" que usa el Hub hoy en memoria (id, empresa, nombre, wp, correo,
// clase, ltv, tipo, identificacion, soloB2C) -- estas funciones solo traducen
// hacia/desde los nombres de columna reales de Postgres (telefono, solo_b2c).
function tacticalClienteADb(c){
  return {
    id: c.id, empresa: c.empresa, nombre: c.nombre||'', telefono: c.wp||'', correo: c.correo||'',
    clase: c.clase||'nuevo', tipo: c.tipo||'', identificacion: c.identificacion||'',
    ltv: c.ltv||0, solo_b2c: !!c.soloB2C,
  };
}
function tacticalClienteDeDb(r){
  return {
    id: r.id, empresa: r.empresa, nombre: r.nombre||'', wp: r.telefono||'', correo: r.correo||'',
    clase: r.clase||'nuevo', tipo: r.tipo||'', identificacion: r.identificacion||'',
    ltv: Number(r.ltv)||0, soloB2C: !!r.solo_b2c,
  };
}
async function tacticalClientesCargar(){
  const { data, error } = await tacticalSupabase.from('clientes').select('*').order('created_at');
  if(error){ console.error('Error cargando clientes de Supabase:', error); return []; }
  return data.map(tacticalClienteDeDb);
}
// Guarda TODA la lista actual (upsert masivo) -- más simple y seguro que
// intentar adivinar cuál fila cambió en cada uno de los ~10 sitios del Hub
// que guardan clientes; la lista de clientes es pequeña, no pesa nada.
async function tacticalSyncClientes(lista){
  if(!lista || lista.length===0) return;
  const filas = lista.map(tacticalClienteADb);
  const { error } = await tacticalSupabase.from('clientes').upsert(filas);
  if(error) console.error('Error guardando clientes en Supabase:', error);
}
async function tacticalEliminarClienteRemoto(id){
  const { error } = await tacticalSupabase.from('clientes').delete().eq('id', id);
  if(error) console.error('Error eliminando cliente en Supabase:', error);
}

// ============ OPORTUNIDADES (pipeline activo) + HISTORIAL DE CIERRES ============
function tacticalOppADb(o){
  return {
    id: o.id, ot: o.ot||null, id_cliente: o.idCli||null, nombre_cli: o.nombreCli||'',
    descripcion: o.desc||'', vendedor: o.vendedor||null, monto: o.monto||0,
    etapa: o.etapa||'req', linea: o.linea||'manual', cantidad: o.cantidad||null,
    maquina: o.maquina||null, material: o.material||null, n_pliegos: o.nPliegos||null,
    plano_corte: o.planoCorte||null, plano_corte_lineas: o.planoCorteLineas||null,
    recomendaciones: o.recomendaciones||null, lineas: o.lineas||null,
    opciones_comparativa: o.opcionesComparativa||null,
    cot_params: o.cotParams||null, cot_resultado: o.cotResultado||null,
    seguimiento: o.seguimiento||null, seguimiento_fecha: o.seguimientoFecha||null,
  };
}
function tacticalOppDeDb(r){
  return {
    id: r.id, ot: r.ot, idCli: r.id_cliente, nombreCli: r.nombre_cli, desc: r.descripcion,
    vendedor: r.vendedor, monto: Number(r.monto)||0, etapa: r.etapa, linea: r.linea,
    cantidad: r.cantidad, maquina: r.maquina, material: r.material, nPliegos: r.n_pliegos,
    planoCorte: r.plano_corte, planoCorteLineas: r.plano_corte_lineas,
    recomendaciones: r.recomendaciones, lineas: r.lineas,
    opcionesComparativa: r.opciones_comparativa, cotParams: r.cot_params, cotResultado: r.cot_resultado,
    seguimiento: r.seguimiento||'',
    seguimientoFecha: r.seguimiento_fecha||'',
    fecha: r.created_at,
  };
}
// Conde 2026-08-27 (módulo Comercial): "Observaciones" de Cotizaciones creadas -- seguimiento tipo
// "llamé el viernes 28, volver a llamar el 2 de septiembre". Guardado suelto (mismo motivo que
// tacticalGuardarNotasManualesOP/tacticalGuardarComercialB2C) -- tacticalSyncOpps de arriba
// reescribe TODA la lista en cada llamada, innecesario solo para guardar un texto libre.
async function tacticalGuardarSeguimientoOpp(id, texto){
  const { error } = await tacticalSupabase.from('opps').update({ seguimiento: texto||null }).eq('id', id);
  if(error) console.error('Error guardando seguimiento de negocio:', error);
}
// Conde 2026-08-28: fecha programada del ícono de reloj (activa el recordatorio "HOY seguimiento
// cotización..." en Comercial) -- columna aparte de "seguimiento" (que es el texto libre).
async function tacticalGuardarSeguimientoFechaOpp(id, fechaISO){
  const { error } = await tacticalSupabase.from('opps').update({ seguimiento_fecha: fechaISO||null }).eq('id', id);
  if(error) console.error('Error guardando fecha de seguimiento de negocio:', error);
}
async function tacticalOppsCargar(){
  const { data, error } = await tacticalSupabase.from('opps').select('*').order('created_at');
  if(error){ console.error('Error cargando opps de Supabase:', error); return []; }
  return data.map(tacticalOppDeDb);
}
async function tacticalSyncOpps(lista){
  if(!lista || lista.length===0) return;
  const filas = lista.map(tacticalOppADb);
  const { error } = await tacticalSupabase.from('opps').upsert(filas);
  if(error) console.error('Error guardando opps en Supabase:', error);
}
async function tacticalEliminarOppRemoto(id){
  const { error } = await tacticalSupabase.from('opps').delete().eq('id', id);
  if(error) console.error('Error eliminando opp en Supabase:', error);
}

// El historial es append-only -- se guarda como snapshot completo (jsonb) del
// opp al momento de cerrar, más estado/motivo/fecha. Al leer, se aplana de
// vuelta a la forma plana que ya espera el Hub ({...opp, estado, motivo, fechaCierre}).
function tacticalHistorialDeDb(r){
  return { ...(r.snapshot||{}), estado: r.estado, motivo: r.motivo, fechaCierre: r.fecha_cierre, _historialRowId: r.id };
}
async function tacticalHistorialCargar(){
  const { data, error } = await tacticalSupabase.from('historial_cierres').select('*').order('fecha_cierre');
  if(error){ console.error('Error cargando historial de Supabase:', error); return []; }
  return data.map(tacticalHistorialDeDb);
}
async function tacticalAgregarHistorialRemoto(entry){
  const { estado, motivo, fechaCierre, _historialRowId, ...opp } = entry;
  const { error } = await tacticalSupabase.from('historial_cierres').insert({
    opp_id: opp.id||null, snapshot: opp, estado, motivo: motivo||null,
    fecha_cierre: fechaCierre||new Date().toISOString(),
  });
  if(error) console.error('Error guardando historial en Supabase:', error);
}
async function tacticalEliminarHistorialRemoto(oppId){
  const { error } = await tacticalSupabase.from('historial_cierres').delete().eq('snapshot->>id', oppId);
  if(error) console.error('Error eliminando historial en Supabase:', error);
}
// Conde 2026-08-28: "botón de cambio para cambiar de comercial" en el Buscador de Cotizaciones --
// para un negocio YA CERRADO el vendedor vive dentro del snapshot (JSON), no en su propia columna,
// así que se reescribe el snapshot completo (ya se arma en JS con el vendedor corregido).
async function tacticalCorregirVendedorHistorial(oppId, snapshotActualizado){
  const { error } = await tacticalSupabase.from('historial_cierres').update({ snapshot: snapshotActualizado }).eq('snapshot->>id', oppId);
  if(error) console.error('Error corrigiendo vendedor en historial:', error);
}

// ============ KANBAN (fichas de producción) ============
// Cada ficha tiene 3 tablas hijas (líneas, checklist, fotos) -- se sincroniza
// UNA ficha a la vez (no toda la lista de golpe como Clientes/Opps) porque
// hay que reescribir sus hijas también. Las fotos NO se reemplazan todas
// cada vez -- se agregan/borran una por una (ver tacticalAgregarFotoFichaRemoto).
function tacticalFichaKanbanADb(f){
  return {
    id: f.id, ot: f.ot||null, id_cliente: f.idCli||null, nombre_cli: f.nombreCli||'',
    titulo: f.titulo||'', columna: f.columna||'aprobada', urgente: !!f.urgente,
    fecha_entrega: f.fechaEntrega||null, entrega: f.entrega||null,
    responsable: f.responsable||null, origen: f.origen||null, diseno_aprobado: !!f.disenoAprobado,
    op_notas_manual: f.opNotasManual||null, vendedor: f.vendedor||null,
  };
}
function tacticalFichaKanbanDeDb(r, lineas, checklist, fotos){
  return {
    id: r.id, ot: r.ot, idCli: r.id_cliente, nombreCli: r.nombre_cli, titulo: r.titulo,
    columna: r.columna, urgente: r.urgente, fechaEntrega: r.fecha_entrega, entrega: r.entrega,
    responsable: r.responsable, origen: r.origen, disenoAprobado: !!r.diseno_aprobado, fechaCreacion: r.created_at,
    opNotasManual: r.op_notas_manual||'', vendedor: r.vendedor||'',
    lineas: lineas||[], checklist: checklist||[], fotos: fotos||[],
  };
}
// Conde 2026-08-24: guardado suelto (solo esta columna) -- tacticalSyncFichaKanban() de arriba
// borra y reinserta líneas/checklist cada vez que se llama, innecesario y arriesgado solo para
// guardar un texto libre cada vez que se abre/cierra la vista previa de la Orden de Producción.
async function tacticalGuardarNotasManualesOP(fichaId, texto){
  const { error } = await tacticalSupabase.from('kanban_fichas').update({ op_notas_manual: texto||null }).eq('id', fichaId);
  if(error) console.error('Error guardando notas manuales de OP:', error);
}
// Conde 2026-08-27 (módulo Comercial): mismo motivo que tacticalGuardarNotasManualesOP -- editar
// "Observaciones" ahí reusa el campo "responsable" (📝 Notas) que ya tiene cada ficha, sin re-sincronizar líneas/checklist/fotos por un solo texto.
async function tacticalGuardarNotasFicha(fichaId, texto){
  const { error } = await tacticalSupabase.from('kanban_fichas').update({ responsable: texto||null }).eq('id', fichaId);
  if(error) console.error('Error guardando notas de ficha:', error);
}
function tacticalLineaKanbanADb(fichaId, l){
  return {
    ficha_id: fichaId, linea: l.linea||'manual', descripcion: l.desc||'', cantidad: l.cantidad||null,
    maquina: l.maquina||null, material: l.material||null, n_pliegos: l.nPliegos||null,
    plano_corte: l.planoCorte||null, plano_corte_lineas: l.planoCorteLineas||null,
    recomendaciones: l.recomendaciones||null, foto_url: l.fotoUrl||null, video_url: l.videoUrl||null,
  };
}
function tacticalLineaKanbanDeDb(r){
  return {
    linea: r.linea, desc: r.descripcion, cantidad: r.cantidad, maquina: r.maquina, material: r.material,
    nPliegos: r.n_pliegos, planoCorte: r.plano_corte, planoCorteLineas: r.plano_corte_lineas,
    recomendaciones: r.recomendaciones, fotoUrl: r.foto_url, videoUrl: r.video_url,
  };
}
async function tacticalFichasKanbanCargar(){
  const [rf, rl, rc, rp] = await Promise.all([
    tacticalSupabase.from('kanban_fichas').select('*').order('created_at'),
    tacticalSupabase.from('kanban_lineas').select('*'),
    tacticalSupabase.from('kanban_checklist').select('*').order('orden'),
    tacticalSupabase.from('kanban_fotos').select('*').order('created_at'),
  ]);
  if(rf.error){ console.error('Error cargando fichas kanban de Supabase:', rf.error); return []; }
  const lineas = rl.data||[], checklist = rc.data||[], fotos = rp.data||[];
  return (rf.data||[]).map(f => tacticalFichaKanbanDeDb(f,
    lineas.filter(l=>l.ficha_id===f.id).map(tacticalLineaKanbanDeDb),
    checklist.filter(c=>c.ficha_id===f.id).map(c=>({texto:c.texto, hecho:c.hecho, riel:c.riel})),
    fotos.filter(p=>p.ficha_id===f.id).map(p=>({url:p.url, etiqueta:p.etiqueta})),
  ));
}
// Conde 2026-08-22: devuelve true/false (antes no devolvía nada) -- el módulo de Montajes de
// Rompecabezas (B2C) llamaba esto sin esperar el resultado y mostraba "Pedido aprobado" siempre,
// aunque el guardado real fallara (ej. sin conexión, o la sesión ya no era válida) -- el usuario
// nunca se enteraba. Ahora quien llame puede `await` y reaccionar si de verdad falló.
async function tacticalSyncFichaKanban(f){
  const { error: errF } = await tacticalSupabase.from('kanban_fichas').upsert(tacticalFichaKanbanADb(f));
  if(errF){ console.error('Error guardando ficha kanban:', errF); return false; }
  await tacticalSupabase.from('kanban_lineas').delete().eq('ficha_id', f.id);
  await tacticalSupabase.from('kanban_checklist').delete().eq('ficha_id', f.id);
  let ok = true;
  if(f.lineas && f.lineas.length){
    const { error } = await tacticalSupabase.from('kanban_lineas').insert(f.lineas.map(l=>tacticalLineaKanbanADb(f.id, l)));
    if(error){ console.error('Error guardando líneas de ficha kanban:', error); ok = false; }
  }
  if(f.checklist && f.checklist.length){
    const filas = f.checklist.map((c,i)=>({ ficha_id: f.id, texto: c.texto, hecho: !!c.hecho, riel: c.riel||null, orden: i }));
    const { error } = await tacticalSupabase.from('kanban_checklist').insert(filas);
    if(error){ console.error('Error guardando checklist de ficha kanban:', error); ok = false; }
  }
  return ok;
}
async function tacticalEliminarFichaKanbanRemoto(id){
  const { error } = await tacticalSupabase.from('kanban_fichas').delete().eq('id', id);
  if(error) console.error('Error eliminando ficha kanban:', error);
}
async function tacticalAgregarFotoFichaRemoto(fichaId, foto){
  const { error } = await tacticalSupabase.from('kanban_fotos').insert({ ficha_id: fichaId, url: foto.url, etiqueta: foto.etiqueta||null });
  if(error) console.error('Error guardando foto de ficha kanban:', error);
}
async function tacticalEliminarFotoFichaRemoto(fichaId, url){
  const { error } = await tacticalSupabase.from('kanban_fotos').delete().eq('ficha_id', fichaId).eq('url', url);
  if(error) console.error('Error eliminando foto de ficha kanban:', error);
}

// ============ B2C PEDIDOS (Módulo de Montajes Rompecabezas) ============
// Mismo patrón que Kanban: cada pedido tiene 1 tabla hija (items) -- se
// sincroniza UN pedido a la vez, no toda la lista (Conde 2026-08-20).
function tacticalB2CPedidoADb(p){
  return {
    id: p.id, fecha: p.fecha||new Date().toISOString(), estado: p.estado||'pendiente',
    nombre: p.nombre||'', celular: p.cel||'', correo: p.correo||'', entrega: p.entrega||'',
    total: p.total||0, cantidad: p.cantidad||0, kanban_ficha_id: p.idKanban||null,
    fecha_aprobado: p.fechaAprobado||null,
    nota_comercial: p.notaComercial||null, observaciones_comercial: p.observacionesComercial||null,
  };
}
function tacticalB2CPedidoDeDb(r, items){
  return {
    id: r.id, fecha: r.fecha, estado: r.estado, nombre: r.nombre, cel: r.celular,
    correo: r.correo, entrega: r.entrega, total: Number(r.total)||0, cantidad: Number(r.cantidad)||0,
    idKanban: r.kanban_ficha_id, fechaAprobado: r.fecha_aprobado, items: items||[],
    notaComercial: r.nota_comercial||'', observacionesComercial: r.observaciones_comercial||'',
  };
}
function tacticalB2CItemADb(pedidoId, it){
  return {
    pedido_id: pedidoId, linea: it.linea||null, forma: it.forma||null, fichas: it.fichas||null,
    medida: it.medida||null, cantidad: it.cantidad||null, precio_unitario: it.precioUnitario||null,
    total: it.total||null, marco_madera: !!it.marcoMadera, foto_thumb_url: it.fotoThumb||null,
  };
}
function tacticalB2CItemDeDb(r){
  return {
    linea: r.linea, forma: r.forma, fichas: r.fichas, medida: r.medida, cantidad: r.cantidad,
    precioUnitario: r.precio_unitario, total: r.total, marcoMadera: r.marco_madera, fotoThumb: r.foto_thumb_url,
  };
}
async function tacticalB2CPedidosCargar(){
  const [rp, ri] = await Promise.all([
    tacticalSupabase.from('b2c_pedidos').select('*').order('fecha', {ascending:false}),
    tacticalSupabase.from('b2c_pedido_items').select('*'),
  ]);
  if(rp.error){ console.error('Error cargando pedidos B2C de Supabase:', rp.error); return []; }
  const items = ri.data||[];
  return (rp.data||[]).map(p => tacticalB2CPedidoDeDb(p, items.filter(it=>it.pedido_id===p.id).map(tacticalB2CItemDeDb)));
}
async function tacticalSyncB2CPedido(p){
  const { error: errP } = await tacticalSupabase.from('b2c_pedidos').upsert(tacticalB2CPedidoADb(p));
  if(errP){ console.error('Error guardando pedido B2C:', errP); return; }
  await tacticalSupabase.from('b2c_pedido_items').delete().eq('pedido_id', p.id);
  if(p.items && p.items.length){
    const { error } = await tacticalSupabase.from('b2c_pedido_items').insert(p.items.map(it=>tacticalB2CItemADb(p.id, it)));
    if(error) console.error('Error guardando items de pedido B2C:', error);
  }
}
// Conde 2026-08-28: "borrar los aprobados que fueron pruebas" -- borra el pedido y sus ítems.
// b2c_pedido_items no tiene ON DELETE CASCADE confirmado, así que se borra explícito primero.
// Devuelve true/false (antes solo quedaba en consola -- "no lo está borrando" y no había forma
// de saber si de verdad falló o si solo no se refrescó la vista).
async function tacticalEliminarB2CPedido(id){
  await tacticalSupabase.from('b2c_pedido_items').delete().eq('pedido_id', id);
  const { error } = await tacticalSupabase.from('b2c_pedidos').delete().eq('id', id);
  if(error){ console.error('Error eliminando pedido B2C:', error); return false; }
  return true;
}
// Conde 2026-08-27 (módulo Comercial): guardado suelto de "Pendiente"/"Observaciones" -- mismo
// motivo que tacticalGuardarNotasManualesOP, tacticalSyncB2CPedido de arriba borra y reinserta TODOS
// los ítems del pedido en cada llamada, innecesario y arriesgado solo para guardar un texto libre.
async function tacticalGuardarComercialB2C(pedidoId, campo, texto){
  const columna = campo==='pendiente' ? 'nota_comercial' : 'observaciones_comercial';
  const { error } = await tacticalSupabase.from('b2c_pedidos').update({ [columna]: texto||null }).eq('id', pedidoId);
  if(error) console.error('Error guardando seguimiento comercial B2C:', error);
}

// ============ COTIZACIONES CUADERNOS ============
// Se sincroniza UNA cotización a la vez (no toda la lista) porque son
// registros que se acumulan con el tiempo y cada uno carga un jsonb pesado
// (params/resultado del motor) -- reenviar todo el historial en cada
// guardado sería cada vez más lento. Son prácticamente inmutables una vez
// creadas (solo se borran, no se editan), así que no hace falta re-sincronizar
// una cotización vieja.
function tacticalCotizacionADb(c){
  return {
    id: c.id, ot: c.ot||null, opp_id: c.idOpp||null, id_cliente: c.idCli||null,
    vendedor: c.vendedor||null, descripcion: c.desc||'',
    cliente_empresa: (c.cliente||{}).empresa||null, cliente_encargado: (c.cliente||{}).encargado||null,
    cliente_telefono: (c.cliente||{}).telefono||null, cliente_correo: (c.cliente||{}).correo||null,
    params: c.params||{}, resultado: c.resultado||{},
    plazo_entrega: c.plazoEntrega||null, validez_oferta: c.validezOferta||null,
    observaciones: c.observaciones||null, condiciones_comerciales: c.condicionesComerciales||null,
  };
}
function tacticalCotizacionDeDb(r){
  return {
    id: r.id, ot: r.ot, idOpp: r.opp_id, idCli: r.id_cliente, fecha: r.created_at,
    cliente: { empresa: r.cliente_empresa, encargado: r.cliente_encargado, telefono: r.cliente_telefono, correo: r.cliente_correo },
    vendedor: r.vendedor, desc: r.descripcion, params: r.params, resultado: r.resultado,
    plazoEntrega: r.plazo_entrega, validezOferta: r.validez_oferta,
    observaciones: r.observaciones, condicionesComerciales: r.condiciones_comerciales,
  };
}
async function tacticalCotizacionesCargar(){
  const { data, error } = await tacticalSupabase.from('cotizaciones_cuadernos').select('*').order('created_at');
  if(error){ console.error('Error cargando cotizaciones de Supabase:', error); return []; }
  return data.map(tacticalCotizacionDeDb);
}
async function tacticalSyncCotizacion(c){
  const { error } = await tacticalSupabase.from('cotizaciones_cuadernos').upsert(tacticalCotizacionADb(c));
  if(error) console.error('Error guardando cotización en Supabase:', error);
}
async function tacticalEliminarCotizacionRemoto(id){
  const { error } = await tacticalSupabase.from('cotizaciones_cuadernos').delete().eq('id', id);
  if(error) console.error('Error eliminando cotización en Supabase:', error);
}

// ============ COTIZACIONES DE LAS OTRAS 8 CALCULADORAS ============
// Conde 2026-08-27: mismo patrón que "cotizaciones_cuadernos" de arriba, pero en tabla aparte
// ("cotizaciones_calculadoras", con columna "linea") porque estas 8 calculadoras son archivos HTML
// independientes -- cada una tiene su propio ultimoParams/ultimoResultado, con forma distinta a la
// de Cuadernos. Permite reabrir y editar cotizaciones desde el Buscador del Hub en cualquier línea,
// no solo Cuadernos.
function tacticalCotizacionCalcADb(c){
  return {
    id: c.id, linea: c.linea, ot: c.ot||null, opp_id: c.idOpp||null, id_cliente: c.idCli||null,
    vendedor: c.vendedor||null, descripcion: c.desc||'',
    cliente_empresa: (c.cliente||{}).empresa||null, cliente_encargado: (c.cliente||{}).encargado||null,
    cliente_telefono: (c.cliente||{}).telefono||null, cliente_correo: (c.cliente||{}).correo||null,
    params: c.params||{}, resultado: c.resultado||{},
    plazo_entrega: c.plazoEntrega||null, validez_oferta: c.validezOferta||null,
    observaciones: c.observaciones||null, condiciones_comerciales: c.condicionesComerciales||null,
  };
}
function tacticalCotizacionCalcDeDb(r){
  return {
    id: r.id, linea: r.linea, ot: r.ot, idOpp: r.opp_id, idCli: r.id_cliente, fecha: r.created_at,
    cliente: { empresa: r.cliente_empresa, encargado: r.cliente_encargado, telefono: r.cliente_telefono, correo: r.cliente_correo },
    vendedor: r.vendedor, desc: r.descripcion, params: r.params, resultado: r.resultado,
    plazoEntrega: r.plazo_entrega, validezOferta: r.validez_oferta,
    observaciones: r.observaciones, condicionesComerciales: r.condiciones_comerciales,
  };
}
// Trae solo las cotizaciones de UNA línea (cada calculadora solo necesita las suyas) -- filtrado
// además por OT si se pasa (usado al abrir la calculadora desde el link "editar" del Buscador).
async function tacticalCotizacionesCalcCargar(linea, ot){
  let q = tacticalSupabase.from('cotizaciones_calculadoras').select('*').eq('linea', linea);
  if(ot) q = q.eq('ot', ot);
  const { data, error } = await q.order('created_at');
  if(error){ console.error('Error cargando cotizaciones de Supabase:', error); return []; }
  return data.map(tacticalCotizacionCalcDeDb);
}
// Conde 2026-08-28: "hice esta cotización ayer y 'editar' me dice que no encuentra el desglose" --
// esto fallaba en silencio (solo quedaba en la consola) si Supabase rechazaba el guardado --
// típicamente falta el permiso en la tabla, mismo patrón que ya pasó con historial_cierres y
// b2c_pedidos. El PDF y el registro en CRM sí quedan bien (usan otro guardado, tacticalSyncOpps),
// solo el desglose editable se perdía sin que nadie se enterara. Devuelve true/false para que cada
// calculadora pueda avisar en pantalla si esto vuelve a pasar.
async function tacticalSyncCotizacionCalc(c){
  const { error } = await tacticalSupabase.from('cotizaciones_calculadoras').upsert(tacticalCotizacionCalcADb(c));
  if(error){ console.error('Error guardando cotización en Supabase:', error); return false; }
  return true;
}

// ============ PLAN DE TAREAS ============
// Cada campo se guarda fila por fila (no todo el tablero de una) porque
// varias personas pueden estar editando tareas distintas al mismo tiempo --
// guardar solo la fila que cambió evita que el guardado de una persona
// borre el cambio recién hecho por otra (ver nota en TACTICAL_ERP_HUB.html).
function tacticalTareaADb(t){
  return {
    id: t.id, area: t.area, descripcion: t.desc||'', especificaciones: t.espec||'',
    responsables: t.emp||[], status: t.status||'pendiente', aclaracion: t.aclaracion||null,
    fecha_origen: t.fechaOrigen||new Date().toISOString(), orden: t.orden||Date.now(),
    cerrada: !!t.cerrada, fecha_cierre: t.fechaCierre||null, delay_cerrado: t.delayCerrado!=null ? t.delayCerrado : null,
    fecha_limite: t.fechaLimite||null,
  };
}
function tacticalTareaActivaDeDb(r){
  return {
    id: r.id, area: r.area, desc: r.descripcion, espec: r.especificaciones||'',
    emp: r.responsables||[], status: r.status, aclaracion: r.aclaracion||'',
    fechaOrigen: r.fecha_origen, orden: r.orden, fechaLimite: r.fecha_limite||null,
  };
}
function tacticalTareaHistDeDb(r){
  return {
    id: r.id, area: r.area, desc: r.descripcion, espec: r.especificaciones||'',
    emp: r.responsables||[], status: r.status, aclaracion: r.aclaracion||'',
    fechaCierre: r.fecha_cierre, delay: r.delay_cerrado||0, fechaLimite: r.fecha_limite||null,
  };
}
async function tacticalTareasCargar(){
  const { data, error } = await tacticalSupabase.from('tareas').select('*').order('orden');
  if(error){ console.error('Error cargando tareas de Supabase:', error); return { activas: [], historico: [] }; }
  return {
    activas: data.filter(r=>!r.cerrada).map(tacticalTareaActivaDeDb),
    historico: data.filter(r=>r.cerrada).sort((a,b)=>new Date(a.fecha_cierre)-new Date(b.fecha_cierre)).map(tacticalTareaHistDeDb),
  };
}
async function tacticalSyncTarea(t){
  const { error } = await tacticalSupabase.from('tareas').upsert(tacticalTareaADb(t));
  if(error) console.error('Error guardando tarea en Supabase:', error);
}
async function tacticalEliminarTareaRemoto(id){
  const { error } = await tacticalSupabase.from('tareas').delete().eq('id', id);
  if(error) console.error('Error eliminando tarea en Supabase:', error);
}

// ============ CONTADORES (numeración FV/CC/IN/CP/EG) ============
// "siguiente_numero" SÍ consume el contador (súmale 1 de una) -- se llama
// solo al guardar de verdad. "tacticalNumeroActual" es de solo lectura, para
// mostrar la sugerencia en el campo sin gastar un número si el usuario
// termina no guardando el formulario.
async function tacticalNumeroActual(tipo){
  const { data, error } = await tacticalSupabase.from('contadores').select('valor').eq('tipo', tipo).single();
  if(error){ console.error('Error leyendo contador:', error); return 0; }
  return data.valor;
}
async function tacticalSiguienteNumero(tipo){
  const { data, error } = await tacticalSupabase.rpc('siguiente_numero', { p_tipo: tipo });
  if(error){ console.error('Error generando siguiente número:', error); return null; }
  return data;
}
async function tacticalAvanzarContadorSiMayor(tipo, valor){
  const { error } = await tacticalSupabase.rpc('avanzar_contador_si_mayor', { p_tipo: tipo, p_valor: valor });
  if(error) console.error('Error avanzando contador:', error);
}

// ============ CONTABILIDAD ============
function tacticalProveedorADb(p){ return { id: p.id, nombre: p.nombre }; }
function tacticalProveedorDeDb(r){ return { id: r.id, nombre: r.nombre }; }
async function tacticalProveedoresCargar(){
  const { data, error } = await tacticalSupabase.from('proveedores').select('*').order('nombre');
  if(error){ console.error('Error cargando proveedores de Supabase:', error); return []; }
  return data.map(tacticalProveedorDeDb);
}
async function tacticalSyncProveedor(p){
  const { error } = await tacticalSupabase.from('proveedores').upsert(tacticalProveedorADb(p));
  if(error) console.error('Error guardando proveedor en Supabase:', error);
}

// Ítems de Documento de Venta / Cuenta por Pagar: misma forma en ambas tablas hijas.
function tacticalItemADb(fk, fkVal, it){
  return { [fk]: fkVal, descripcion: it.descripcion||'', cantidad: it.cantidad||null, valor_unitario: it.valorUnitario||null, iva: it.iva||0, valor_total: it.valorTotal||null };
}
function tacticalItemDeDb(r){ return { descripcion: r.descripcion, cantidad: r.cantidad, valorUnitario: r.valor_unitario, iva: Number(r.iva)||0, valorTotal: r.valor_total }; }

function tacticalDocVentaADb(d){
  return {
    id: d.id, numero: d.numero, tipo_doc: d.tipoDoc, fecha: d.fecha,
    id_cliente: d.idCli||null, id_cotizacion: d.idCot||null, opp_id: d.idOpp||null, descripcion: d.descripcion||'',
    valor_bruto: d.valorBruto||0, iva: d.iva||0, reteiva: d.reteiva||0, valor_envio: d.valorEnvio||0,
    total_documento: d.totalDocumento||0, total_cobrar: d.totalCobrar||0, condicion_pago: d.condicionPago||null,
    fecha_vencimiento: d.fechaVencimiento||null, saldo_pendiente: d.saldoPendiente||0, estado: d.estado||'pendiente',
    vendedor: d.vendedor||null,
  };
}
function tacticalDocVentaDeDb(r, items){
  return {
    id: r.id, numero: r.numero, tipoDoc: r.tipo_doc, fecha: r.fecha, idCli: r.id_cliente, idCot: r.id_cotizacion, idOpp: r.opp_id,
    descripcion: r.descripcion, items: items||[], valorBruto: Number(r.valor_bruto)||0, iva: Number(r.iva)||0, reteiva: Number(r.reteiva)||0,
    valorEnvio: Number(r.valor_envio)||0, totalDocumento: Number(r.total_documento)||0, totalCobrar: Number(r.total_cobrar)||0,
    condicionPago: r.condicion_pago, fechaVencimiento: r.fecha_vencimiento, saldoPendiente: Number(r.saldo_pendiente)||0,
    estado: r.estado, vendedor: r.vendedor,
  };
}
async function tacticalDocVentaCargar(){
  const [rd, ri] = await Promise.all([
    tacticalSupabase.from('documentos_venta').select('*').order('created_at'),
    tacticalSupabase.from('documentos_venta_items').select('*'),
  ]);
  if(rd.error){ console.error('Error cargando documentos de venta de Supabase:', rd.error); return []; }
  const items = ri.data||[];
  return (rd.data||[]).map(d => tacticalDocVentaDeDb(d, items.filter(i=>i.documento_id===d.id).map(tacticalItemDeDb)));
}
async function tacticalSyncDocVenta(d){
  const { error: errD } = await tacticalSupabase.from('documentos_venta').upsert(tacticalDocVentaADb(d));
  if(errD){ console.error('Error guardando documento de venta:', errD); return; }
  await tacticalSupabase.from('documentos_venta_items').delete().eq('documento_id', d.id);
  if(d.items && d.items.length){
    const { error } = await tacticalSupabase.from('documentos_venta_items').insert(d.items.map(it=>tacticalItemADb('documento_id', d.id, it)));
    if(error) console.error('Error guardando ítems de documento de venta:', error);
  }
}

// ============ PREFACTURAS ============
// Conde 2026-08-27: registro simple (sin número, sin ciclo de vida financiero) que se crea al
// marcar un negocio "Ganado" -- reemplaza la creación automática del Documento de Venta. Contabilidad
// las revisa y desde ahí genera el Documento de Venta real (una o varias juntas, mismo cliente).
function tacticalPrefacturaADb(p){
  return {
    id: p.id, opp_id: p.idOpp||null, id_cot: p.idCot||null, id_cliente: p.idCli||null,
    cliente_empresa: p.nombreCli||null, ot: p.ot||null, descripcion: p.desc||'', monto: p.monto||0,
    vendedor: p.vendedor||null, facturada: !!p.facturada, id_doc_venta: p.idDocVenta||null,
  };
}
function tacticalPrefacturaDeDb(r){
  return {
    id: r.id, idOpp: r.opp_id, idCot: r.id_cot, idCli: r.id_cliente, nombreCli: r.cliente_empresa,
    ot: r.ot, desc: r.descripcion, monto: Number(r.monto)||0, vendedor: r.vendedor,
    facturada: !!r.facturada, idDocVenta: r.id_doc_venta, fecha: r.created_at,
  };
}
async function tacticalPrefacturasCargar(){
  const { data, error } = await tacticalSupabase.from('prefacturas').select('*').order('created_at');
  if(error){ console.error('Error cargando prefacturas de Supabase:', error); return []; }
  return data.map(tacticalPrefacturaDeDb);
}
async function tacticalSyncPrefactura(p){
  const { error } = await tacticalSupabase.from('prefacturas').upsert(tacticalPrefacturaADb(p));
  if(error) console.error('Error guardando prefactura en Supabase:', error);
}
async function tacticalEliminarPrefacturaRemoto(id){
  const { error } = await tacticalSupabase.from('prefacturas').delete().eq('id', id);
  if(error) console.error('Error eliminando prefactura en Supabase:', error);
}

function tacticalIngresoADb(i){
  return {
    id: i.id, numero: i.numero, fecha: i.fecha, id_cliente: i.idCli||null, id_documento_venta: i.idDocVenta||null,
    valor: i.valor||0, concepto: i.concepto||'', medio_pago: i.medioPago||null, referencia_soporte: i.referenciaSoporte||null,
  };
}
function tacticalIngresoDeDb(r){
  return {
    id: r.id, numero: r.numero, fecha: r.fecha, idCli: r.id_cliente, idDocVenta: r.id_documento_venta,
    valor: Number(r.valor)||0, concepto: r.concepto, medioPago: r.medio_pago, referenciaSoporte: r.referencia_soporte,
  };
}
async function tacticalIngresosCargar(){
  const { data, error } = await tacticalSupabase.from('ingresos').select('*').order('created_at');
  if(error){ console.error('Error cargando ingresos de Supabase:', error); return []; }
  return data.map(tacticalIngresoDeDb);
}
async function tacticalSyncIngreso(i){
  const { error } = await tacticalSupabase.from('ingresos').upsert(tacticalIngresoADb(i));
  if(error) console.error('Error guardando ingreso en Supabase:', error);
}

function tacticalCxpADb(c){
  return {
    id: c.id, numero: c.numero, fecha: c.fecha, proveedor: c.proveedor||'', numero_factura_proveedor: c.numeroFacturaProveedor||null,
    categoria: c.categoria||null, subcategoria: c.subcategoria||null, iva: c.iva||0, monto: c.monto||0, saldo_pendiente: c.saldoPendiente||0,
    fecha_vencimiento: c.fechaVencimiento||null, estado: c.estado||'pendiente', id_egreso: c.idEgreso||null,
  };
}
function tacticalCxpDeDb(r, items){
  return {
    id: r.id, numero: r.numero, fecha: r.fecha, proveedor: r.proveedor, numeroFacturaProveedor: r.numero_factura_proveedor,
    categoria: r.categoria, subcategoria: r.subcategoria, iva: Number(r.iva)||0, items: items||[], monto: Number(r.monto)||0, saldoPendiente: Number(r.saldo_pendiente)||0,
    fechaVencimiento: r.fecha_vencimiento, estado: r.estado, idEgreso: r.id_egreso,
  };
}
async function tacticalCxpCargar(){
  const [rc, ri] = await Promise.all([
    tacticalSupabase.from('cuentas_por_pagar').select('*').order('created_at'),
    tacticalSupabase.from('cuentas_por_pagar_items').select('*'),
  ]);
  if(rc.error){ console.error('Error cargando cuentas por pagar de Supabase:', rc.error); return []; }
  const items = ri.data||[];
  return (rc.data||[]).map(c => tacticalCxpDeDb(c, items.filter(i=>i.cxp_id===c.id).map(tacticalItemDeDb)));
}
async function tacticalSyncCxp(c){
  const { error: errC } = await tacticalSupabase.from('cuentas_por_pagar').upsert(tacticalCxpADb(c));
  if(errC){ console.error('Error guardando cuenta por pagar:', errC); return; }
  await tacticalSupabase.from('cuentas_por_pagar_items').delete().eq('cxp_id', c.id);
  if(c.items && c.items.length){
    const { error } = await tacticalSupabase.from('cuentas_por_pagar_items').insert(c.items.map(it=>tacticalItemADb('cxp_id', c.id, it)));
    if(error) console.error('Error guardando ítems de cuenta por pagar:', error);
  }
}

function tacticalEgresoADb(e){
  return {
    id: e.id, numero: e.numero, fecha: e.fecha, beneficiario: e.beneficiario||'', concepto: e.concepto||'',
    monto: e.monto||0, categoria: e.categoria||null, medio_pago: e.medioPago||null, referencia_soporte: e.referenciaSoporte||null,
    // cxp_id (singular) se mantiene por compatibilidad con egresos viejos de 1 sola factura --
    // ids_cxp (Conde 2026-08-20: "seleccionar varias facturas del mismo proveedor... en un solo
    // comprobante") es la lista real que usa el código nuevo, cxp_id queda igual al primero de esa
    // lista solo como referencia rápida.
    cxp_id: (e.idsCxp && e.idsCxp[0]) || e.idCxp || null,
    ids_cxp: e.idsCxp || (e.idCxp ? [e.idCxp] : []),
  };
}
function tacticalEgresoDeDb(r){
  return {
    id: r.id, numero: r.numero, fecha: r.fecha, beneficiario: r.beneficiario, concepto: r.concepto,
    monto: Number(r.monto)||0, categoria: r.categoria, medioPago: r.medio_pago, referenciaSoporte: r.referencia_soporte,
    idCxp: r.cxp_id, idsCxp: (r.ids_cxp && r.ids_cxp.length) ? r.ids_cxp : (r.cxp_id ? [r.cxp_id] : []),
  };
}
async function tacticalEgresosCargar(){
  const { data, error } = await tacticalSupabase.from('egresos').select('*').order('created_at');
  if(error){ console.error('Error cargando egresos de Supabase:', error); return []; }
  return data.map(tacticalEgresoDeDb);
}
async function tacticalSyncEgreso(e){
  const { error } = await tacticalSupabase.from('egresos').upsert(tacticalEgresoADb(e));
  if(error) console.error('Error guardando egreso en Supabase:', error);
}

function tacticalGastoFijoADb(g, orden){ return { id: g.id, concepto: g.concepto||'', monto: g.monto||0, orden }; }
function tacticalGastoFijoDeDb(r){ return { id: r.id, concepto: r.concepto, monto: Number(r.monto)||0 }; }
async function tacticalGastosFijosCargar(){
  const { data, error } = await tacticalSupabase.from('gastos_fijos_config').select('*').order('orden');
  if(error){ console.error('Error cargando gastos fijos de Supabase:', error); return []; }
  return data.map(tacticalGastoFijoDeDb);
}
async function tacticalSyncGastoFijo(g, orden){
  const { error } = await tacticalSupabase.from('gastos_fijos_config').upsert(tacticalGastoFijoADb(g, orden));
  if(error) console.error('Error guardando gasto fijo en Supabase:', error);
}
async function tacticalEliminarGastoFijoRemoto(id){
  const { error } = await tacticalSupabase.from('gastos_fijos_config').delete().eq('id', id);
  if(error) console.error('Error eliminando gasto fijo en Supabase:', error);
}
// Conde 2026-08-21: "necesito editar y borrar" documentos de venta y cuentas por pagar --
// documentos_venta_items/cuentas_por_pagar_items tienen "on delete cascade", así que borrar el
// documento padre ya se lleva sus ítems solo, no hace falta borrarlos aparte.
async function tacticalEliminarDocVentaRemoto(id){
  const { error } = await tacticalSupabase.from('documentos_venta').delete().eq('id', id);
  if(error) console.error('Error eliminando documento de venta en Supabase:', error);
}
async function tacticalEliminarCxpRemoto(id){
  const { error } = await tacticalSupabase.from('cuentas_por_pagar').delete().eq('id', id);
  if(error) console.error('Error eliminando cuenta por pagar en Supabase:', error);
}
// Conde 2026-08-21: "en comprobantes de egresos e ingresos permita editar y eliminar".
async function tacticalEliminarEgresoRemoto(id){
  const { error } = await tacticalSupabase.from('egresos').delete().eq('id', id);
  if(error) console.error('Error eliminando egreso en Supabase:', error);
}
async function tacticalEliminarIngresoRemoto(id){
  const { error } = await tacticalSupabase.from('ingresos').delete().eq('id', id);
  if(error) console.error('Error eliminando ingreso en Supabase:', error);
}

// ============ CONTROL DE REPROCESOS ============
function tacticalReprocesoADb(inc){
  return {
    id: inc.id, ot: inc.ot||'Servicio Express', responsable: inc.responsable||null, proveedor: inc.proveedor||null,
    origen: inc.origen||null, deteccion: inc.deteccion||null, observaciones: inc.observaciones||null,
    costo_total: inc.costoTotal||0,
  };
}
function tacticalReprocesoDeDb(r, items){
  return {
    id: r.id, ot: r.ot, responsable: r.responsable, proveedor: r.proveedor, origen: r.origen, deteccion: r.deteccion,
    observaciones: r.observaciones, costoTotal: Number(r.costo_total)||0, items: items||[],
  };
}
function tacticalReprocesoItemADb(reprocesoId, it){
  return { reproceso_id: reprocesoId, concepto: it.nameConcepto||'', cantidad: it.cantidad||null, costo: it.costoFila||null, medida: it.medida||null, caracteristica: it.caracteristica||null };
}
function tacticalReprocesoItemDeDb(r){
  return { nameConcepto: r.concepto, cantidad: r.cantidad, costoFila: r.costo, medida: r.medida, caracteristica: r.caracteristica };
}
async function tacticalReprocesosCargar(){
  const [ri, rit] = await Promise.all([
    tacticalSupabase.from('reprocesos').select('*').order('created_at'),
    tacticalSupabase.from('reprocesos_items').select('*'),
  ]);
  if(ri.error){ console.error('Error cargando reprocesos de Supabase:', ri.error); return []; }
  const items = rit.data||[];
  return (ri.data||[]).map(r => tacticalReprocesoDeDb(r, items.filter(i=>i.reproceso_id===r.id).map(tacticalReprocesoItemDeDb)));
}
async function tacticalSyncReproceso(inc){
  const { error: errR } = await tacticalSupabase.from('reprocesos').upsert(tacticalReprocesoADb(inc));
  if(errR){ console.error('Error guardando reproceso:', errR); return; }
  await tacticalSupabase.from('reprocesos_items').delete().eq('reproceso_id', inc.id);
  if(inc.items && inc.items.length){
    const { error } = await tacticalSupabase.from('reprocesos_items').insert(inc.items.map(it=>tacticalReprocesoItemADb(inc.id, it)));
    if(error) console.error('Error guardando ítems de reproceso:', error);
  }
}
async function tacticalEliminarReprocesoRemoto(id){
  const { error } = await tacticalSupabase.from('reprocesos').delete().eq('id', id);
  if(error) console.error('Error eliminando reproceso en Supabase:', error);
}

// ============ FOTOTECA DE PRODUCTOS ============
// "tacticalFototecaCache" es leída de forma SÍNCRONA por tacticalObtenerFotoProducto/
// tacticalObtenerVideoProducto (en precios_tactical.js) desde las 8 calculadoras sueltas +
// el Hub, en el momento de generar un PDF -- no pueden esperar una consulta de red justo
// ahí. Por eso esta función se llama una vez al iniciar sesión (window.tacticalOnLogin en
// cada una de las 9 herramientas) y deja todo precargado en memoria; de ahí en adelante la
// lectura es instantánea, igual que ya se hace con clientes/oportunidades.
let tacticalFototecaCache = {};
function tacticalFototecaItemADb(item){
  return {
    clave: item.clave, label: item.label||null, linea_base: item.lineaBase||null,
    foto_url: item.foto||null, video_url: item.video||null, es_custom: !!item.esCustom,
  };
}
function tacticalFototecaItemDeDb(r){
  return { clave: r.clave, label: r.label, lineaBase: r.linea_base, foto: r.foto_url, video: r.video_url, esCustom: r.es_custom };
}
async function tacticalFototecaCargar(){
  const { data, error } = await tacticalSupabase.from('fototeca_items').select('*');
  if(error){ console.error('Error cargando fototeca de Supabase:', error); return []; }
  const items = data.map(tacticalFototecaItemDeDb);
  tacticalFototecaCache = {};
  // label/lineaBase/esCustom viajan también en la cache (no solo foto/video) para que
  // tacticalListarVariantesFoto() (precios_tactical.js) pueda listar las variantes custom de
  // forma síncrona en las 8 calculadoras, igual que ya se hace con foto/video (Conde 2026-08-20 --
  // antes esta función leía una clave de localStorage que ya nadie llenaba desde que Fototeca se
  // migró a Supabase, así que siempre devolvía vacío en silencio).
  items.forEach(it => { tacticalFototecaCache[it.clave] = { foto: it.foto, video: it.video, label: it.label, lineaBase: it.lineaBase, esCustom: it.esCustom }; });
  return items;
}
async function tacticalSyncFototecaItem(item){
  const { error } = await tacticalSupabase.from('fototeca_items').upsert(tacticalFototecaItemADb(item));
  if(error){ console.error('Error guardando ficha de fototeca en Supabase:', error); return; }
  tacticalFototecaCache[item.clave] = { foto: item.foto, video: item.video, label: item.label, lineaBase: item.lineaBase, esCustom: item.esCustom };
}
async function tacticalEliminarFototecaItemRemoto(clave){
  const { error } = await tacticalSupabase.from('fototeca_items').delete().eq('clave', clave);
  if(error) console.error('Error eliminando ficha de fototeca en Supabase:', error);
  delete tacticalFototecaCache[clave];
}

// ============ PRECIOS OVERRIDE (Panel de Precios) ============
// A diferencia de todo lo demás migrado hasta ahora, estos overrides SIGUEN viviendo en
// localStorage como fuente de lectura rápida (precios_tactical.js/precios_promocionales.js los
// leen de forma síncrona al cargar) -- Supabase es la capa de sincronización entre dispositivos,
// no un reemplazo. Ver la llamada a esta función dentro de tacticalMostrarGateLogin().
async function tacticalSincronizarPreciosOverride(){
  const [ro, rp, rs, ra] = await Promise.all([
    tacticalSupabase.from('precios_override').select('datos').eq('id', true).single(),
    tacticalSupabase.from('precios_promo_override').select('datos').eq('id', true).single(),
    tacticalSupabase.from('sustratos_custom').select('datos').eq('id', true).single(),
    tacticalSupabase.from('acabados_custom').select('datos').eq('id', true).single(),
  ]);
  let cambio = false;
  if(!ro.error && ro.data){
    const remoto = JSON.stringify(ro.data.datos||{});
    if(remoto !== (localStorage.getItem('tactical_precios_override_v1') || '{}')){
      localStorage.setItem('tactical_precios_override_v1', remoto);
      localStorage.setItem('tactical_precios_override_meta_v1', JSON.stringify({actualizadoEn: new Date().toISOString()}));
      cambio = true;
    }
  }
  if(!rp.error && rp.data){
    const remoto = JSON.stringify(rp.data.datos||{});
    if(remoto !== (localStorage.getItem('tactical_precios_promo_override_v1') || '{}')){
      localStorage.setItem('tactical_precios_promo_override_v1', remoto);
      cambio = true;
    }
  }
  if(!rs.error && rs.data){
    const remoto = JSON.stringify(rs.data.datos||[]);
    if(remoto !== (localStorage.getItem('tactical_sustratos_custom_v1') || '[]')){
      localStorage.setItem('tactical_sustratos_custom_v1', remoto);
      cambio = true;
    }
  }
  if(!ra.error && ra.data){
    const remoto = JSON.stringify(ra.data.datos||[]);
    if(remoto !== (localStorage.getItem('tactical_acabados_custom_v1') || '[]')){
      localStorage.setItem('tactical_acabados_custom_v1', remoto);
      cambio = true;
    }
  }
  return cambio;
}
async function tacticalGuardarPreciosOverride(datos){
  const { error } = await tacticalSupabase.from('precios_override').upsert({ id: true, datos, actualizado_en: new Date().toISOString() });
  if(error) console.error('Error guardando precios override en Supabase:', error);
}
async function tacticalGuardarPreciosPromoOverride(datos){
  const { error } = await tacticalSupabase.from('precios_promo_override').upsert({ id: true, datos, actualizado_en: new Date().toISOString() });
  if(error) console.error('Error guardando precios promo override en Supabase:', error);
}
async function tacticalGuardarSustratosCustom(lista){
  const { error } = await tacticalSupabase.from('sustratos_custom').upsert({ id: true, datos: lista, actualizado_en: new Date().toISOString() });
  if(error) console.error('Error guardando sustratos custom en Supabase:', error);
}
async function tacticalGuardarAcabadosCustom(lista){
  const { error } = await tacticalSupabase.from('acabados_custom').upsert({ id: true, datos: lista, actualizado_en: new Date().toISOString() });
  if(error) console.error('Error guardando acabados custom en Supabase:', error);
}

// ============ RECOMENDACIONES DE PRODUCCIÓN (editables desde el Panel de Precios) ============
// A diferencia de precios/sustratos/acabados custom, esto NO se necesita de forma síncrona al
// cargar la página -- las Recomendaciones solo se muestran después de calcular una cotización (ya
// con sesión iniciada hace rato), así que un cache simple en memoria (precargado en
// window.tacticalOnLogin de cada calculadora) alcanza, sin necesitar el patrón de localStorage
// (Conde 2026-08-20).
let tacticalRecomendacionesCache = { overrides: {}, custom: [] };
async function tacticalRecomendacionesCargar(){
  const { data, error } = await tacticalSupabase.from('recomendaciones_override').select('*').eq('id', true).maybeSingle();
  if(error){ console.error('Error cargando recomendaciones override de Supabase:', error); return; }
  tacticalRecomendacionesCache = data ? { overrides: data.overrides||{}, custom: data.custom||[] } : { overrides:{}, custom:[] };
}
async function tacticalGuardarRecomendacionesOverride(overrides, custom){
  const { error } = await tacticalSupabase.from('recomendaciones_override').upsert({ id: true, overrides, custom, actualizado_en: new Date().toISOString() });
  if(error){ console.error('Error guardando recomendaciones override en Supabase:', error); return; }
  tacticalRecomendacionesCache = { overrides, custom };
}

// ============ BORRADORES POR USUARIO (Pedido Activo / Comparación Activa) ============
// Antes eran UN SOLO borrador global en localStorage, compartido sin querer por cualquiera que
// abriera el navegador -- Conde pidió que sean por usuario (2 vendedores armando pedidos
// distintos al mismo tiempo no deben pisarse). Igual que la Fototeca, se leen de forma síncrona
// en varios puntos de las 9 herramientas mientras el usuario interactúa (no al cargar la
// página), así que se precargan en window.tacticalPedidoBorradorCache /
// window.tacticalComparacionBorradorCache al iniciar sesión y de ahí se leen instantáneo.
function tacticalPedidoBorradorADb(pd, usuarioId){
  return { usuario_id: usuarioId, ot: pd.ot||null, id_cliente: pd.idCli||null, nombre_cli: pd.nombreCli||null, vendedor: pd.vendedor||null, lineas: pd.lineas||[] };
}
function tacticalPedidoBorradorDeDb(r){
  return { ot: r.ot, idCli: r.id_cliente, nombreCli: r.nombre_cli, vendedor: r.vendedor, lineas: r.lineas||[], creado: r.created_at };
}
async function tacticalPedidoBorradorCargar(){
  const session = await tacticalSesionActual();
  if(!session) return null;
  const { data, error } = await tacticalSupabase.from('pedidos_borrador').select('*').eq('usuario_id', session.user.id).maybeSingle();
  if(error){ console.error('Error cargando pedido borrador:', error); return null; }
  window.tacticalPedidoBorradorCache = data ? tacticalPedidoBorradorDeDb(data) : null;
  return window.tacticalPedidoBorradorCache;
}
async function tacticalGuardarPedidoBorrador(pd){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('pedidos_borrador').upsert(tacticalPedidoBorradorADb(pd, session.user.id));
  if(error) console.error('Error guardando pedido borrador:', error);
}
async function tacticalEliminarPedidoBorrador(){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('pedidos_borrador').delete().eq('usuario_id', session.user.id);
  if(error) console.error('Error eliminando pedido borrador:', error);
}

function tacticalComparacionBorradorADb(comp, usuarioId){
  return { usuario_id: usuarioId, ot: comp.ot||null, id_cliente: comp.idCli||null, nombre_cli: comp.nombreCli||null, vendedor: comp.vendedor||null, opciones: comp.opciones||[] };
}
function tacticalComparacionBorradorDeDb(r){
  return { ot: r.ot, idCli: r.id_cliente, nombreCli: r.nombre_cli, vendedor: r.vendedor, opciones: r.opciones||[], creado: r.created_at };
}
async function tacticalComparacionBorradorCargar(){
  const session = await tacticalSesionActual();
  if(!session) return null;
  const { data, error } = await tacticalSupabase.from('comparaciones_borrador').select('*').eq('usuario_id', session.user.id).maybeSingle();
  if(error){ console.error('Error cargando comparación borrador:', error); return null; }
  window.tacticalComparacionBorradorCache = data ? tacticalComparacionBorradorDeDb(data) : null;
  return window.tacticalComparacionBorradorCache;
}
async function tacticalGuardarComparacionBorrador(comp){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('comparaciones_borrador').upsert(tacticalComparacionBorradorADb(comp, session.user.id));
  if(error) console.error('Error guardando comparación borrador:', error);
}
async function tacticalEliminarComparacionBorrador(){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('comparaciones_borrador').delete().eq('usuario_id', session.user.id);
  if(error) console.error('Error eliminando comparación borrador:', error);
}

// ============ B2C CARRITO BORRADOR (Módulo de Montajes Rompecabezas) ============
// Mismo patrón que Pedido Activo/Comparación Activa de arriba -- por usuario, con cache en
// memoria precargada al login porque se lee de forma síncrona mientras se arma el pedido
// (Conde 2026-08-20, "quiero que no quede nada pendiente").
function tacticalB2CCarritoADb(car, usuarioId){
  return { usuario_id: usuarioId, items: car.items||[] };
}
function tacticalB2CCarritoDeDb(r){
  return { items: r.items||[] };
}
async function tacticalB2CCarritoCargar(){
  const session = await tacticalSesionActual();
  if(!session) return null;
  const { data, error } = await tacticalSupabase.from('b2c_carrito_borrador').select('*').eq('usuario_id', session.user.id).maybeSingle();
  if(error){ console.error('Error cargando carrito B2C:', error); return null; }
  window.tacticalB2CCarritoCache = data ? tacticalB2CCarritoDeDb(data) : null;
  return window.tacticalB2CCarritoCache;
}
async function tacticalGuardarB2CCarrito(car){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('b2c_carrito_borrador').upsert(tacticalB2CCarritoADb(car, session.user.id));
  if(error) console.error('Error guardando carrito B2C:', error);
}
async function tacticalEliminarB2CCarrito(){
  const session = await tacticalSesionActual();
  if(!session) return;
  const { error } = await tacticalSupabase.from('b2c_carrito_borrador').delete().eq('usuario_id', session.user.id);
  if(error) console.error('Error eliminando carrito B2C:', error);
}

// ============ PERSONAL (nombres editables para Tareas y Reprocesos) ============
function tacticalPersonalADb(p){ return { id: p.id, nombre: p.nombre, areas: p.areas||[], orden: p.orden||0 }; }
function tacticalPersonalDeDb(r){ return { id: r.id, nombre: r.nombre, areas: r.areas||[], orden: r.orden||0 }; }
async function tacticalPersonalCargar(){
  const { data, error } = await tacticalSupabase.from('personal').select('*').order('orden');
  if(error){ console.error('Error cargando personal de Supabase:', error); return []; }
  return data.map(tacticalPersonalDeDb);
}
async function tacticalSyncPersonal(p){
  const { error } = await tacticalSupabase.from('personal').upsert(tacticalPersonalADb(p));
  if(error) console.error('Error guardando persona en Supabase:', error);
}
async function tacticalEliminarPersonalRemoto(id){
  const { error } = await tacticalSupabase.from('personal').delete().eq('id', id);
  if(error) console.error('Error eliminando persona en Supabase:', error);
}

document.addEventListener('DOMContentLoaded', tacticalMostrarGateLogin);
