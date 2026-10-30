import { ModalDialog } from "../ui/Modal.jsx";
import { HeaderCells } from "../ui/HeaderCells.jsx";

import { TeamEditorTable, TeamDefaultLineup } from "../TeamEditor.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useRef, useState } from "react";
import { teamEditorStore } from "../../state/team-editor-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

export function TeamManagerModal() {
  const view = useViewStore(teamEditorStore);
  const campFile = useRef(null);
  const [importing, setImporting] = useState(false);
  const run = async (command, ...args) => {
    try {
      return await appActions[command]( ...args);
    } catch (error) {
      console.error("Operazione squadra non riuscita", error);
      window.alert(error.message);
    }
  };
  const field = (name) => ({
    value: view.meta[name],
    onChange: (event) =>
      teamEditorStore.updateMetadata(name, event.target.value),
  });
  const close = () => run("closeTeamManagerModal");
  return (
    <ModalDialog
      id="team-manager-modal"
      open={view.open}
      onClose={close}
      variant="team"
      backdropProps={{}}
      contentProps={{
        className: "team-modal__dialog" + (view.liveEdit ? " team-modal__dialog--live-edit" : ""),
      }}
      closeOnRoot
      title={<h3>{view.title}</h3>}
      closeProps={{
        id: "team-manager-close",
        onClick: () => run("closeTeamManagerModal"),
        className: "icon-button",
      }}
      bodyProps={{ className: "team-modal__content" }}
    >
      <div className="team-meta-grid">
        <label>
          {"Nome squadra\n            "}
          <input
            type="text"
            id="team-meta-name"
            {...field("name")}
            disabled={!view.isNew}
            title={!view.isNew ? "Rinomina squadra disabilitata" : ""}
            placeholder="Nome squadra"
          />
        </label>
        <label>
          {"Head coach\n            "}
          <input type="text" id="team-meta-head" {...field("headCoach")} placeholder="Allenatore" />
        </label>
        <label>
          {"Vice\n            "}
          <input
            type="text"
            id="team-meta-assistant"
            {...field("assistantCoach")}
            placeholder="Assistente"
          />
        </label>
        <label>
          {"Dirigente\n            "}
          <input type="text" id="team-meta-manager" {...field("manager")} placeholder="Dirigente" />
        </label>
      </div>
      <p id="team-manager-live-note" className={"section-note" + (view.liveEdit ? "" : " hidden")}>
        {
          "Modifica rapida in partita: puoi aggiungere giocatrici e correggere nomi o numeri senza resettare formazione e dati gara. Le rimozioni restano disabilitate."
        }
      </p>
      <p className="section-note">
        {
          "Imposta staff, capitana (K), liberi (L) e chi è fuori rosa. La formazione di default si gestisce dal pannello a destra. I ruoli in campo sono sempre inferiti automaticamente dalla posizione del palleggiatore nella rotazione reale."
        }
      </p>
      <div className="team-manager-actions">
        <button
          id="team-manager-add"
          onClick={() => run("addManagedTeamPlayer")}
          className="secondary"
        >
          {"Aggiungi giocatrice"}
        </button>
        <button
          id="btn-open-players-paste"
          onClick={() => run("openManagedPlayersPaste")}
          className="secondary"
        >
          {"Incolla elenco"}
        </button>
        <button
          id="btn-import-camp3"
          className="secondary"
          disabled={importing}
          onClick={() => {
            campFile.current.value = "";
            campFile.current.click();
          }}
        >
          {importing ? "Lettura CAMP3..." : "Importa CAMP3"}
        </button>
        <input
          id="camp3-file-input"
          ref={campFile}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setImporting(true);
            try {
              await appActions.importCamp3IntoTeamManager(file);
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
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf,image/*"
          hidden={true}
        />
        <button
          id="team-manager-template"
          onClick={() => run("generateManagedTeamTemplate")}
          className={"secondary" + (view.players.length ? " hidden" : "")}
        >
          {"Genera squadra di default"}
        </button>
      </div>
      <div className="team-manager-roster-layout">
        <div className="team-manager-roster">
          <div className="table-wrapper team-manager-tablewrap">
            <table className="team-manager-table">
              <thead>
                <tr>
                  <HeaderCells
                    labels={[
                      "#",
                      "Cognome",
                      "Nome",
                      "Foto",
                      "Capitano",
                      "Libero",
                      "Fuori rosa",
                      "ID",
                      "Azioni",
                    ]}
                  />
                </tr>
              </thead>
              <TeamEditorTable />
            </table>
          </div>
        </div>
        <TeamDefaultLineup />
      </div>
      <div className="team-manager-footer">
        <button
          id="btn-export-team"
          onClick={() => run("exportCurrentTeamToFile")}
          className="secondary"
        >
          {"Esporta su file"}
        </button>
        <button
          id="team-manager-cancel"
          onClick={() => run("closeTeamManagerModal")}
          className="secondary"
        >
          {"Annulla"}
        </button>
        <button
          id="team-manager-save"
          onClick={() => run("saveTeamManagerPayload")}
          className="primary"
        >
          {"Salva"}
        </button>
      </div>
    </ModalDialog>
  );
}
