import { CloudDatabase } from "../CloudDatabase.jsx";
import { ThemePicker } from '../ThemePicker.jsx';
import { ButtonList } from "../ui/ButtonList.jsx";
import { TabPanel } from "../ui/TabPanel.jsx";
import { AppActionButton, DatabaseImportInput, DemoDeleteButton, MatchImportButton, MatchImportInput } from "../AppActions.jsx";
import { MatchArchiveList, MatchActionButton } from "../MatchArchive.jsx";

export function MatchPage() {
  return (
    <TabPanel className="tab-panel active" data-tab="match">
      <div className="section">
        <div className="match-lobby-heading">
          <div>
            <p className="match-lobby-eyebrow">{"Archivio partite"}</p>
            <h2>{"Scegli una partita"}</h2>
            <p className="section-note">
              {
                "Seleziona una partita e accedi al suo spazio dedicato per Scout live, Analisi e Video."
              }
            </p>
          </div>
          <div className="lobby-theme-picker">
            <span className="lobby-theme-picker__label">{"Tema"}</span>
            <ThemePicker suffix="-lobby" />
          </div>
        </div>
      </div>
      <div className="section">
        <div className="match-manager__content">
          <div className="match-manager__body">
            <div className="match-manager-grid">
              <div className="match-manager-panel">
                <h4>{"Match salvati"}</h4>
                <MatchArchiveList />
                <div className="controls-row">
                  <MatchActionButton
                    command="enterSelectedMatch"
                    requiresSelection
                    id="btn-load-match"
                  >
                    {"Entra nella partita"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="createNewMatchFromPrompt"
                    id="btn-new-match"
                    className="secondary"
                  >
                    {"Nuovo match"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="editMatch"
                    type="button"
                    className="secondary"
                    data-edit-match=""
                  >
                    {"Modifica dati partita"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="deleteSelectedMatch"
                    requiresSelection
                    id="btn-delete-match"
                    className="danger"
                  >
                    {"Elimina"}
                  </MatchActionButton>
                </div>
                <div className="controls-row match-actions-row">
                  <ButtonList as={AppActionButton}
                items={[
                  ["btn-reset-match","Reset match",{"className":"danger"}],
                  ["btn-export-match","Esporta match",{"className":"secondary"}],
                  ["btn-export-dvw","Esporta DataVolley",{"className":"secondary"}],
                ]}
              />
                  <MatchImportButton
                    id="btn-import-match"
                    className="secondary"
                  >
                    {"Importa match"}
                  </MatchImportButton>
                  <MatchImportInput
                    id="match-file-input"
                    type="file"
                    accept=".json,.dvw,application/json,text/plain"
                    hidden={true}
                  />
                </div>
              </div>
              <div className="match-manager-panel">
                <h4>{"Archivio squadre"}</h4>
                <p className="section-note">
                  {
                    "Crea, modifica, importa ed esporta le squadre disponibili. L’associazione a una partita avviene soltanto durante la sua creazione."
                  }
                </p>
                <div className="controls-row">
                  <AppActionButton
                    id="btn-open-teams-manager"
                    className="secondary"
                  >
                    {"Gestione squadre"}
                  </AppActionButton>
                </div>
              </div>
              <div className="match-manager-panel match-manager-panel--actions">
                <h4>{"Azioni database"}</h4>
                <div className="controls-row match-actions-row database-actions-row">
                <AppActionButton
                  id="btn-open-debug-modal"
                  className="secondary"
                  type="button"
                >
                  {"Debug"}
                </AppActionButton>
                  <AppActionButton id="btn-export-db" className="secondary">
                    {"Esporta database completo"}
                  </AppActionButton>
                  <AppActionButton id="btn-import-db" className="secondary">
                    {"Importa database"}
                  </AppActionButton>
                  <DatabaseImportInput
                    id="db-file-input"
                    type="file"
                    accept="application/json,text/plain"
                    hidden={true}
                  />
                  <CloudDatabase />
                  <DemoDeleteButton
                    id="btn-delete-demo-data"
                    className="secondary hidden"
                    type="button"
                  >
                    {"Cancella dati demo"}
                  </DemoDeleteButton>
                  <AppActionButton
                    id="btn-reset-app"
                    className="danger"
                    type="button"
                  >
                    {"Cancella dati app"}
                  </AppActionButton>
                </div>
                <p className="section-note">
                  {
                    "Backup di tutte le impostazioni, squadre e match attuale in un unico file."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TabPanel>
  );
}
