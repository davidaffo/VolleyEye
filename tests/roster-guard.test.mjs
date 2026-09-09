import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = { alerts: [] };
context.self = context;
context.window = context;
context.alert = message => context.alerts.push(message);
vm.runInNewContext(
  readFileSync(new URL("../js/shared/state-isolation.js", import.meta.url), "utf8"),
  context
);
vm.runInNewContext(
  readFileSync(new URL("../js/shared/roster-manager.js", import.meta.url), "utf8"),
  context
);

const normalizePlayers = list => Array.from(new Set((list || []).filter(Boolean)));
const buildNumbersForNames = (names, provided = {}, fallback = {}) =>
  Object.fromEntries(names.map(name => [name, provided[name] ?? fallback[name] ?? ""]));

function createGuardedManager(state, options = {}) {
  return context.RosterManager.createRosterManager({
    state,
    saveState: () => {},
    normalizePlayers,
    buildNumbersForNames,
    syncNumbersFn: buildNumbersForNames,
    renderList: () => {},
    renderLiberoTags: () => {},
    applyTextarea: () => {},
    canUpdateRoster: (next, options = {}) => {
      if (options.allowDuringMatch) return true;
      const changed = state.players.length !== next.length || state.players.some((name, i) => name !== next[i]);
      return !(changed && state.events.length > 0);
    },
    sanitizeState: () => context.VolleyEyeStateIsolation.sanitizeRosterScope(state, "our"),
    onRenameReferences: options.onRenameReferences || null
  });
}

test("una sostituzione roster è bloccata quando lo scout contiene eventi", () => {
  const state = {
    players: ["Rossi Anna"],
    playerNumbers: { "Rossi Anna": "2" },
    liberos: [],
    captains: [],
    court: [{ main: "Rossi Anna" }],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    events: [{ code: "serve" }]
  };
  const manager = createGuardedManager(state);
  assert.equal(manager.updateRoster(["Verdi Sara"]), false);
  assert.deepEqual(state.players, ["Rossi Anna"]);
  assert.equal(state.court[0].main, "Rossi Anna");
});

test("la modifica rapida può aggiungere senza perdere campo o riferimenti validi", () => {
  const state = {
    players: ["Rossi Anna"],
    playerNumbers: { "Rossi Anna": "2" },
    liberos: [],
    captains: ["Rossi Anna"],
    preferredLibero: "",
    court: [{ main: "Rossi Anna" }],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    events: [{ code: "serve" }]
  };
  const manager = createGuardedManager(state);
  assert.equal(
    manager.updateRoster(["Rossi Anna", "Verdi Sara"], {
      allowDuringMatch: true,
      playerNumbers: { "Rossi Anna": "2", "Verdi Sara": "8" },
      liberos: ["Verdi Sara", "Estranea"],
      captains: ["Rossi Anna"]
    }),
    true
  );
  assert.deepEqual(Array.from(state.players), ["Rossi Anna", "Verdi Sara"]);
  assert.deepEqual(Array.from(state.liberos), ["Verdi Sara"]);
  assert.equal(state.court[0].main, "Rossi Anna");
});

test("rinominare conserva campo, numero zero, libero e capitano", () => {
  const state = {
    players: ["Rossi Anna"],
    playerNumbers: { "Rossi Anna": 0 },
    liberos: ["Rossi Anna"],
    captains: ["Rossi Anna"],
    preferredLibero: "Rossi Anna",
    court: [{ main: "Rossi Anna", replaced: "" }],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    events: []
  };
  const manager = createGuardedManager(state, {
    onRenameReferences: (oldName, newName) => {
      state.court.forEach(slot => {
        if (slot.main === oldName) slot.main = newName;
      });
    }
  });
  manager.renamePlayerAtIndex(0, "Verdi Sara");
  assert.deepEqual(Array.from(state.players), ["Verdi Sara"]);
  assert.equal(state.playerNumbers["Verdi Sara"], 0);
  assert.deepEqual(Array.from(state.liberos), ["Verdi Sara"]);
  assert.deepEqual(Array.from(state.captains), ["Verdi Sara"]);
  assert.equal(state.court[0].main, "Verdi Sara");
});

test("un rename bloccato non modifica riferimenti prima del controllo", () => {
  const state = {
    players: ["Rossi Anna"],
    playerNumbers: {},
    liberos: [],
    captains: [],
    court: [{ main: "Rossi Anna" }],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    events: [{ code: "serve" }]
  };
  let renamedReferences = 0;
  const manager = createGuardedManager(state, {
    onRenameReferences: () => renamedReferences += 1
  });
  manager.renamePlayerAtIndex(0, "Verdi Sara");
  assert.equal(renamedReferences, 0);
  assert.equal(state.players[0], "Rossi Anna");
  assert.equal(state.court[0].main, "Rossi Anna");
});

test("un nome duplicato viene rifiutato senza mutare il roster", () => {
  context.alerts.length = 0;
  const state = {
    players: ["Rossi Anna", "Verdi Sara"],
    playerNumbers: {},
    liberos: [],
    captains: [],
    court: [],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    events: []
  };
  createGuardedManager(state).renamePlayerAtIndex(0, "verdi sara");
  assert.deepEqual(state.players, ["Rossi Anna", "Verdi Sara"]);
  assert.equal(context.alerts.length, 1);
});
