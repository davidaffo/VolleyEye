import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const source = readScoutSource();
const autoFlowSource = source.slice(
  source.indexOf("function getAutoFlowState"),
  source.indexOf("function getMobileActiveScope")
);
const predictedSource = source.slice(
  source.indexOf("function getPredictedSkillIdForScope"),
  source.indexOf("function getPredictedSkillId()")
);
const twoTeamFlowSource = source.slice(
  source.indexOf("function computeTwoTeamFlowFromEvent"),
  source.indexOf("function getLastFlowEvent")
);
const blockPromptSource = source.slice(
  source.indexOf("function shouldShowNetBlockPromptForScope"),
  source.indexOf("function getNetBlockPromptScope")
);

function makeContext(isServing, staleScope) {
  const state = {
    useOpponentTeam: true,
    predictiveSkillFlow: true,
    isServing,
    flowTeamScope: staleScope,
    events: [],
    pendingServe: null,
    skillFlowOverride: null,
    opponentSkillFlowOverride: null,
    freeballPending: false,
    opponentSkillConfig: {}
  };
  const context = {
    state,
    getLastFlowEvent: () => null,
    computeTwoTeamFlowFromEvent: () => {
      throw new Error("non deve essere consultato senza eventi");
    },
    resolveFlowSkillForScope: (_scope, skill) => skill,
    getFreeballStartSkill: () => "freeball",
    getOppositeScope: scope => scope === "our" ? "opponent" : "our",
    getEnabledSkillsForScope: () => [{ id: "serve" }],
    isSkillEnabledForScope: () => true
  };
  vm.runInNewContext(`${autoFlowSource}\n${predictedSource}`, context);
  return context;
}

test("un match nuovo ignora lo scope vecchio e parte dalla squadra in battuta", () => {
  const ourServe = makeContext(true, "opponent");
  assert.deepEqual(JSON.parse(JSON.stringify(ourServe.getAutoFlowState())), {
    teamScope: "our",
    skillId: "serve"
  });
  assert.equal(ourServe.getPredictedSkillIdForScope("our"), "serve");
  assert.equal(ourServe.getPredictedSkillIdForScope("opponent"), null);

  const opponentServe = makeContext(false, "our");
  assert.deepEqual(JSON.parse(JSON.stringify(opponentServe.getAutoFlowState())), {
    teamScope: "opponent",
    skillId: "serve"
  });
  assert.equal(opponentServe.getPredictedSkillIdForScope("opponent"), "serve");
  assert.equal(opponentServe.getPredictedSkillIdForScope("our"), null);
});

test("in doppia squadra lo slash d'attacco apre direttamente il muro avversario", () => {
  const context = {
    getTeamScopeFromEvent: event => event.teamScope,
    getOppositeScope: scope => scope === "our" ? "opponent" : "our",
    getPointDirection: () => null
  };
  vm.runInNewContext(twoTeamFlowSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.computeTwoTeamFlowFromEvent({
      teamScope: "our",
      skillId: "attack",
      code: "/"
    }))),
    { teamScope: "opponent", skillId: "block" }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.computeTwoTeamFlowFromEvent({
      teamScope: "opponent",
      skillId: "attack",
      code: "/"
    }))),
    { teamScope: "our", skillId: "block" }
  );
});

test("il muro previsto in doppia squadra non viene degradato a prompt sopra la difesa", () => {
  const context = {
    state: { useOpponentTeam: true, predictiveSkillFlow: true },
    isForcedBlockScope: () => false,
    getPredictedSkillIdForScope: () => "block",
    getPredictedSkillIdSingle: () => "defense",
    isSkillEnabledForScope: () => true
  };
  vm.runInNewContext(blockPromptSource, context);

  assert.equal(context.shouldShowNetBlockPromptForScope("our"), false);
  assert.equal(context.shouldShowNetBlockPromptForScope("opponent"), false);
});

test("la valutazione ! non è disponibile per il muro", () => {
  const globals = readFileSync(new URL("../js/globals.js", import.meta.url), "utf8");
  const roster = readRosterSource();
  const normalizeSource = roster.slice(
    roster.indexOf("function normalizeMetricConfig"),
    roster.indexOf("function sameCodeList")
  );
  const context = {
    RESULT_CODES: ["#", "+", "!", "-", "/", "="],
    allowedMetricCodes: new Set(["#", "+", "!", "-", "/", "="]),
    METRIC_DEFAULTS: {
      block: {
        positive: ["#", "+"],
        negative: ["/", "="],
        activeCodes: ["#", "+", "-", "/", "="],
        enabled: true
      },
      serve: { positive: ["#"], negative: ["="], activeCodes: ["#"], enabled: true }
    }
  };
  vm.runInNewContext(normalizeSource, context);

  const migrated = context.normalizeMetricConfig("block", {
    positive: ["#", "+"],
    negative: ["/", "="],
    activeCodes: ["#", "+", "!", "-", "/", "="],
    enabled: true
  });
  assert.deepEqual(Array.from(migrated.activeCodes), ["#", "+", "-", "/", "="]);
  assert.match(globals, /activeCodes: RESULT_CODES\.filter\(code => code !== "!"\)/);
  assert.doesNotMatch(
    source.slice(source.indexOf("function getAttackCodeFromBlockCode"), source.indexOf("function resolveFlowSkillForScope")),
    /"!"\s*:\s*"!"/
  );
});

test("l'avvio del set riallinea il flusso e cancella selezioni transitorie", () => {
  const applyStart = source.slice(
    source.indexOf("function applyNextSetDraft"),
    source.indexOf("function shouldOpenNextSetModal")
  );
  assert.match(applyStart, /state\.flowTeamScope = state\.isServing \? "our" : "opponent"/);
  assert.match(applyStart, /state\.pendingServe = null/);
  assert.match(applyStart, /cancelPartialSkillFlowForScope\("our"\)/);
  assert.match(applyStart, /cancelPartialSkillFlowForScope\("opponent"\)/);
});

test("il reset e il salvataggio conservano le premesse del flusso automatico", () => {
  const roster = readRosterSource();
  const reset = roster.slice(
    roster.indexOf("function resetMatchState"),
    roster.indexOf("function renameSelectedTeam")
  );
  assert.match(reset, /state\.flowTeamScope = preservedServing \? "our" : "opponent"/);
  assert.match(reset, /state\.pendingServe = null/);

  const exportPayload = source.slice(
    source.indexOf("function buildMatchExportPayload"),
    source.indexOf("function buildDatabaseBackupPayload")
  );
  assert.match(exportPayload, /predictiveSkillFlow: state\.predictiveSkillFlow !== false/);
  assert.match(exportPayload, /pendingServe: state\.pendingServe/);
});
