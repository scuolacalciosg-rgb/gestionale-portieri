import { proteggiPagina, collegaLogout } from "./auth-guard.js";
import { db, ref, get, set, push, update, remove } from "./firebase-config.js";

await proteggiPagina();
collegaLogout();

const listaGiocatori = document.getElementById("listaGiocatori");
const overlayGiocatore = document.getElementById("overlayGiocatore");
const modaleTitolo = document.getElementById("modaleTitolo");
const btnNuovoGiocatore = document.getElementById("btnNuovoGiocatore");
const btnAnnullaGiocatore = document.getElementById("btnAnnullaGiocatore");
const btnSalvaGiocatore = document.getElementById("btnSalvaGiocatore");
const btnEliminaGiocatore = document.getElementById("btnEliminaGiocatore");
const inputFoto = document.getElementById("inputFoto");
const previewFoto = document.getElementById("previewFoto");

let giocatoriCache = {};
let idGiocatoreCorrente = null;
let fotoBase64Corrente = "";

const STATI = ["Disponibile", "Infortunato", "Indisponibile", "Recuperato", "Convocato"];

async function caricaGiocatori() {
  try {
    const snap = await get(ref(db, "portieri_giocatori"));
    giocatoriCache = snap.exists() ? snap.val() : {};
    renderLista();
  } catch (err) {
    console.error(err);
    listaGiocatori.innerHTML = `<p style="color:var(--rosso);">Errore nel caricamento: ${err.message}</p>`;
  }
}

