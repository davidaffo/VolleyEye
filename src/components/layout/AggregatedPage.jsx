import { ChartMetricFilter } from '../SkillChart.jsx';
import { TrajectoryAnalysisPanel } from '../TrajectoryAnalysisPanel.jsx';
import { ButtonList } from '../ui/ButtonList.jsx';
import { AnalysisCountTable } from '../AnalysisCountTable.jsx';
import { AnalysisFilterPanel } from '../AnalysisFilterPanel.jsx';

import { TabPanel } from "../ui/TabPanel.jsx";
import { FilterField } from "../ui/FilterField.jsx";
import { AppActionButton } from "../AppActions.jsx";
import { AggregatedTotalScore, AggregatedSetCards } from "../AggregatedScore.jsx";
import { AggTabButton } from "../RuntimeControls.jsx";
import { PlayerAnalysisRegion, PlayerAnalysisHeader, PlayerAnalysisSelect, PlayerAnalysisToggle, PlayerAnalysisHero, PlayerAnalysisBody, PlayerComparison } from "../PlayerAnalysis.jsx";

import { DistributionGrid } from "../AnalysisTable.jsx";
import { AggregatedTable, AggregatedExtraTable } from "../AggregatedTable.jsx";
import { SetTrendGrid, SetTrendDetail } from "../SetTrend.jsx";
import { PlayByPlaySelect, PlayByPlaySummary, PlayByPlayTable } from "../PlayByPlay.jsx";
import { MatchSheetControls, MatchSheetPage } from "../MatchSheet.jsx";
import { MultiscoutButton } from "./MultiscoutModal.jsx";
import { AnalysisFilter } from "../AnalysisFilter.jsx";
import { SkillChartGrid } from "../SkillChart.jsx";
import { SetWinScore } from "../ScoreControls.jsx";

