import { SKILLS } from "../../../js/globals.js";
import { ThemePicker } from "../ThemePicker.jsx";
import { ButtonList } from "../ui/ButtonList.jsx";
import { TabPanel } from "../ui/TabPanel.jsx";
import { OpponentSkillToggle } from "../ScoutOptions.jsx";
import { AppActionButton } from "../AppActions.jsx";
import { MetricsConfig } from "../MetricsConfig.jsx";

export function InfoPage() {
  return (
    <TabPanel className="tab-panel" data-tab="info">
      <div className="section">
        <h2>{"Impostazioni"}</h2>
      </div>
      <div className="section global-team-settings">
        <div className="global-settings-grid">
          <div className="global-settings-card">
            <h3>{"Aspetto"}</h3>
            <p className="section-note">
              {
                "Scegli il tema usato in tutta l’applicazione oppure segui quello del dispositivo."
              }
            </p>
            <ThemePicker />
          </div>
          <div className="global-settings-card">
            <h3>{"Scouting squadra avversaria"}</h3>
            <p className="section-note">
              {
                "Scegli quali fondamentali sono disponibili quando la partita usa due squadre."
              }
            </p>
            <div className="opponent-skill-toggles">
              {SKILLS.map(skill => (
                <label key={skill.id} className={"auto-rotate-toggle skill-" + skill.id}>
                  <OpponentSkillToggle id={"opponent-skill-" + skill.id} />
                  {" " + skill.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="section">
        <details className="import-panel metrics-panel" open={true}>
          <summary>{"Regole calcolo efficienza/positività"}</summary>
          <p className="section-note">
            {
              "Positività = positivi / totali · Efficienza = (positivi - negativi) / totali · Perfezione = # / totali."
            }
            <br />
            {
              "Nota bene: è sconsigliato togliere codici, disattivare battuta, ricezione attacco e modificare le regole di assegnazione punto quando si utilizza la modalità automatica. "
            }
          </p>
          <div className="controls-row metrics-actions">
            <ButtonList as={AppActionButton} className="secondary"
                items={[
                  ["btn-reset-codes","Riattiva tutte le valutazioni"],
                  ["btn-reset-metrics","Ripristina criteri calcolo efficienza"],
                  ["btn-reset-points","Ripristina punti default"],
                ]}
              />
          </div>
          <MetricsConfig />
        </details>
      </div>
    </TabPanel>
  );
}
