if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker non registrato:", err);
    });
  });
}

let eventoInstallazioneDifferito = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  eventoInstallazioneDifferito = event;
  mostraBannerInstallazione();
});

function mostraBannerInstallazione() {
  if (document.getElementById("bannerInstallaApp")) return;

  const banner = document.createElement("div");
  banner.id = "bannerInstallaApp";
  banner.style.cssText = `
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    background: #1a1a1a; color: #fff; padding: 12px 18px; border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; align-items: center;
    gap: 14px; z-index: 1000; font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 0.9rem; border-bottom: 3px solid #d6362e;
  `;
  banner.innerHTML = `
    <span>📲 Installa il gestionale portieri sul telefono</span>
    <button id="btnInstallaApp" style="background:#d6362e; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:600;">Installa</button>
    <button id="btnChiudiBannerInstalla" style="background:none; color:rgba(255,255,255,0.6); border:none; cursor:pointer; font-size:1.1rem;">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById("btnInstallaApp").addEventListener("click", async () => {
    if (!eventoInstallazioneDifferito) return;
    eventoInstallazioneDifferito.prompt();
    await eventoInstallazioneDifferito.userChoice;
    eventoInstallazioneDifferito = null;
    banner.remove();
  });

  document.getElementById("btnChiudiBannerInstalla").addEventListener("click", () => {
    banner.remove();
  });
}
