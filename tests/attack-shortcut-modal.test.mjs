import { readAppHtml } from './helpers/app-html.mjs';
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const source = readScoutSource();
const actions = readFileSync(new URL("../src/components/AppActions.jsx", import.meta.url), "utf8");
const html = readAppHtml();
const css = readStyleSource();

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
  for (const command of ["toggleBaseModal", "toggleAttackSetterModal", "toggleAttackTypeModal", "toggleBlockNumberModal"]) assert.ok(actions.includes(command));
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
