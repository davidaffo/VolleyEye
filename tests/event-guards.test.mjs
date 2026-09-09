import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const counterFunctions = source.slice(
  source.indexOf("function getTimeoutCountForSet"),
  source.indexOf("function updateTeamCounters")
);
const undoFunction = source.slice(
  source.indexOf("function undoSubstitutionEvent"),
  source.indexOf("function applyAggColumnsVisibility")
);
const lineupSubstitutionFunction = source.slice(
  source.indexOf("function getLineupSubstitutions"),
  source.indexOf("function assignPlayerToLineup")
);
const state = {
  events: [],
  court: [],
  opponentCourt: [],
  liberos: [],
  opponentLiberos: []
};
const context = {
  state,
  getTeamScopeFromEvent: event => event && event.team === "opponent" ? "opponent" : "our",
  getCourtShape: court => court.map(slot => ({ main: slot.main || "", replaced: slot.replaced || "" })),
  cloneCourt: court => court.map(slot => ({ ...slot })),
  isLiberoForScope: () => false,
  ensureCourtShapeFor: court => court,
  saveState: () => {},
  renderPlayers: () => {},
  renderBenchChips: () => {},
  renderLineupChips: () => {},
  updateRotationDisplay: () => {}
};
context.commitCourtChange = court => {
  state.court = court;
};
context.commitCourtChangeForScope = (court, scope) => {
  if (scope === "opponent") state.opponentCourt = court;
};
vm.runInNewContext(`${counterFunctions}\n${undoFunction}\n${lineupSubstitutionFunction}`, context);
const plain = value => JSON.parse(JSON.stringify(value));

test("timeout e cambi importati con set stringa vengono contati nel set corretto", () => {
  state.events = [
    { actionType: "timeout", set: "2", code: "TO", team: "our" },
    { actionType: "timeout", set: "2", code: "TOA", team: "opponent" },
    { actionType: "substitution", set: "2", team: "our" },
    { actionType: "substitution", set: 2, team: "opponent" },
    { actionType: "substitution", set: 1, team: "our" }
  ];
  assert.equal(context.getTimeoutCountForSet(2), 1);
  assert.equal(context.getTimeoutOppCountForSet(2), 1);
  assert.equal(context.getSubstitutionCountForSet(2, "our"), 1);
  assert.equal(context.getSubstitutionCountForSet(2, "opponent"), 1);
});

test("annullare un cambio avversario modifica soltanto il campo avversario", () => {
  state.court = [{ main: "Casa", replaced: "" }];
  state.opponentCourt = [{ main: "Entrata", replaced: "" }, { main: "Altra", replaced: "" }];
  const ourBefore = plain(state.court);
  const result = context.undoSubstitutionEvent({
    actionType: "substitution",
    team: "opponent",
    playerIn: "Entrata",
    playerOut: "Uscita"
  });
  assert.equal(result, true);
  assert.deepEqual(plain(state.court), ourBefore);
  assert.equal(state.opponentCourt[0].main, "Uscita");
});

test("annullare un cambio della squadra di casa non modifica l'avversaria", () => {
  state.court = [{ main: "Entrata", replaced: "" }];
  state.opponentCourt = [{ main: "Ospite", replaced: "" }];
  const opponentBefore = plain(state.opponentCourt);
  assert.equal(
    context.undoSubstitutionEvent({ team: "our", playerIn: "Entrata", playerOut: "Uscita" }),
    true
  );
  assert.equal(state.court[0].main, "Uscita");
  assert.deepEqual(plain(state.opponentCourt), opponentBefore);
});

test("il rilevamento cambi usa i liberi del lato corretto", () => {
  state.liberos = ["Libero casa"];
  state.opponentLiberos = ["Libero ospite"];
  const previous = [{ main: "Titolare", replaced: "" }];

  assert.deepEqual(
    plain(context.getLineupSubstitutions(previous, [{ main: "Libero ospite", replaced: "" }], "opponent")),
    []
  );
  assert.deepEqual(
    plain(context.getLineupSubstitutions(previous, [{ main: "Libero ospite", replaced: "" }], "our")),
    [{ playerIn: "Libero ospite", playerOut: "Titolare" }]
  );
});
