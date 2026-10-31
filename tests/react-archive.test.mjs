import { sourceFunctions } from "./helpers/source-functions.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";

const repository = readFileSync(new URL("../src/features/storage/match-repository.js", import.meta.url), "utf8") + readFileSync(new URL("../src/features/teams/archive-labels.js", import.meta.url), "utf8") + sourceFunctions(readFileSync(new URL("../src/features/core/runtime-view.js", import.meta.url), "utf8"), ["selectArchivedMatch", "renderMatchesList", "renderMatchSummary"]);
function setup() {
  let notifications = 0;
  const events = [{ skillId: "attack", code: "#" }];
  const state = {
    selectedMatch: "A",
    loadedMatchName: "A",
    events,
    savedMatches: { A: {}, B: {} },
  };
  const context = vm.createContext({
    state,
    elSavedMatchesSelect: { value: "A", dataset: { reactManaged: "true" } },
    elSavedMatchesList: { dataset: { reactManaged: "true" } },
    publishRuntimeView() {
      notifications++;
    },
    updateMatchButtonsState() {},
  });
  vm.runInContext(repository, context);
  return { context, state, events, notifications: () => notifications };
}
test("React archive selection changes synchronously without loading or altering events", () => {
  const { context, state, events, notifications } = setup();
  context.selectArchivedMatch("B");
  assert.equal(context.getSelectedArchivedMatch(), "B");
  assert.equal(context.elSavedMatchesSelect.value, "A"); // React commit may still be pending.
  assert.equal(state.loadedMatchName, "A");
  assert.equal(state.events, events);
  assert.equal(notifications(), 1);
});
test("archive selection rejects stale names and supports clearing the selection", () => {
  const { context, state, notifications } = setup();
  context.selectArchivedMatch("removed");
  assert.equal(state.selectedMatch, "A");
  assert.equal(notifications(), 0);
  context.selectArchivedMatch("");
  assert.equal(context.getSelectedArchivedMatch(), "");
  assert.equal(state.loadedMatchName, "A");
});
test("archive state ignores stale select values before React commits", () => {
  const { context } = setup();
  context.elSavedMatchesSelect.dataset.reactManaged = "false";
  context.elSavedMatchesSelect.value = "B";
  assert.equal(context.getSelectedArchivedMatch(), "A");
});

test("archive view preserves immutable labels across points and refreshes renamed duplicates", () => {
  const { context, state } = setup();
  state.match = { name: "Aurora" };
  state.savedMatches = {
    A: { state: { match: { name: "Aurora" } } },
    B: { state: { match: { name: "Aurora" } } },
  };
  let latest;
  let resolvedLabels = 0;
  const getLabel = context.getMatchArchiveLabel;
  Object.assign(context, {
    buildMatchDisplayName: (match) => match.name || "",
    publishReactSettings: () => {},
    publishReactVideoView: () => {},
    getMatchArchiveLabel(...args) {
      resolvedLabels++;
      return getLabel(...args);
    },
    computePointsSummary: () => ({
      totalFor: state.events.length,
      totalAgainst: 0,
    }),
    computeSetWinScore: () => ({ for: 0, against: 0 }),
    MAX_TIMEOUTS_PER_SET: 2,
    MAX_SUBSTITUTIONS_PER_SET: 8,
    getTimeoutCountForSet: () => 0,
    getTimeoutOppCountForSet: () => 0,
    getSubstitutionCountForSet: () => 0,
    runtimeStore: {
      publish(view) {
        latest = view;
      },
    },
  });
  const adapter = readFileSync(
    new URL("../src/features/core/runtime-view.js", import.meta.url),
    "utf8",
  );
  vm.runInContext(readFileSync(new URL("../src/app/lifecycle.js", import.meta.url), "utf8") + adapter, context);
  context.publishRuntimeView();
  const previous = latest.archivedMatches;
  assert.equal(previous[0].label, "Aurora (1)");
  assert.equal(previous[1].label, "Aurora (2)");
  assert.ok(Object.isFrozen(previous));
  assert.ok(previous.every(Object.isFrozen));
  state.events.push({ skillId: "serve" });
  context.publishRuntimeView();
  assert.equal(latest.archivedMatches, previous);
  assert.equal(resolvedLabels, 2);
  state.savedMatches.B.state.match.name = "Nuovo nome";
  context.publishRuntimeView();
  assert.notEqual(latest.archivedMatches, previous);
  assert.equal(latest.archivedMatches[0].label, "Aurora");
  assert.equal(latest.archivedMatches[1].label, "Nuovo nome");
  assert.equal(previous[0].label, "Aurora (1)");
});
