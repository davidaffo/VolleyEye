import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { showStartupProgress, completeStartupScreen, failStartupScreen } from "../src/app/startup-screen.js";

test("la splash precede i moduli, blocca i controlli e lascia dipingere gli aggiornamenti", async () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const dom = new JSDOM(html);
  const previousDocument = globalThis.document, previousFrame = globalThis.requestAnimationFrame;
  try {
    globalThis.document = dom.window.document;
    let paint;
    globalThis.requestAnimationFrame = callback => { paint = callback; };
    assert.ok(document.getElementById("root").hasAttribute("inert"));
    assert.ok(html.indexOf('id="startup-screen"') < html.indexOf('src="/src/main.jsx"'));
    let resolved = false;
    const progress = showStartupProgress("Preparazione demo…").then(() => { resolved = true; });
    assert.equal(document.getElementById("startup-status").textContent, "Preparazione demo…");
    assert.equal(resolved, false);
    paint();
    await progress;
    completeStartupScreen();
    assert.equal(document.getElementById("startup-screen"), null);
    assert.equal(document.getElementById("root").hasAttribute("inert"), false);
    assert.equal(document.getElementById("root").hasAttribute("aria-busy"), false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousFrame;
    dom.window.close();
  }
});

test("un avvio fallito mostra il pulsante per riprovare e mantiene l'app inattiva", () => {
  const dom = new JSDOM(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
  const previousDocument = globalThis.document;
  try {
    globalThis.document = dom.window.document;
    failStartupScreen();
    assert.equal(document.getElementById("startup-status").getAttribute("role"), "alert");
    assert.match(document.getElementById("startup-status").textContent, /Impossibile avviare/);
    assert.equal(document.getElementById("startup-retry").hidden, false);
    assert.equal(document.activeElement.id, "startup-retry");
    assert.ok(document.querySelector(".startup-screen__spinner").hasAttribute("hidden"));
    assert.ok(document.getElementById("root").hasAttribute("inert"));
  } finally {
    globalThis.document = previousDocument;
    dom.window.close();
  }
});
