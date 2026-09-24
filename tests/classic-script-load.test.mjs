import { IDBFactory } from "fake-indexeddb";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { ROSTER_SOURCE_FILES } from "./helpers/roster-source.mjs";
import { SCOUT_SOURCE_FILES } from "./helpers/scout-source.mjs";

const dvwRoot = 'resources/data volley';
const dvwFiles = [`${dvwRoot}/data volley example file.dvw`, ...readdirSync(`${dvwRoot}/files scout`).filter(file => file.endsWith('.dvw')).map(file => `${dvwRoot}/files scout/${file}`)];
const rootUrl = new URL("../", import.meta.url);
const runtimeFiles = [
  "js/globals.js",
  "js/shared/namespace.js",
  "js/shared/state-isolation.js",
  "js/shared/persistent-storage.js",
  "js/shared/team-ui.js",
  "js/shared/lineup-core.js",
  "js/shared/auto-role.js",
  "js/shared/roster-manager.js",
  "js/match-settings.js",
  "js/opponent-settings.js",
  ...ROSTER_SOURCE_FILES.map(path => `js/${path}`),
  ...SCOUT_SOURCE_FILES.map(path => `js/${path}`)
];

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

test("gli script modulari condividono lo stesso contesto classico senza collisioni", async () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => {
    const source = readFileSync(new URL(path, rootUrl), "utf8");
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
  runtimeFiles.forEach(path => vm.runInContext(readFileSync(new URL(path, rootUrl), "utf8"), context, { filename: path }));
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

  function node() {
    return {
      children: [], dataset: {}, classList: makeClassList(),
      set innerHTML(value) { this.children = []; },
      appendChild(child) { this.children.push(child); },
      addEventListener() {}
    };
  }
  const bench = node();
  context.document.getElementById = id => id === "bench-chips-opp" ? bench : null;
  context.document.createElement = node;
  vm.runInContext("renderOpponentBenchChips()", context);
  assert.equal(bench.children.length, 3);
  assert.ok(bench.children.some(child => child.dataset.playerName === "Ospite 7" && child.textContent.startsWith("27 - ")));

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
  runtimeFiles.forEach(path => vm.runInContext(readFileSync(new URL(path, rootUrl), "utf8"), context, { filename: path }));
  await context.initializePersistentStorage();
  const selects = Object.fromEntries(["auto-libero-select", "auto-libero-select-settings", "auto-libero-select-opp"].map(id => [id, {
    value: "", listeners: {}, addEventListener(event, callback) { this.listeners[event] = callback; }
  }]));
  context.document.getElementById = id => selects[id] || null;
  vm.runInContext("bindScoutSettingsControls()", context);
  for (const select of Object.values(selects)) assert.equal(select.value, "C");

  // Old snapshots did not record whether an empty role was a chosen preference.
  vm.runInContext(`
    applyImportedMatch({ players: [], events: [], match: {}, useOpponentTeam: true,
      autoLiberoRole: "", opponentAutoLiberoRole: ""
    }, { silent: true });
  `, context);
  for (const select of Object.values(selects)) assert.equal(select.value, "C");

  for (const [scope, id] of [["our", "auto-libero-select"], ["opponent", "auto-libero-select-opp"]]) {
    selects[id].value = "";
    selects[id].listeners.change();
    assert.equal(vm.runInContext(`getTeamAutoLiberoRole("${scope}")`, context), "");
    assert.equal(vm.runInContext(`getTeamAutoLiberoBackline("${scope}")`, context), false);
    if (scope === "our") {
      assert.equal(selects["auto-libero-select-settings"].value, "");
      assert.equal(selects["auto-libero-select-opp"].value, "C");
    }
  }
  vm.runInContext(`
    const liberoSnapshot = buildCompactLocalStateSnapshot(state);
    setAutoLiberoRole("C", "our");
    setAutoLiberoRole("C", "opponent");
    applyImportedMatch(liberoSnapshot, { silent: true });
  `, context);
  for (const select of Object.values(selects)) assert.equal(select.value, "");
  for (const id of ["auto-libero-select-settings", "auto-libero-select-opp"]) {
    selects[id].value = "C";
    selects[id].listeners.change();
  }
  for (const select of Object.values(selects)) assert.equal(select.value, "C");
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
  runtimeFiles.forEach(path => vm.runInContext(readFileSync(new URL(path, rootUrl), "utf8"), context, { filename: path }));
  await context.initializePersistentStorage();
  for (const file of dvwFiles) {
    context.importText = readFileSync(file, 'utf8');
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
  runtimeFiles.forEach(path => vm.runInContext(readFileSync(new URL(path, rootUrl), "utf8"), reopened, { filename: path }));
  await reopened.initializePersistentStorage();
  assert.equal(reopened.listMatchesFromStorage().length, dvwFiles.length);
  for (const name of reopened.listMatchesFromStorage()) assert.ok(reopened.loadMatchFromStorage(name).state.events.length > 0);
  assert.equal(await reopened.loadStateFromIndexedDb(), true);
  assert.equal(vm.runInContext('state.events[0].importPersistenceTest', reopened), 'conservato');
  assert.equal(reopened.loadMatchFromStorage(context.lastName).state.events[0].importPersistenceTest, 'conservato');
  assert.ok([...saved.values()].reduce((size, raw) => size + raw.length, 0) < 10000);
  await vm.runInContext("archiveStorage.flush()", reopened);
});
