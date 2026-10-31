import { featureSource } from "./helpers/feature-source.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const flow = featureSource("src/features/live/flow-model.js");
const undoSource = featureSource(["src/features/events/history-model.js", "src/features/events/history-commands.js"]);
const skills = ["serve", "pass", "second", "attack", "block", "defense", "freeball"].map(id => ({ id }));

function setup(useOpponentTeam, cloneData) {
  const context = {
    state: { events: [], stats: {}, predictiveSkillFlow: true, useOpponentTeam, isServing: true, rotation: 1 },
    window: cloneData ? { VolleyEye: { stateIsolation: { cloneData } } } : {},
    SKILLS: skills,
    selectedSkillPerPlayer: {},
    getEnabledSkills: () => skills,
    isSkillEnabled: () => true,
    isSkillEnabledForScope: () => true,
    getTeamScopeFromEvent: event => event.team || "our",
    getOppositeScope: scope => scope === "our" ? "opponent" : "our",
    getPointDirection: () => null,
    alert: message => assert.fail(message)
  };
  for (const name of ["saveState", "recalcAllStatsAndUpdateUI", "renderEventsLog", "renderPlayers",
    "renderLiberoChipsInline", "renderLineupChips", "updateRotationDisplay", "renderLiveScore",
    "updateSetScoreDisplays", "renderLiberoBench", "publishRuntimeView", "recomputeServeFlagsFromHistory"]) context[name] = () => {};
  vm.runInNewContext(flow + undoSource, context);
  return context;
}

for (const snapshots of [false, true]) {
  for (const dual of [false, true]) {
    test(`annullamenti consecutivi riallineano il flusso fino alla battuta (${dual ? "doppia" : "singola"}, ${snapshots ? "snapshot" : "storico ricaricato"})`, () => {
      const c = setup(dual, structuredClone);
      const sequence = dual
        ? [["our", "serve"], ["opponent", "pass"], ["opponent", "second"], ["opponent", "attack"], ["our", "defense"]]
        : [["our", "serve"], ["our", "defense"], ["our", "second"], ["our", "attack"], ["our", "defense"]];
      const expected = [];
      const prediction = () => dual
        ? JSON.stringify(c.getAutoFlowState())
        : c.getPredictedSkillIdSingle();
      sequence.forEach(([team, skillId], index) => {
        expected.push(prediction());
        const snapshot = c.captureScoutActionSnapshot();
        const event = { team, skillId, code: "+", playerIdx: 0 };
        c.state.events.push(snapshots ? c.attachScoutActionSnapshot(event, snapshot) : event);
        if (snapshots) c.state.rotation = index + 2;
      });
      // Simula la forzatura rimasta sulla difesa durante lo scout.
      c.state.skillFlowOverride = "defense";
      c.state.opponentSkillFlowOverride = "defense";
      c.state.forceSkillActive = true;
      c.state.forceSkillScope = "our";
      while (c.state.events.length) {
        const length = c.state.events.length;
        c.undoLastEvent();
        assert.equal(c.state.events.length, length - 1);
        assert.equal(prediction(), expected[length - 1]);
        if (snapshots) {
          assert.equal(c.state.rotation, length);
          for (const event of c.state.events) assert.ok(event.__undoSnapshot);
        }
      }
      assert.equal(c.state.forceSkillActive, false);
      assert.equal(c.state.skillFlowOverride, null);
      assert.equal(c.state.opponentSkillFlowOverride, null);
    });
  }
}

test("le ricevute sono persistenti e non contengono copie dello storico", () => {
  const c = setup(false);
  for (const skillId of ["serve", "defense", "second"]) {
    const before = c.captureScoutActionSnapshot();
    c.state.events.push(c.attachScoutActionSnapshot({ skillId, code: "+" }, before));
  }
  assert.equal(c.state.events[2].undoState.events, undefined);
  assert.equal(c.state.events[2].undoState.before.events, undefined);
  c.state = JSON.parse(JSON.stringify(c.state));
  assert.ok(c.state.events.every(event => event.undoState.version === 1));
  assert.equal(JSON.stringify(c.state).includes("__undoSnapshot"), false);
  c.undoLastEvent();
  c.undoLastEvent();
  c.undoLastEvent();
  assert.equal(c.getPredictedSkillIdSingle(), "serve");
});

test("annullare uno storico ricaricato elimina ricezione e freeball transitorie obsolete", () => {
  const c = setup(true);
  c.state.events = [{ skillId: "serve", code: "+" }];
  c.state.pendingServe = { scope: "our", playerName: "Server" };
  c.state.freeballPending = true;
  c.state.freeballPendingScope = "opponent";
  c.undoLastEvent();
  assert.equal(c.state.pendingServe, null);
  assert.equal(c.state.freeballPending, false);
  assert.equal(c.getAutoFlowState().skillId, "serve");
});
