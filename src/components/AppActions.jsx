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

  "btn-timeout": ["recordTimeoutEvent", true],
  "btn-timeout-opp": ["recordOpponentTimeoutEvent", true],
  "btn-score-team-point": ["startReactPointPick", true],
  "btn-score-team-error": ["startReactErrorPick", true],
  "btn-score-opp-point": ["handleOpponentPoint", true],
  "btn-score-opp-error": ["handleOpponentErrorPoint", true],
  "btn-score-opp-point-single": ["handleOpponentPoint", true],
  "btn-score-opp-error-single": ["handleOpponentErrorPoint", true],
  "btn-reset-scout-widgets": ["resetReactScoutWidgets", true],

  "btn-open-teams-manager": "openTeamsManagerModal",
  "btn-open-debug-modal": "openDebugModal",
  "btn-export-db": "exportDatabaseToFile",
  "btn-import-db": "openReactDatabasePicker",
  "btn-import-db-url": "importReactDatabaseUrl",
  "btn-delete-demo-data": "removeDefaultDemoData",
  "btn-reset-app": "resetAppData",
  "btn-open-live-team-editor": ["openReactLiveTeam", true],
  "btn-open-live-opponent-team-editor": ["openReactLiveOpponent", true],
  "btn-open-lineup": ["openMobileLineupModal", true],
  "btn-open-lineup-opp": ["openReactOpponentLineup", true],
  "btn-attack-base": ["toggleBaseModal", true],
  "btn-attack-setter": ["toggleAttackSetterModal", true],
  "btn-attack-type": ["toggleAttackTypeModal", true],
  "btn-block-number": ["toggleBlockNumberModal", true],
  "btn-net-block-prompt": ["triggerNetBlockPrompt", true],

  "btn-export-pdf": "exportAnalysisPdf",
  "btn-export-html": "exportAnalysisHtml",
  "btn-export-match": "exportMatchToFile",
  "btn-export-dvw": "exportDataVolleyToFile",
  "btn-reset-match": "resetMatch",
  "btn-undo": ["undoLastEvent", true],
  "btn-contesa": ["undoContestedRally", true],
  "btn-reset-metrics": "resetMetricsToDefault",
  "btn-reset-codes": "resetAllActiveCodes",
  "btn-reset-points": "resetPointRulesToDefault",
};
export function AppActionButton({ id, children, ...props }) {
  const controls = useViewStore(runtimeStore);
  const entry = actions[id];
  const [command, scoutOnly] = Array.isArray(entry) ? entry : [entry, false];
  return (
    <CommandButton
      id={id}
      {...props}
      disabled={props.disabled || (scoutOnly && !!controls.scoutControlsDisabled)}
      command="runReactAppAction"
      args={[command]}
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
