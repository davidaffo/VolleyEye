import { AppActionButton } from "./AppActions.jsx";
import { ScoutToggle } from "./ScoutOptions.jsx";
import { TeamCounter } from "./TeamCounter.jsx";

const toggles = [
  ["auto-role-p1american-toggle", "P1 americana"],
  ["attack-trajectory-toggle", "Traiettoria attacco"],
  ["settype-prompt-toggle-inline", "Tipo alzata"],
  ["serve-trajectory-toggle-inline", "Traiettoria servizio"],
  ["serve-trajectory-log-toggle-inline", "Traiettorie del battitore"],
];
const scopes = {
  our: {
    panel: "home",
    title: "Impostazioni squadra",
    editor: "btn-open-live-team-editor",
    editLabel: "Modifica squadra in partita",
    suffix: "",
    timeoutId: "timeout-count",
    timeoutCounter: "timeoutsOur",
    substitutionsId: "substitution-remaining",
    substitutionsCounter: "substitutionsOur",
  },
  opponent: {
    panel: "opponent",
    title: "Impostazioni avversaria",
    editor: "btn-open-live-opponent-team-editor",
    editLabel: "Modifica squadra avversaria in partita",
    suffix: "-opp",
    timeoutId: "timeout-opp-count",
    timeoutCounter: "timeoutsOpponent",
    substitutionsId: "substitution-remaining-opp",
    substitutionsCounter: "substitutionsOpponent",
  },
};
function CounterLabel({ label, id, counter }) {
  return (
    <span className="team-counter">
      {label}
      <strong id={id}>
        <TeamCounter counter={counter} />
      </strong>
    </span>
  );
}
export function ScoutTeamSettings({ scope }) {
  const config = scopes[scope];
  return (
    <div
      className={`court-actions-bar team-panel team-panel--${config.panel}`}
      data-team-panel={`${config.panel}-settings`}
    >
      <div className="panel-title-row">
        <h3 className="panel-title">{config.title}</h3>
        <AppActionButton
          id={config.editor}
          className="icon-button team-panel-edit-btn"
          type="button"
          aria-label={config.editLabel}
          title={config.editLabel}
        >
          ✎
        </AppActionButton>
      </div>
      <div className="rotation-toggles">
        {toggles.map(([id, label]) => (
          <label className="auto-rotate-toggle" key={id}>
            <ScoutToggle type="checkbox" id={id + config.suffix} />
            {"\n                  " + label + "\n                "}
          </label>
        ))}
      </div>
      <div className="team-timeout-block">
        <AppActionButton
          id={"btn-timeout" + config.suffix}
          className={scope === "our" ? "small secondary" : "secondary small"}
        >
          Timeout
        </AppActionButton>
        <AppActionButton
          id={"btn-open-lineup" + config.suffix}
          className="secondary small"
        >
          Formazione/Sostituzione
        </AppActionButton>
        <CounterLabel
          label="TO: "
          id={config.timeoutId}
          counter={config.timeoutCounter}
        />
        <CounterLabel
          label="Cambi: "
          id={config.substitutionsId}
          counter={config.substitutionsCounter}
        />
      </div>
    </div>
  );
}
