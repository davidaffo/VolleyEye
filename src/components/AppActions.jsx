import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
const actions = {
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
      {...props}
      id={id}
      disabled={
        ["btn-undo", "btn-contesa"].includes(id) &&
        !!controls.scoutControlsDisabled
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
