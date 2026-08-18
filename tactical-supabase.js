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
    let perfil = null;
    try{ perfil = await tacticalPerfilActual(); } catch(e){ console.error('No se pudo leer el perfil:', e); }
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
  };
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
    responsable: f.responsable||null, origen: f.origen||null,
  };
}
function tacticalFichaKanbanDeDb(r, lineas, checklist, fotos){
  return {
    id: r.id, ot: r.ot, idCli: r.id_cliente, nombreCli: r.nombre_cli, titulo: r.titulo,
    columna: r.columna, urgente: r.urgente, fechaEntrega: r.fecha_entrega, entrega: r.entrega,
    responsable: r.responsable, origen: r.origen, fechaCreacion: r.created_at,
    lineas: lineas||[], checklist: checklist||[], fotos: fotos||[],
  };
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
async function tacticalSyncFichaKanban(f){
  const { error: errF } = await tacticalSupabase.from('kanban_fichas').upsert(tacticalFichaKanbanADb(f));
  if(errF){ console.error('Error guardando ficha kanban:', errF); return; }
  await tacticalSupabase.from('kanban_lineas').delete().eq('ficha_id', f.id);
  await tacticalSupabase.from('kanban_checklist').delete().eq('ficha_id', f.id);
  if(f.lineas && f.lineas.length){
    const { error } = await tacticalSupabase.from('kanban_lineas').insert(f.lineas.map(l=>tacticalLineaKanbanADb(f.id, l)));
    if(error) console.error('Error guardando líneas de ficha kanban:', error);
  }
  if(f.checklist && f.checklist.length){
    const filas = f.checklist.map((c,i)=>({ ficha_id: f.id, texto: c.texto, hecho: !!c.hecho, riel: c.riel||null, orden: i }));
    const { error } = await tacticalSupabase.from('kanban_checklist').insert(filas);
    if(error) console.error('Error guardando checklist de ficha kanban:', error);
  }
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

document.addEventListener('DOMContentLoaded', tacticalMostrarGateLogin);
