import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");

test("ogni zona mostra numero e percentuale sulla stessa riga", () => {
  const renderer = source.slice(
    source.indexOf("function renderDistributionGrid"),
    source.indexOf("function renderPlayerSecondTable")
  );
  assert.match(renderer, /main\.textContent = zoneTotal \+ " - " \+ perc \+ "%"/);
  assert.doesNotMatch(renderer, /pallon[ei]/);
});
