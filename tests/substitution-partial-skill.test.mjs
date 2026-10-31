import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

function load(c, source, names) {
  for (const name of names) {
    const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
    assert.ok(start >= 0, name);
    const tail = source.slice(start);
    const end = tail.slice(1).search(/^(?:async )?function /m);
    vm.runInContext(end < 0 ? tail : tail.slice(0, end + 1), c);
  }
}

function setup(scope) {
  const court = () => Array.from({ length: 6 }, (_, idx) => ({ main: `P${idx}`, replaced: "" }));
  const c = vm.createContext({
    state: { court: court(), opponentCourt: court(), events: [{ skillId: "second", code: "+" }], useOpponentTeam: true, predictiveSkillFlow: true, attackTrajectoryEnabled: true, opponentAttackTrajectoryEnabled: true, serveTrajectoryEnabled: true, opponentServeTrajectoryEnabled: true },
    partialSkillFlowVersions: { our: 0, opponent: 0 },
    selectedSkillPerPlayer: { [`${scope}:0`]: "attack" },
    serveMetaByPlayer: {}, attackMetaByPlayer: {}, blockConfirmByPlayer: {}, serveTypeSelectHandlers: {},
    attackInlinePlayer: null, serveTypeInlinePlayer: null, serveTypeFocusPlayer: null, blockInlinePlayer: null,
    serveTypeInlineHandler: null, activeSkillModalContext: null, trajectoryResolver: null,
    window: { removeEventListener() {} },
    makePlayerKey: (s, idx) => `${s}:${idx}`, isPlayerKeyInScope: (key, s) => key.startsWith(s + ":"),
    isErrorPickModeForScope: () => false,
    getCurrentZoneForPlayer: () => 4, isFarSideForScope: () => false, getServeBaseZoneForPlayer: () => 1,
    cleanCourtPlayers() {}, resetAutoRoleCache() {}, enforceAutoLiberoForState() {}, enforceAutoLiberoForScope() {},
    saveState() {}, renderLiberoBench() {}, renderPlayers() {}, renderOpponentPlayers() {}, renderLiberoChipsInline() {}, renderOpponentLiberoChipsInline() {}, renderLineupChips() {}, updateRotationDisplay() {}, updateOpponentRotationDisplay() {},
    ensureCourtShapeFor: value => value.map(slot => ({ ...slot }))
  });
  c.setSelectedSkillForScope = (s, idx) => { delete c.selectedSkillPerPlayer[`${s}:${idx}`]; };
  c.getTeamCourt = s => c.state[s === "our" ? "court" : "opponentCourt"];
  c.opened = 0;
  c.openAttackTrajectoryModal = () => {
    c.opened++;
    return new Promise(resolve => { c.trajectoryResolver = resolve; });
  };
  c.closeAttackTrajectoryModal = () => {
    const resolve = c.trajectoryResolver;
    c.trajectoryResolver = null;
    if (resolve) resolve(null);
  };
  load(c, readScoutSource(), ["setServeTypeFocusPlayer", "clearServeTypeInlineListener", "removeServeTypeInlineKeyListener", "clearAttackSelection", "resetSkillSelectionForPlayer", "cancelPartialSkillFlowForScope", "startAttackSelection", "startServeTypeSelection", "collectServeTrajectory"]);
  load(c, readRosterSource(), ["cancelPartialSkillFlowForCourtChange", "commitCourtChange", "commitCourtChangeForScope"]);
  return c;
}

test("un cambio annulla attacco e traiettoria di servizio senza riprendere le richieste in sospeso", async () => {
  for (const scope of ["our", "opponent"]) {
    for (const phase of ["attack", "serve-start", "serve-end"]) {
      const c = setup(scope);
      let completed = false;
      const pending = phase === "attack"
        ? c.startAttackSelection(0, "alta", () => { completed = true; }, scope)
        : c.startServeTypeSelection(0, "JF", () => { completed = true; }, scope);
      if (phase === "serve-end") {
        c.trajectoryResolver({ point: { x: 0.2, y: 0.4 } });
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(c.opened, 2);
      }
      const before = JSON.stringify(c.state.events);
      const next = c.getTeamCourt(scope).map(slot => ({ ...slot }));
      next[0].main = "Nuova";
      c.commitCourtChangeForScope(next, scope);
      await pending;
      assert.equal(completed, false);
      assert.equal(c.opened, phase === "serve-end" ? 2 : 1, "il servizio annullato non apre un'altra traiettoria");
      assert.equal(c.state.pendingServe, undefined);
      assert.equal(Object.keys(c.attackMetaByPlayer).length, 0);
      assert.equal(Object.keys(c.serveMetaByPlayer).length, 0);
      assert.equal(Object.keys(c.selectedSkillPerPlayer).length, 0);
      assert.equal(c.attackInlinePlayer, null);
      assert.equal(c.serveTypeInlinePlayer, null);
      assert.equal(c.state.skillFlowOverride, null);
      assert.equal(c.state.opponentSkillFlowOverride, null);
      assert.equal(JSON.stringify(c.state.events), before);
      assert.equal(c.getTeamCourt(scope)[0].main, "Nuova");
    }
  }
});

test("un cambio avversario annulla anche una battuta nostra già in attesa della ricezione", () => {
  const c = setup("our");
  c.state.pendingServe = { scope: "our", playerName: "P0", meta: { serveType: "JF" } };
  c.state.skillFlowOverride = "attack";
  c.state.forceSkillActive = true;
  c.state.forceSkillScope = "our";
  const next = c.getTeamCourt("opponent").map(slot => ({ ...slot }));
  next[0].main = "Nuova";
  c.commitCourtChangeForScope(next, "opponent");
  assert.equal(c.state.pendingServe, null);
  assert.equal(c.state.skillFlowOverride, null);
  assert.equal(c.state.forceSkillActive, false);
});

test("confermare la stessa formazione non annulla una selezione parziale", () => {
  const c = setup("our");
  c.commitCourtChangeForScope(c.state.court, "our");
  assert.equal(c.selectedSkillPerPlayer["our:0"], "attack");
  assert.equal(c.partialSkillFlowVersions.our, 0);
});
