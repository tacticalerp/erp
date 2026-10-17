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
      + '#tactical-quicknav-btn:hover{ background:#b30000; }';
    document.head.appendChild(st);
    const cont = document.createElement('div'); cont.id = 'tactical-quicknav';
    cont.innerHTML = '<button id="tactical-quicknav-btn" title="Ir al Hub principal" aria-label="Ir al Hub principal"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg></button>';
    cont.firstChild.addEventListener('click', function(){ location.href = 'TACTICAL_ERP_HUB.html#hub'; });
    document.body.appendChild(cont);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner); else poner();
})();
