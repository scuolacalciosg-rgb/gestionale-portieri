import { proteggiPagina, collegaLogout } from "./auth-guard.js";
import { db, ref, get, set, push, update, remove } from "./firebase-config.js";

await proteggiPagina();
collegaLogout();

const listaGiocatoriRapporti = document.getElementById("listaGiocatoriRapporti");
const dettaglioRapporti = document.getElementById("dettaglioRapporti");
const btnNuovoRapporto = document.getElementById("btnNuovoRapporto");
const overlayRapporto = document.getElementById("overlayRapporto");
const modaleTitoloRapp = document.getElementById("modaleTitoloRapp");
const campoGiocatoreRapp = document.getElementById("campoGiocatoreRapp");
const btnAnnullaRapporto = document.getElementById("btnAnnullaRapporto");
const btnSalvaRapporto = document.getElementById("btnSalvaRapporto");
const btnEliminaRapporto = document.getElementById("btnEliminaRapporto");

let playersCache = {};
let rapportiCache = {};
let giocatoreSelezionato = null;
let idRapportoCorrente = null;

function formattaData(dataStr) {
  if (!dataStr) return "-";
  const [anno, mese, giorno] = dataStr.split("-");
  return `${giorno}/${mese}/${anno}`;
}

async function caricaDati() {
  try {
    const [snapPlayers, snapRapporti] = await Promise.all([
      get(ref(db, "portieri_giocatori")),
      get(ref(db, "portieri_rapporti"))
    ]);
    playersCache = snapPlayers.exists() ? snapPlayers.val() : {};
    rapportiCache = snapRapporti.exists() ? snapRapporti.val() : {};

    popolaSelectGiocatori();
    renderListaGiocatori();
  } catch (err) {
    console.error(err);
    listaGiocatoriRapporti.innerHTML = `<p style="color:var(--rosso);">Errore: ${err.message}</p>`;
  }
}

function popolaSelectGiocatori() {
  const ids = Object.keys(playersCache).sort((a, b) => (playersCache[a].nome || "").localeCompare(playersCache[b].nome || ""));
  campoGiocatoreRapp.innerHTML = ids.map(id => `<option value="${id}">${playersCache[id].nome}</option>`).join("");
}

function renderListaGiocatori() {
  const perGiocatore = {};
  Object.keys(rapportiCache).forEach(idRapp => {
    const r = rapportiCache[idRapp];
    const key = r.giocatoreKey || "sconosciuto";
    if (!perGiocatore[key]) perGiocatore[key] = [];
    perGiocatore[key].push(idRapp);
  });

  const chiavi = Object.keys(perGiocatore);

  if (chiavi.length === 0) {
    listaGiocatoriRapporti.innerHTML = `<p style="color:var(--testo-chiaro);">Nessun rapporto ancora inserito.</p>`;
    return;
  }

  chiavi.sort((a, b) => {
    const nomeA = playersCache[a]?.nome || rapportiCache[perGiocatore[a][0]]?.giocatoreNome || "";
    const nomeB = playersCache[b]?.nome || rapportiCache[perGiocatore[b][0]]?.giocatoreNome || "";
    return nomeA.localeCompare(nomeB);
  });

  listaGiocatoriRapporti.innerHTML = chiavi.map(key => {
    const p = playersCache[key];
    const idsRapp = perGiocatore[key];
    const ultimaData = idsRapp.map(id => rapportiCache[id].data || "").sort().reverse()[0];
    const nome = p?.nome || rapportiCache[idsRapp[0]]?.giocatoreNome || "Portiere";
    const foto = p?.foto || "";
    return `
      <div class="rapporti-giocatore-riga ${key === giocatoreSelezionato ? "selezionato" : ""}" data-key="${key}">
        <img src="${foto}" alt="${nome}" onerror="this.style.opacity=0">
        <div class="rg-info">
          <div class="rg-nome">${nome}</div>
          <div class="rg-meta">${idsRapp.length} rapport${idsRapp.length === 1 ? "o" : "i"} · ultimo ${formattaData(ultimaData)}</div>
        </div>
      </div>
    `;
  }).join("");

  listaGiocatoriRapporti.querySelectorAll(".rapporti-giocatore-riga").forEach(riga => {
    riga.addEventListener("click", () => {
      giocatoreSelezionato = riga.dataset.key;
      renderListaGiocatori();
      renderDettaglioGiocatore(giocatoreSelezionato);
    });
  });
}

