import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const lifecycle = readFileSync(new URL("../js/scout/core/app-lifecycle.js", import.meta.url), "utf8");
const source = lifecycle.slice(
  lifecycle.indexOf("function captureScoutActionSnapshot"),
  lifecycle.indexOf("function deleteEventByKey")
);

function setup(events, currentSet = 1) {
  const alerts = [];
  const context = {
    state: { events, currentSet, stats: {} },
    window: {},
    alert: message => alerts.push(message)
  };
  for (const name of [
    "saveState", "recalcAllStatsAndUpdateUI", "renderEventsLog", "renderPlayers",
    "renderLiberoChipsInline", "renderLineupChips",
    "updateRotationDisplay", "renderLiveScore", "updateSetScoreDisplays",
    "recomputeServeFlagsFromHistory", "resetSetTypeState"
  ]) context[name] = () => {};
  vm.runInNewContext(source, context);
  return { context, alerts };
}

test("contesa annulla fino alla battuta inclusa lasciando l’azione precedente", () => {
  for (const team of ["our", "opponent"]) {
    const previous = [{ skillId: "serve", set: 1 }, { skillId: "attack", code: "#", set: 1 }];
    const { context, alerts } = setup([
      ...previous,
      { skillId: "serve", team, set: 1 },
      { skillId: "pass", set: 1 },
      { skillId: "second", set: 1 },
      { skillId: "attack", set: 1 }
    ]);
    context.undoContestedRally();
    assert.deepEqual(context.state.events, previous);
    assert.deepEqual(alerts, []);
  }
});

test("contesa usa gli snapshot di annulla per ripristinare punteggio, servizio e rotazione", () => {
  const { context } = setup([{ skillId: "attack", set: 1 }]);
  Object.assign(context.state, { score: 4, isServing: false, rotation: 2 });
  const beforeServe = context.captureScoutActionSnapshot();
  context.state.events.push(context.attachScoutActionSnapshot({ skillId: "serve", set: 1 }, beforeServe));
  const beforeAttack = context.captureScoutActionSnapshot();
  context.state.events.push(context.attachScoutActionSnapshot({ skillId: "attack", code: "#", set: 1 }, beforeAttack));
  Object.assign(context.state, { score: 5, isServing: true, rotation: 3 });
  context.undoContestedRally();
  assert.equal(context.state.events.length, 1);
  assert.equal(context.state.score, 4);
  assert.equal(context.state.isServing, false);
  assert.equal(context.state.rotation, 2);
});

test("contesa gestisce battuta derivata e ricezione annullate da un solo snapshot", () => {
  const { context } = setup([{ skillId: "attack", set: 1 }]);
  const before = context.captureScoutActionSnapshot();
  context.state.events.push({ skillId: "serve", derivedFromPassServe: true, set: 1 });
  context.state.events.push(context.attachScoutActionSnapshot({ skillId: "pass", set: 1 }, before));
  context.undoContestedRally();
  assert.equal(context.state.events.length, 1);
  assert.equal(context.state.events[0].skillId, "attack");
});

test("contesa senza battuta nel set corrente conserva lo storico", () => {
  for (const events of [
    [],
    [{ skillId: "pass", set: 2 }],
    [{ skillId: "serve", set: 1 }, { skillId: "pass", set: 2 }],
    [{ skillId: "serve", set: 2 }, { actionType: "set-change", set: 2 }]
  ]) {
    const before = [...events];
    const { context, alerts } = setup(events, 2);
    context.undoContestedRally();
    assert.deepEqual(context.state.events, before);
    assert.equal(alerts.length, 1);
  }
});

test("contesa annulla anche la sola battuta con set importato come stringa", () => {
  const { context } = setup([{ skillId: "serve", set: "2" }], 2);
  context.undoContestedRally();
  assert.equal(context.state.events.length, 0);
});

test("il tasto rosso Contesa precede Annulla ultimo sulla rete", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="btn-contesa" class="small danger net-action-btn"[^>]*>Contesa<\/button>\s*<button id="btn-undo"/);
  const bindings = readFileSync(new URL("../js/scout/core/bindings-data.js", import.meta.url), "utf8");
  assert.match(bindings, /elBtnContesa\.addEventListener\("click", undoContestedRally\)/);
});
