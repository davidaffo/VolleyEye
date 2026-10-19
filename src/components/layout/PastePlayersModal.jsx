import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useEffect, useRef } from "react";
import { pastePlayersStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function PastePlayersModal() {
  const view = useViewStore(pastePlayersStore),
    input = useRef(null);
  useEffect(() => {
    if (view.open) input.current?.focus();
  }, [view.open]);
  const run = (command, ...args) =>
    appActions[command]( ...args).catch((error) => {
      console.error(error);
      window.alert(error.message);
    });
  const close = () => run("closeManagedPlayersPaste");
  return (
    <ModalDialog
      id="paste-players-modal"
      className="settings-modal"
      aria-labelledby="paste-players-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-paste": "" }}
      contentProps={{ className: "settings-modal__content" }}
      title={<h3 id="paste-players-title">Incolla elenco giocatrici</h3>}
      closeProps={{
        className: "pill-remove",
        "aria-label": "Chiudi",
        "data-close-paste": "",
        onClick: close,
      }}
      bodyProps={{ className: "settings-modal__body" }}
    >
      <label htmlFor="players-input">
        Formato: Numero;Cognome;Nome;L (L opzionale per il libero). Sono accettati anche tab o spazi.
      </label>
      <textarea
        id="players-input"
        ref={input}
        placeholder={"Esempi:\n12;Rossi;Martina;L\n7;Verdi;Sara\n18 Bianchi Laura"}
        value={view.text}
        onChange={(event) => pastePlayersStore.publish({ text: event.target.value })}
      />
      <div className="controls-row">
        <button id="btn-apply-players" onClick={() => run("applyManagedPlayersPaste", "append")}>
          Aggiungi elenco
        </button>
        <button
          id="btn-replace-players"
          className="danger"
          onClick={() => run("applyManagedPlayersPaste", "replace")}
        >
          Sostituisci squadra
        </button>
        <button className="secondary" data-close-paste="" onClick={close}>
          Annulla
        </button>
      </div>
    </ModalDialog>
  );
}
