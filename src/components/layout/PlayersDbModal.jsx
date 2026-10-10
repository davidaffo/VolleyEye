import { useState, useSyncExternalStore } from "react";
import { playersDbStore } from "../../state/players-db-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
function report(error) {
  console.error("Operazione archivio giocatrici non riuscita", error);
  window.alert(error.message);
}
export function PlayersDbModal() {
  const view = useSyncExternalStore(
    playersDbStore.subscribe,
    playersDbStore.getSnapshot,
    playersDbStore.getSnapshot,
  );
  const [merging, setMerging] = useState(false);
  const run = (command, ...args) =>
    invokeRuntime(command, ...args).catch(report);
  const close = () => run("closePlayersDbModal");
  return (
    <div
      id="players-db-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="players-db-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-players-db=""
        onClick={close}
      ></div>
      <div className="settings-modal__content players-db__content">
        <div className="settings-modal__head">
          <h3 id="players-db-title">Archivio giocatrici</h3>
          <button
            id="players-db-close"
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body players-db__body">
          <div className="players-db__summary">
            <span id="players-db-count">{view.countLabel}</span>
            <button
              id="btn-clean-players-db"
              className="secondary small"
              data-react-managed="true"
              onClick={() => run("removeOrphanPlayersFromDb")}
            >
              Rimuovi senza squadra
            </button>
          </div>
          <div className="players-db__merge controls-row">
            {[
              {
                field: "primaryId",
                id: "players-db-merge-primary",
                label: "Mantieni",
              },
              {
                field: "secondaryId",
                id: "players-db-merge-secondary",
                label: "Unisci",
              },
            ].map((item) => (
              <span key={item.id} style={{ display: "contents" }}>
                <label htmlFor={item.id}>{item.label}</label>
                <select
                  id={item.id}
                  value={view[item.field]}
                  onChange={(event) =>
                    playersDbStore.select(item.field, event.target.value)
                  }
                >
                  <option value="">-</option>
                  {view.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>
            ))}
            <button
              id="btn-merge-players"
              className="secondary small"
              data-react-managed="true"
              disabled={merging || view.options.length < 2}
              onClick={async () => {
                if (merging) return;
                setMerging(true);
                try {
                  await run(
                    "mergeManagedPlayersDb",
                    view.primaryId,
                    view.secondaryId,
                  );
                } finally {
                  setMerging(false);
                }
              }}
            >
              Unisci ID
            </button>
          </div>
          <div className="table-wrapper players-db__tablewrap">
            <table className="players-db-table">
              <thead>
                <tr>
                  <th>Cognome</th>
                  <th>Nome</th>
                  <th>Foto</th>
                  <th>Squadre</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody id="players-db-body" data-react-managed="true">
                {view.entries.length ? (
                  view.entries.map((entry) => (
                    <tr key={entry.id} data-player-id={entry.id}>
                      <td>{entry.lastName}</td>
                      <td>{entry.firstName}</td>
                      <td>
                        <div className="players-db-photo-cell">
                          <div
                            className={
                              "players-db-photo-preview" +
                              (entry.photo ? "" : " empty")
                            }
                            style={
                              entry.photo
                                ? {
                                    backgroundImage:
                                      "url(" +
                                      JSON.stringify(entry.photo) +
                                      ")",
                                  }
                                : undefined
                            }
                            role="button"
                            tabIndex={0}
                            title={
                              entry.photo ? "Modifica foto" : "Aggiungi foto"
                            }
                            aria-label={
                              entry.photo ? "Modifica foto" : "Aggiungi foto"
                            }
                            onClick={() =>
                              Promise.resolve(entry.onPhoto()).catch(report)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                Promise.resolve(entry.onPhoto()).catch(report);
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td>{entry.teams}</td>
                      <td>{entry.id}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Nessuna giocatrice nell'archivio.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
