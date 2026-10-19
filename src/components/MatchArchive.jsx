import { CommandButton } from "./ui/CommandButton.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import { actions as appActions } from "../app/actions.mjs";

function useArchiveView() {
  return useViewStore(runtimeStore);
}
function reportMatchArchiveError(error) {
  console.error("Operazione archivio non riuscita", error);
  window.alert(error.message);
}
function perform(command, ...args) {
  appActions[command]( ...args).catch(reportMatchArchiveError);
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
    <CommandButton
      {...props}
      disabled={requiresSelection && !view.selectedMatch}
      command={command}
      args={[]}
      onError={reportMatchArchiveError}
    >
      {children}
    </CommandButton>
  );
}
export function ActiveMatchName() {
  const view = useArchiveView();
  return (
    <strong id="active-match-name">
      {view.matchLabel || "—"}
    </strong>
  );
}
