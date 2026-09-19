import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";

const source = readScoutSource();

test("ogni zona mostra numero e percentuale sulla stessa riga", () => {
  const renderer = source.slice(
    source.indexOf("function renderDistributionGrid"),
    source.indexOf("function renderPlayerSecondTable")
  );
  assert.match(renderer, /main\.textContent = zoneTotal \+ " - " \+ perc \+ "%"/);
  assert.doesNotMatch(renderer, /pallon[ei]/);
});
