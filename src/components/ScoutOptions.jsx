import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { settingsStore } from "../state/roster-import-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
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
  const view = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );
  return (
    <input
      {...props}
      id={id}
      type="checkbox"
      data-react-managed="true"
      checked={!!view.values[fields[id]]}
      onChange={(event) =>
        invokeRuntime(
          "changeReactSetting",
          fields[id],
          event.target.checked,
        ).catch(console.error)
      }
    />
  );
}

const useSettings = () =>
  useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );
const useControls = () =>
  useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
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
    <button
      {...props}
      id={id}
      data-react-managed="true"
      disabled={!allowed && !!controls.scoutControlsDisabled}
      onClick={() => run(...actions[id])}
    >
      {children}
    </button>
  );
}
export function ScoutRotationSelect({ id, children, ...props }) {
  const { values } = useSettings(),
    opponent = id.endsWith("-opp");
  return (
    <select
      {...props}
      id={id}
      data-react-managed="true"
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
      data-react-managed="true"
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
      data-react-managed="true"
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
