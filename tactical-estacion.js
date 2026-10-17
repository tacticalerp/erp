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

  // Pastilla de estado para las cabeceras: <span id="estacionChip"></span>
  E.pintarChip = function(id){
    const el = document.getElementById(id || 'estacionChip'); if(!el) return;
    el.textContent = E.conectada ? '● Estación de diseño conectada' : '○ Estación de diseño no conectada';
    el.title = E.conectada ? ('Carpeta de trabajos: '+(E.info&&E.info.raiz)+' · espacio libre: '+(E.info&&E.info.espacioLibreGb)+' GB') : 'El programa de la estación de diseño no está abierto en este computador (solo hace falta para archivos pesados).';
    el.style.cssText = 'display:inline-block;font-size:12px;font-weight:700;border-radius:12px;padding:3px 10px;'
      + (E.conectada ? 'background:#1a7d3f;color:#fff;' : 'background:#475569;color:#cbd5e1;');
  };
  // Revisa al abrir la página y cada 15 s
  E.vigilar = function(idChip){
    E.alCambiar(()=>E.pintarChip(idChip));
    E.estado().then(()=>E.pintarChip(idChip));
    setInterval(()=>{ E.estado().then(()=>E.pintarChip(idChip)); }, 15000);
  };
  return E;
})();