function renderDettaglioGiocatore(key) {
  const p = playersCache[key];
  const idsRapp = Object.keys(rapportiCache).filter(id => (rapportiCache[id].giocatoreKey || "sconosciuto") === key);
  idsRapp.sort((a, b) => (rapportiCache[b].data || "").localeCompare(rapportiCache[a].data || ""));

  const nome = p?.nome || rapportiCache[idsRapp[0]]?.giocatoreNome || "Portiere";
  const foto = p?.foto || "";

  const cardsHtml = idsRapp.map(id => {
    const r = rapportiCache[id];
    return `
      <div class="rapporto-card" data-id="${id}">
        <div class="rc-header">
          <strong>${formattaData(r.data)}</strong>
          <span class="tag-cat">${r.contesto || "-"}</span>
          <span class="rc-voto">Voto: ${r.voto || "-"}/5</span>
          <button class="btn-secondary btn-modifica-rapp" data-id="${id}" style="margin-left:auto;">Modifica</button>
        </div>
        ${r.comportamento ? `<div class="rc-sezione"><div class="rc-label">Comportamento</div><p>${r.comportamento}</p></div>` : ""}
        ${r.presa ? `<div class="rc-sezione"><div class="rc-label">🧤 Presa della palla</div><p>${r.presa}</p></div>` : ""}
        ${r.uscite ? `<div class="rc-sezione"><div class="rc-label">🏃 Uscite</div><p>${r.uscite}</p></div>` : ""}
        ${r.rinvio ? `<div class="rc-sezione"><div class="rc-label">🦵 Rinvio</div><p>${r.rinvio}</p></div>` : ""}
        ${r.posizionamento ? `<div class="rc-sezione"><div class="rc-label">📍 Posizionamento</div><p>${r.posizionamento}</p></div>` : ""}
        ${r.migliorare ? `<div class="rc-sezione"><div class="rc-label">Da migliorare</div><p>${r.migliorare}</p></div>` : ""}
        ${r.note ? `<div class="rc-sezione"><div class="rc-label">Note</div><p>${r.note}</p></div>` : ""}
      </div>
    `;
  }).join("");

  dettaglioRapporti.innerHTML = `
    <div class="rapporti-dettaglio-header">
      <img src="${foto}" alt="${nome}" onerror="this.style.opacity=0">
      <div>
        <h3 style="font-size:1.1rem;">${nome}</h3>
        <div style="font-size:0.85rem; color:var(--testo-chiaro);">🧤 Portiere · ${idsRapp.length} rapporti totali</div>
      </div>
    </div>
    ${cardsHtml}
  `;

  dettaglioRapporti.querySelectorAll(".btn-modifica-rapp").forEach(btn => {
    btn.addEventListener("click", () => apriModificaRapporto(btn.dataset.id));
  });
}

function apriNuovoRapporto() {
  idRapportoCorrente = null;
  modaleTitoloRapp.textContent = "Nuovo rapporto";
  if (giocatoreSelezionato && playersCache[giocatoreSelezionato]) {
    campoGiocatoreRapp.value = giocatoreSelezionato;
  }
  document.getElementById("campoDataRapp").value = new Date().toISOString().split("T")[0];
  document.getElementById("campoContestoRapp").value = "";
  document.getElementById("campoVotoRapp").value = 3;
  document.getElementById("campoComportamentoRapp").value = "";
  document.getElementById("campoPresaRapp").value = "";
  document.getElementById("campoUsciteRapp").value = "";
  document.getElementById("campoRinvioRapp").value = "";
  document.getElementById("campoPosizionamentoRapp").value = "";
  document.getElementById("campoMigliorareRapp").value = "";
  document.getElementById("campoNoteRapp").value = "";
  campoGiocatoreRapp.disabled = false;
  btnEliminaRapporto.style.display = "none";
  overlayRapporto.classList.add("attivo");
}