export function AggregatedPage() {
  return (
    <TabPanel className="tab-panel" data-tab="aggregated" id="aggregated-panel">
      <div id="print-match-title" className="print-match-title"></div>
      <div className="section">
        <div className="agg-topbar">
          <div className="agg-subnav">
            <ButtonList as={AggTabButton} items={[
              [null,"Tabellino",{"className":"agg-subtab-btn active","data-agg-tab-target":"summary"}],
              [null,"Andamento set",{"className":"agg-subtab-btn","data-agg-tab-target":"set-trend"}],
              [null,"Play by play",{"className":"agg-subtab-btn","data-agg-tab-target":"play-by-play"}],
              [null,"Grafici skill",{"className":"agg-subtab-btn","data-agg-tab-target":"skill-charts"}],
              [null,"Alzate",{"className":"agg-subtab-btn","data-agg-tab-target":"second"}],
              [null,"Attacco",{"className":"agg-subtab-btn","data-agg-tab-target":"trajectory"}],
              [null,"Battute",{"className":"agg-subtab-btn","data-agg-tab-target":"serve"}],
              [null,"Foglio gara",{"className":"agg-subtab-btn","data-agg-tab-target":"match-sheet"}],
              [null,"Giocatrici",{"className":"agg-subtab-btn","data-agg-tab-target":"player"}],
            ]} />
          </div>
          <div className="analysis-filters analysis-team-filter analysis-team-filter--summary">
            <FilterField label="Squadra" row>
                <AnalysisFilter
                  id="analysis-filter-teams"
                  className="analysis-filter__options"
                />
              </FilterField>
            <FilterField label="Set" row>
                <AnalysisFilter
                  id="analysis-filter-sets"
                  className="analysis-filter__options"
                />
                <MultiscoutButton />
                <div
                  id="analysis-score-summary"
                  className="score-summary score-summary--inline"
                >
                  <div className="score-card">
                    <label>{"Punteggio totale"}</label>
                    <AggregatedTotalScore />
                    <label className="score-set-label">{"Set vinti"}</label>
                    <SetWinScore
                      as="div"
                      id="agg-set-score"
                      className="score-value small"
                    />
                    <AggregatedSetCards />
                  </div>
                </div>
              </FilterField>
          </div>
        </div>
        <TabPanel className="agg-subpanel active" data-agg-tab="summary">
          <p className="section-note">
            {
              "Clicca una giocatrice per aprire l’analisi individuale oppure un fondamentale per vederne i dettagli."
            }
          </p>
          <AggregatedTable />
          <AggregatedExtraTable />
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="set-trend">
          <div className="set-trend-panel">
            <p className="section-note">
              {
                "Zero centrale: sopra siamo avanti noi, sotto vanno avanti le avversarie. Passa sopra i punti per vedere il punteggio, clicca un rally per il dettaglio."
              }
            </p>
            <SetTrendGrid />
            <SetTrendDetail />
          </div>
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="play-by-play">
          <div className="play-by-play-panel">
            <p className="section-note">
              {
                "Passa sopra un rettangolo colorato per vedere il dettaglio del rally."
              }
            </p>
            <div className="analysis-filters play-by-play-controls">
              <FilterField label="Set" row>
                  <PlayByPlaySelect />
                </FilterField>
            </div>
            <PlayByPlaySummary />
            <PlayByPlayTable />
          </div>
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="skill-charts">
          <div className="analysis-skill-charts-panel">
            <ChartMetricFilter kind="global" />
            <p className="section-note">
              {
                "Un punto per ogni evento del fondamentale selezionato, nell'ordine della partita (filtri analisi attivi)."
              }
            </p>
            <SkillChartGrid kind="global" id="analysis-skill-chart-grid" />
          </div>
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="trajectory">
          <TrajectoryAnalysisPanel variant="attack" />
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="serve">
          <TrajectoryAnalysisPanel variant="serve" />
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="second">
          <div className="second-layout">
            <AnalysisFilterPanel className="analysis-filters" id="second-filters"
              resetId="second-filter-reset"
              group="second" prefix="second-filter-"
            />
            <div className="distribution-section">
              <h3>{"Distribuzione alzate per rotazione"}</h3>
              <DistributionGrid id="second-distribution" />
            </div>
          </div>
          <AnalysisCountTable title="Alzatrice" skill="second" bodyId="agg-second-body" />
          <AnalysisCountTable title="Attacchi dopo alzata" skill="attack" bodyId="agg-second-attack-body" />
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="match-sheet">
          <div className="match-sheet-panel">
            <MatchSheetControls />
            <MatchSheetPage />
          </div>
        </TabPanel>
        <TabPanel className="agg-subpanel" data-agg-tab="player">
          <div className="player-analysis">
            <div className="player-analysis-controls">
              <FilterField className="analysis-filter" label="Giocatrice">
                <PlayerAnalysisSelect />
              </FilterField>
              <div className="analysis-filter player-analysis-compare-toggle">
                <label className="analysis-toggle">
                  <PlayerAnalysisToggle
                    id="player-analysis-compare-enabled"
                    field="compareEnabled"
                  />
                  {"\n                  Confronta\n                "}
                </label>
              </div>
              <PlayerAnalysisRegion as={FilterField} region="compareFilter"
                id="player-analysis-compare-filter"
                className="analysis-filter"
                label="Confronta con"
              >
                <PlayerAnalysisSelect compare />
              </PlayerAnalysisRegion>
              <FilterField className="analysis-filter" label="Campo">
                <AnalysisFilter
                  id="player-analysis-court-side"
                  className="analysis-filter__options"
                />
              </FilterField>
              <div className="player-analysis-toggles">
                <label className="analysis-toggle">
                  <PlayerAnalysisToggle
                    id="player-analysis-show-attack"
                    field="showAttack"
                  />
                  {"\n                Traiettorie attacco\n              "}
                </label>
                <label className="analysis-toggle">
                  <PlayerAnalysisToggle
                    id="player-analysis-show-serve"
                    field="showServe"
                  />
                  {"\n                Traiettorie battute\n              "}
                </label>
                <label className="analysis-toggle">
                  <PlayerAnalysisToggle
                    id="player-analysis-show-second"
                    field="showSecond"
                  />
                  {"\n                Distribuzione alzate\n              "}
                </label>
              </div>
            </div>
            <PlayerAnalysisHero />
            <PlayerAnalysisRegion id="player-analysis-table-wrap" className="table-wrapper">
              <table className="agg-table player-analysis-table">
                <PlayerAnalysisHeader />
                <PlayerAnalysisBody />
              </table>
            </PlayerAnalysisRegion>
            <PlayerComparison />
            <PlayerAnalysisRegion className="player-analysis-columns">
              {['attack', 'serve'].map(variant => (
                <PlayerAnalysisRegion key={variant} preference={variant === 'attack' ? 'showAttack' : 'showServe'} id={'player-analysis-' + variant} className="player-analysis-section">
                  <div className="player-analysis-column"><TrajectoryAnalysisPanel variant={variant} individual /></div>
                </PlayerAnalysisRegion>
              ))}

              <PlayerAnalysisRegion preference="showSecond"
                id="player-analysis-second"
                className="player-analysis-section"
              >
                <div className="player-analysis-column">
                  <div className="second-layout player-second-layout">
                    <DistributionGrid id="player-second-distribution" />
                    <AnalysisCountTable title="Alzate" skill="second" bodyId="player-second-body" />
                    <AnalysisCountTable title="Attacchi dopo alzata" skill="attack" bodyId="player-second-attack-body" />
                    <AnalysisFilterPanel className="analysis-filters" id="player-second-filters"
              resetId="player-second-filter-reset"
              group="playerSecond" prefix="player-second-filter-"
            />
                  </div>
                </div>
              </PlayerAnalysisRegion>
            </PlayerAnalysisRegion>
            <PlayerAnalysisRegion className="analysis-skill-charts-panel player-skill-charts-panel">
              <ChartMetricFilter kind="player" />
              <SkillChartGrid
                kind="player"
                id="player-analysis-skill-chart-grid"
              />
            </PlayerAnalysisRegion>
          </div>
        </TabPanel>
        <div className="controls-row agg-actions">
          <AppActionButton id="btn-export-pdf" className="secondary">
            {"Stampa / PDF"}
          </AppActionButton>
          <AppActionButton id="btn-export-html" className="secondary">
            {"Esporta HTML"}
          </AppActionButton>
        </div>
      </div>
    </TabPanel>
  );
}
