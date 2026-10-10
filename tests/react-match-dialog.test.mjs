import assert from "node:assert/strict";
import test from "node:test";
import { createMatchDialogStore } from "../src/state/match-dialog-store.mjs";

function config(overrides = {}) {
  return {
    mode: "create",
    teamNames: ["Aurora", "Riviera"],
    today: "2026-10-10",
    currentCategory: "U18",
    details: {
      selectedTeam: "Aurora",
      selectedOpponentTeam: "Riviera",
      useOpponentTeam: true,
      match: {
        teamName: "Aurora",
        opponent: "Riviera",
        category: "U16",
        date: "2026-03-15",
        matchType: "campionato",
        leg: "ritorno",
      },
    },
    ...overrides,
  };
}
test("create dialog uses existing defaults and switches the available opponent when home changes", () => {
  const store = createMatchDialogStore();
  store.open(config());
  assert.deepEqual(store.getSnapshot().draft, {
    teamName: "Aurora",
    opponentTeam: "Riviera",
    mode: "double",
    opponentManual: "",
    category: "U18",
    date: "2026-10-10",
    matchType: "amichevole",
    leg: "",
  });
  store.update("teamName", "Riviera");
  assert.equal(store.getSnapshot().draft.opponentTeam, "Aurora");
  store.update("mode", "single");
  store.update("opponentManual", "Ospiti");
  assert.equal(store.getSnapshot().draft.opponentManual, "Ospiti");
});
test("editing archived details freezes team identity even when the team archive is empty", () => {
  const store = createMatchDialogStore();
  store.open(
    config({ mode: "edit", archiveName: "archived-A", teamNames: [] }),
  );
  const previous = store.getSnapshot();
  store.update("teamName", "Terza squadra");
  store.update("opponentTeam", "Terza squadra");
  store.update("mode", "single");
  assert.equal(store.getSnapshot(), previous);
  assert.equal(previous.archiveName, "archived-A");
  assert.equal(previous.draft.category, "U16");
  assert.equal(previous.draft.date, "2026-03-15");
  store.update("category", "U20");
  assert.equal(store.getSnapshot().draft.category, "U20");
  assert.equal(previous.draft.category, "U16");
});
test("cancelled drafts stay isolated and reopening restores saved details", () => {
  const store = createMatchDialogStore();
  const options = config({ mode: "edit" });
  store.open(options);
  const original = store.getSnapshot();
  store.update("category", "Unsaved");
  store.close();
  assert.equal(store.getSnapshot().open, false);
  assert.equal(options.details.match.category, "U16");
  store.open(options);
  assert.equal(store.getSnapshot().draft.category, "U16");
  assert.ok(Object.isFrozen(original));
  assert.ok(Object.isFrozen(original.draft));
  assert.ok(Object.isFrozen(original.teamNames));
});
test("empty and single-team archives have no unavailable opponent or phantom team", () => {
  const store = createMatchDialogStore();
  store.open(config({ teamNames: [] }));
  assert.equal(store.getSnapshot().draft.teamName, "");
  assert.equal(store.getSnapshot().draft.opponentTeam, "");
  store.open(config({ teamNames: ["Aurora"] }));
  assert.equal(store.getSnapshot().draft.teamName, "Aurora");
  assert.equal(store.getSnapshot().draft.opponentTeam, "");
});
test("dialog subscriptions unsubscribe and reject updates after closing", () => {
  const store = createMatchDialogStore();
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.open(config());
  store.close();
  const closed = store.getSnapshot();
  store.update("category", "Ignored");
  assert.equal(store.getSnapshot(), closed);
  assert.equal(calls, 2);
  unsubscribe();
  store.open(config());
  assert.equal(calls, 2);
});
