import { ModalDialog } from "../ui/Modal.jsx";

import { FilterField } from "../ui/FilterField.jsx";

import { ChartMetricSelect, SkillChart } from "../SkillChart.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { analysisChartStore } from "../../state/analysis-chart-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

export function AggSkillModal() {
  const view = useViewStore(analysisChartStore).modal;
  const close = () => appActions.closeAggSkillModal().catch(console.error);
  return (
    <ModalDialog
      id="agg-skill-modal"
      className="skill-modal force-popup"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{ "data-close-agg-skill": "" }}
      contentProps={{
        className: "skill-modal__content agg-skill-modal__content",
      }}
      title={
        <div id="agg-skill-modal-title" className="skill-modal__title">
          {view.title}
        </div>
      }
      closeProps={{
        id: "agg-skill-modal-close",
        className: "pill-remove skill-modal__close-abs",
        "aria-label": "Chiudi",
        type: "button",
        "data-close-agg-skill": "true",
        onClick: close,
      }}
      bodyProps={{ id: "agg-skill-modal-body", className: "skill-modal__body" }}
    >
      <div className="agg-skill-summary">
        {view.items.map((item) => (
          <div key={item.label} className="agg-skill-summary-card">
            <div className="agg-skill-summary-label">{item.label}</div>
            <div className="agg-skill-summary-value">{item.value}</div>
          </div>
        ))}
      </div>
      <table className="agg-skill-codes">
        <thead>
          <tr>
            {["Codice", "Tot", "%"].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.codes.map((row) => (
            <tr key={row.code}>
              <td>{row.code}</td>
              <td>{row.count}</td>
              <td>{row.percent}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {view.chart && (
        <div className="agg-skill-modal-chart">
          <div className="analysis-filters skill-chart-inline-filters">
            <FilterField className="analysis-filter" label="Metrica grafico">
              <div className="analysis-filter__row">
                <ChartMetricSelect kind="modal" />
              </div>
            </FilterField>
          </div>
          <div className="analysis-skill-chart-grid analysis-skill-chart-grid--single">
            <SkillChart model={view.chart} />
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
