import { dvwFixtureRoot } from './helpers/dvw-fixtures.mjs';
import { IDBFactory } from "fake-indexeddb";
import assert from "node:assert/strict";
import { readdirSync } from 'node:fs';
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import vm from "node:vm";
import { runtimeFiles, readRuntimeSource } from "./helpers/browser-runtime-files.mjs";

const dvwRoot = dvwFixtureRoot('resources/data volley');
const dvwFiles = [`${dvwRoot}/data volley example file.dvw`, ...readdirSync(`${dvwRoot}/files scout`).filter(file => file.endsWith('.dvw')).map(file => `${dvwRoot}/files scout/${file}`)];
dvwFiles.push(...readdirSync(dvwFixtureRoot('resources/data volley da volleyscout')).filter(file => file.endsWith('.dvw')).map(file => dvwFixtureRoot('resources/data volley da volleyscout') + '/' + file));
const rootUrl = new URL("../", import.meta.url);


function makeClassList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

function buildBrowserContext() {
  const body = { dataset: {}, classList: makeClassList(), style: {} };
  const documentElement = { dataset: {}, style: { setProperty() {} } };
  const document = {
    body,
    documentElement,
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() {
      return {
        classList: makeClassList(),
        dataset: {},
        style: {},
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
    }
  };
  const storage = {
    getItem(key) {
      return key === "volleyeye-default-demo-preference" ? "removed" : null;
    },
    setItem() {},
    removeItem() {},
    clear() {}
  };
  const context = {
    console,
    indexedDB: new IDBFactory(),
    document,
    localStorage: storage,
    sessionStorage: storage,
    navigator: {},
    location: { hostname: "localhost", protocol: "http:", href: "http://localhost/" },
    history: { replaceState() {} },
    URL,
    URLSearchParams,
    Blob,
    TextEncoder,
    TextDecoder,
    structuredClone,
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    requestAnimationFrame(callback) { return typeof callback === "function" ? 0 : 0; },
    cancelAnimationFrame() {},
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
    addEventListener() {},
    removeEventListener() {}
  };
  context.window = context;
  context.self = context;
  return vm.createContext(context);
}

test("il grafo dei moduli ES nativi completa il bootstrap", async () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => {
    const source = readRuntimeSource(path);
    assert.doesNotThrow(
      () => vm.runInContext(source, context, { filename: path }),
      `caricamento fallito in ${path}`
    );
  });
  await assert.doesNotReject(
    Promise.resolve(vm.runInContext("init()", context)),
    "il bootstrap modulare deve completarsi senza dipendenze locali mancanti"
  );
});

