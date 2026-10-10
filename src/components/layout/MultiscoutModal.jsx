import { useSyncExternalStore } from "react";
import { multiscoutStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
import { AnalysisFilter } from "../AnalysisFilter.jsx";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
function useView() {
  return useSyncExternalStore(
    multiscoutStore.subscribe,
    multiscoutStore.getSnapshot,
    multiscoutStore.getSnapshot,
  );
}
export function MultiscoutButton() {
  const view = useView();
  return (
    <button
      id="btn-open-multiscout"
      className={"primary small" + (view.count > 0 ? " is-active" : "")}
      type="button"
      data-react-managed="true"
      onClick={() => run("openReactMultiscout")}
    >
      Utilizza dati di piu partite ({view.count})
    </button>
  );
}
export function MultiscoutModal() {
  const view = useView(),
    close = () => run("closeReactMultiscout");
  return (
    <div
      id="multiscout-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multiscout-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-multiscout=""
        onClick={close}
      />
      <div className="settings-modal__content">
        <div className="settings-modal__head">
          <h3 id="multiscout-title">Utilizza dati di piu partite</h3>
          <button
            id="multiscout-close"
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body">
          <div className="analysis-filter multiscout-controls">
            <div className="analysis-filter__label">Squadra</div>
            <div className="analysis-filter__row">
              <select
                id="multiscout-team-select"
                data-react-managed="true"
                value={view.scope}
                onChange={(event) =>
                  run("changeReactMultiscoutScope", event.target.value)
                }
              >
                {view.teams.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div id="multiscout-subtitle" className="multiscout-subtitle">
            {view.subtitle}
          </div>
          <AnalysisFilter
            id="multiscout-list"
            className="analysis-filter__options multiscout-list"
          />
          <div className="offset-actions">
            <button
              id="multiscout-reset"
              className="small secondary"
              type="button"
              data-react-managed="true"
              onClick={() => run("resetReactMultiscout")}
            >
              Reset
            </button>
            <button
              id="multiscout-cancel"
              className="small secondary"
              data-react-managed="true"
              onClick={close}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
