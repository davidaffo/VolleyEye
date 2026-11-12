export async function showStartupProgress(message) {
  const status = document.getElementById("startup-status");
  if (!status) return;
  status.textContent = message;
  // Let the browser paint the message before preparing the archive and views.
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export function completeStartupScreen() {
  const root = document.getElementById("root");
  root?.removeAttribute("inert");
  root?.removeAttribute("aria-busy");
  document.getElementById("startup-screen")?.remove();
}

export function failStartupScreen() {
  const status = document.getElementById("startup-status");
  if (!status) return;
  status.setAttribute("role", "alert");
  status.textContent = "Impossibile avviare VolleyEye. Riprova a caricare il programma.";
  document.querySelector(".startup-screen__spinner")?.setAttribute("hidden", "");
  const retry = document.getElementById("startup-retry");
  if (retry) {
    retry.hidden = false;
    retry.addEventListener("click", () => window.location.reload(), { once: true });
    retry.focus();
  }
}
