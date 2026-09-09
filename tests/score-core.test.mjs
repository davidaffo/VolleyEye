import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const valueHelper = source.slice(
  source.indexOf("function getEventPointValue"),
  source.indexOf("function isOpponentErrorPoint")
);
const summaryFunction = source.slice(
  source.indexOf("function computePointsSummary"),
  source.indexOf("function computeSetScores")
);
const context = {
  state: { useOpponentTeam: false, events: [] },
  getPointDirection: event => event.pointDirection || null,
  getPointDirectionForScope: event => event.pointDirection || null,
  isOpponentErrorPoint: event => event && event.code === "opp-error",
  getScoreOverrideTotals: () => ({ for: 0, against: 0 })
};
vm.runInNewContext(`${valueHelper}\n${summaryFunction}`, context);
const plain = value => JSON.parse(JSON.stringify(value));

test("il valore punto accetta numeri serializzati e respinge valori negativi o non numerici", () => {
  assert.equal(context.getEventPointValue({}), 1);
  assert.equal(context.getEventPointValue({ value: "2" }), 2);
  assert.equal(context.getEventPointValue({ value: -5 }), 0);
  assert.equal(context.getEventPointValue({ value: "errore" }), 1);
});

test("il riepilogo riconosce i numeri set importati come stringhe", () => {
  const events = [
    { set: "2", pointDirection: "for", value: 1, rotation: 3 },
    { set: 2, pointDirection: "against", value: "2", rotation: 3 },
    { set: 1, pointDirection: "for", value: 1, rotation: 1 }
  ];
  const summary = context.computePointsSummary(2, { events });
  assert.equal(summary.totalFor, 1);
  assert.equal(summary.totalAgainst, 2);
  assert.deepEqual(plain(summary.rotations[2]), {
    rotation: 3,
    for: 1,
    against: 2,
    delta: -1
  });
});

test("eventi corrotti non possono sottrarre punti dal totale", () => {
  const summary = context.computePointsSummary(1, {
    events: [
      { set: 1, pointDirection: "for", value: -10, rotation: 1 },
      { set: 1, pointDirection: "against", value: "non-numero", rotation: 99 }
    ]
  });
  assert.equal(summary.totalFor, 0);
  assert.equal(summary.totalAgainst, 1);
  assert.equal(summary.rotations[0].rotation, 1);
  assert.equal(summary.rotations[0].against, 1);
});
