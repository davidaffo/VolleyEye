import { useRef, useState, useSyncExternalStore } from "react";
import { teamEditorStore } from "../../state/team-editor-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
import { TeamEditorTable, TeamDefaultLineup } from "../TeamEditor.jsx";
export function TeamManagerModal() {
  const view = useSyncExternalStore(
    teamEditorStore.subscribe,
    teamEditorStore.getSnapshot,
    teamEditorStore.getSnapshot,
  );
  const campFile = useRef(null);
  const [importing, setImporting] = useState(false);
  const run = async (command, ...args) => {
    try {
      return await invokeRuntime(command, ...args);
    } catch (error) {
      console.error("Operazione squadra non riuscita", error);
      window.alert(error.message);
    }
  };
  const field = (name) => ({
    value: view.meta[name],
    "data-react-managed": "true",
    onChange: (event) =>
      teamEditorStore.updateMetadata(name, event.target.value),
  });
  const close = () => run("closeTeamManagerModal");
  return (
    <div
      id={"team-manager-modal"}
      className={"team-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role={"dialog"}
      aria-modal={"true"}
    >
      <div className={"team-modal__backdrop"} onClick={close}></div>
      <div
        className={
          "team-modal__dialog" +
          (view.liveEdit ? " team-modal__dialog--live-edit" : "")
        }
      >
        <div className={"team-modal__head"}>
          <h3>{view.title}</h3>
          <button
            id={"team-manager-close"}
            data-react-managed="true"
            onClick={() => run("closeTeamManagerModal")}
            aria-label={"Chiudi"}
            className={"icon-button"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"team-modal__content"}>
          <div className={"team-meta-grid"}>
            <label>
              {"Nome squadra\n            "}
              <input
                type={"text"}
                id={"team-meta-name"}
                {...field("name")}
                disabled={!view.isNew}
                title={!view.isNew ? "Rinomina squadra disabilitata" : ""}
                placeholder={"Nome squadra"}
              />
            </label>
            <label>
              {"Head coach\n            "}
              <input
                type={"text"}
                id={"team-meta-head"}
                {...field("headCoach")}
                placeholder={"Allenatore"}
              />
            </label>
            <label>
              {"Vice\n            "}
              <input
                type={"text"}
                id={"team-meta-assistant"}
                {...field("assistantCoach")}
                placeholder={"Assistente"}
              />
            </label>
            <label>
              {"Dirigente\n            "}
              <input
                type={"text"}
                id={"team-meta-manager"}
                {...field("manager")}
                placeholder={"Dirigente"}
              />
            </label>
          </div>
          <p
            id={"team-manager-live-note"}
            className={"section-note" + (view.liveEdit ? "" : " hidden")}
          >
            {
              "Modifica rapida in partita: puoi aggiungere giocatrici e correggere nomi o numeri senza resettare formazione e dati gara. Le rimozioni restano disabilitate."
            }
          </p>
          <p className={"section-note"}>
            {
              "Imposta staff, capitana (K), liberi (L) e chi è fuori rosa. La formazione di default si gestisce dal pannello a destra. I ruoli in campo sono sempre inferiti automaticamente dalla posizione del palleggiatore nella rotazione reale."
            }
          </p>
          <div className={"team-manager-actions"}>
            <button
              id={"team-manager-add"}
              data-react-managed="true"
              onClick={() => run("addManagedTeamPlayer")}
              className={"secondary"}
            >
              {"Aggiungi giocatrice"}
            </button>
            <button
              id={"btn-open-players-paste"}
              data-react-managed="true"
              onClick={() => run("openManagedPlayersPaste")}
              className={"secondary"}
            >
              {"Incolla elenco"}
            </button>
            <button
              id={"btn-import-camp3"}
              className={"secondary"}
              data-react-managed="true"
              disabled={importing}
              onClick={() => {
                campFile.current.value = "";
                campFile.current.click();
              }}
            >
              {importing ? "Lettura CAMP3..." : "Importa CAMP3"}
            </button>
            <input
              id={"camp3-file-input"}
              ref={campFile}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImporting(true);
                try {
                  await invokeRuntime("importCamp3IntoTeamManager", file);
                } catch (error) {
                  console.error("Errore import CAMP3", error);
                  window.alert(
                    "CAMP3 non leggibile. Per PDF o foto serve connessione per caricare il motore di lettura.",
                  );
                } finally {
                  setImporting(false);
                  campFile.current.value = "";
                }
              }}
              type={"file"}
              accept={".pdf,.txt,text/plain,application/pdf,image/*"}
              hidden={true}
            />
            <button
              id={"team-manager-template"}
              data-react-managed="true"
              onClick={() => run("generateManagedTeamTemplate")}
              className={"secondary" + (view.players.length ? " hidden" : "")}
            >
              {"Genera squadra di default"}
            </button>
          </div>
          <div className={"team-manager-roster-layout"}>
            <div className={"team-manager-roster"}>
              <div className={"table-wrapper team-manager-tablewrap"}>
                <table className={"team-manager-table"}>
                  <thead>
                    <tr>
                      <th>{"#"}</th>
                      <th>{"Cognome"}</th>
                      <th>{"Nome"}</th>
                      <th>{"Foto"}</th>
                      <th>{"Capitano"}</th>
                      <th>{"Libero"}</th>
                      <th>{"Fuori rosa"}</th>
                      <th>{"ID"}</th>
                      <th>{"Azioni"}</th>
                    </tr>
                  </thead>
                  <TeamEditorTable />
                </table>
              </div>
            </div>
            <TeamDefaultLineup />
          </div>
          <div className={"team-manager-footer"}>
            <button
              id={"btn-export-team"}
              data-react-managed="true"
              onClick={() => run("exportCurrentTeamToFile")}
              className={"secondary"}
            >
              {"Esporta su file"}
            </button>
            <button
              id={"team-manager-cancel"}
              data-react-managed="true"
              onClick={() => run("closeTeamManagerModal")}
              className={"secondary"}
            >
              {"Annulla"}
            </button>
            <button
              id={"team-manager-save"}
              data-react-managed="true"
              onClick={() => run("saveTeamManagerPayload")}
              className={"primary"}
            >
              {"Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
