import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const viewer = readFileSync(new URL("../docs/markdown-viewer.html", import.meta.url), "utf8");
const manual = readFileSync(new URL("../docs/manual.md", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("il viewer usa marked con supporto GFM anziché un parser Markdown artigianale", () => {
  assert.match(viewer, /marked\/lib\/marked\.umd\.js/);
  assert.match(viewer, /window\.marked\.parse\(md, \{ gfm: true, breaks: false \}\)/);
  assert.match(viewer, /querySelectorAll\("table"\)/);
  assert.doesNotMatch(viewer, /function applyInlineMarkdown/);
});

test("manuale, viewer e parser sono disponibili anche offline", () => {
  assert.match(serviceWorker, /\.\/docs\/manual\.md/);
  assert.match(serviceWorker, /\.\/docs\/markdown-viewer\.html/);
  assert.match(serviceWorker, /\.\/node_modules\/marked\/lib\/marked\.umd\.js/);
});

test("la tabella dei voti ha le righe vuote richieste dal Markdown", () => {
  assert.ok(manual.includes("manuale di riferimento.\n\n| Fondamentale |"));
  assert.ok(manual.includes("| Difesa non tenuta. |\n\nI significati"));
});

test("le descrizioni dei voti provengono dal manuale di riferimento", () => {
  assert.ok(manual.includes("Battuta che limita anche una sola delle tre soluzioni d'attacco."));
  assert.ok(manual.includes("Ricezione che permette tutte le soluzioni di veloce e relative sovrapposizioni."));
  assert.ok(manual.includes("Attacco giocato sul muro per permettere di rigiocare con un'altra azione di attacco."));
  assert.ok(manual.includes("Non contemplato. Conduce ad una difesa della squadra a muro."));
  assert.ok(manual.includes("Difesa su palla difficile che consente alla squadra di contrattaccare."));
  assert.ok(manual.includes("Alzata che causa un punto diretto per gli avversari."));
});
