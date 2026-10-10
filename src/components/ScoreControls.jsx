import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";

function useScoreView() {
  return useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
}
function perform(command, ...args) {
  invokeRuntime(command, ...args).catch((error) => {
    console.error("Operazione punteggio non riuscita", error);
    window.alert(error.message);
  });
}
export function CurrentSetControl() {
  const view = useScoreView();
  const set = view.currentSet || 1;
  return (
    <>
      <div
        className="set-display"
        id="current-set-display"
        aria-live="polite"
        data-react-managed="true"
      >
        Set {set}
      </div>
      <select
        id="current-set"
        className="hidden-select"
        tabIndex={-1}
        aria-hidden="true"
        data-react-managed="true"
        value={set}
        onChange={(event) => perform("setCurrentSet", event.target.value)}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            Set {value}
          </option>
        ))}
      </select>
    </>
  );
}
export function SetWinScore({ as: Tag = "strong", ...props }) {
  const view = useScoreView();
  return (
    <Tag {...props} data-react-managed="true">
      {view.setWinLabel || "0 - 0"}
    </Tag>
  );
}
export function ManualScoreButton({ direction, delta, children, ...props }) {
  const view = useScoreView();
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={!!view.scoutControlsDisabled}
      onClick={() => perform("handleManualScore", direction, delta)}
    >
      {children}
    </button>
  );
}
export function MatchPauseButton({ className, ...props }) {
  const view = useScoreView();
  return (
    <button
      {...props}
      data-react-managed="true"
      className={
        className + (view.matchFinished ? " resume-btn primary" : " danger")
      }
      onClick={() => perform("endMatch")}
    >
      {view.matchFinished ? "Riprendi partita" : "Pausa/Termina"}
    </button>
  );
}
export function NextSetButton({ children, ...props }) {
  const view = useScoreView();
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={!!view.scoutControlsDisabled}
      onClick={() => perform("prepareNextSet")}
    >
      {children}
    </button>
  );
}