test("dopo il caricamento di un match il roster avversario aggiorna stato, numeri e panchina attivi", async () => {
  const context = buildBrowserContext();
  const saved = new Map();
  context.localStorage = {
    get length() { return saved.size; },
    key: index => Array.from(saved.keys())[index] ?? null,
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, String(value)),
    removeItem: key => saved.delete(key)
  };
  context.alert = message => assert.fail(message);
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
  await context.initializePersistentStorage();
  vm.runInContext(`
    const initialStateReference = state;
    applyImportedMatch({
      players: [], events: [], match: { teamName: "Casa", opponent: "Precedente" },
      useOpponentTeam: true, opponentPlayers: ["Precedente"],
      opponentPlayerNumbers: { Precedente: "99" }, opponentLiberos: []
    }, { silent: true });
    const visitingPlayers = Array.from({ length: 10 }, (_, i) => "Ospite " + (i + 1));
    const visitingNumbers = Object.fromEntries(visitingPlayers.map((name, i) => [name, String(i + 11)]));
    updateOpponentPlayersList(visitingPlayers, {
      playerNumbers: visitingNumbers, liberos: [visitingPlayers[9]], captains: [visitingPlayers[0]]
    });
    applyOpponentDefaultLineup(visitingPlayers.slice(0, 6), 1);
    globalThis.integrationResult = {
      sameState: state === initialStateReference,
      players: state.opponentPlayers,
      numbers: state.opponentPlayerNumbers,
      bench: getBenchForLineupWithRoster(state.opponentCourt, state.opponentPlayers, state.opponentLiberos, state.opponentPlayerNumbers),
      label: formatLineupModalName(visitingPlayers[0], { scope: "opponent" }),
      snapshot: buildCompactLocalStateSnapshot(state)
    };
  `, context);
  const result = JSON.parse(JSON.stringify(context.integrationResult));
  assert.equal(result.players.length, 10, "il roster avversario completo deve raggiungere il match attivo");
  assert.equal(result.sameState, true, "i manager devono mantenere il riferimento allo stato attivo");
  assert.equal(result.numbers["Ospite 1"], "11");
  assert.deepEqual(result.bench, ["Ospite 7", "Ospite 8", "Ospite 9"]);
  assert.match(result.label, /^11 - /);
  assert.equal(result.snapshot.opponentPlayers.length, 10);
  assert.equal(result.snapshot.opponentPlayerNumbers["Ospite 1"], "11");

  vm.runInContext(`
    applyImportedMatch(integrationResult.snapshot, { silent: true });
    handleOpponentNumberChange("Ospite 7", "27");
    globalThis.reopened = buildCompactLocalStateSnapshot(state);
  `, context);
  assert.equal(context.reopened.opponentPlayerNumbers["Ospite 7"], "27");
  assert.equal(context.integrationResult.snapshot.opponentPlayerNumbers["Ospite 7"], "17", "lo snapshot precedente deve restare isolato");

  // The live court has no bench: roster choices belong to the shared lineup modal.
  vm.runInContext(`
    lineupModalScope = "opponent";
    globalThis.benchNames = getBenchForLineupWithRoster(
      state.opponentCourt, getLineupModalPlayers(), getLineupModalLiberos(), getLineupModalNumbers()
    );
    globalThis.reserveLabel = formatLineupModalName("Ospite 7");
  `, context);
  assert.equal(context.benchNames.length, 3);
  assert.ok(context.benchNames.includes("Ospite 7"));
  assert.ok(context.reserveLabel.startsWith("27 - "));

  // Exercise the actual archive selection path used by the new-match dialog.
  context.document.getElementById = () => null;
  vm.runInContext(`
    const archiveTeam = (name, prefix) => ({
      version: 3, name,
      playersDetailed: Array.from({ length: 10 }, (_, i) => ({
        lastName: prefix + " " + (i + 1), firstName: "", number: String(i + 11),
        role: i === 9 ? "L" : "", out: false
      }))
    });
    saveTeamToStorage("Casa", archiveTeam("Casa", "Casa"));
    saveTeamToStorage("Ospiti", archiveTeam("Ospiti", "Ospite"));
    globalThis.created = createNewMatchFromSetup({ teamName: "Casa", mode: "double", opponentTeam: "Ospiti" });
    globalThis.createdSnapshot = buildCompactLocalStateSnapshot(state);
  `, context);
  assert.equal(context.created, true);
  assert.equal(context.createdSnapshot.opponentPlayers.length, 10);
  assert.equal(context.createdSnapshot.opponentPlayerNumbers["Ospite 7"], "17");
  assert.equal(context.createdSnapshot.opponentCourt.filter(slot => slot.main).length, 6);
  await vm.runInContext("archiveStorage.flush()", context);
});

test("gli stessi controlli del libero usano C per entrambe le squadre e conservano Nessuno esplicito", async () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
  await context.initializePersistentStorage();
  const selects = Object.fromEntries(["auto-libero-select", "auto-libero-select-settings", "auto-libero-select-opp"].map(id => [id, {
    value: "", listeners: {}, addEventListener(event, callback) { this.listeners[event] = callback; }
  }]));
  context.document.getElementById = id => selects[id] || null;
  vm.runInContext("bindScoutSettingsControls()", context);
  assert.equal(context.settingsStore.getSnapshot().values.autoLiberoRole, "C");
  assert.equal(context.settingsStore.getSnapshot().values.opponentAutoLiberoRole, "C");

  // Old snapshots did not record whether an empty role was a chosen preference.
  vm.runInContext(`
    applyImportedMatch({ players: [], events: [], match: {}, useOpponentTeam: true,
      autoLiberoRole: "", opponentAutoLiberoRole: ""
    }, { silent: true });
  `, context);
  assert.equal(context.settingsStore.getSnapshot().values.autoLiberoRole, "C");
  assert.equal(context.settingsStore.getSnapshot().values.opponentAutoLiberoRole, "C");

  for (const [scope, id] of [["our", "auto-libero-select"], ["opponent", "auto-libero-select-opp"]]) {
    selects[id].value = "";
    context.setAutoLiberoRole("", scope);
    assert.equal(vm.runInContext(`getTeamAutoLiberoRole("${scope}")`, context), "");
    assert.equal(vm.runInContext(`getTeamAutoLiberoBackline("${scope}")`, context), false);
    if (scope === "our") {
      assert.equal(context.settingsStore.getSnapshot().values.autoLiberoRole, "");
      assert.equal(context.settingsStore.getSnapshot().values.opponentAutoLiberoRole, "C");
    }
  }
  vm.runInContext(`
    const liberoSnapshot = buildCompactLocalStateSnapshot(state);
    setAutoLiberoRole("C", "our");
    setAutoLiberoRole("C", "opponent");
    applyImportedMatch(liberoSnapshot, { silent: true });
  `, context);
  assert.equal(context.settingsStore.getSnapshot().values.autoLiberoRole, "");
  assert.equal(context.settingsStore.getSnapshot().values.opponentAutoLiberoRole, "");
  for (const id of ["auto-libero-select-settings", "auto-libero-select-opp"]) {
    selects[id].value = "C";
    context.setAutoLiberoRole("C", id.endsWith("-opp") ? "opponent" : "our");
  }
  assert.equal(context.settingsStore.getSnapshot().values.autoLiberoRole, "C");
  assert.equal(context.settingsStore.getSnapshot().values.opponentAutoLiberoRole, "C");
  assert.equal(vm.runInContext('getTeamAutoLiberoBackline("our") && getTeamAutoLiberoBackline("opponent")', context), true);
  await vm.runInContext("archiveStorage.flush()", context);
});

