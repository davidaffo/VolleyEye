import { AppActionButton } from "../AppActions.jsx";
import { MetricsConfig } from "../MetricsConfig.jsx";
import { ThemeButton } from "../RuntimeControls.jsx";

// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function InfoPage() {
  return (
    <div className={"tab-panel"} data-tab={"info"}>
      <div className={"section"}>
        <h2>{"Impostazioni"}</h2>
      </div>
      <div className={"section global-team-settings"}>
        <div className={"global-settings-grid"}>
          <div className={"global-settings-card"}>
            <h3>{"Aspetto"}</h3>
            <p className={"section-note"}>
              {
                "Scegli il tema usato in tutta l’applicazione oppure segui quello del dispositivo."
              }
            </p>
            <div
              className={"theme-toggle"}
              role={"group"}
              aria-label={"Tema applicazione"}
            >
              <ThemeButton
                type={"button"}
                id={"theme-dark"}
                className={"secondary"}
                data-theme-choice={"dark"}
                aria-pressed={"false"}
                title={"Tema scuro"}
              >
                {"🌙 Scuro"}
              </ThemeButton>
              <ThemeButton
                type={"button"}
                id={"theme-light"}
                className={"secondary"}
                data-theme-choice={"light"}
                aria-pressed={"false"}
                title={"Tema chiaro"}
              >
                {"☀️ Chiaro"}
              </ThemeButton>
            </div>
          </div>
          <div className={"global-settings-card"}>
            <h3>{"Scouting squadra avversaria"}</h3>
            <p className={"section-note"}>
              {
                "Scegli quali fondamentali sono disponibili quando la partita usa due squadre."
              }
            </p>
            <div className={"opponent-skill-toggles"}>
              <label className={"auto-rotate-toggle skill-serve"}>
                <input type={"checkbox"} id={"opponent-skill-serve"} />
                {" Battuta"}
              </label>
              <label className={"auto-rotate-toggle skill-pass"}>
                <input type={"checkbox"} id={"opponent-skill-pass"} />
                {" Ricezione"}
              </label>
              <label className={"auto-rotate-toggle skill-freeball"}>
                <input type={"checkbox"} id={"opponent-skill-freeball"} />
                {" Freeball"}
              </label>
              <label className={"auto-rotate-toggle skill-second"}>
                <input type={"checkbox"} id={"opponent-skill-second"} />
                {" Alzata"}
              </label>
              <label className={"auto-rotate-toggle skill-attack"}>
                <input type={"checkbox"} id={"opponent-skill-attack"} />
                {" Attacco"}
              </label>
              <label className={"auto-rotate-toggle skill-defense"}>
                <input type={"checkbox"} id={"opponent-skill-defense"} />
                {" Difesa"}
              </label>
              <label className={"auto-rotate-toggle skill-block"}>
                <input type={"checkbox"} id={"opponent-skill-block"} />
                {" Muro"}
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className={"section"}>
        <details className={"import-panel metrics-panel"} open={true}>
          <summary>{"Regole calcolo efficienza/positività"}</summary>
          <p className={"section-note"}>
            {
              "Positività = positivi / totali · Efficienza = (positivi - negativi) / totali · Perfezione = # / totali."
            }
            <br />
            {
              "Nota bene: è sconsigliato togliere codici, disattivare battuta, ricezione attacco e modificare le regole di assegnazione punto quando si utilizza la modalità automatica. "
            }
          </p>
          <div className={"controls-row metrics-actions"}>
            <AppActionButton id={"btn-reset-codes"} className={"secondary"}>
              {"Riattiva tutte le valutazioni"}
            </AppActionButton>
            <AppActionButton id={"btn-reset-metrics"} className={"secondary"}>
              {"Ripristina criteri calcolo efficienza"}
            </AppActionButton>
            <AppActionButton id={"btn-reset-points"} className={"secondary"}>
              {"Ripristina punti default"}
            </AppActionButton>
          </div>
          <MetricsConfig />
        </details>
      </div>
    </div>
  );
}
