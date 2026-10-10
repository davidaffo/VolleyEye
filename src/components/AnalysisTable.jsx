import { useSyncExternalStore } from "react";
import { analysisTableStore } from "../state/analysis-table-store.mjs";
function useView(id) {
  useSyncExternalStore(
    analysisTableStore.subscribe,
    analysisTableStore.getSnapshot,
    analysisTableStore.getSnapshot,
  );
  return analysisTableStore.getView(id);
}
export function AnalysisTableBody({ id }) {
  const view = useView(id);
  return (
    <tbody id={id} data-react-managed="true">
      {view.rows.map((row, index) => (
        <tr key={index} className={row.className}>
          {row.cells.map((cell, index) => (
            <td key={index} className={cell.className} colSpan={cell.colspan}>
              {cell.text}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
export function DistributionGrid({ id }) {
  const view = useView(id);
  return (
    <div
      id={id}
      className="distribution-grid distribution-grid-layout"
      data-react-managed="true"
    >
      <div className="distribution-legend">
        <span>
          <i className="distribution-legend__volume" /> area più servita
        </span>
        <span>
          <i className="distribution-legend__eff" /> zona più efficiente
        </span>
      </div>
      {view.cards.map((card) => (
        <div
          key={card.key}
          className="distribution-card"
          style={{ gridArea: card.area }}
        >
          <div className="distribution-card__title-row">
            <h4>{card.title}</h4>
            <span className="distribution-card__damp">Damp {card.damp}</span>
          </div>
          <div className="distribution-court">
            {card.zones.map((cell) => (
              <div key={cell.zone} className={cell.className}>
                <div className="cell-label">Z{cell.zone}</div>
                <div className={"cell-main" + cell.mainClass}>
                  {cell.count} - {cell.percent}%
                </div>
                <div className={"cell-sub" + cell.subClass}>Eff {cell.eff}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
