import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { debugStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function DebugModal() {
  const view = useViewStore(debugStore),
    run = (command) => appActions[command]().catch(console.error),
    close = () => run("closeDebugModal");
  return (
    <ModalDialog
      id="debug-modal"
      aria-labelledby="debug-modal-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-debug-modal": "" }}
      title={<h3 id="debug-modal-title">{"Debug dati match"}</h3>}
      closeProps={{
        id: "debug-modal-close",
        onClick: () => run("closeDebugModal"),
      }}
    >
      <p className="section-note">
        {"Forza il riallineamento dei dati di analisi usando il log come fonte."}
      </p>
      <div className="controls-row">
        <button id="btn-force-sync-log" onClick={() => run("syncReactDebugLog")} className="danger">
          {"Riallinea dati dal log"}
        </button>
      </div>
      <p className="section-note">
        {"Allinea le partite salvate aggiungendo gli ID giocatrice mancanti."}
      </p>
      <div className="controls-row">
        <button
          id="btn-backfill-player-ids"
          onClick={() => run("backfillReactPlayerIds")}
          className="secondary"
        >
          {"Scrivi ID giocatrici nei match"}
        </button>
      </div>
    </ModalDialog>
  );
}