function renderLista() {
  const ids = Object.keys(giocatoriCache);
  if (ids.length === 0) {
    listaGiocatori.innerHTML = `<p style="color:var(--testo-chiaro);">Nessun portiere ancora inserito.</p>`;
    return;
  }

  ids.sort((a, b) => Number(giocatoriCache[a].numero || 0) - Number(giocatoriCache[b].numero || 0));

  listaGiocatori.innerHTML = ids.map(id => {
    const g = giocatoriCache[id];
    const foto = g.foto || "";
    return `
      <div class="giocatore-card" data-id="${id}">
        <div class="sticker">
          <img class="foto-giocatore" src="${foto}" alt="${g.nome || ''}" onerror="this.style.opacity=0">
          <div class="sticker-cornice"></div>
          <div class="sticker-numero">${g.numero || "-"}</div>
          <img class="sticker-stemma" src="assets/stemma.png" alt="Stemma">
          <div class="sticker-nome-banda">
            <h3>${g.nome || "Senza nome"}</h3>
            <div class="ruolo">🧤 Portiere</div>
          </div>
        </div>
        <select class="select-stato" data-id="${id}">
          ${STATI.map(s => `<option value="${s}" ${s === g.stato ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    `;
  }).join("");

  listaGiocatori.querySelectorAll(".giocatore-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "SELECT") return;
      apriSchedaGiocatore(card.dataset.id);
    });
  });

  listaGiocatori.querySelectorAll(".select-stato").forEach(sel => {
    sel.addEventListener("click", (e) => e.stopPropagation());
    sel.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const nuovoStato = e.target.value;
      try {
        await update(ref(db, `portieri_giocatori/${id}`), { stato: nuovoStato });
        giocatoriCache[id].stato = nuovoStato;
      } catch (err) {
        alert("Errore nel salvataggio dello stato: " + err.message);
      }
    });
  });
}

function apriSchedaGiocatore(id) {
  idGiocatoreCorrente = id;
  const g = giocatoriCache[id];

  modaleTitolo.textContent = g.nome || "Scheda portiere";
  document.getElementById("campoNome").value = g.nome || "";
  document.getElementById("campoNumero").value = g.numero || "";
  document.getElementById("campoDataNascita").value = g.dataNascita || "";
  document.getElementById("campoCategoria").value = g.categoria || "";
  document.getElementById("campoStato").value = g.stato || "Disponibile";
  document.getElementById("campoGenitore").value = g.genitore || "";
  document.getElementById("campoContatto").value = g.contatto || "";
  document.getElementById("campoNote").value = g.note || "";

  fotoBase64Corrente = g.foto || "";
  previewFoto.src = fotoBase64Corrente || "https://via.placeholder.com/120?text=Foto";
  inputFoto.value = "";

  btnEliminaGiocatore.style.display = "inline-block";
  overlayGiocatore.classList.add("attivo");
}

function apriNuovoGiocatore() {
  idGiocatoreCorrente = null;
  modaleTitolo.textContent = "Nuovo portiere";

  document.getElementById("campoNome").value = "";
  document.getElementById("campoNumero").value = "";
  document.getElementById("campoDataNascita").value = "";
  document.getElementById("campoCategoria").value = "";
  document.getElementById("campoStato").value = "Disponibile";
  document.getElementById("campoGenitore").value = "";
  document.getElementById("campoContatto").value = "";
  document.getElementById("campoNote").value = "";

  fotoBase64Corrente = "";
  previewFoto.src = "https://via.placeholder.com/120?text=Foto";
  inputFoto.value = "";

  btnEliminaGiocatore.style.display = "none";
  overlayGiocatore.classList.add("attivo");
}

function chiudiModale() {
  overlayGiocatore.classList.remove("attivo");
  idGiocatoreCorrente = null;
}

inputFoto.addEventListener("change", () => {
  const file = inputFoto.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxLato = 300;
      let { width, height } = img;
      if (width > height && width > maxLato) {
        height = Math.round(height * (maxLato / width));
        width = maxLato;
      } else if (height > maxLato) {
        width = Math.round(width * (maxLato / height));
        height = maxLato;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      fotoBase64Corrente = canvas.toDataURL("image/jpeg", 0.7);
      previewFoto.src = fotoBase64Corrente;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

async function salvaGiocatore() {
  const dati = {
    nome: document.getElementById("campoNome").value.trim(),
    numero: document.getElementById("campoNumero").value.trim(),
    dataNascita: document.getElementById("campoDataNascita").value,
    categoria: document.getElementById("campoCategoria").value.trim(),
    stato: document.getElementById("campoStato").value,
    genitore: document.getElementById("campoGenitore").value.trim(),
    contatto: document.getElementById("campoContatto").value.trim(),
    note: document.getElementById("campoNote").value.trim(),
    foto: fotoBase64Corrente
  };

  if (!dati.nome) {
    alert("Il nome del portiere è obbligatorio.");
    return;
  }

  btnSalvaGiocatore.disabled = true;
  btnSalvaGiocatore.textContent = "Salvataggio...";

  try {
    if (idGiocatoreCorrente) {
      await update(ref(db, `portieri_giocatori/${idGiocatoreCorrente}`), dati);
      giocatoriCache[idGiocatoreCorrente] = dati;
    } else {
      const nuovoRef = push(ref(db, "portieri_giocatori"));
      await set(nuovoRef, dati);
      giocatoriCache[nuovoRef.key] = dati;
    }
    renderLista();
    chiudiModale();
  } catch (err) {
    alert("Errore nel salvataggio: " + err.message);
  } finally {
    btnSalvaGiocatore.disabled = false;
    btnSalvaGiocatore.textContent = "Salva";
  }
}

async function eliminaGiocatore() {
  if (!idGiocatoreCorrente) return;
  const nome = giocatoriCache[idGiocatoreCorrente]?.nome || "questo portiere";
  if (!confirm(`Sei sicuro di voler eliminare ${nome}? L'operazione è irreversibile.`)) return;

  try {
    await remove(ref(db, `portieri_giocatori/${idGiocatoreCorrente}`));
    delete giocatoriCache[idGiocatoreCorrente];
    renderLista();
    chiudiModale();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

btnNuovoGiocatore.addEventListener("click", apriNuovoGiocatore);
btnAnnullaGiocatore.addEventListener("click", chiudiModale);
btnSalvaGiocatore.addEventListener("click", salvaGiocatore);
btnEliminaGiocatore.addEventListener("click", eliminaGiocatore);
overlayGiocatore.addEventListener("click", (e) => {
  if (e.target === overlayGiocatore) chiudiModale();
});

caricaGiocatori();
