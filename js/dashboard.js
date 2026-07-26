import { proteggiPagina, collegaLogout } from "./auth-guard.js";
import { db, ref, get } from "./firebase-config.js";

await proteggiPagina();
collegaLogout();

const dataOggiEl = document.getElementById("dataOggi");
const ultimeNotizieDiv = document.getElementById("ultimeNotizie");
const prossimiAllenamentiDiv = document.getElementById("prossimiAllenamenti");
const prossimePartiteDiv = document.getElementById("prossimePartite");

function formattaData(dataStr) {
  if (!dataStr) return "-";
  const [anno, mese, giorno] = dataStr.split("-");
  return `${giorno}/${mese}/${anno}`;
}

function isoLocale(d) {
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, "0");
  const giorno = String(d.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

// Converte una data in formato "DD/MM/YYYY" (usata da news) in "YYYY-MM-DD"
function convertiDataItalianaISO(dataItaliana) {
  if (!dataItaliana) return "";
  const parti = dataItaliana.split("/");
  if (parti.length !== 3) return "";
  const [giorno, mese, anno] = parti;
  return `${anno}-${mese.padStart(2, "0")}-${giorno.padStart(2, "0")}`;
}

function mostraDataOggi() {
  const oggi = new Date();
  const formattata = oggi.toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  dataOggiEl.textContent = formattata;
}

async function caricaNotizie() {
  try {
    const snap = await get(ref(db, "portieri_news"));
    const newsObj = snap.exists() ? snap.val() : {};
    const ids = Object.keys(newsObj);

    if (ids.length === 0) {
      ultimeNotizieDiv.innerHTML = `<p style="color:var(--testo-chiaro);">Nessuna comunicazione pubblicata.</p>`;
      return;
    }

    ids.sort((a, b) => Number(newsObj[b].ts || 0) - Number(newsObj[a].ts || 0));

    ultimeNotizieDiv.innerHTML = ids.slice(0, 5).map(id => {
      const n = newsObj[id];
      const dataISO = convertiDataItalianaISO(n.data);
      return `
        <a class="mini-card" href="calendario.html?data=${dataISO}">
          <h3>📰 ${n.titolo || "Comunicazione"}</h3>
          <div class="mini-meta">${n.data || ""}${n.autore ? " · " + n.autore : ""}</div>
          ${n.body ? `<div class="mini-testo">${n.body}</div>` : ""}
        </a>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    ultimeNotizieDiv.innerHTML = `<p style="color:var(--rosso);">Errore: ${err.message}</p>`;
  }
}

async function caricaProssimiAllenamenti() {
  try {
    const snap = await get(ref(db, "portieri_trainings"));
    const trainings = snap.exists() ? snap.val() : {};

    const oggi = isoLocale(new Date());
    const ids = Object.keys(trainings)
      .filter(id => trainings[id].data >= oggi)
      .sort((a, b) => trainings[a].data.localeCompare(trainings[b].data))
      .slice(0, 5);

    if (ids.length === 0) {
      prossimiAllenamentiDiv.innerHTML = `<p style="color:var(--testo-chiaro);">Nessun allenamento futuro in programma.</p>`;
      return;
    }

    prossimiAllenamentiDiv.innerHTML = ids.map(id => {
      const t = trainings[id];
      return `
        <a class="mini-card" href="allenamenti.html?id=${id}">
          <h3>📋 ${t.titolo || "Allenamento"}</h3>
          <div class="mini-meta">📅 ${formattaData(t.data)}${t.ora ? " · ore " + t.ora : ""}${t.luogo ? " · 📍 " + t.luogo : ""}</div>
        </a>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    prossimiAllenamentiDiv.innerHTML = `<p style="color:var(--rosso);">Errore: ${err.message}</p>`;
  }
}

async function caricaProssimePartite() {
  try {
    const snap = await get(ref(db, "portieri_partite"));
    const partite = snap.exists() ? snap.val() : {};

    const oggi = isoLocale(new Date());
    const ids = Object.keys(partite)
      .filter(id => partite[id].data >= oggi)
      .sort((a, b) => partite[a].data.localeCompare(partite[b].data))
      .slice(0, 5);

    if (ids.length === 0) {
      prossimePartiteDiv.innerHTML = `<p style="color:var(--testo-chiaro);">Nessuna partita futura in programma.</p>`;
      return;
    }

    prossimePartiteDiv.innerHTML = ids.map(id => {
      const p = partite[id];
      return `
        <a class="mini-card" href="calendario.html?data=${p.data}">
          <h3>⚽ vs ${p.avversario || "?"}</h3>
          <div class="mini-meta">📅 ${formattaData(p.data)}${p.ora ? " · ore " + p.ora : ""}${p.campo ? " · 📍 " + p.campo : ""}</div>
        </a>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    prossimePartiteDiv.innerHTML = `<p style="color:var(--rosso);">Errore: ${err.message}</p>`;
  }
}

mostraDataOggi();
caricaNotizie();
caricaProssimiAllenamenti();
caricaProssimePartite();
