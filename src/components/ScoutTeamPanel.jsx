import { useViewStore } from "../hooks/useViewStore.js";
import { settingsStore } from "../state/roster-import-store.mjs";
import { RotationControls } from './ui/RotationControls.jsx';
import { AppActionButton } from './AppActions.jsx';
import { ScoutActionButton, ScoutRotationSelect, ScoutLiberoSelect, ForceSkillButton } from './ScoutOptions.jsx';
import { LiberoBench } from './LiberoBench.jsx';
import { ScoutCourt } from './ScoutCourt.jsx';

const skills = [['serve', 'Ba'], ['pass', 'Ri'], ['second', 'Al'], ['attack', 'At'], ['block', 'Mu'], ['defense', 'Di']];
const liberoRoles = [['', 'Nessuno'], ['P', 'P'], ['S', 'S'], ['C', 'C'], ['O', 'O']];

function TeamToolbar({ scope, side, suffix }) {
  const opponent = scope === 'opponent';
  const { values } = useViewStore(settingsStore);
  return (
    <div className={`court-actions-bar court-actions-inline sl-toolbar team-panel__bar team-panel__bar--${side}`}>
      {(!opponent || values.useOpponentTeam) && <div id={opponent ? "opponent-rotation-controls" : undefined} className="rotation-block court-rotation-block">
        <RotationControls
            ids={['btn-rotate-cw' + suffix, 'rotation-select' + suffix, 'btn-rotate-ccw' + suffix]}
            buttonAs={ScoutActionButton} selectAs={ScoutRotationSelect}
          />
      </div>}
      <div className="score-actions court-game-actions sl-action-row">
        <AppActionButton id={`btn-score-${opponent ? 'opp' : 'team'}-point`} className={opponent ? 'small success' : 'small'}>Punto</AppActionButton>
        <AppActionButton id={`btn-score-${opponent ? 'opp' : 'team'}-error`} className="small danger">Errore</AppActionButton>
        {opponent ? (
          <ScoutActionButton id="btn-freeball-opp" className="secondary small">Freeball</ScoutActionButton>
        ) : (
          <div className="freeball-actions-inline">
            <ScoutActionButton id="btn-freeball" className="secondary small">Freeball</ScoutActionButton>
          </div>
        )}
      </div>
      <div className="team-controls-panel sl-team-controls">
        <div className="libero-inline">
          <label>Libero</label>
          <LiberoBench scope={scope} />
          <label className="auto-libero-inline">
            <ScoutLiberoSelect id={`auto-libero-select${suffix}`} defaultValue="C">
              {liberoRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </ScoutLiberoSelect>
          </label>
          <ScoutActionButton type="button" id={`btn-swap-libero${suffix}`} className="small secondary">Cambia L</ScoutActionButton>
        </div>
        <div className="skill-flow-panel">
          <label>Forza prossima skill</label>
          <div className="skill-flow-grid skill-flow-inline" id={`skill-flow-buttons${suffix}`}>
            {skills.map(([skill, label]) => (
              <ForceSkillButton key={skill} scope={scope} type="button"
                className={`skill-flow-btn badge badge-${skill}`} data-force-skill={skill}>{label}</ForceSkillButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoutTeamPanel({ scope }) {
  const opponent = scope === 'opponent';
  const side = opponent ? 'opponent' : 'home';
  const toolbar = <TeamToolbar scope={scope} side={side} suffix={opponent ? '-opp' : ''} />;
  return (
    <div className={`team-panel team-panel--${opponent ? 'far' : 'near'} team-panel--${side}`} data-team-panel={side}>
      <div className={`team-field-box team-field-box--${side}`}>
        {opponent && toolbar}
        <ScoutCourt scope={scope} />
        {!opponent && toolbar}
      </div>
    </div>
  );
}

export function SingleTeamOpponentPanel() {
  const { values } = useViewStore(settingsStore);
  return <div id="single-team-opponent-panel" className={"single-team-opponent-panel team-field-box--opponent" + (values.useOpponentTeam ? " hidden" : "")} aria-label="Comandi avversaria in squadra singola">
    <span className="single-team-opponent-label">Avversaria</span>
    <div data-single-opponent-rotation="">
      {!values.useOpponentTeam && <div id="opponent-rotation-controls" className="rotation-block court-rotation-block">
        <RotationControls ids={['btn-rotate-cw-opp', 'rotation-select-opp', 'btn-rotate-ccw-opp']} buttonAs={ScoutActionButton} selectAs={ScoutRotationSelect} />
      </div>}
    </div>
    <div className="single-team-opponent-actions">
      <div id="single-team-score-actions" className="score-actions-inline">
        <AppActionButton id="btn-score-opp-point-single" className="small success" aria-label="Punto avversaria">Punto</AppActionButton>
        <AppActionButton id="btn-score-opp-error-single" className="small danger" aria-label="Errore avversaria">Errore</AppActionButton>
      </div>
      <ScoutActionButton id="btn-freeball-opp-single" className="small danger" aria-label="Freeball avversaria">Freeball</ScoutActionButton>
    </div>
  </div>;
}
