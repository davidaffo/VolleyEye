import { useSyncExternalStore } from "react";
import {
  demoActionStore,
  databaseImportStore,
} from "../state/roster-import-store.mjs";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
const actions = {
  "traj-filter-reset": "resetTrajectoryFilters",
  "serve-traj-filter-reset": "resetServeTrajectoryFilters",
  "second-filter-reset": "resetSecondFilters",
  "player-traj-filter-reset": "resetPlayerTrajectoryFilters",
  "player-serve-traj-filter-reset": "resetPlayerServeTrajectoryFilters",
  "player-second-filter-reset": "resetPlayerSecondFilters",
  "video-filter-reset": "resetVideoFilters",

  "btn-timeout": "recordTimeoutEvent",
  "btn-timeout-opp": "recordOpponentTimeoutEvent",
  "btn-score-team-point": "startReactPointPick",
  "btn-score-team-error": "startReactErrorPick",
  "btn-score-opp-point": "handleOpponentPoint",
  "btn-score-opp-error": "handleOpponentErrorPoint",
  "btn-score-opp-point-single": "handleOpponentPoint",
  "btn-score-opp-error-single": "handleOpponentErrorPoint",
  "btn-reset-scout-widgets": "resetReactScoutWidgets",

  "btn-open-teams-manager": "openTeamsManagerModal",
  "btn-open-debug-modal": "openDebugModal",
  "btn-export-db": "exportDatabaseToFile",
  "btn-import-db": "openReactDatabasePicker",
  "btn-import-db-url": "importReactDatabaseUrl",
  "btn-delete-demo-data": "removeDefaultDemoData",
  "btn-reset-app": "resetAppData",
  "btn-open-live-team-editor": "openReactLiveTeam",
  "btn-open-live-opponent-team-editor": "openReactLiveOpponent",
  "btn-open-lineup": "openMobileLineupModal",
  "btn-open-lineup-opp": "openReactOpponentLineup",
  "btn-attack-base": "toggleBaseModal",
  "btn-attack-setter": "toggleAttackSetterModal",
  "btn-attack-type": "toggleAttackTypeModal",
  "btn-block-number": "toggleBlockNumberModal",
  "btn-net-block-prompt": "triggerNetBlockPrompt",

  "btn-export-pdf": "exportAnalysisPdf",
  "btn-export-html": "exportAnalysisHtml",
  "btn-export-match": "exportMatchToFile",
  "btn-export-dvw": "exportDataVolleyToFile",
  "btn-reset-match": "resetMatch",
  "btn-undo": "undoLastEvent",
  "btn-contesa": "undoContestedRally",
  "btn-reset-metrics": "resetMetricsToDefault",
  "btn-reset-codes": "resetAllActiveCodes",
  "btn-reset-points": "resetPointRulesToDefault",
};
export function AppActionButton({ id, children, ...props }) {
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  return (
    <button
      id={id}
      {...props}
      disabled={
        props.disabled ||
        ([
          "btn-open-lineup",
          "btn-open-lineup-opp",
          "btn-open-live-team-editor",
          "btn-open-live-opponent-team-editor",
          "btn-reset-scout-widgets",
          "btn-timeout",
          "btn-timeout-opp",
          "btn-score-team-point",
          "btn-score-team-error",
          "btn-score-opp-point",
          "btn-score-opp-error",
          "btn-score-opp-point-single",
          "btn-score-opp-error-single",
          "btn-undo",
          "btn-contesa",
          "btn-attack-base",
          "btn-attack-setter",
          "btn-attack-type",
          "btn-block-number",
          "btn-net-block-prompt",
        ].includes(id) &&
          !!controls.scoutControlsDisabled)
      }
      data-react-managed="true"
      onClick={() => {
        Promise.resolve(
          invokeRuntimeEvent("runReactAppAction", actions[id]),
        ).catch(console.error);
      }}
    >
      {children}
    </button>
  );
}
export function MatchImportButton({ children, ...props }) {
  return (
    <button
      {...props}
      data-react-managed="true"
      onClick={() => invokeRuntimeEvent("openReactMatchFilePicker")}
    >
      {children}
    </button>
  );
}
export function MatchImportInput(props) {
  return (
    <input
      {...props}
      data-react-managed="true"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file)
          invokeRuntime("handleImportMatchFile", file).catch(console.error);
      }}
    />
  );
}
export function ScoutDrawerButton({ drawer, children, ...props }) {
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={!!controls.scoutControlsDisabled}
      onClick={() => invokeRuntimeEvent("changeReactScoutDrawer", drawer)}
    >
      {children}
    </button>
  );
}
export function ScoutDrawerBackdrop(props) {
  return (
    <div
      {...props}
      data-react-managed="true"
      onClick={() => invokeRuntimeEvent("changeReactScoutDrawer", "")}
    />
  );
}

export function DatabaseImportInput(props) {
  return (
    <input
      {...props}
      data-react-managed="true"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file)
          invokeRuntime("handleImportDatabaseFile", file).catch(console.error);
      }}
    />
  );
}

export function DemoDeleteButton({ className, ...props }) {
  const view = useSyncExternalStore(
    demoActionStore.subscribe,
    demoActionStore.getSnapshot,
    demoActionStore.getSnapshot,
  );
  return (
    <AppActionButton
      {...props}
      disabled={!view.visible}
      className={
        (className || "")
          .split(/\s+/)
          .filter((name) => name !== "hidden")
          .join(" ") + (view.visible ? "" : " hidden")
      }
    />
  );
}

export function DatabaseUrlInput(props) {
  const view = useSyncExternalStore(
    databaseImportStore.subscribe,
    databaseImportStore.getSnapshot,
    databaseImportStore.getSnapshot,
  );
  return (
    <input
      {...props}
      data-react-managed="true"
      value={view.url}
      onChange={(event) =>
        databaseImportStore.publish({ url: event.target.value })
      }
    />
  );
}
