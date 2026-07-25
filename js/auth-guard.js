import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

export function proteggiPagina() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "index.html";
      } else {
        resolve(user);
      }
    });
  });
}

export function collegaLogout() {
  const btn = document.getElementById("btnLogout");
  if (btn) {
    btn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  }
}
