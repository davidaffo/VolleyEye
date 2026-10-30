import {reference} from "./helpers/ui-reference.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8"),
  skills = ["serve", "pass", "freeball", "attack", "block", "defense"],
  codes = ["#", "+", "!", "-", "=", "/"],
  empty = () => Object.fromEntries(codes.map((code) => [code, 0])),
  total = (counts) =>
    Object.values(counts || {}).reduce((sum, count) => sum + count, 0);
function extract(source, name, next) {
  return source.slice(
    source.indexOf("function " + name + "("),
    source.indexOf("function " + next + "("),
  );
}
for (const both of [false, true])
  for (const team of ["our", "opponent", "both"])
    test(`tabellino React conserva tutti i valori: doppia squadra ${both}, filtro ${team}`, () => {
      const dom = new JSDOM(
          '<table><thead></thead><tbody id="body"></tbody></table><table><tbody id="extra"></tbody></table>',
        ),
        document = dom.window.document,
        body = document.querySelector("#body"),
        extra = document.querySelector("#extra"),
        events = Array.from({ length: 36 }, (_, index) => ({
          team: index % 2 ? "opponent" : "our",
          set: (index % 3) + 1,
          skillId: skills[index % 6],
          playerIdx: index % 2,
          code: codes[(index * 3) % 6],
          attackBp: index % 2 === 0,
          receiveEvaluation: index % 4 ? "+" : "-",
          value: 1,
        })),
        state = { useOpponentTeam: both, events, metricsConfig: {} },
        roster = {
          our: ["Casa Uno", "Casa Due"],
          opponent: ["Ospite Uno", "Ospite Due"],
        };
      let view;
      const scope = team === "opponent" ? "opponent" : "our",
        chosen = new Set(team === "both" ? [] : [team]);
      const context = vm.createContext({
        document,
        state,
        elAggTableBody: body,
        elAggSummaryExtraBody: extra,
        aggTableHeadCache: null,
        aggTableView: { mode: "summary" },
        analysisTeamFilterState: { teams: chosen },
        SKILLS: skills.map((id) => ({ id, label: id })),
        analysisStatsCache: null,
        analysisStatsScope: null,
        getAggTableElements: () => ({
          table: body.closest("table"),
          thead: document.querySelector("thead"),
        }),
        ensureAggTableHeadCache: () => {},
        renderAnalysisTeamFilter: () => {},
        renderAnalysisSummarySetFilter: () => {},
        isAggSubtabVisible: () => false,
        getAnalysisTeamScope: () => scope,
        getAnalysisEvents: () => events,
        getSummarySetNumbers: () => [1, 2, 3],
        isSkillEnabledForScope: () => true,
        computePointsSummary: () => ({}),
        bindSetStartHeaderClicks: () => {},
        bindSetStartBodyHeaderClicks: () => {},
        bindAggSummaryInteractions: () => {},
        applyAggColumnsVisibility: () => {},
        renderScoreAndRotations: () => {},
        renderSecondTable: () => {},
        renderTrajectoryAnalysis: () => {},
        renderServeTrajectoryAnalysis: () => {},
        getPlayersForScope: (scope) => roster[scope],
        getPlayerNumbersForScope: () => ({}),
        matchesTeamFilter: (event, teams) =>
          !teams.size || teams.has(event.team),
        matchesSummarySetFilter: () => true,
        getTeamNameForScope: (scope) => (scope === "our" ? "Casa" : "Ospite"),
        getTeamScopeFromEvent: (event) => event.team,
        emptyCounts: empty,
        normalizeCounts: (counts) => ({ ...empty(), ...counts }),
        mergeCounts: (target, counts) => {
          if (!target) return;
          codes.forEach(
            (code) =>
              (target[code] = (target[code] || 0) + (counts[code] || 0)),
          );
        },
        totalFromCounts: total,
        computeMetrics: (counts = {}) => {
          const n = total(counts);
          return {
            total: n,
            eff: n ? ((counts["#"] || 0) - (counts["="] || 0)) / n : null,
            pos: n ? ((counts["#"] || 0) + (counts["+"] || 0)) / n : null,
            prf: n ? (counts["#"] || 0) / n : null,
            negativeCount: counts["="] || 0,
          };
        },
        formatPercent: (value) => `${Math.round(value * 100)}%`,
        formatPercentValue: (value, n) =>
          n ? `${Math.round((value / n) * 100)}%` : "-",
        formatPercentValueSafe: (value, n) =>
          n ? `${Math.round((value / n) * 100)}%` : "-",
        formatDelta: (value) => (value > 0 ? "+" + value : String(value)),
        computePlayerPointsMap: (events) => {
          const result = {};
          events.forEach((event) => {
            result[event.playerIdx] ??= { for: 0, against: 0 };
            result[event.playerIdx][event.code === "#" ? "for" : "against"]++;
          });
          return result;
        },
        computePlayerErrorsMap: () => ({ 0: 2, 1: 1 }),
        computeOpponentErrorsMap: () => ({ 0: 0, 1: 3 }),
        computeOpponentErrorsTotal: (events) => events.length,
        computePlayerPassAceMap: () => ({ 0: 1, 1: 0 }),
        getSortedPlayerEntriesForScope: (scope) =>
          roster[scope].map((name, idx) => ({ name, idx })),
        getSortedPlayerEntries: () =>
          roster.our.map((name, idx) => ({ name, idx })),
        buildSetStartInfoList: () =>
          [1, 2, 3].map((set, index) => ({
            positions: new Map([
              ["casa uno", 1],
              ["ospite uno", 1],
            ]),
            subsIn: new Set(index ? ["casa due", "ospite due"] : []),
            setterPos: 1,
          })),
        makePlayerNameKey: (name) => name.toLowerCase(),
        formatNameWithNumber: (name) => name,
        formatNameWithNumberFor: (name) => name,
        countPointsForSkill: (counts) => counts["#"] || 0,
        normalizeSetNumber: Number,
        getEventPointValue: (event) => event.value,
        getPointDirectionFor: (scope, event) =>
          event.code === "#" ? "for" : null,
        computeAttackSplitSummary: (events) => ({
          err: events.filter((event) => event.code === "=").length,
          mur: 0,
          pt: events.filter((event) => event.code === "#").length,
          tot: events.length,
        }),
        computeRotationDeltasForEvents: () => [1, -1, 0, 2, -2, 0],
        getSkillIdFromHeader: (element) =>
          skills.find((id) => element.classList.contains("skill-" + id)),
        getSkillLabel: (id) => id,
        openSetStartEditor: () => {},
        ensurePlayerAnalysisState: () => ({}),
        saveState: () => {},
        setActiveAggTab: () => {},
        renderPlayerAnalysis: () => {},
        aggregatedTableStore: {
          publish: (value) => {
            view = value;
          },
        },
      });
      vm.runInContext(
          read("../src/domain/analysis-columns.js") +
          read("../src/features/analysis/table-cells.js") +
          read("../src/features/analysis/statistic-model.js") +
          read("../src/features/analysis/aggregated-table.js") +
          read("../src/features/analysis/summary-model.js"),
        context,
      );

      const rows = (element) =>
          [...element.children].map((row) =>
            [...row.children].map((cell) => ({
              text: cell.textContent,
              span: cell.colSpan || 1,
            })),
          );
      context.renderAggregatedTable();
      const nativeRows = (rows) =>
        JSON.parse(
          JSON.stringify(
            rows.map((row) =>
              row.cells.map((cell) => ({
                text: String(cell.text ?? ""),
                span: cell.colspan || 1,
              })),
            ),
          ),
        );
      assert.deepEqual(nativeRows(view.rows), reference("react-aggregated-table:8060"));
      assert.deepEqual(nativeRows(view.extraRows), reference("react-aggregated-table:8119"));
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            view.headers.map((cells) =>
              cells.map((cell) => ({
                text: String(cell.text ?? ""),
                span: cell.colspan || 1,
              })),
            ),
          ),
        ),
        reference("react-aggregated-table:8184"),
      );
    });
