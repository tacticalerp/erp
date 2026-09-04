// ==========================================================================
// tactical-bot.js
// Widget flotante del "Bot Tactical" -- burbuja de chat visible en el ERP,
// que le pregunta a la Edge Function supabase/functions/bot-tactical/index.ts
// (ahí vive la llamada real a Claude, esta parte solo maneja la interfaz).
//
// Se carga DESPUÉS de tactical-supabase.js (necesita el cliente ya creado):
//   <script src="tactical-supabase.js?v=..."></script>
//   <script src="tactical-bot.js?v=..."></script>
//
// SESIÓN 1: solo pregunta/respuesta de texto. Sin fotos, sin tareas, sin
// cotizaciones, sin memoria entre recargas de página (eso viene después).
// ==========================================================================

(function(){

  // El widget no se dibuja hasta que el login termine de verdad -- si se mostrara antes, un clic
  // en "Enviar" fallaría porque todavía no hay sesión (la Edge Function exige estar logueado), y
  // además se vería raro encima de la pantalla de login. tactical-supabase.js expone
  // window.tacticalUsuarioPerfil recién cuando la sesión queda confirmada, así que se espera a que
  // aparezca (sin depender de window.tacticalOnLogin, que cada página ya define para lo suyo -- si
  // este script también lo definiera, pisaría esa función en vez de sumarse a ella).
  function esperarLoginYArrancar(){
    if(window.tacticalUsuarioPerfil){
      botInicializar();
      return;
    }
    setTimeout(esperarLoginYArrancar, 300);
  }

  function botInicializar(){

  // Se dibuja apenas carga el script, en la esquina inferior IZQUIERDA a propósito -- ya existen
  // 2 botones flotantes en la esquina inferior derecha (acceso rápido ☰ y Asistente de Ayuda ?),
  // para no encimarse con esos.
  const estilos = `
    #tactical-bot-btn{
      position:fixed; bottom:16px; left:16px; z-index:99999;
      width:50px; height:50px; border-radius:50%;
      background:#5b21b6; color:#fff; border:none;
      box-shadow:0 4px 12px rgba(0,0,0,0.28); cursor:pointer;
      font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      display:flex; align-items:center; justify-content:center;
    }
    #tactical-bot-panel{
      display:none; position:fixed; bottom:74px; left:16px; z-index:99999;
      width:340px; max-width:calc(100vw - 32px); height:440px; max-height:calc(100vh - 160px);
      background:#fff; border:1px solid #d7dee5; border-radius:10px;
      box-shadow:0 8px 24px rgba(0,0,0,0.25); flex-direction:column; overflow:hidden;
      font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    }
    #tactical-bot-panel.abierto{ display:flex; }
    #tactical-bot-header{
      background:#5b21b6; color:#fff; padding:10px 14px; font-size:14px; font-weight:600;
      display:flex; justify-content:space-between; align-items:center;
    }
    #tactical-bot-header span.cerrar{ cursor:pointer; font-size:17px; line-height:1; }
    #tactical-bot-log{ flex:1; overflow-y:auto; padding:10px; background:#f8fafc; }
    .tactical-bot-msg{
      margin-bottom:8px; padding:8px 10px; border-radius:8px; font-size:12.5px;
      line-height:1.4; max-width:88%; word-wrap:break-word; white-space:pre-wrap;
    }
    .tactical-bot-msg-bot{ background:#ede9fe; color:#0f172a; margin-right:auto; }
    .tactical-bot-msg-user{ background:#1e3a5f; color:#fff; margin-left:auto; text-align:right; }
    .tactical-bot-msg-error{ background:#fee2e2; color:#991b1b; margin-right:auto; }
    #tactical-bot-inputrow{ display:flex; border-top:1px solid #e2e8f0; padding:8px; gap:6px; }
    #tactical-bot-input{
      flex:1; border:1px solid #cbd5e0; border-radius:6px; padding:7px 9px; font-size:12.5px;
    }
    #tactical-bot-enviar{
      background:#5b21b6; color:#fff; border:none; border-radius:6px; padding:0 12px;
      font-size:13px; cursor:pointer;
    }
    #tactical-bot-enviar:disabled{ opacity:.5; cursor:not-allowed; }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = estilos;
  document.head.appendChild(styleTag);

  // ticon() viene de precios_tactical.js (mismo sistema de íconos de línea delgada ya usado en todo
  // el ERP -- Conde pidió explícitamente un ícono simple en vez del emoji 🤖 original).
  document.body.insertAdjacentHTML('beforeend', `
    <button id="tactical-bot-btn" title="Bot Tactical (ayuda y cotizaciones)">${ticon('botChat', {size:26, color:'#fff', noMargin:true})}</button>
    <div id="tactical-bot-panel">
      <div id="tactical-bot-header">
        <span style="display:flex; align-items:center; gap:6px;">${ticon('botChat', {size:18, color:'#fff', noMargin:true})} Bot Tactical</span>
        <span class="cerrar" id="tactical-bot-cerrar">✕</span>
      </div>
      <div id="tactical-bot-log"></div>
      <div id="tactical-bot-inputrow">
        <input type="text" id="tactical-bot-input" placeholder="Escribe tu pregunta...">
        <button id="tactical-bot-enviar">Enviar</button>
      </div>
    </div>
  `);

  // Historial en memoria de ESTA sesión del navegador -- si recargas la página se pierde. Bot
  // Tactical, a diferencia de Derek, no lleva memoria de largo plazo entre sesiones (así quedó
  // definido en la especificación).
  let botHistorial = [];
  let botEnviando = false;

  function botAgregarMensaje(tipo, texto){
    const log = document.getElementById('tactical-bot-log');
    const div = document.createElement('div');
    div.className = 'tactical-bot-msg tactical-bot-msg-' + tipo;
    div.textContent = texto;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function botTogglePanel(){
    const panel = document.getElementById('tactical-bot-panel');
    panel.classList.toggle('abierto');
    if(panel.classList.contains('abierto')){
      const log = document.getElementById('tactical-bot-log');
      if(!log.dataset.iniciado){
        botAgregarMensaje('bot', 'Hola, soy Bot Tactical. Puedo ayudarte con dudas técnicas de producción (sangrado, formatos, especificaciones), con cómo usar el sistema (pedidos, comparativas, Kanban, fotos, etc.) y ya puedo cotizar Volantes/Afiches/Plegables de verdad. Por ahora no puedo crear tareas ni cotizar las demás líneas -- eso llega pronto.');
        log.dataset.iniciado = '1';
      }
      document.getElementById('tactical-bot-input').focus();
    }
  }

  async function botEnviarMensaje(){
    if(botEnviando) return;
    const input = document.getElementById('tactical-bot-input');
    const mensaje = input.value.trim();
    if(!mensaje) return;

    botAgregarMensaje('user', mensaje);
    input.value = '';
    botEnviando = true;
    document.getElementById('tactical-bot-enviar').disabled = true;

    try{
      // tacticalSupabase.functions.invoke ya agrega solo el token de la sesión actual (Authorization)
      // -- así la Edge Function puede confirmar que quien pregunta está logueado de verdad.
      const { data, error } = await tacticalSupabase.functions.invoke('bot-tactical', {
        body: { mensaje, historial: botHistorial }
      });
      if(error) throw error;
      if(data && data.error) throw new Error(data.error);

      const respuesta = (data && data.respuesta) || '(sin respuesta)';
      botAgregarMensaje('bot', respuesta);
      botHistorial.push({ role: 'user', content: mensaje });
      botHistorial.push({ role: 'assistant', content: respuesta });
      // Se manda solo lo reciente para no hacer la petición cada vez más pesada -- 20 mensajes
      // (10 preguntas + 10 respuestas) es de sobra para una conversación de soporte típica.
      if(botHistorial.length > 20) botHistorial = botHistorial.slice(-20);
    } catch(e){
      console.error('Error consultando Bot Tactical:', e);
      botAgregarMensaje('error', 'No se pudo contactar al bot. Revisa tu conexión e intenta de nuevo.');
    } finally {
      botEnviando = false;
      document.getElementById('tactical-bot-enviar').disabled = false;
      input.focus();
    }
  }

  document.getElementById('tactical-bot-btn').addEventListener('click', botTogglePanel);
  document.getElementById('tactical-bot-cerrar').addEventListener('click', botTogglePanel);
  document.getElementById('tactical-bot-enviar').addEventListener('click', botEnviarMensaje);
  document.getElementById('tactical-bot-input').addEventListener('keydown', function(ev){
    if(ev.key === 'Enter') botEnviarMensaje();
  });

  } // fin botInicializar

  esperarLoginYArrancar();

})();
