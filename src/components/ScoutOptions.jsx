import { CommandButton } from "./ui/CommandButton.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import {
  settingsStore,
  setTypeShortcutsStore,
} from "../state/roster-import-store.mjs";
import { actions as appActions } from "../app/actions.mjs";
const fields = {
  "auto-rotate-toggle": "autoRotate",
  "auto-role-toggle": "autoRolePositioning",
  "auto-role-p1american-toggle": "autoRoleP1American",
  "auto-role-p1american-toggle-opp": "opponentAutoRoleP1American",
  "predictive-skill-toggle": "predictiveSkillFlow",
  "attack-trajectory-toggle": "attackTrajectoryEnabled",
  "attack-trajectory-toggle-opp": "opponentAttackTrajectoryEnabled",
  "attack-trajectory-simple-toggle": "attackTrajectorySimplified",
  "force-mobile-toggle": "forceMobileLayout",
  "video-scout-toggle": "videoScoutMode",
  "settype-prompt-toggle-inline": "setTypePromptEnabled",
  "settype-prompt-toggle-inline-opp": "opponentSetTypePromptEnabled",
  "serve-trajectory-toggle-inline": "serveTrajectoryEnabled",
  "serve-trajectory-toggle-inline-opp": "opponentServeTrajectoryEnabled",
  "serve-trajectory-log-toggle-inline": "showServeTrajectoryLogOur",
  "serve-trajectory-log-toggle-inline-opp": "showServeTrajectoryLogOpp",
};
export function ScoutToggle({ id, ...props }) {
  const view = useViewStore(settingsStore);
  return (
    <input
      {...props}
      id={id}
      type="checkbox"
      checked={!!view.values[fields[id]]}
      onChange={(event) =>
        appActions.changeReactSetting(fields[id],
          event.target.checked,
        ).catch(console.error)
      }
    />
  );
}

const useSettings = () => useViewStore(settingsStore);
const useControls = () => useViewStore(runtimeStore);
const run = (command, ...args) =>
  appActions[command]( ...args).catch(console.error);
const actions = {
  "btn-rotate-cw": ["rotateCourt", "cw"],
  "btn-rotate-ccw": ["rotateCourt", "ccw"],
  "btn-rotate-cw-opp": ["rotateOpponentCourt", "cw"],
  "btn-rotate-ccw-opp": ["rotateOpponentCourt", "ccw"],
  "btn-swap-libero": ["swapPreferredLiberoForScope", "our"],
  "btn-swap-libero-opp": ["swapPreferredLiberoForScope", "opponent"],
  "btn-freeball": ["triggerFreeballFlow"],
  "btn-freeball-opp": ["triggerFreeballFlow", { scope: "opponent" }],
  "btn-freeball-opp-single": ["handleOpponentFreeballSingle"],
  "btn-toggle-court-view": ["toggleReactCourtSide"],
};
export function ScoutActionButton({ id, children, ...props }) {
  const controls = useControls();
  const allowed = id.startsWith("btn-swap-libero");
  return (
    <CommandButton
      {...props}
      id={id}
      disabled={!allowed && !!controls.scoutControlsDisabled}
      command={actions[id][0]}
      args={actions[id].slice(1)}
    >
      {children}
    </CommandButton>
  );
}
export function ScoutRotationSelect({ id, children, ...props }) {
  const { values } = useSettings(),
    opponent = id.endsWith("-opp");
  return (
    <select
      {...props}
      id={id}
      value={String(values[opponent ? "opponentRotation" : "rotation"] || 1)}
      onChange={(event) =>
        run(
          opponent ? "setOpponentRotation" : "setRotation",
          event.target.value,
        )
      }
    >
      {children}
    </select>
  );
}
export function ScoutLiberoSelect({ id, children, defaultValue, ...props }) {
  const { values } = useSettings(),
    opponent = id.endsWith("-opp");
  return (
    <select
      {...props}
      id={id}
      value={
        values[opponent ? "opponentAutoLiberoRole" : "autoLiberoRole"] ?? "C"
      }
      onChange={(event) =>
        run(
          "setAutoLiberoRole",
          event.target.value,
          opponent ? "opponent" : "our",
        )
      }
    >
      {children}
    </select>
  );
}
export function ForceSkillButton({ scope, children, ...props }) {
  const { values } = useSettings(),
    controls = useControls(),
    skill = props["data-force-skill"];
  return (
    <button
      {...props}
      style={{
        display: values.skillVisibility?.[skill] === false ? "none" : "",
      }}
      disabled={!!controls.scoutControlsDisabled}
      onClick={() => run("forceNextSkill", skill, scope)}
    >
      {children}
    </button>
  );
}

export function OpponentSkillToggle({ id, ...props }) {
  const view = useSettings();
  const skill = id.replace("opponent-skill-", "");
  return (
    <input
      {...props}
      id={id}
      type="checkbox"
      checked={view.values.opponentSkillConfig?.[skill] !== false}
      onChange={(event) =>
        run("changeReactOpponentSkill", skill, event.target.checked)
      }
    />
  );
}

export function SetTypeShortcuts() {
  const view = useViewStore(setTypeShortcutsStore);
  const controls = useControls();
  return (
    <div className="set-type-shortcuts__buttons">
      {view.choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          className={
            "set-type-btn" + (view.selected === choice.value ? " active" : "")
          }
          data-settype={choice.value}
          aria-pressed={view.selected === choice.value}
          disabled={!!controls.scoutControlsDisabled}
          onClick={() => run("changeReactSetType", choice.value)}
        >
          {choice.label}
        </button>
      ))}
      <button
        className="set-type-btn secondary"
        data-clear-settype=""
        type="button"
        disabled={!!controls.scoutControlsDisabled}
        onClick={() => run("changeReactSetType", "")}
      >
        Nessuna (N)
      </button>
    </div>
  );
}
