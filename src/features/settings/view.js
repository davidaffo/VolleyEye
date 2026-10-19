import { session as matchState, SKILLS } from "../../../js/globals.js";
import { getTeamAutoLiberoRole } from "../teams/auto-libero-selectors.js";
import { normalizeMetricConfig } from "./rules.js";
import { settingsStore } from "../../state/roster-import-store.mjs";

const settingsFields = [
    "autoRotate",
    "autoRolePositioning",
    "autoRoleP1American",
    "attackTrajectoryEnabled",
    "attackTrajectorySimplified",
    "predictiveSkillFlow",
    "autoLiberoRole",
    "opponentAutoRoleP1American",
    "opponentAttackTrajectoryEnabled",
    "forceMobileLayout",
    "videoScoutMode",
    "setTypePromptEnabled",
    "opponentSetTypePromptEnabled",
    "serveTrajectoryEnabled",
    "opponentServeTrajectoryEnabled",
    "showServeTrajectoryLogOur",
    "showServeTrajectoryLogOpp",
  ];
let lastSignature, lastValues;

export function publishReactSettings() {
  const signature = JSON.stringify([settingsFields.map(field => matchState.state[field]),
    matchState.state.metricsConfig, matchState.state.opponentSkillConfig, matchState.state.rotation,
    matchState.state.opponentRotation, getTeamAutoLiberoRole('our'), getTeamAutoLiberoRole('opponent')]);
  if (signature === lastSignature && settingsStore.getSnapshot().values === lastValues) return;
  const values = {};
  settingsFields.forEach((field) => {
    values[field] = matchState.state[field];
  });
  values.autoLiberoRole = getTeamAutoLiberoRole("our");
  values.opponentAutoLiberoRole = getTeamAutoLiberoRole("opponent");
  values.opponentSkillConfig = Object.freeze({ ...matchState.state.opponentSkillConfig });
  values.rotation = matchState.state.rotation || 1;
  values.opponentRotation = matchState.state.opponentRotation || 1;
  values.skillVisibility = Object.freeze(
    Object.fromEntries(
      SKILLS.map((skill) => [
        skill.id,
        normalizeMetricConfig(skill.id, matchState.state.metricsConfig?.[skill.id])
          .enabled !== false,
      ]),
    ),
  );
  lastSignature = signature;
  lastValues = Object.freeze(values);
  settingsStore.publish({ values: lastValues });
}

export function setReactSettingsOpen(open) {
  publishReactSettings();
  settingsStore.publish({ open });
}
