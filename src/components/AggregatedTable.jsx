import { actions } from '../app/actions.mjs';
import { SkillChart } from "./SkillChart.jsx";
import { useViewStore } from "../hooks/useViewStore.js";

import { aggregatedTableStore } from "../state/roster-import-store.mjs";
function useView() {
  return useViewStore(aggregatedTableStore);
}
function Cell({ cell, header = false, hiddenSkills = [] }) {
  const Tag = cell.tag || (header ? "th" : "td"),
    classes = cell.className || "",
    hidden = hiddenSkills.some((id) =>
      classes.split(/\s+/).includes("skill-" + id),
    );
  return (
    <Tag
      className={classes + (hidden ? " skill-hidden" : "") || undefined}
      colSpan={cell.colspan}
      rowSpan={cell.rowspan}
      title={cell.title}
      data-set-num={cell.setNum}
      onClick={cell.command ? () => actions[cell.command](...(cell.args || [])).catch(console.error) : undefined}
    >
      {cell.text}
    </Tag>
  );
}
export function AggregatedTable() {
  const view = useView();
  return (
    <div className="table-wrapper">
      <table className={view.tableClass}>
        <thead>
          {view.headers.map((cells, index) => (
            <tr key={index}>
              {cells.map((cell, index) => (
                <Cell
                  key={index}
                  cell={cell}
                  header
                  hiddenSkills={view.hiddenSkills}
                />
              ))}
            </tr>
          ))}
        </thead>
        <tbody id="agg-table-body">
          {view.rows.map((row, index) => (
            <tr
              key={index}
              className={row.className}
              data-team-scope={row.scope}
            >
              {row.cells.map((cell, index) => (
                <Cell
                  key={index}
                  cell={cell}
                  hiddenSkills={view.hiddenSkills}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function AggregatedExtraTable() {
  const view = useView();
  return (
    <div className="table-wrapper">
      <table className="agg-table">
        <tbody id="agg-summary-extra-body">
          {view.charts?.length > 0 && (
            <tr>
              <td colSpan={32}>
                <div className="analysis-skill-charts-panel">
                  <p className="section-note">
                    Andamento della skill per tutte le metriche (punti in ordine
                    cronologico, filtri analisi attivi).
                  </p>
                  <div className="analysis-skill-chart-grid">
                    {view.charts.map((chart, index) => (
                      <SkillChart key={index} model={chart} />
                    ))}
                  </div>
                </div>
              </td>
            </tr>
          )}
          {view.extraRows.map((row, index) => (
            <tr key={index}>
              {row.cells.map((cell, index) => (
                <Cell key={index} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
