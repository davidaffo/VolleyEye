import {
  AppActionButton,
  MatchImportButton,
  MatchImportInput,
} from "../AppActions.jsx";
import { MatchArchiveList, MatchActionButton } from "../MatchArchive.jsx";
import { ThemeButton } from "../RuntimeControls.jsx";

// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function MatchPage() {
  return (
    <div className={"tab-panel active"} data-tab={"match"}>
      <div className={"section"}>
        <div className={"match-lobby-heading"}>
          <div>
            <p className={"match-lobby-eyebrow"}>{"Archivio partite"}</p>
            <h2>{"Scegli una partita"}</h2>
            <p className={"section-note"}>
              {
                "Seleziona una partita e accedi al suo spazio dedicato per Scout live, Analisi e Video."
              }
            </p>
          </div>
          <div className={"lobby-theme-picker"}>
            <span className={"lobby-theme-picker__label"}>{"Tema"}</span>
            <div
              className={"theme-toggle"}
              role={"group"}
              aria-label={"Tema applicazione"}
            >
              <ThemeButton
                type={"button"}
                id={"theme-dark-lobby"}
                className={"secondary"}
                data-theme-choice={"dark"}
                aria-pressed={"false"}
                title={"Tema scuro"}
              >
                {"🌙 Scuro"}
              </ThemeButton>
              <ThemeButton
                type={"button"}
                id={"theme-light-lobby"}
                className={"secondary"}
                data-theme-choice={"light"}
                aria-pressed={"false"}
                title={"Tema chiaro"}
              >
                {"☀️ Chiaro"}
              </ThemeButton>
            </div>
          </div>
        </div>
      </div>
      <div className={"section"}>
        <div className={"match-manager__content"}>
          <div className={"match-manager__body"}>
            <div className={"match-manager-grid"}>
              <div className={"match-manager-panel"}>
                <h4>{"Match salvati"}</h4>
                <MatchArchiveList />
                <div className={"controls-row"}>
                  <MatchActionButton
                    command="enterSelectedMatch"
                    requiresSelection
                    id={"btn-load-match"}
                  >
                    {"Entra nella partita"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="createNewMatchFromPrompt"
                    id={"btn-new-match"}
                    className={"secondary"}
                  >
                    {"Nuovo match"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="editMatch"
                    type={"button"}
                    className={"secondary"}
                    data-edit-match={""}
                  >
                    {"Modifica dati partita"}
                  </MatchActionButton>
                  <MatchActionButton
                    command="deleteSelectedMatch"
                    requiresSelection
                    id={"btn-delete-match"}
                    className={"danger"}
                  >
                    {"Elimina"}
                  </MatchActionButton>
                </div>
                <div className={"controls-row match-actions-row"}>
                  <AppActionButton id={"btn-reset-match"} className={"danger"}>
                    {"Reset match"}
                  </AppActionButton>
                  <AppActionButton
                    id={"btn-export-match"}
                    className={"secondary"}
                  >
                    {"Esporta match"}
                  </AppActionButton>
                  <AppActionButton
                    id={"btn-export-dvw"}
                    className={"secondary"}
                  >
                    {"Esporta DataVolley"}
                  </AppActionButton>
                  <MatchImportButton
                    id={"btn-import-match"}
                    className={"secondary"}
                  >
                    {"Importa match"}
                  </MatchImportButton>
                  <MatchImportInput
                    id={"match-file-input"}
                    type={"file"}
                    accept={".json,.dvw,application/json,text/plain"}
                    hidden={true}
                  />
                </div>
              </div>
              <div className={"match-manager-panel"}>
                <h4>{"Archivio squadre"}</h4>
                <p className={"section-note"}>
                  {
                    "Crea, modifica, importa ed esporta le squadre disponibili. L’associazione a una partita avviene soltanto durante la sua creazione."
                  }
                </p>
                <div className={"controls-row"}>
                  <button id={"btn-open-teams-manager"} className={"secondary"}>
                    {"Gestione squadre"}
                  </button>
                </div>
              </div>
              <div
                className={"match-manager-panel match-manager-panel--actions"}
              >
                <h4>{"Azioni database"}</h4>
                <button
                  id={"btn-open-debug-modal"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Debug"}
                </button>
                <div className={"controls-row match-actions-row"}>
                  <button id={"btn-export-db"} className={"secondary"}>
                    {"Esporta database completo"}
                  </button>
                  <button id={"btn-import-db"} className={"secondary"}>
                    {"Importa database"}
                  </button>
                  <input
                    id={"db-file-input"}
                    type={"file"}
                    accept={"application/json,text/plain"}
                    hidden={true}
                  />
                </div>
                <div
                  className={
                    "controls-row match-actions-row match-actions-row--url"
                  }
                >
                  <input
                    id={"import-db-url"}
                    type={"url"}
                    className={"match-url-input"}
                    placeholder={"https://.../backup.json"}
                  />
                  <button id={"btn-import-db-url"} className={"secondary"}>
                    {"Importa database da URL"}
                  </button>
                </div>
                <div className={"controls-row match-actions-row"}>
                  <button
                    id={"btn-delete-demo-data"}
                    className={"secondary hidden"}
                    type={"button"}
                  >
                    {"Cancella dati demo"}
                  </button>
                  <button
                    id={"btn-reset-app"}
                    className={"danger"}
                    type={"button"}
                  >
                    {"Cancella dati app"}
                  </button>
                </div>
                <p className={"section-note"}>
                  {
                    "Backup di tutte le impostazioni, squadre e match attuale in un unico file."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
