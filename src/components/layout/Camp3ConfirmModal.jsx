import { ModalCloseButton } from "../ui/Modal.jsx";
import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { camp3ConfirmStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function Camp3ConfirmModal() {
  const view = useViewStore(camp3ConfirmStore);
  const close = (result = false) =>
    appActions.closeCamp3ConfirmModal(result).catch(console.error);
  const change = (row, field, value) => row.onChange(field, value);
  return (
    <ModalDialog
      id="camp3-confirm-modal"
      className="settings-modal camp3-confirm-modal"
      aria-labelledby="camp3-confirm-title"
      open={view.open}
      onClose={() => close()}
      variant="settings"
      backdropProps={{ "data-close-camp3-confirm": "" }}
      contentProps={{
        className: "settings-modal__content camp3-confirm-modal__content",
      }}
      title={<h3 id="camp3-confirm-title">Conferma import CAMP3</h3>}
      closeProps={{ id: "camp3-confirm-close" }}
      bodyProps={{ className: "settings-modal__body camp3-confirm-modal__body" }}
    >
      <div id="camp3-confirm-summary" className="camp3-confirm-summary">
        <p className="section-note">
          Controlla e modifica le righe riconosciute prima di applicarle alla squadra.
        </p>
        {!!view.rows.length && (
          <section className="camp3-confirm-section">
            <h4>Giocatrici lette dal CAMP3 ({view.rows.length})</h4>
            <div className="camp3-confirm-tablewrap">
              <table className="camp3-confirm-table">
                <thead>
                  <tr>
                    {["Stato", "#", "Cognome", "Nome", "L", "K", ""].map((label, index) => (
                      <th key={index}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={row.id} className={"camp3-confirm-row camp3-confirm-row--" + row.kind}>
                      <td>
                        <span className={"camp3-confirm-status camp3-confirm-status--" + row.kind}>
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
                            onChange={(event) => change(row, field, event.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="checkbox"
                          checked={row.role === "L"}
                          onChange={(event) => change(row, "role", event.target.checked ? "L" : "")}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!row.isCaptain}
                          onChange={(event) => change(row, "isCaptain", event.target.checked)}
                        />
                      </td>
                      <td>
                        <ModalCloseButton className="pill-remove camp3-confirm-remove"
aria-label="Elimina modifica"
onClick={row.onRemove} />
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
                <div key={row.id || index} className="camp3-confirm-out-item">
                  <span>{row.name || "Giocatrice"}</span>
                  <ModalCloseButton className="pill-remove camp3-confirm-remove"
aria-label="Non mettere fuori rosa"
onClick={row.onRemove} />
                </div>
              ))}
            </div>
          </section>
        )}
        {!view.rows.length && !view.outRows.length && (
          <div className="players-empty">Nessuna modifica da applicare.</div>
        )}
      </div>
      <div className="settings-actions">
        <button id="camp3-confirm-cancel" className="secondary" type="button" onClick={() => close()}>
          Annulla
        </button>
        <button
          id="camp3-confirm-apply"
          className="primary"
          type="button"
          onClick={() => close(true)}
        >
          Applica modifiche
        </button>
      </div>
    </ModalDialog>
  );
}