function apriModificaRapporto(id) {
  idRapportoCorrente = id;
  const r = rapportiCache[id];
  modaleTitoloRapp.textContent = "Modifica rapporto";
  if (r.giocatoreKey) campoGiocatoreRapp.value = r.giocatoreKey;
  document.getElementById("campoDataRapp").value = r.data || "";
  document.getElementById("campoContestoRapp").value = r.contesto || "";
  document.getElementById("campoVotoRapp").value = r.voto || 3;
  document.getElementById("campoComportamentoRapp").value = r.comportamento || "";
  document.getElementById("campoPresaRapp").value = r.presa || "";
  document.getElementById("campoUsciteRapp").value = r.uscite || "";
  document.getElementById("campoRinvioRapp").value = r.rinvio || "";
  document.getElementById("campoPosizionamentoRapp").value = r.posizionamento || "";
  document.getElementById("campoMigliorareRapp").value = r.migliorare || "";
  document.getElementById("campoNoteRapp").value = r.note || "";
  campoGiocatoreRapp.disabled = true;
  btnEliminaRapporto.style.display = "inline-block";
  overlayRapporto.classList.add("attivo");
}

function chiudiModale() {
  overlayRapporto.classList.remove("attivo");
  idRapportoCorrente = null;
}

async function salvaRapporto() {
  const giocatoreKey = campoGiocatoreRapp.value;
  const giocatoreNome = playersCache[giocatoreKey]?.nome || "";

  const dati = {
    giocatoreKey,
    giocatoreNome,
    data: document.getElementById("campoDataRapp").value,
    contesto: document.getElementById("campoContestoRapp").value.trim(),
    voto: Number(document.getElementById("campoVotoRapp").value) || null,
    comportamento: document.getElementById("campoComportamentoRapp").value.trim(),
    presa: document.getElementById("campoPresaRapp").value.trim(),
    uscite: document.getElementById("campoUsciteRapp").value.trim(),
    rinvio: document.getElementById("campoRinvioRapp").value.trim(),
    posizionamento: document.getElementById("campoPosizionamentoRapp").value.trim(),
    migliorare: document.getElementById("campoMigliorareRapp").value.trim(),
    note: document.getElementById("campoNoteRapp").value.trim()
  };

  if (!giocatoreKey || !dati.data) {
    alert("Portiere e data sono obbligatori.");
    return;
  }

  btnSalvaRapporto.disabled = true;
  btnSalvaRapporto.textContent = "Salvataggio...";

  try {
    if (idRapportoCorrente) {
      await update(ref(db, `portieri_rapporti/${idRapportoCorrente}`), dati);
      rapportiCache[idRapportoCorrente] = { ...rapportiCache[idRapportoCorrente], ...dati };
    } else {
      dati.ts = Date.now();
      const nuovoRef = push(ref(db, "portieri_rapporti"));
      await set(nuovoRef, dati);
      rapportiCache[nuovoRef.key] = dati;
    }
    giocatoreSelezionato = giocatoreKey;
    renderListaGiocatori();
    renderDettaglioGiocatore(giocatoreKey);
    chiudiModale();
  } catch (err) {
    alert("Errore nel salvataggio: " + err.message);
  } finally {
    btnSalvaRapporto.disabled = false;
    btnSalvaRapporto.textContent = "Salva";
  }
}

async function eliminaRapporto() {
  if (!idRapportoCorrente) return;
  if (!confirm("Sei sicuro di voler eliminare questo rapporto? L'operazione è irreversibile.")) return;

  const key = rapportiCache[idRapportoCorrente]?.giocatoreKey;

  try {
    await remove(ref(db, `portieri_rapporti/${idRapportoCorrente}`));
    delete rapportiCache[idRapportoCorrente];
    renderListaGiocatori();
    if (key) renderDettaglioGiocatore(key);
    chiudiModale();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

btnNuovoRapporto.addEventListener("click", apriNuovoRapporto);
btnAnnullaRapporto.addEventListener("click", chiudiModale);
btnSalvaRapporto.addEventListener("click", salvaRapporto);
btnEliminaRapporto.addEventListener("click", eliminaRapporto);
overlayRapporto.addEventListener("click", (e) => {
  if (e.target === overlayRapporto) chiudiModale();
});

caricaDati();
