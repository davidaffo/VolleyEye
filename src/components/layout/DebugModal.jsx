import { useSyncExternalStore } from "react";
import { debugStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function DebugModal() {
  const view = useSyncExternalStore(
      debugStore.subscribe,
      debugStore.getSnapshot,
      debugStore.getSnapshot,
    ),
    run = (command) => invokeRuntime(command).catch(console.error),
    close = () => run("closeDebugModal");
  return (
    <div
      id={"debug-modal"}
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role={"dialog"}
      aria-modal={"true"}
      aria-labelledby={"debug-modal-title"}
    >
      <div
        className={"settings-modal__backdrop"}
        data-close-debug-modal={""}
        onClick={close}
      ></div>
      <div className={"settings-modal__content"}>
        <div className={"settings-modal__head"}>
          <h3 id={"debug-modal-title"}>{"Debug dati match"}</h3>
          <button
            id={"debug-modal-close"}
            data-react-managed="true"
            onClick={() => run("closeDebugModal")}
            className={"pill-remove"}
            aria-label={"Chiudi"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"settings-modal__body"}>
          <p className={"section-note"}>
            {
              "Forza il riallineamento dei dati di analisi usando il log come fonte."
            }
          </p>
          <div className={"controls-row"}>
            <button
              id={"btn-force-sync-log"}
              data-react-managed="true"
              onClick={() => run("syncReactDebugLog")}
              className={"danger"}
            >
              {"Riallinea dati dal log"}
            </button>
          </div>
          <p className={"section-note"}>
            {
              "Allinea le partite salvate aggiungendo gli ID giocatrice mancanti."
            }
          </p>
          <div className={"controls-row"}>
            <button
              id={"btn-backfill-player-ids"}
              data-react-managed="true"
              onClick={() => run("backfillReactPlayerIds")}
              className={"secondary"}
            >
              {"Scrivi ID giocatrici nei match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