test("tutti i file DVW vengono importati cumulativamente in IndexedDB con localStorage leggero", async () => {
  const context = buildBrowserContext();
  const saved = new Map();
  context.localStorage = {
    get length() { return saved.size; },
    key: index => Array.from(saved.keys())[index] ?? null,
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => {
      const size = Array.from(saved).reduce((total, [k, v]) => total + (k === key ? 0 : k.length + v.length), 0) + key.length + String(value).length;
      if (size > 5 * 1024 * 1024 / 2) {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      saved.set(key, String(value));
    },
    removeItem: key => saved.delete(key)
  };
  context.alert = message => assert.fail(message);
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
  await context.initializePersistentStorage();
  for (const file of dvwFiles) {
    context.importText = readRuntimeSource(file);
    await assert.doesNotReject(() => vm.runInContext(`(async () => {
      var imported = parseDataVolleyDvwToMatchState(importText);
      var archiveResult = await importMatchStateAsNew(imported, { silent: true });
      var reopened = loadMatchFromStorage(archiveResult.name);
      globalThis.roundTripEvents = reopened.state.events;
      globalThis.imported = imported;
      await archiveStorage.flush();
    })()`, context), file);
    assert.deepEqual(JSON.parse(JSON.stringify(context.roundTripEvents)), JSON.parse(JSON.stringify(context.imported.events)), file);
    assert.ok([...saved.values()].reduce((size, raw) => size + raw.length, 0) < 10000, 'localStorage deve contenere solo stato leggero');
  }
  // Open a saved match, persist an edit, then simulate a new browser runtime.
  vm.runInContext(`
    var lastName = listMatchesFromStorage().at(-1);
    applyImportedMatch(loadMatchFromStorage(lastName).state, { silent: true });
    state.selectedMatch = lastName;
    state.loadedMatchName = lastName;
    state.events[0].importPersistenceTest = "conservato";
    saveState();
  `, context);
  await vm.runInContext("archiveStorage.flush()", context);
  const reopened = buildBrowserContext();
  reopened.indexedDB = context.indexedDB;
  reopened.localStorage = context.localStorage;
  reopened.alert = message => assert.fail(message);
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), reopened, { filename: path }));
  await reopened.initializePersistentStorage();
  assert.equal(reopened.listMatchesFromStorage().length, dvwFiles.length);
  for (const name of reopened.listMatchesFromStorage()) assert.ok(reopened.loadMatchFromStorage(name).state.events.length > 0);
  assert.equal(await reopened.loadStateFromIndexedDb(), true);
  assert.equal(vm.runInContext('state.events[0].importPersistenceTest', reopened), 'conservato');
  assert.equal(reopened.loadMatchFromStorage(context.lastName).state.events[0].importPersistenceTest, 'conservato');
  assert.ok([...saved.values()].reduce((size, raw) => size + raw.length, 0) < 10000);
  await vm.runInContext("archiveStorage.flush()", reopened);
});

for (const [file, count] of [['Castenaso - Budrio.dvw', 144], ['Finale Villanova-Budrio.dvw', 174]]) {
  test(`l'analisi apre la squadra scoutizzata di ${file} dopo una partita diversa`, async () => {
    const context = buildBrowserContext();
    runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
    await context.initializePersistentStorage();
    context.importText = readFileSync(dvwFixtureRoot('resources/data volley da volleyscout') + '/' + file, 'utf8');
    vm.runInContext(`
      ensureAnalysisTeamFilterDefault();
      analysisSummaryFilterState.sets.add(99);
      trajectoryFilterState.players.add(99);
      trajectoryFilterState.sets.add(99);
      aggTableView = { mode: 'player', skillId: null, playerIdx: 99 };
      applyImportedMatch(parseDataVolleyDvwToMatchState(importText), { silent: true });
    `, context);
    assert.equal(context.getAnalysisTeamScope(), 'opponent');
    assert.equal(context.getFilteredTrajectoryEvents().length, count);
    assert.ok(context.getMatchSheetPlayers(context.getAnalysisTeamScope()).length > 0);
    assert.ok(context.filterEventsByAnalysisTeam().every(event => event.team === 'opponent'));
    assert.equal(vm.runInContext('analysisSummaryFilterState.sets.size', context), 0);
    assert.equal(vm.runInContext('aggTableView.mode', context), 'summary');
    await vm.runInContext('archiveStorage.flush()', context);
  });
}

