import { CommandButton } from "./ui/CommandButton.jsx";
import { FileImportInput } from "./ui/FileImportInput.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import {
  demoActionStore,
  databaseImportStore,
} from "../state/roster-import-store.mjs";
import { runtimeStore } from "../state/runtime-store.mjs";
import { actions as appActions, events as appEvents } from "../app/actions.mjs";
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
  const controls = useViewStore(runtimeStore);
  return (
    <CommandButton
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
      command="runReactAppAction"
      args={[actions[id]]}
      immediate
    >
      {children}
    </CommandButton>
  );
}
export function MatchImportButton({ children, ...props }) {
  return (
    <CommandButton
      {...props}
      command="openReactMatchFilePicker"
      immediate
    >
      {children}
    </CommandButton>
  );
}
export function MatchImportInput(props) {
  return (
    <FileImportInput
      {...props}
      onFile={(file) => appActions.handleImportMatchFile(file)}
    />
  );
}

export function ScoutDrawerButton({ drawer, children, ...props }) {
  const controls = useViewStore(runtimeStore);
  return (
    <CommandButton
      {...props}
      disabled={!!controls.scoutControlsDisabled}
      command="changeReactScoutDrawer"
      args={[drawer]}
      immediate
    >
      {children}
    </CommandButton>
  );
}
export function ScoutDrawerBackdrop(props) {
  return (
    <div
      {...props}
      onClick={() => appEvents.changeReactScoutDrawer("")}
    />
  );
}

export function DatabaseImportInput(props) {
  return (
    <FileImportInput
      {...props}
      onFile={(file) => appActions.handleImportDatabaseFile(file)}
    />
  );
}

export function DemoDeleteButton({ className, ...props }) {
  const view = useViewStore(demoActionStore);
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
  const view = useViewStore(databaseImportStore);
  return (
    <input
      {...props}
      value={view.url}
      onChange={(event) =>
        databaseImportStore.publish({ url: event.target.value })
      }
    />
  );
}
