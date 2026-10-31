import { SetWinScore } from "./ScoreControls.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { aggregatedScoreStore } from "../state/roster-import-store.mjs";
function useView() {
  return useViewStore(aggregatedScoreStore);
}
export function AggregatedTotalScore() {
  const view = useView();
  return (
    <div id="agg-score" className="score-value">
      {view.label}
    </div>
  );
}
export function AggregatedSetCards() {
  const view = useView();
  return (
    <div
      id="agg-set-cards"
      className="score-sets cards"
    >
      {view.sets.length ? (
        view.sets.map((set) => (
          <div key={set.key} className="score-set-chip">
            {set.label}
          </div>
        ))
      ) : (
        <div className="score-set-chip">Nessun set</div>
      )}
    </div>
  );
}

export function AggregatedScoreSummary() {
  return (
    <div id="analysis-score-summary" className="score-summary score-summary--inline" role="group" aria-label="Riepilogo punteggio">
      <div className="score-card">
        <div className="score-summary__metric">
          <span className="score-summary__label">Punteggio totale</span>
          <AggregatedTotalScore />
        </div>
        <div className="score-summary__metric">
          <span className="score-summary__label">Set vinti</span>
          <SetWinScore as="div" id="agg-set-score" className="score-value small" />
        </div>
        <AggregatedSetCards />
      </div>
    </div>
  );
}
