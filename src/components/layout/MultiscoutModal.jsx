import { ModalDialog } from "../ui/Modal.jsx";
import { FilterField } from "../ui/FilterField.jsx";

import { AnalysisFilter } from "../AnalysisFilter.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { multiscoutStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

const run = (command, ...args) =>
  appActions[command]( ...args).catch(console.error);
function useView() {
  return useViewStore(multiscoutStore);
}
export function MultiscoutButton() {
  const view = useView();
  return (
    <button
      id="btn-open-multiscout"
      className={"primary small" + (view.count > 0 ? " is-active" : "")}
      type="button"
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
    <ModalDialog
      id="multiscout-modal"
      aria-labelledby="multiscout-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-multiscout": "" }}
      title={<h3 id="multiscout-title">Utilizza dati di piu partite</h3>}
      closeProps={{ id: "multiscout-close" }}
    >
      <FilterField className="analysis-filter multiscout-controls" label="Squadra">
        <div className="analysis-filter__row">
          <select
            id="multiscout-team-select"
            value={view.scope}
            onChange={(event) => run("changeReactMultiscoutScope", event.target.value)}
          >
            {view.teams.map((team) => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </select>
        </div>
      </FilterField>
      <div id="multiscout-subtitle" className="multiscout-subtitle">
        {view.subtitle}
      </div>
      <AnalysisFilter id="multiscout-list" className="analysis-filter__options multiscout-list" />
      <div className="offset-actions">
        <button
          id="multiscout-reset"
          className="small secondary"
          type="button"
          onClick={() => run("resetReactMultiscout")}
        >
          Reset
        </button>
        <button id="multiscout-cancel" className="small secondary" onClick={close}>
          Chiudi
        </button>
      </div>
    </ModalDialog>
  );
}
