import { useEffect, useRef, useSyncExternalStore } from "react";
import { pastePlayersStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function PastePlayersModal() {
  const view = useSyncExternalStore(
      pastePlayersStore.subscribe,
      pastePlayersStore.getSnapshot,
      pastePlayersStore.getSnapshot,
    ),
    input = useRef(null);
  useEffect(() => {
    if (view.open) input.current?.focus();
  }, [view.open]);
  const run = (command, ...args) =>
    invokeRuntime(command, ...args).catch((error) => {
      console.error(error);
      window.alert(error.message);
    });
  const close = () => run("closeManagedPlayersPaste");
  return (
    <div
      id="paste-players-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-players-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-paste=""
        onClick={close}
      />
      <div className="settings-modal__content">
        <div className="settings-modal__head">
          <h3 id="paste-players-title">Incolla elenco giocatrici</h3>
          <button
            className="pill-remove"
            aria-label="Chiudi"
            data-close-paste=""
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body">
          <label htmlFor="players-input">
            Formato: Numero;Cognome;Nome;L (L opzionale per il libero). Sono
            accettati anche tab o spazi.
          </label>
          <textarea
            id="players-input"
            ref={input}
            data-react-managed="true"
            placeholder={
              "Esempi:\n12;Rossi;Martina;L\n7;Verdi;Sara\n18 Bianchi Laura"
            }
            value={view.text}
            onChange={(event) =>
              pastePlayersStore.publish({ text: event.target.value })
            }
          />
          <div className="controls-row">
            <button
              id="btn-apply-players"
              data-react-managed="true"
              onClick={() => run("applyManagedPlayersPaste", "append")}
            >
              Aggiungi elenco
            </button>
            <button
              id="btn-replace-players"
              className="danger"
              data-react-managed="true"
              onClick={() => run("applyManagedPlayersPaste", "replace")}
            >
              Sostituisci squadra
            </button>
            <button className="secondary" data-close-paste="" onClick={close}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
