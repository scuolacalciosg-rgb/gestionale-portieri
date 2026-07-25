import { proteggiPagina, collegaLogout } from "./auth-guard.js";
import { db, ref, get, set, push, update, remove } from "./firebase-config.js";

await proteggiPagina();
collegaLogout();

const titoloMese = document.getElementById("titoloMese");
const btnMesePrec = document.getElementById("btnMesePrec");
const btnMeseSucc = document.getElementById("btnMeseSucc");
const calendarioGrid = document.getElementById("calendarioGrid");
const titoloGiornoSelezionato = document.getElementById("titoloGiornoSelezionato");
const listaEventiGiorno = document.getElementById("listaEventiGiorno");
const btnNuovoEvento = document.getElementById("btnNuovoEvento");

const overlayEvento = document.getElementById("overlayEvento");
const modaleTitoloEvento = document.getElementById("modaleTitoloEvento");
const campoTipoEvento = document.getElementById("campoTipoEvento");
const btnAnnullaEvento = document.getElementById("btnAnnullaEvento");
const btnSalvaEvento = document.getElementById("btnSalvaEvento");
const btnEliminaEvento = document.getElementById("btnEliminaEvento");

let trainingsCache = {};
let partiteCache = {};
let newsCache = {};

let meseVisualizzato = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let giornoSelezionato = "";
let eventoInModifica = null;

