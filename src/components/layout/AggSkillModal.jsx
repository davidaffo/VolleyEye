import { useSyncExternalStore } from "react";
import { analysisChartStore } from "../../state/analysis-chart-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
import { ChartMetricSelect, SkillChart } from "../SkillChart.jsx";
export function AggSkillModal() {
  const view = useSyncExternalStore(
    analysisChartStore.subscribe,
    analysisChartStore.getSnapshot,
    analysisChartStore.getSnapshot,
  ).modal;
  const close = () => invokeRuntime("closeAggSkillModal").catch(console.error);
  return (
    <div
      id="agg-skill-modal"
      className={"skill-modal force-popup" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="skill-modal__backdrop"
        data-close-agg-skill=""
        onClick={close}
      />
      <div className="skill-modal__content agg-skill-modal__content">
        <div className="skill-modal__head">
          <div id="agg-skill-modal-title" className="skill-modal__title">
            {view.title}
          </div>
          <button
            id="agg-skill-modal-close"
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            data-close-agg-skill="true"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div
          id="agg-skill-modal-body"
          className="skill-modal__body"
          data-react-managed="true"
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
                <div className="analysis-filter">
                  <div className="analysis-filter__label">Metrica grafico</div>
                  <div className="analysis-filter__row">
                    <ChartMetricSelect kind="modal" />
                  </div>
                </div>
              </div>
              <div className="analysis-skill-chart-grid analysis-skill-chart-grid--single">
                <SkillChart model={view.chart} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
