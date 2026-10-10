import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";

function useArchiveView() {
  return useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
}
function perform(command, ...args) {
  invokeRuntime(command, ...args).catch((error) => {
    console.error("Operazione archivio non riuscita", error);
    window.alert(error.message);
  });
}
export function MatchArchiveList() {
  const view = useArchiveView();
  const matches = view.archivedMatches || [];
  return (
    <>
      <div
        id="saved-matches-list"
        className="match-list"
        role="listbox"
        aria-label="Match salvati"
        data-react-managed="true"
      >
        {matches.length ? (
          matches.map((match) => (
            <button
              key={match.name}
              type="button"
              className={
                "match-list-item match-list-open" +
                (view.selectedMatch === match.name ? " active" : "")
              }
              data-match-name={match.name}
              role="option"
              aria-selected={view.selectedMatch === match.name}
              onClick={() => perform("selectArchivedMatch", match.name)}
            >
              {match.label}
            </button>
          ))
        ) : (
          <div className="match-list-empty">Nessun match salvato.</div>
        )}
      </div>
      <select
        id="saved-matches"
        className="hidden-select"
        tabIndex={-1}
        aria-hidden="true"
        data-react-managed="true"
        value={view.selectedMatch || ""}
        onChange={(event) => perform("selectArchivedMatch", event.target.value)}
      >
        <option value="">Nuovo match (vuoto)</option>
        {matches.map((match) => (
          <option key={match.name} value={match.name}>
            {match.label}
          </option>
        ))}
      </select>
    </>
  );
}
export function MatchActionButton({
  command,
  requiresSelection = false,
  children,
  ...props
}) {
  const view = useArchiveView();
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={requiresSelection && !view.selectedMatch}
      onClick={() => perform(command)}
    >
      {children}
    </button>
  );
}
export function ActiveMatchName() {
  const view = useArchiveView();
  return (
    <strong id="active-match-name" data-react-managed="true">
      {view.matchLabel || "—"}
    </strong>
  );
}
