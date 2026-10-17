/* Cliente de la ESTACIÓN DE DISEÑO (programa local del PC de diseño, carpeta estacion_diseno/).
   Conde 2026-10-17: archivos pesados (500 MB o más) se trabajan en el disco del PC de diseño, no en internet.
   Las herramientas del ERP siguen en internet; este archivo les permite hablar con el programa local
   (http://127.0.0.1:8793) cuando está abierto. Si no está abierto, todo sigue funcionando como siempre
   y las herramientas muestran "Estación no conectada".
   Uso:  await tacticalEstacion.estado()  ->  true/false (y llena tacticalEstacion.info)  */
const tacticalEstacion = (function(){
  const BASE = 'http://127.0.0.1:8793';
  const E = { conectada:false, info:null, trabajo:null, _escuchas:[] };

  async function llamar(ruta, opciones, esperaMs){
    const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), esperaMs || 8000);
    try{
      const r = await fetch(BASE + ruta, { ...(opciones||{}), signal: ctl.signal });
      const d = await r.json().catch(()=>({ ok:false, error:'respuesta no válida' }));
      if(!r.ok && d.ok !== false) d.ok = false;
      return d;
    } catch(e){ return { ok:false, error: e.name==='AbortError' ? 'la estación no respondió a tiempo' : 'la estación de diseño no está conectada' }; }
    finally{ clearTimeout(t); }
  }
  const postJson = (ruta, cuerpo)=>llamar(ruta, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(cuerpo||{}) });

  E.url = BASE;
  E.alCambiar = fn => { E._escuchas.push(fn); };
  E.estado = async function(){
    const d = await llamar('/estado', null, 1500);
    const antes = E.conectada;
    E.conectada = !!d.ok; E.info = d.ok ? d : null;
    if(antes !== E.conectada) E._escuchas.forEach(f=>{ try{ f(E.conectada, E.info); }catch(e){} });
    return E.conectada;
  };
  E.crearTrabajo = async function(ot, cliente, datos){ const d = await postJson('/trabajo', { ot, cliente, datos }); if(d.ok) E.trabajo = d; return d; };
  E.listarOriginales = (ot, cliente, sub)=>llamar('/trabajo/archivos?ot='+encodeURIComponent(ot||'')+'&cliente='+encodeURIComponent(cliente||'')+'&sub='+encodeURIComponent(sub||'originales'));
  E.urlArchivo = rutaRelativa => BASE + '/archivo?ruta=' + encodeURIComponent(rutaRelativa);
  E.guardar = (rutaRelativa, blob)=>llamar('/guardar?ruta='+encodeURIComponent(rutaRelativa), { method:'POST', body: blob, headers:{ 'Content-Type':'application/octet-stream' } }, 600000);
  E.plotterSiguiente = ()=>llamar('/plotter/siguiente');
  E.plotterGuardar = (nombre, ext, blob)=>llamar('/plotter/guardar?nombre='+encodeURIComponent(nombre)+'&ext='+encodeURIComponent(ext||'jpg'), { method:'POST', body: blob, headers:{ 'Content-Type':'application/octet-stream' } }, 600000);
  E.abrir = (ruta, relativa)=>postJson('/abrir', { ruta, relativa: !!relativa });
  E.config = ()=>llamar('/config');
  E.cambiarConfig = (raiz, plotter)=>postJson('/config', { raiz, plotter });

  // Pastilla de estado para las cabeceras: <span id="estacionChip"></span>  (grande, para que se vea de un vistazo)
  E.pintarChip = function(id){
    const el = document.getElementById(id || 'estacionChip'); if(!el) return;
    el.textContent = E.conectada ? '● Estación de diseño conectada' : '○ Estación de diseño desconectada';
    el.title = E.conectada ? ('Carpeta de trabajos: '+(E.info&&E.info.raiz)+' · espacio libre: '+(E.info&&E.info.espacioLibreGb)+' GB') : 'El programa de la estación de diseño no está abierto en este computador (solo hace falta para archivos pesados).';
    el.style.cssText = 'display:inline-block;font-size:15px;font-weight:800;border-radius:18px;padding:7px 18px;letter-spacing:.2px;'
      + (E.conectada ? 'background:#1a7d3f;color:#fff;box-shadow:0 0 0 3px rgba(26,125,63,.28);' : 'background:#7f1d1d;color:#fff;box-shadow:0 0 0 3px rgba(220,38,38,.28);');
  };
  // Aviso visible cuando la estación estaba conectada y deja de responder (y confirmación cuando vuelve)
  let huboConexion = false;
  function aviso(texto, color, autoOcultarMs){
    let b = document.getElementById('estacionAviso');
    if(!b){ b = document.createElement('div'); b.id = 'estacionAviso'; document.body.appendChild(b); }
    b.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:999998;max-width:min(92vw,720px);padding:12px 44px 12px 18px;border-radius:10px;color:#fff;font:700 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);background:'+color+';';
    b.innerHTML = texto + '<span style="position:absolute;right:14px;top:8px;cursor:pointer;font-size:20px;" onclick="this.parentNode.remove()">×</span>';
    if(autoOcultarMs) setTimeout(()=>{ if(b.parentNode) b.remove(); }, autoOcultarMs);
  }
  E.alCambiar(function(conectada){
    if(conectada){
      if(huboConexion && document.getElementById('estacionAviso')) aviso('✔ Estación de diseño reconectada.', '#1a7d3f', 4000);
      huboConexion = true;
    } else if(huboConexion){
      aviso('⚠ Estación de diseño desconectada. El programa del PC de diseño dejó de responder: revisa que la ventana negra siga abierta o ábrelo de nuevo. Mientras tanto no se podrán leer ni guardar archivos en ese PC.', '#b91c1c');
    }
  });
  // Revisa al abrir la página y cada 8 s
  E.vigilar = function(idChip){
    E.alCambiar(()=>E.pintarChip(idChip));
    E.estado().then(()=>E.pintarChip(idChip));
    setInterval(()=>{ E.estado().then(()=>E.pintarChip(idChip)); }, 8000);
  };
  return E;
})();