function isoDaData(d) {
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, "0");
  const giorno = String(d.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

giornoSelezionato = isoDaData(new Date());

function formattaDataISO(dataStr) {
  if (!dataStr) return "-";
  const [anno, mese, giorno] = dataStr.split("-");
  return `${giorno}/${mese}/${anno}`;
}

function convertiDataItalianaISO(dataItaliana) {
  if (!dataItaliana) return "";
  const parti = dataItaliana.split("/");
  if (parti.length !== 3) return "";
  const [giorno, mese, anno] = parti;
  return `${anno}-${mese.padStart(2, "0")}-${giorno.padStart(2, "0")}`;
}

// ============================================
// CARICAMENTO
// ============================================
async function caricaTutto() {
  try {
    const [snapTrainings, snapPartite, snapNews] = await Promise.all([
      get(ref(db, "portieri_trainings")),
      get(ref(db, "portieri_partite")),
      get(ref(db, "portieri_news"))
    ]);
    trainingsCache = snapTrainings.exists() ? snapTrainings.val() : {};
    partiteCache = snapPartite.exists() ? snapPartite.val() : {};
    newsCache = snapNews.exists() ? snapNews.val() : {};

    renderCalendario();
    renderEventiGiorno();
  } catch (err) {
    console.error(err);
    listaEventiGiorno.innerHTML = `<p style="color:var(--rosso);">Errore nel caricamento: ${err.message}</p>`;
  }
}

function costruisciMappaEventi() {
  const mappa = {};

  function aggiungi(dataISO, evento) {
    if (!dataISO) return;
    if (!mappa[dataISO]) mappa[dataISO] = [];
    mappa[dataISO].push(evento);
  }

  Object.keys(trainingsCache).forEach(id => {
    const t = trainingsCache[id];
    aggiungi(t.data, { tipo: "allenamento", id, titolo: t.titolo || "Allenamento", ora: t.ora, extra: t.luogo });
  });

  Object.keys(partiteCache).forEach(id => {
    const p = partiteCache[id];
    aggiungi(p.data, { tipo: "partita", id, titolo: `vs ${p.avversario || "?"}`, ora: p.ora, extra: p.campo });
  });

  Object.keys(newsCache).forEach(id => {
    const n = newsCache[id];
    const dataISO = convertiDataItalianaISO(n.data);
    aggiungi(dataISO, { tipo: "comunicazione", id, titolo: n.titolo || "Comunicazione", extra: n.autore });
  });

  return mappa;
}

// ============================================
// RENDER CALENDARIO MENSILE
// ============================================
function renderCalendario() {
  const anno = meseVisualizzato.getFullYear();
  const mese = meseVisualizzato.getMonth();

  const nomeMese = meseVisualizzato.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  titoloMese.textContent = nomeMese.charAt(0).toUpperCase() + nomeMese.slice(1);

  const mappaEventi = costruisciMappaEventi();

  const primoGiorno = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const offsetIniziale = (primoGiorno.getDay() + 6) % 7;

  const oggiISO = isoDaData(new Date());

  let celle = "";
  for (let i = 0; i < offsetIniziale; i++) {
    celle += `<div class="calendario-cella vuota"></div>`;
  }

  for (let giorno = 1; giorno <= ultimoGiorno.getDate(); giorno++) {
    const dataCorrente = new Date(anno, mese, giorno);
    const dataISO = isoDaData(dataCorrente);
    const eventiGiorno = mappaEventi[dataISO] || [];

    const classiExtra = [
      dataISO === oggiISO ? "oggi" : "",
      dataISO === giornoSelezionato ? "selezionata" : ""
    ].join(" ");

    const puntiniUnici = [...new Set(eventiGiorno.map(e => e.tipo))];

    celle += `
      <div class="calendario-cella ${classiExtra}" data-data="${dataISO}">
        <span class="numero-giorno">${giorno}</span>
        <span class="puntini">
          ${puntiniUnici.map(tipo => `<span class="dot dot-${tipo}"></span>`).join("")}
        </span>
      </div>
    `;
  }

  calendarioGrid.innerHTML = celle;

  calendarioGrid.querySelectorAll(".calendario-cella:not(.vuota)").forEach(cella => {
    cella.addEventListener("click", () => {
      giornoSelezionato = cella.dataset.data;
      renderCalendario();
      renderEventiGiorno();
    });
  });
}

// ============================================
// RENDER EVENTI DEL GIORNO SELEZIONATO
// ============================================
function renderEventiGiorno() {
  const mappaEventi = costruisciMappaEventi();
  const eventi = mappaEventi[giornoSelezionato] || [];

  const [anno, mese, giorno] = giornoSelezionato.split("-");
  titoloGiornoSelezionato.textContent = `Eventi del ${giorno}/${mese}/${anno}`;

  if (eventi.length === 0) {
    listaEventiGiorno.innerHTML = `<p style="color:var(--testo-chiaro);">Nessun evento in questo giorno.</p>`;
    return;
  }

  const iconeTipo = { allenamento: "📋", partita: "⚽", comunicazione: "📰" };
  const nomiTipo = { allenamento: "Allenamento", partita: "Partita", comunicazione: "Comunicazione" };

  listaEventiGiorno.innerHTML = eventi.map(ev => `
    <div class="evento-riga-giorno tipo-${ev.tipo}" data-tipo="${ev.tipo}" data-id="${ev.id}">
      <div class="er-header">
        <div>
          <div class="er-tipo">${iconeTipo[ev.tipo]} ${nomiTipo[ev.tipo]}</div>
          <strong>${ev.titolo}</strong>
        </div>
        <span class="tag-cat">${ev.ora ? "ore " + ev.ora : ""} ${ev.extra ? "· " + ev.extra : ""}</span>
      </div>
    </div>
  `).join("");

  listaEventiGiorno.querySelectorAll(".evento-riga-giorno").forEach(riga => {
    riga.addEventListener("click", () => {
      const tipo = riga.dataset.tipo;
      const id = riga.dataset.id;
      if (tipo === "allenamento") {
        window.location.href = `allenamenti.html?id=${id}`;
      } else if (tipo === "comunicazione") {
        apriModificaComunicazione(id);
      } else if (tipo === "partita") {
        apriModificaPartita(id);
      }
    });
  });
}

// ============================================
// NAVIGAZIONE MESE
// ============================================
btnMesePrec.addEventListener("click", () => {
  meseVisualizzato.setMonth(meseVisualizzato.getMonth() - 1);
  renderCalendario();
});

btnMeseSucc.addEventListener("click", () => {
  meseVisualizzato.setMonth(meseVisualizzato.getMonth() + 1);
  renderCalendario();
});

// ============================================
// GESTIONE MODALE
// ============================================
const sezioni = {
  allenamento: document.getElementById("sezioneAllenamento"),
  comunicazione: document.getElementById("sezioneComunicazione"),
  partita: document.getElementById("sezionePartita")
};

function mostraSezione(tipo) {
  Object.keys(sezioni).forEach(t => {
    sezioni[t].style.display = t === tipo ? "block" : "none";
  });
  btnSalvaEvento.style.display = tipo === "allenamento" ? "none" : "inline-block";
}

campoTipoEvento.addEventListener("change", () => mostraSezione(campoTipoEvento.value));

function apriNuovoEvento() {
  eventoInModifica = null;
  modaleTitoloEvento.textContent = "Nuovo evento";
  campoTipoEvento.disabled = false;
  campoTipoEvento.value = "partita";
  mostraSezione("partita");

  document.getElementById("campoAvversarioPar").value = "";
  document.getElementById("campoDataPar").value = giornoSelezionato;
  document.getElementById("campoOraPar").value = "";
  document.getElementById("campoCampoPar").value = "";
  document.getElementById("campoNotePar").value = "";

  document.getElementById("campoTitoloCom").value = "";
  document.getElementById("campoDataCom").value = giornoSelezionato;
  document.getElementById("campoBodyCom").value = "";
  document.getElementById("campoAutoreCom").value = "";

  btnEliminaEvento.style.display = "none";
  overlayEvento.classList.add("attivo");
}

function apriModificaComunicazione(id) {
  eventoInModifica = { tipo: "comunicazione", id };
  const n = newsCache[id];
  modaleTitoloEvento.textContent = "Comunicazione";
  campoTipoEvento.value = "comunicazione";
  campoTipoEvento.disabled = true;
  mostraSezione("comunicazione");

  document.getElementById("campoTitoloCom").value = n.titolo || "";
  document.getElementById("campoDataCom").value = convertiDataItalianaISO(n.data);
  document.getElementById("campoBodyCom").value = n.body || "";
  document.getElementById("campoAutoreCom").value = n.autore || "";

  btnEliminaEvento.style.display = "inline-block";
  overlayEvento.classList.add("attivo");
}

function apriModificaPartita(id) {
  eventoInModifica = { tipo: "partita", id };
  const p = partiteCache[id];
  modaleTitoloEvento.textContent = "Modifica partita";
  campoTipoEvento.value = "partita";
  campoTipoEvento.disabled = true;
  mostraSezione("partita");

  document.getElementById("campoAvversarioPar").value = p.avversario || "";
  document.getElementById("campoDataPar").value = p.data || "";
  document.getElementById("campoOraPar").value = p.ora || "";
  document.getElementById("campoCampoPar").value = p.campo || "";
  document.getElementById("campoNotePar").value = p.note || "";

  btnEliminaEvento.style.display = "inline-block";
  overlayEvento.classList.add("attivo");
}

function chiudiModale() {
  overlayEvento.classList.remove("attivo");
  eventoInModifica = null;
}

// ============================================
// SALVA / ELIMINA
// ============================================
async function salvaEvento() {
  const tipo = campoTipoEvento.value;

  btnSalvaEvento.disabled = true;
  btnSalvaEvento.textContent = "Salvataggio...";

  try {
    if (tipo === "comunicazione") {
      const dati = {
        titolo: document.getElementById("campoTitoloCom").value.trim(),
        data: formattaDataISO(document.getElementById("campoDataCom").value),
        body: document.getElementById("campoBodyCom").value.trim(),
        autore: document.getElementById("campoAutoreCom").value.trim(),
        ts: Date.now()
      };
      if (!dati.titolo) { alert("Il titolo è obbligatorio."); return; }
      if (eventoInModifica?.tipo === "comunicazione") {
        await update(ref(db, `portieri_news/${eventoInModifica.id}`), dati);
        newsCache[eventoInModifica.id] = dati;
      } else {
        const nuovoRef = push(ref(db, "portieri_news"));
        await set(nuovoRef, dati);
        newsCache[nuovoRef.key] = dati;
      }
    }

    else if (tipo === "partita") {
      const dati = {
        avversario: document.getElementById("campoAvversarioPar").value.trim(),
        data: document.getElementById("campoDataPar").value,
        ora: document.getElementById("campoOraPar").value,
        campo: document.getElementById("campoCampoPar").value.trim(),
        note: document.getElementById("campoNotePar").value.trim(),
        ts: Date.now()
      };
      if (!dati.avversario || !dati.data) { alert("Avversario e data sono obbligatori."); return; }
      if (eventoInModifica?.tipo === "partita") {
        await update(ref(db, `portieri_partite/${eventoInModifica.id}`), dati);
        partiteCache[eventoInModifica.id] = dati;
      } else {
        const nuovoRef = push(ref(db, "portieri_partite"));
        await set(nuovoRef, dati);
        partiteCache[nuovoRef.key] = dati;
      }
    }

    renderCalendario();
    renderEventiGiorno();
    chiudiModale();
  } catch (err) {
    alert("Errore nel salvataggio: " + err.message);
  } finally {
    btnSalvaEvento.disabled = false;
    btnSalvaEvento.textContent = "Salva";
  }
}

async function eliminaEvento() {
  if (!eventoInModifica) return;
  if (!confirm("Sei sicuro di voler eliminare questo evento? L'operazione è irreversibile.")) return;

  const { tipo, id } = eventoInModifica;
  const mappaNodi = { partita: "portieri_partite", comunicazione: "portieri_news" };
  const nodo = mappaNodi[tipo] || "portieri_news";

  try {
    await remove(ref(db, `${nodo}/${id}`));
    if (tipo === "partita") delete partiteCache[id];
    if (tipo === "comunicazione") delete newsCache[id];
    renderCalendario();
    renderEventiGiorno();
    chiudiModale();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

btnNuovoEvento.addEventListener("click", apriNuovoEvento);
btnAnnullaEvento.addEventListener("click", chiudiModale);
btnSalvaEvento.addEventListener("click", salvaEvento);
btnEliminaEvento.addEventListener("click", eliminaEvento);
overlayEvento.addEventListener("click", (e) => {
  if (e.target === overlayEvento) chiudiModale();
});

// Se arrivo da un link diretto con ?data=AAAA-MM-GG, apro il calendario su quel giorno
const parametriURL = new URLSearchParams(window.location.search);
const dataDaAprire = parametriURL.get("data");
if (dataDaAprire && /^\d{4}-\d{2}-\d{2}$/.test(dataDaAprire)) {
  giornoSelezionato = dataDaAprire;
  const [annoP, meseP] = dataDaAprire.split("-").map(Number);
  meseVisualizzato = new Date(annoP, meseP - 1, 1);
}

caricaTutto();
