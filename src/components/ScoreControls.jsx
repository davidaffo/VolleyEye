import { CommandButton } from "./ui/CommandButton.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import { actions as appActions } from "../app/actions.mjs";

function useScoreView() {
  return useViewStore(runtimeStore);
}
function reportScoreControlsError(error) {
  console.error("Operazione punteggio non riuscita", error);
  window.alert(error.message);
}
function perform(command, ...args) {
  appActions[command]( ...args).catch(reportScoreControlsError);
}
export function CurrentSetControl() {
  const view = useScoreView();
  const set = view.currentSet || 1;
  return (
    <>
      <div
        className="set-display"
        id="current-set-display"
        aria-live="polite"
      >
        Set {set}
      </div>
      <select
        id="current-set"
        className="hidden-select"
        tabIndex={-1}
        aria-hidden="true"
        value={set}
        onChange={(event) => perform("setCurrentSet", event.target.value)}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            Set {value}
          </option>
        ))}
      </select>
    </>
  );
}
export function SetWinScore({ as: Tag = "strong", ...props }) {
  const view = useScoreView();
  return (
    <Tag {...props}>
      {view.setWinLabel || "0 - 0"}
    </Tag>
  );
}
export function ManualScoreButton({ direction, delta, children, ...props }) {
  const view = useScoreView();
  return (
    <CommandButton
      {...props}
      disabled={!!view.scoutControlsDisabled}
      command="handleManualScore"
      args={[direction, delta]}
      onError={reportScoreControlsError}
    >
      {children}
    </CommandButton>
  );
}
export function MatchPauseButton({ className, ...props }) {
  const view = useScoreView();
  return (
    <CommandButton
      {...props}
      className={
        className + (view.matchFinished ? " resume-btn primary" : " danger")
      }
      command="endMatch"
      args={[]}
      onError={reportScoreControlsError}
    >
      {view.matchFinished ? "Riprendi partita" : "Pausa/Termina"}
    </CommandButton>
  );
}
export function NextSetButton({ children, ...props }) {
  const view = useScoreView();
  return (
    <CommandButton
      {...props}
      disabled={!!view.scoutControlsDisabled}
      command="prepareNextSet"
      args={[]}
      onError={reportScoreControlsError}
    >
      {children}
    </CommandButton>
  );
}

export function ManualScoreControls({ direction }) {
  const label = direction === 'for' ? 'Fatti' : 'Subiti';
  return <div className={'score-side score-side-' + direction}>
    {[-1, 1].map(delta => <ManualScoreButton key={delta} direction={direction} delta={delta}
      id={'btn-score-' + direction + (delta < 0 ? '-minus' : '-plus')}
      className={delta < 0 ? 'small secondary' : 'small'}>{(delta < 0 ? '- ' : '+ ') + label}</ManualScoreButton>)}
  </div>;
}
