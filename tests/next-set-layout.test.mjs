import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const css = readStyleSource();
const scout = readScoutSource();

test("la preparazione del set non viene centrata fuori dal contenitore", () => {
  const overlay = css.slice(
    css.indexOf(".next-set-inline {"),
    css.indexOf(".next-set-inline.hidden")
  );
  const card = css.slice(
    css.indexOf(".next-set-inline__card {"),
    css.indexOf(".next-set-inline__head")
  );
  assert.match(overlay, /align-items:\s*flex-start/);
  assert.match(overlay, /overflow-y:\s*auto/);
  assert.match(card, /max-height:\s*100%/);
  assert.match(card, /overflow-y:\s*auto/);
});

test("in doppia squadra le formazioni si affiancano quando c'è spazio", () => {
  assert.match(
    css,
    /\.next-set-lineups\.next-set-lineups--double\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit/
  );
  const openModal = scout.slice(
    scout.indexOf("function openNextSetModal"),
    scout.indexOf("function closeNextSetModal")
  );
  assert.match(openModal, /next-set-lineups--double/);
  assert.match(openModal, /!!state\.useOpponentTeam/);
  assert.match(openModal, /elNextSetBlockOpp\.classList\.toggle\("hidden", !state\.useOpponentTeam\)/);
});