test('lo schema filtri conserva indici numerici, chiavi video e ordine dei campi', () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
  const keys = ['teams', 'players', 'setters', 'skills', 'codes', 'sets', 'rotations',
    'zones', 'bases', 'setTypes', 'phases', 'receiveEvals', 'receiveZones', 'serveTypes', 'attackTypes'];
  const elements = Object.fromEntries(keys.map(key => [key, { id: key, classList: makeClassList(), closest() { return null; } }]));
  const video = context.getFilterFields('videoFilterState', elements);
  assert.deepEqual(Array.from(video, row => row[0]), keys.map(key => key === 'receiveEvals' ? 'receiveEvaluations' : key));
  for (const key of ['players', 'setters']) {
    const field = video.find(row => row[0] === key);
    assert.equal(field[2], false);
    assert.equal(field[3], false);
  }
  const sets = video.find(row => row[0] === 'sets');
  assert.equal(sets[2], true);
  assert.equal(sets[3], false);
  const state = Object.fromEntries(video.map(([key]) => [key, new Set()]));
  const options = Object.fromEntries(video.map(([key]) => [key, []]));
  state.players = new Set(['our:0', 'opponent:0', 'our:99']);
  state.sets = new Set([1, '1', 99]);
  options.players = [{ value: 'our:0' }, { value: 'opponent:0' }];
  options.sets = [{ value: '1' }];
  context.renderFilterControls(state, video, options, () => {});
  context.syncFilterSelections(state, video);
  assert.deepEqual([...state.players], ['our:0', 'opponent:0']);
  assert.deepEqual([...state.sets], [1]);
  const trajectory = context.getFilterFields('trajectoryFilterState', elements);
  assert.deepEqual(Array.from(trajectory, row => row[0]), ['setters', 'players', 'sets', 'setTypes',
    'bases', 'phases', 'receiveEvaluations', 'receiveZones', 'codes', 'attackTypes', 'zones']);
  assert.ok(trajectory.filter(row => ['setters', 'players', 'sets', 'zones', 'receiveZones'].includes(row[0]))
    .every(row => row[2] && row[3]));
});

test("modelli statistici condivisi conservano regole personalizzate, percentuali e conteggi assenti", () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => vm.runInContext(readRuntimeSource(path), context, { filename: path }));
  context.state = {
    metricsConfig: { attack: { positive: ['#'], negative: ['='] } },
    pointRules: { attack: { for: ['#', '+'], against: ['='] } },
  };
  const counts = { '#': 2, '+': 1, '=': 1, '/': 1 };
  const entries = context.buildSkillEntries('attack', counts);
  const entry = label => entries.find(item => item.label === label);
  assert.equal(entry('Tot').value, 5);
  assert.equal(entry('Punti').value, 3);
  assert.equal(entry('% Punti').value, 0.6);
  assert.equal(entry('% Punti').text, '60%');
  assert.equal(entry('Eff').value, 20);
  assert.equal(entry('Eff').text, '20%');
  assert.equal(entry('Err').better, 'lower');
  assert.equal(entry('Tot').better, 'neutral');

  const absent = context.buildSkillEntries('freeball', undefined);
  assert.equal(absent[0].value, 0);
  assert.ok(absent.slice(2).every(item => item.value === null && item.text === '-'));
  const empty = context.comparisonCountCells('Totale', context.emptyCounts(), context.emptyCounts(), 'attack');
  assert.ok(empty.slice(-3).every(cell => Object.hasOwn(cell, 'raw') && cell.raw === null && cell.className === 'skill-col skill-attack'));

  const events = [{ code: '#', name: 'A' }, { evaluation: '+', name: 'A' }, { code: 'invalid', name: 'B' }];
  const grouped = context.groupEventCounts(events, event => ({ key: event.name, name: event.name }));
  assert.equal(grouped.size, 1);
  assert.equal(context.totalFromCounts(grouped.get('A').counts), 2);
});
