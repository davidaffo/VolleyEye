import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = {};
context.self = context;
context.window = context;
vm.runInNewContext(
  readFileSync(new URL("../js/shared/namespace.js", import.meta.url), "utf8"),
  context
);
vm.runInNewContext(
  readFileSync(new URL("../js/shared/lineup-core.js", import.meta.url), "utf8"),
  context
);
vm.runInNewContext(
  readFileSync(new URL("../js/shared/auto-role.js", import.meta.url), "utf8"),
  context
);

const core = context.VolleyEye.lineup;
const plain = value => JSON.parse(JSON.stringify(value));
const court = (...names) =>
  Array.from({ length: 6 }, (_, index) => ({ main: names[index] || "", replaced: "" }));

test("ensureCourtShapeFor restituisce sempre sei slot indipendenti", () => {
  const shaped = core.ensureCourtShapeFor([{ main: "A" }]);
  assert.equal(shaped.length, 6);
  shaped[0].main = "X";
  assert.equal(shaped[1].main, "");
});

test("cloneCourtLineup non condivide riferimenti con l'originale", () => {
  const original = court("A", "B", "C", "D", "E", "F");
  const cloned = core.cloneCourtLineup(original);
  cloned[0].main = "X";
  assert.equal(original[0].main, "A");
});

test("un giocatore spostato compare in un solo slot", () => {
  const next = core.setPlayerOnCourt({ court: court("A", "B"), posIdx: 1, playerName: "A" });
  assert.deepEqual(plain(next.slice(0, 2)), [
    { main: "", replaced: "" },
    { main: "A", replaced: "" }
  ]);
});

test("un libero conserva il giocatore che sostituisce", () => {
  const next = core.setPlayerOnCourt({
    court: court("A", "B"),
    posIdx: 0,
    playerName: "L",
    liberos: ["L"]
  });
  assert.deepEqual(plain(next[0]), { main: "L", replaced: "A" });
});

test("spostare un libero ripristina il giocatore nel vecchio slot", () => {
  const source = court("L", "B");
  source[0].replaced = "A";
  const next = core.setPlayerOnCourt({ court: source, posIdx: 1, playerName: "L", liberos: ["L"] });
  assert.deepEqual(plain(next.slice(0, 2)), [
    { main: "A", replaced: "" },
    { main: "L", replaced: "B" }
  ]);
});

test("rimuovere un libero ripristina automaticamente il sostituito", () => {
  const source = court("L");
  source[0].replaced = "A";
  const next = core.clearCourtSlot({ court: source, posIdx: 0, liberos: ["L"] });
  assert.deepEqual(plain(next[0]), { main: "A", replaced: "" });
});

test("indici di scambio non validi non deformano il campo", () => {
  const source = court("A", "B", "C", "D", "E", "F");
  for (const pair of [[-1, 2], [0, 6], [undefined, 1], [1.5, 2]]) {
    const next = core.swapCourtSlots({ court: source, fromIdx: pair[0], toIdx: pair[1] });
    assert.equal(next.length, 6);
    assert.deepEqual(plain(next), source);
  }
});

test("lo scambio valido mantiene tutti e sei i giocatori", () => {
  const next = core.swapCourtSlots({
    court: court("A", "B", "C", "D", "E", "F"),
    fromIdx: 0,
    toIdx: 5
  });
  assert.deepEqual(plain(next.map(slot => slot.main)), ["F", "B", "C", "D", "E", "A"]);
});

test("auto-role limita la rotazione all'intervallo 1-6", () => {
  const autoRole = context.VolleyEye.autoRole.createAutoRole({});
  const base = court("A", "B", "C", "D", "E", "F");
  const low = autoRole.buildAutoRolePermutation({ baseLineup: base, rotation: -20, phase: "receive" });
  const high = autoRole.buildAutoRolePermutation({ baseLineup: base, rotation: 99, phase: "receive" });
  assert.equal(low.length, 6);
  assert.equal(high.length, 6);
  assert.deepEqual(plain(low.map(item => item.slot.main).sort()), ["A", "B", "C", "D", "E", "F"]);
  assert.deepEqual(plain(high.map(item => item.slot.main).sort()), ["A", "B", "C", "D", "E", "F"]);
});

test("auto-role accetta configurazione omessa, array front-row e rotazioni serializzate", () => {
  assert.doesNotThrow(() => context.VolleyEye.autoRole.createAutoRole());
  const autoRole = context.VolleyEye.autoRole.createAutoRole({ frontRowIndexes: [1, 2, 3] });
  const next = autoRole.buildAutoRolePermutation({
    baseLineup: court("A", "B", "C", "D", "E", "F"),
    rotation: "1",
    phase: "receive",
    autoRoleP1American: true
  });
  assert.equal(next.length, 6);
  assert.deepEqual(plain(next.map(item => item.slot.main).sort()), ["A", "B", "C", "D", "E", "F"]);
});

test("auto-role non muta la formazione di partenza", () => {
  const autoRole = context.VolleyEye.autoRole.createAutoRole({});
  const base = court("A", "B", "C", "D", "E", "F");
  const before = plain(base);
  autoRole.applyPhasePermutation({ lineup: base, rotation: 4, phase: "attack", isServing: true });
  assert.deepEqual(base, before);
});

test("un libero permutato in prima linea viene scambiato col sostituito", () => {
  const autoRole = context.VolleyEye.autoRole.createAutoRole({});
  const base = court("A", "L", "C", "D", "E", "F");
  base[1].replaced = "B";
  const next = autoRole.applyPhasePermutation({
    lineup: base,
    rotation: 1,
    phase: "attack",
    isServing: false,
    liberos: ["L"]
  });
  const liberoSlot = next.find(slot => slot.main === "B" && slot.replaced === "L");
  assert.ok(liberoSlot);
});
