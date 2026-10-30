import { SKILLS, session as matchState } from "../../../js/globals.js";
import { metricsStore } from "../../state/roster-import-store.mjs";
import {
  ensureMetricsConfigDefaults,
  ensurePointRulesDefaults,
  normalizePointRule,
  getCodeTone,
} from "./rules.js";
import { session as camp3ImportState } from "./rule-state.js";
export function publishReactMetrics() {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  metricsStore.publish({
    skills: SKILLS.map((skill) => {
      const config = matchState.state.metricsConfig[skill.id],
        point = normalizePointRule(
          skill.id,
          matchState.state.pointRules[skill.id],
        );
      const rows = (metas, points = false) =>
        metas.map((meta) => ({
          ...meta,
          codes:
            meta.key === "enabled"
              ? []
              : camp3ImportState.SETTINGS_RESULT_CODES.map((code) => ({
                  code,
                  tone: points
                    ? meta.key === "for"
                      ? "positive"
                      : meta.key === "against"
                        ? "negative"
                        : "neutral"
                    : getCodeTone(skill.id, code),
                  active: points
                    ? meta.key === "for"
                      ? point.for.includes(code)
                      : meta.key === "against"
                        ? point.against.includes(code)
                        : !point.for.includes(code) &&
                          !point.against.includes(code)
                    : config[meta.key].includes(code),
                  disabled:
                    !points &&
                    skill.id === "block" &&
                    code === "!" &&
                    meta.key === "activeCodes",
                  command: points
                    ? "togglePointRule"
                    : meta.key === "activeCodes"
                      ? "toggleActiveCode"
                      : "toggleMetricAssignment",
                })),
        }));
      return {
        id: skill.id,
        label: skill.label,
        enabled: config.enabled,
        columns: [
          rows([
            { key: "enabled", label: "Scout attivo?" },
            { key: "activeCodes", label: "Codici abilitati" },
          ]),
          rows([
            { key: "positive", label: "Positivo" },
            { key: "neutral", label: "Neutro" },
            { key: "negative", label: "Negativo" },
          ]),
          rows(
            [
              { key: "for", label: "Punto" },
              { key: "against", label: "Punto subito" },
              { key: "neutral", label: "Neutro (no punto)" },
            ],
            true,
          ),
        ],
      };
    }),
  });
}
