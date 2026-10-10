import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { attributionStore } from "../state/attribution-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
function run(command, ...args) {
  invokeRuntime(command, ...args).catch((error) => {
    console.error("Assegnazione non riuscita", error);
    window.alert(error.message);
  });
}
export function AttributionModal({ kind }) {
  const snapshot = useSyncExternalStore(
    attributionStore.subscribe,
    attributionStore.getSnapshot,
    attributionStore.getSnapshot,
  );
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  const view = snapshot[kind];
  const disabled = !!view.courtModal && !!controls.scoutControlsDisabled;
  const point = kind === "point";
  const close = () => run(point ? "closePointModal" : "closeErrorModal");
  const picker = view.fromPicker || view.teamFromPicker;
  return (
    <div
      id={kind + "-modal"}
      className={
        "skill-modal" +
        (view.courtModal ? " court-modal" : "") +
        (view.open ? "" : " hidden")
      }
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby={kind + "-modal-title"}
    >
      <div
        className="skill-modal__backdrop"
        {...{ ["data-close-" + kind]: "" }}
        onClick={close}
      ></div>
      <div className="skill-modal__content">
        <div className="skill-modal__head">
          <div id={kind + "-modal-title"} className="skill-modal__title">
            {point ? "Assegna punto" : "Assegna errore/fallo"}
          </div>
          <button
            data-react-managed="true"
            disabled={disabled}
            id={kind + "-modal-close"}
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div
          id={kind + "-modal-body"}
          className="skill-modal__body"
          data-react-managed="true"
        >
          {!point && (
            <div className="error-type-section">
              <p className="section-note">Tipo errore:</p>
              <div className="error-choice-grid error-type-grid">
                {view.types.map((type) => (
                  <button
                    data-react-managed="true"
                    disabled={disabled}
                    key={type.id}
                    type="button"
                    data-error-type={type.id}
                    className={
                      "error-choice-btn error-type-btn" +
                      (type.id === view.selectedType ? " active" : "")
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
                    data-react-managed="true"
                    disabled={disabled}
                    type="button"
                    className="error-choice-btn"
                    onClick={() =>
                      run("applyAttribution", kind, view.pickedIndex)
                    }
                  >
                    Applica a {view.pickedLabel}
                  </button>
                )}
                {!view.fromPicker && (
                  <button
                    data-react-managed="true"
                    disabled={disabled}
                    type="button"
                    className={
                      "error-choice-btn " + (point ? "success" : "danger")
                    }
                    onClick={() => run("applyAttribution", kind)}
                  >
                    Assegna alla squadra
                  </button>
                )}
                {view.players.map((player) => (
                  <button
                    data-react-managed="true"
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
        </div>
      </div>
    </div>
  );
}
