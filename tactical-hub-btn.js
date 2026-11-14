/* Botón flotante "Volver al Hub" (círculo rojo con casita, abajo a la derecha).
   Conde 2026-10-17: debe estar en TODAS las herramientas, incluidas las que se creen a futuro.
   Cómo usarlo en una herramienta nueva: nada extra si ya carga precios_tactical.js (lo carga solo);
   si no, agregar  <script src="tactical-hub-btn.js"></script>  antes de </body>.
   No hace nada en el Hub ni en index.html, ni si la página ya trae su propio botón (#tactical-quicknav). */
(function(){
  if(window.__tacticalHubBtn) return; window.__tacticalHubBtn = true;
  function poner(){
    const ruta = (location.pathname.split('/').pop() || '').toLowerCase();
    if(!ruta || ruta === 'index.html' || ruta === 'tactical_erp_hub.html') return;
    if(document.getElementById('tactical-quicknav')) return;
    const st = document.createElement('style');
    st.textContent = '#tactical-quicknav{ position:fixed; bottom:16px; right:16px; z-index:99999; display:flex; flex-direction:column; align-items:flex-end; gap:8px; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; }'
      + '#tactical-quicknav-btn{ width:50px; height:50px; border-radius:50%; background:#cc0000; color:#fff; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.28); font-size:21px; cursor:pointer; display:flex; align-items:center; justify-content:center; }'
      + '#tactical-quicknav-btn:hover{ background:#b30000; }'
      // Conde 2026-11-14: "anexa el boton de whapp en las calculadoras solo para celular" -- abre
      // WhatsApp (sin número fijo, el celular busca a quién enviarle), solo tiene sentido en un
      // teléfono que tenga la app instalada, por eso se oculta en pantalla grande.
      + '#tactical-quicknav-wa{ width:50px; height:50px; border-radius:50%; background:#25D366; color:#fff; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.28); cursor:pointer; display:none; align-items:center; justify-content:center; }'
      + '#tactical-quicknav-wa:hover{ background:#1ebe5b; }'
      + '@media (max-width:680px){ #tactical-quicknav-wa{ display:flex; } }';
    document.head.appendChild(st);
    const cont = document.createElement('div'); cont.id = 'tactical-quicknav';
    cont.innerHTML = '<button id="tactical-quicknav-wa" title="Abrir WhatsApp" aria-label="Abrir WhatsApp"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.26 4.9L2 22l5.25-1.26A9.96 9.96 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.2c-1.6 0-3.1-.44-4.39-1.2l-.31-.18-3.11.75.76-3.03-.2-.32A8.17 8.17 0 0 1 3.84 12c0-4.52 3.68-8.2 8.2-8.2s8.2 3.68 8.2 8.2-3.68 8.2-8.2 8.2zm4.5-6.14c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.67-1.17.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z"></path></svg></button>'
      + '<button id="tactical-quicknav-btn" title="Ir al Hub principal" aria-label="Ir al Hub principal"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg></button>';
    cont.querySelector('#tactical-quicknav-wa').addEventListener('click', function(){ window.open('https://api.whatsapp.com/send', '_blank'); });
    cont.querySelector('#tactical-quicknav-btn').addEventListener('click', function(){ location.href = 'TACTICAL_ERP_HUB.html#hub'; });
    document.body.appendChild(cont);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner); else poner();
})();
