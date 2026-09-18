import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const roster = readFileSync(new URL("../js/roster-lineup.js", import.meta.url), "utf8");
const start = roster.indexOf("function pauseAndPersistCurrentMatch");
const end = roster.indexOf("function createNewMatchFromPrompt", start);
assert.ok(start >= 0 && end > start, "ciclo di pausa e salvataggio match non trovato");
const lifecycleSource = roster.slice(start, end);

function buildContext({ persistResult = true } = {}) {
  const state = {
    loadedMatchName: "Match corrente",
    selectedMatch: "Match corrente",
    savedMatches: { "Match corrente": { old: true } },
    events: [{ eventId: 1 }],
    matchFinished: false,
    skillClock: { paused: false },
    videoClock: { paused: false }
  };
  const observed = [];
  const context = {
    state,
    Array,
    cloneIsolationData: value => JSON.parse(JSON.stringify(value)),
    snapshotSkillClock: () => ({ ...state.skillClock }),
    snapshotVideoClock: () => ({ ...state.videoClock }),
    pauseSkillClock: () => { state.skillClock.paused = true; },
    pauseVideoClock: () => { state.videoClock.paused = true; },
    restoreSkillClock: snapshot => { state.skillClock = { ...snapshot }; },
    restoreVideoClock: snapshot => { state.videoClock = { ...snapshot }; },
    updateMatchStatusUI: () => {},
    persistCurrentMatch: options => {
      observed.push({
        options,
        finished: state.matchFinished,
        skillPaused: state.skillClock.paused,
        videoPaused: state.videoClock.paused
      });
      state.savedMatches["Match corrente"] = { paused: true };
      return persistResult;
    }
  };
  vm.runInNewContext(lifecycleSource, context);
  return { context, state, observed };
}

test("prima di creare un match quello corrente viene messo in pausa e salvato", () => {
  const { context, state, observed } = buildContext();
  assert.equal(context.pauseAndPersistCurrentMatch(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(observed)), [{
    options: { allowCreate: true },
    finished: true,
    skillPaused: true,
    videoPaused: true
  }]);
  assert.equal(state.matchFinished, true);
});

test("un errore di salvataggio annulla la pausa e conserva il match corrente", () => {
  const { context, state } = buildContext({ persistResult: false });
  assert.equal(context.pauseAndPersistCurrentMatch(), false);
  assert.equal(state.matchFinished, false);
  assert.equal(state.skillClock.paused, false);
  assert.equal(state.videoClock.paused, false);
  assert.deepEqual(state.savedMatches, { "Match corrente": { old: true } });
});

test("la creazione non descrive più il cambio match come un reset distruttivo", () => {
  const createSource = roster.slice(
    roster.indexOf("function createNewMatchFromPrompt"),
    roster.indexOf("function deleteSelectedMatch")
  );
  assert.match(createSource, /messo in pausa e salvato in archivio/);
  assert.match(createSource, /if \(!isLoadingMatch && !pauseAndPersistCurrentMatch\(\)\)/);
  assert.doesNotMatch(createSource, /dati correnti verranno azzerati/);
});

test("due match con gli stessi dati ricevono chiavi di archivio diverse", () => {
  const uniqueStart = roster.indexOf("function makeUniqueMatchName");
  const uniqueEnd = roster.indexOf("function generateMatchName", uniqueStart);
  assert.ok(uniqueStart >= 0 && uniqueEnd > uniqueStart, "generatore univoco match non trovato");
  const uniqueContext = { Set };
  vm.runInNewContext(`${roster.slice(uniqueStart, uniqueEnd)}; this.makeUnique = makeUniqueMatchName;`, uniqueContext);
  const base = "09/18/2026 - Volley Blu - Volley Rossa - Amichevole";
  assert.equal(uniqueContext.makeUnique(base, []), base);
  assert.equal(uniqueContext.makeUnique(base, [base]), `${base} (2)`);
  assert.equal(uniqueContext.makeUnique(base, [base, `${base} (2)`]), `${base} (3)`);
});

test("ogni percorso di creazione usa il generatore univoco", () => {
  const createSource = roster.slice(
    roster.indexOf("function loadSelectedMatch"),
    roster.indexOf("function deleteSelectedMatch")
  );
  assert.equal((createSource.match(/generateMatchName\(\)/g) || []).length, 2);
  const generatorSource = roster.slice(
    roster.indexOf("function generateMatchName"),
    roster.indexOf("function persistCurrentMatch")
  );
  assert.match(generatorSource, /makeUniqueMatchName\s*\(/);
  assert.match(generatorSource, /listMatchesFromStorage\s*\(\)/);
});
