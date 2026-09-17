import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

const modalIds = ["base-modal", "attack-type-modal", "attack-setter-modal", "block-number-modal"];

test("i popup dei dati retroattivi restano sopra l'overlay del campo", () => {
  modalIds.forEach(id => {
    assert.match(html, new RegExp(`id="${id}" class="[^"]*force-popup`));
  });
  assert.match(css, /\.skill-modal\.force-popup\s*\{\s*z-index:\s*3200\s*!important/);
  const forcedOpenCalls = source.match(/setGlobalModalState\(true, \{ forcePopup: true \}\)/g) || [];
  assert.ok(forcedOpenCalls.length >= 4);
});

test("i quattro pulsanti a rete usano un vero toggle", () => {
  assert.match(source, /elBtnAttackBase\.addEventListener\("click", toggleBaseModal\)/);
  assert.match(source, /elBtnAttackSetter\.addEventListener\("click", toggleAttackSetterModal\)/);
  assert.match(source, /elBtnAttackType\.addEventListener\("click", toggleAttackTypeModal\)/);
  assert.match(source, /elBtnBlockNumber\.addEventListener\("click", toggleBlockNumberModal\)/);
});

test("K A T N chiudono il rispettivo popup quando è già aperto", () => {
  assert.match(source, /e\.key === "k"[\s\S]*closeBaseModal\(\)/);
  assert.match(source, /e\.key === "a"[\s\S]*closeAttackSetterModal\(\)/);
  assert.match(source, /e\.key === "t"[\s\S]*closeAttackTypeModal\(\)/);
  assert.match(source, /e\.key === "n"[\s\S]*closeBlockNumberModal\(\)/);
});

test("l'applicazione dei dati chiude il popup anche se il rendering fallisce", () => {
  [
    "closeBaseModal",
    "closeAttackSetterModal",
    "closeAttackTypeModal",
    "closeBlockNumberModal"
  ].forEach(closeName => {
    assert.match(source, new RegExp(`finally \\{\\s*${closeName}\\(\\);`));
  });
});
