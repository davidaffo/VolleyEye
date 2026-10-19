
import { useViewStore } from "../hooks/useViewStore.js";

import { metricsStore } from "../state/roster-import-store.mjs";
import { actions as appActions } from "../app/actions.mjs";
const run = (command, ...args) =>
  appActions[command]( ...args).catch(console.error);
export function MetricsConfig() {
  const view = useViewStore(metricsStore);
  return (
    <div
      id="metrics-config"
      className="metrics-config"
    >
      {view.skills.map((skill) => (
        <div
          key={skill.id}
          className={`metric-block skill-${skill.id}${skill.enabled ? "" : " disabled"}`}
        >
          <div className="metric-title">{skill.label}</div>
          <div className="metric-helper" />
          <div className="metric-cols">
            {skill.columns.map((rows, index) => (
              <div
                key={index}
                className={
                  "metric-col" + (index === 2 ? " metrics-points" : "")
                }
              >
                {rows.map((row) => (
                  <div key={row.key} className="metric-row">
                    <span className="metric-label">{row.label}</span>
                    {row.key === "enabled" ? (
                      <button
                        type="button"
                        className={
                          "metric-toggle toggle-skill " +
                          (skill.enabled ? "toggle-on" : "toggle-off")
                        }
                        onClick={() => run("toggleSkillEnabled", skill.id)}
                      >
                        {skill.enabled ? "ON" : "OFF"}
                      </button>
                    ) : (
                      row.codes.map((toggle) => (
                        <button
                          key={toggle.code}
                          type="button"
                          className={
                            "metric-toggle" +
                            (toggle.tone ? " code-" + toggle.tone : "") +
                            (toggle.active ? " active" : "")
                          }
                          disabled={toggle.disabled}
                          title={
                            toggle.disabled
                              ? "Non contemplato per il muro"
                              : undefined
                          }
                          onClick={() =>
                            toggle.command === "toggleActiveCode"
                              ? run(toggle.command, skill.id, toggle.code)
                              : run(
                                  toggle.command,
                                  skill.id,
                                  row.key,
                                  toggle.code,
                                )
                          }
                        >
                          {toggle.code}
                        </button>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
