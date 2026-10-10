import { useSyncExternalStore } from "react";
import { camp3ConfirmStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function Camp3ConfirmModal() {
  const view = useSyncExternalStore(
    camp3ConfirmStore.subscribe,
    camp3ConfirmStore.getSnapshot,
    camp3ConfirmStore.getSnapshot,
  );
  const close = (result = false) =>
    invokeRuntime("closeCamp3ConfirmModal", result).catch(console.error);
  const change = (row, field, value) => row.onChange(field, value);
  return (
    <div
      id="camp3-confirm-modal"
      className={
        "settings-modal camp3-confirm-modal" + (view.open ? "" : " hidden")
      }
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camp3-confirm-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-camp3-confirm=""
        onClick={() => close()}
      />
      <div className="settings-modal__content camp3-confirm-modal__content">
        <div className="settings-modal__head">
          <h3 id="camp3-confirm-title">Conferma import CAMP3</h3>
          <button
            id="camp3-confirm-close"
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={() => close()}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body camp3-confirm-modal__body">
          <div
            id="camp3-confirm-summary"
            className="camp3-confirm-summary"
            data-react-managed="true"
          >
            <p className="section-note">
              Controlla e modifica le righe riconosciute prima di applicarle
              alla squadra.
            </p>
            {!!view.rows.length && (
              <section className="camp3-confirm-section">
                <h4>Giocatrici lette dal CAMP3 ({view.rows.length})</h4>
                <div className="camp3-confirm-tablewrap">
                  <table className="camp3-confirm-table">
                    <thead>
                      <tr>
                        {["Stato", "#", "Cognome", "Nome", "L", "K", ""].map(
                          (label, index) => (
                            <th key={index}>{label}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {view.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            "camp3-confirm-row camp3-confirm-row--" + row.kind
                          }
                        >
                          <td>
                            <span
                              className={
                                "camp3-confirm-status camp3-confirm-status--" +
                                row.kind
                              }
                            >
                              {row.kind === "added"
                                ? "Aggiunta"
                                : row.kind === "modified"
                                  ? "Modifica"
                                  : "Invariata"}
                            </span>
                          </td>
                          {["number", "lastName", "firstName"].map((field) => (
                            <td key={field}>
                              <input
                                className="team-manager-input"
                                type={field === "number" ? "number" : "text"}
                                min={field === "number" ? "0" : undefined}
                                max={field === "number" ? "999" : undefined}
                                value={row[field] || ""}
                                onChange={(event) =>
                                  change(row, field, event.target.value)
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <input
                              type="checkbox"
                              checked={row.role === "L"}
                              onChange={(event) =>
                                change(
                                  row,
                                  "role",
                                  event.target.checked ? "L" : "",
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!row.isCaptain}
                              onChange={(event) =>
                                change(row, "isCaptain", event.target.checked)
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="pill-remove camp3-confirm-remove"
                              aria-label="Elimina modifica"
                              onClick={row.onRemove}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {!!view.outRows.length && (
              <section className="camp3-confirm-section">
                <h4>Da mettere fuori rosa ({view.outRows.length})</h4>
                <div className="camp3-confirm-out-list">
                  {view.outRows.map((row, index) => (
                    <div
                      key={row.id || index}
                      className="camp3-confirm-out-item"
                    >
                      <span>{row.name || "Giocatrice"}</span>
                      <button
                        type="button"
                        className="pill-remove camp3-confirm-remove"
                        aria-label="Non mettere fuori rosa"
                        onClick={row.onRemove}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {!view.rows.length && !view.outRows.length && (
              <div className="players-empty">
                Nessuna modifica da applicare.
              </div>
            )}
          </div>
          <div className="settings-actions">
            <button
              id="camp3-confirm-cancel"
              className="secondary"
              type="button"
              data-react-managed="true"
              onClick={() => close()}
            >
              Annulla
            </button>
            <button
              id="camp3-confirm-apply"
              className="primary"
              type="button"
              data-react-managed="true"
              onClick={() => close(true)}
            >
              Applica modifiche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
