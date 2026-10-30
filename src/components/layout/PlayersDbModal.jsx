import { ModalDialog } from "../ui/Modal.jsx";
import { HeaderCells } from "../ui/HeaderCells.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useState } from "react";
import { playersDbStore } from "../../state/players-db-store.mjs";
import { actions as appActions, events as appEvents } from "../../app/actions.mjs";
function report(error) {
  console.error("Operazione archivio giocatrici non riuscita", error);
  window.alert(error.message);
}
export function PlayersDbModal() {
  const view = useViewStore(playersDbStore);
  const [merging, setMerging] = useState(false);
  const run = (command, ...args) =>
    appActions[command]( ...args).catch(report);
  const close = () => run("closePlayersDbModal");
  return (
    <ModalDialog
      id="players-db-modal"
      aria-labelledby="players-db-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-players-db": "" }}
      contentProps={{
        className: "settings-modal__content players-db__content",
      }}
      title={<h3 id="players-db-title">Archivio giocatrici</h3>}
      closeProps={{ id: "players-db-close" }}
      bodyProps={{ className: "settings-modal__body players-db__body" }}
    >
      <div className="players-db__summary">
        <span id="players-db-count">{view.countLabel}</span>
        <button
          id="btn-clean-players-db"
          className="secondary small"
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
              onChange={(event) => playersDbStore.select(item.field, event.target.value)}
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
          disabled={merging || view.options.length < 2}
          onClick={async () => {
            if (merging) return;
            setMerging(true);
            try {
              await run("mergeManagedPlayersDb", view.primaryId, view.secondaryId);
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
              <HeaderCells labels={["Cognome", "Nome", "Foto", "Squadre", "ID"]} />
            </tr>
          </thead>
          <tbody id="players-db-body">
            {view.entries.length ? (
              view.entries.map((entry) => (
                <tr key={entry.id} data-player-id={entry.id}>
                  <td>{entry.lastName}</td>
                  <td>{entry.firstName}</td>
                  <td>
                    <div className="players-db-photo-cell">
                      <div
                        className={"players-db-photo-preview" + (entry.photo ? "" : " empty")}
                        style={
                          entry.photo
                            ? {
                                backgroundImage: "url(" + JSON.stringify(entry.photo) + ")",
                              }
                            : undefined
                        }
                        role="button"
                        tabIndex={0}
                        title={entry.photo ? "Modifica foto" : "Aggiungi foto"}
                        aria-label={entry.photo ? "Modifica foto" : "Aggiungi foto"}
                        onClick={() => Promise.resolve(appEvents.editPlayersDbPhoto(entry)).catch(report)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            Promise.resolve(appEvents.editPlayersDbPhoto(entry)).catch(report);
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
    </ModalDialog>
  );
}
