import { ModalDialog } from "./ui/Modal.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import { attributionStore } from "../state/attribution-store.mjs";
import { actions as appActions } from "../app/actions.mjs";
function run(command, ...args) {
  appActions[command]( ...args).catch((error) => {
    console.error("Assegnazione non riuscita", error);
    window.alert(error.message);
  });
}
export function AttributionModal({ kind }) {
  const snapshot = useViewStore(attributionStore);
  const controls = useViewStore(runtimeStore);
  const view = snapshot[kind];
  const disabled = !!view.courtModal && !!controls.scoutControlsDisabled;
  const point = kind === "point";
  const close = () => run(point ? "closePointModal" : "closeErrorModal");
  const picker = view.fromPicker || view.teamFromPicker;
  return (
    <ModalDialog
      id={kind + "-modal"}
      className={"skill-modal" + (view.courtModal ? " court-modal" : "")}
      aria-labelledby={kind + "-modal-title"}
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{ ["data-close-" + kind]: "" }}
      title={
        <div id={kind + "-modal-title"} className="skill-modal__title">
          {point ? "Assegna punto" : "Assegna errore/fallo"}
        </div>
      }
      closeProps={{
        disabled: disabled,
        id: kind + "-modal-close",
        className: "pill-remove skill-modal__close-abs",
      }}
      bodyProps={{ id: kind + "-modal-body", className: "skill-modal__body" }}
    >
      {!point && (
        <div className="error-type-section">
          <p className="section-note">Tipo errore:</p>
          <div className="error-choice-grid error-type-grid">
            {view.types.map((type) => (
              <button
                disabled={disabled}
                key={type.id}
                type="button"
                data-error-type={type.id}
                className={
                  "error-choice-btn error-type-btn" + (type.id === view.selectedType ? " active" : "")
                }
                onClick={() => run("selectAttributionErrorType", type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="section-note">
        {point
          ? "Seleziona la giocatrice a cui assegnare il punto oppure applicalo alla squadra."
          : picker
            ? "Seleziona il tipo errore/fallo da assegnare."
            : "Seleziona la giocatrice a cui assegnare l'errore/fallo oppure applicalo alla squadra."}
      </p>
      {!point && view.fromPicker && view.pickedName ? (
        <p className="section-note">Giocatrice: {view.pickedLabel}</p>
      ) : !point && view.teamFromPicker ? (
        <p className="section-note">Destinazione: squadra</p>
      ) : (
        <>
          {!view.players.length && (
            <div className="players-empty">
              {point
                ? "Aggiungi giocatrici per assegnare il punto."
                : "Aggiungi giocatrici per assegnare l'errore."}
            </div>
          )}
          <div className="error-choice-grid">
            {!point && view.prefilled && (
              <button
                disabled={disabled}
                type="button"
                className="error-choice-btn"
                onClick={() => run("applyAttribution", kind, view.pickedIndex)}
              >
                Applica a {view.pickedLabel}
              </button>
            )}
            {!view.fromPicker && (
              <button
                disabled={disabled}
                type="button"
                className={"error-choice-btn " + (point ? "success" : "danger")}
                onClick={() => run("applyAttribution", kind)}
              >
                Assegna alla squadra
              </button>
            )}
            {view.players.map((player) => (
              <button
                disabled={disabled}
                key={player.idx}
                type="button"
                className="error-choice-btn"
                onClick={() => run("applyAttribution", kind, player.idx)}
              >
                {player.label}
              </button>
            ))}
          </div>
        </>
      )}
    </ModalDialog>
  );
}
