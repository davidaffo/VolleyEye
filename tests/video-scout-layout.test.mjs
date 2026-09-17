import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const relocateSource = source.slice(
  source.indexOf("function relocateVideoScoutContainer"),
  source.indexOf("function updateVideoScoutModeLayout")
);

test("in doppia squadra il video scout è il primo elemento della colonna destra", () => {
  assert.match(
    relocateSource,
    /logSection\.insertBefore\(elVideoScoutContainer, logSection\.firstChild\)/
  );
  assert.doesNotMatch(relocateSource, /events-log-summary/);
});

test("uscendo dalla doppia squadra il video torna nella posizione originale", () => {
  assert.match(relocateSource, /videoScoutHomeParent\.insertBefore/);
  assert.match(relocateSource, /videoScoutHomeParent\.appendChild/);
});
