import { AppActionButton } from "../AppActions.jsx";
import {
  AggregatedTotalScore,
  AggregatedSetCards,
} from "../AggregatedScore.jsx";
import { AggTabButton } from "../RuntimeControls.jsx";
import {
  PlayerAnalysisSelect,
  PlayerAnalysisToggle,
  PlayerAnalysisHero,
  PlayerAnalysisBody,
  PlayerComparison,
} from "../PlayerAnalysis.jsx";
import { TrajectoryGrid, AttackSummary } from "../TrajectoryGrid.jsx";
import { AnalysisTableBody, DistributionGrid } from "../AnalysisTable.jsx";
import { AggregatedTable, AggregatedExtraTable } from "../AggregatedTable.jsx";
import { SetTrendGrid, SetTrendDetail } from "../SetTrend.jsx";
import {
  PlayByPlaySelect,
  PlayByPlaySummary,
  PlayByPlayTable,
} from "../PlayByPlay.jsx";
import { MatchSheetControls, MatchSheetPage } from "../MatchSheet.jsx";
import { MultiscoutButton } from "./MultiscoutModal.jsx";
import { AnalysisFilter, PreviousSkillSelect } from "../AnalysisFilter.jsx";
import { ChartMetricSelect, SkillChartGrid } from "../SkillChart.jsx";
import { SetWinScore } from "../ScoreControls.jsx";
// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function AggregatedPage() {
  return (
    <div
      className={"tab-panel"}
      data-tab={"aggregated"}
      id={"aggregated-panel"}
    >
      <div id={"print-match-title"} className={"print-match-title"}></div>
      <div className={"section"}>
        <div className={"agg-topbar"}>
          <div className={"agg-subnav"}>
            <AggTabButton
              className={"agg-subtab-btn active"}
              data-agg-tab-target={"summary"}
            >
              {"Tabellino"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"set-trend"}
            >
              {"Andamento set"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"play-by-play"}
            >
              {"Play by play"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"skill-charts"}
            >
              {"Grafici skill"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"second"}
            >
              {"Alzate"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"trajectory"}
            >
              {"Attacco"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"serve"}
            >
              {"Battute"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"match-sheet"}
            >
              {"Foglio gara"}
            </AggTabButton>
            <AggTabButton
              className={"agg-subtab-btn"}
              data-agg-tab-target={"player"}
            >
              {"Giocatrici"}
            </AggTabButton>
          </div>
          <div
            className={
              "analysis-filters analysis-team-filter analysis-team-filter--summary"
            }
          >
            <div className={"analysis-filter"}>
              <div className={"analysis-filter__label"}>{"Squadra"}</div>
              <div className={"analysis-filter__row"}>
                <AnalysisFilter
                  id="analysis-filter-teams"
                  className="analysis-filter__options"
                />
              </div>
            </div>
            <div className={"analysis-filter"}>
              <div className={"analysis-filter__label"}>{"Set"}</div>
              <div className={"analysis-filter__row"}>
                <AnalysisFilter
                  id="analysis-filter-sets"
                  className="analysis-filter__options"
                />
                <MultiscoutButton />
                <div
                  id={"analysis-score-summary"}
                  className={"score-summary score-summary--inline"}
                >
                  <div className={"score-card"}>
                    <label>{"Punteggio totale"}</label>
                    <AggregatedTotalScore />
                    <label className={"score-set-label"}>{"Set vinti"}</label>
                    <SetWinScore
                      as="div"
                      id="agg-set-score"
                      className="score-value small"
                    />
                    <AggregatedSetCards />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={"agg-subpanel active"} data-agg-tab={"summary"}>
          <p className={"section-note"}>
            {
              "Clicca una giocatrice per aprire l’analisi individuale oppure un fondamentale per vederne i dettagli."
            }
          </p>
          <AggregatedTable />
          <AggregatedExtraTable />
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"set-trend"}>
          <div className={"set-trend-panel"}>
            <p className={"section-note"}>
              {
                "Zero centrale: sopra siamo avanti noi, sotto vanno avanti le avversarie. Passa sopra i punti per vedere il punteggio, clicca un rally per il dettaglio."
              }
            </p>
            <SetTrendGrid />
            <SetTrendDetail />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"play-by-play"}>
          <div className={"play-by-play-panel"}>
            <p className={"section-note"}>
              {
                "Passa sopra un rettangolo colorato per vedere il dettaglio del rally."
              }
            </p>
            <div className={"analysis-filters play-by-play-controls"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Set"}</div>
                <div className={"analysis-filter__row"}>
                  <PlayByPlaySelect />
                </div>
              </div>
            </div>
            <PlayByPlaySummary />
            <PlayByPlayTable />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"skill-charts"}>
          <div className={"analysis-skill-charts-panel"}>
            <div className={"analysis-filters"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Metrica grafici"}
                </div>
                <div className={"analysis-filter__row"}>
                  <ChartMetricSelect
                    kind="global"
                    id="analysis-skill-chart-metric"
                  />
                </div>
              </div>
            </div>
            <p className={"section-note"}>
              {
                "Un punto per ogni evento del fondamentale selezionato, nell'ordine della partita (filtri analisi attivi)."
              }
            </p>
            <SkillChartGrid kind="global" id="analysis-skill-chart-grid" />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"trajectory"}>
          <AttackSummary id="trajectory-attack-summary" />
          <div className={"trajectory-layout"}>
            <div className={"analysis-filters trajectory-filters"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Alzatrice"}</div>
                <AnalysisFilter
                  id="traj-filter-setters"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Giocatrici"}</div>
                <AnalysisFilter
                  id="traj-filter-players"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Set"}</div>
                <AnalysisFilter
                  id="traj-filter-sets"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Tipo alzata"}</div>
                <AnalysisFilter
                  id="traj-filter-set-types"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Base"}</div>
                <AnalysisFilter
                  id="traj-filter-bases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Fase (SO/BP)"}</div>
                <AnalysisFilter
                  id="traj-filter-phases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione rice"}
                </div>
                <AnalysisFilter
                  id="traj-filter-receive-evals"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona ricezione"}
                </div>
                <AnalysisFilter
                  id="traj-filter-receive-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione attacco"}
                </div>
                <AnalysisFilter
                  id="traj-filter-codes"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Tipo attacco"}</div>
                <AnalysisFilter
                  id="traj-filter-attack-types"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona partenza"}
                </div>
                <AnalysisFilter
                  id="traj-filter-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Skill precedente"}
                </div>
                <PreviousSkillSelect id="traj-filter-prev" />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Campo"}</div>
                <AnalysisFilter
                  id="traj-court-side"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter filter-actions"}>
                <button
                  id={"traj-filter-reset"}
                  className={"secondary small"}
                  type={"button"}
                >
                  {"Reset filtri"}
                </button>
              </div>
            </div>
            <TrajectoryGrid id="trajectory-grid" variant="attack" />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"serve"}>
          <div className={"trajectory-layout serve-trajectory-layout"}>
            <div className={"analysis-filters trajectory-filters"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Giocatrici"}</div>
                <AnalysisFilter
                  id="serve-traj-filter-players"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Set"}</div>
                <AnalysisFilter
                  id="serve-traj-filter-sets"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Tipo alzata"}</div>
                <AnalysisFilter
                  id="serve-traj-filter-set-types"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Base"}</div>
                <AnalysisFilter
                  id="serve-traj-filter-bases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Fase (SO/BP)"}</div>
                <AnalysisFilter
                  id="serve-traj-filter-phases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione rice"}
                </div>
                <AnalysisFilter
                  id="serve-traj-filter-receive-evals"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona ricezione"}
                </div>
                <AnalysisFilter
                  id="serve-traj-filter-receive-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione battuta"}
                </div>
                <AnalysisFilter
                  id="serve-traj-filter-codes"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona partenza"}
                </div>
                <AnalysisFilter
                  id="serve-traj-filter-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Campo"}</div>
                <AnalysisFilter
                  id="serve-traj-court-side"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter filter-actions"}>
                <button
                  id={"serve-traj-filter-reset"}
                  className={"secondary small"}
                  type={"button"}
                >
                  {"Reset filtri"}
                </button>
              </div>
            </div>
            <TrajectoryGrid id="serve-trajectory-grid" variant="serve" />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"second"}>
          <div className={"second-layout"}>
            <div className={"analysis-filters"} id={"second-filters"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Alzatrice"}</div>
                <AnalysisFilter
                  id="second-filter-setters"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Giocatrici"}</div>
                <AnalysisFilter
                  id="second-filter-players"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Set"}</div>
                <AnalysisFilter
                  id="second-filter-sets"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Tipo alzata"}</div>
                <AnalysisFilter
                  id="second-filter-set-types"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Base"}</div>
                <AnalysisFilter
                  id="second-filter-bases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Fase (SO/BP)"}</div>
                <AnalysisFilter
                  id="second-filter-phases"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione rice"}
                </div>
                <AnalysisFilter
                  id="second-filter-receive-evals"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona ricezione"}
                </div>
                <AnalysisFilter
                  id="second-filter-receive-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Valutazione attacco"}
                </div>
                <AnalysisFilter
                  id="second-filter-codes"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Zona partenza"}
                </div>
                <AnalysisFilter
                  id="second-filter-zones"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>
                  {"Skill precedente"}
                </div>
                <PreviousSkillSelect id="second-filter-prev" />
              </div>
              <div className={"analysis-filter filter-actions"}>
                <button
                  id={"second-filter-reset"}
                  className={"secondary small"}
                  type={"button"}
                >
                  {"Reset filtri"}
                </button>
              </div>
            </div>
            <div className={"distribution-section"}>
              <h3>{"Distribuzione alzate per rotazione"}</h3>
              <DistributionGrid id="second-distribution" />
            </div>
          </div>
          <div className={"table-wrapper"}>
            <table className={"agg-table"}>
              <thead>
                <tr>
                  <th>{"Alzatrice"}</th>
                  <th className={"skill-col skill-second"}>{"Tot"}</th>
                  <th className={"skill-col skill-second"}>{"#"}</th>
                  <th className={"skill-col skill-second"}>{"+"}</th>
                  <th className={"skill-col skill-second"}>{"!"}</th>
                  <th className={"skill-col skill-second"}>{"-"}</th>
                  <th className={"skill-col skill-second"}>{"="}</th>
                  <th className={"skill-col skill-second"}>{"/"}</th>
                  <th className={"skill-col skill-second"}>{"Pos"}</th>
                  <th className={"skill-col skill-second"}>{"Prf"}</th>
                  <th className={"skill-col skill-second"}>{"Eff"}</th>
                </tr>
              </thead>
              <AnalysisTableBody id="agg-second-body" />
            </table>
          </div>
          <div className={"table-wrapper"}>
            <table className={"agg-table"}>
              <thead>
                <tr>
                  <th>{"Attacchi dopo alzata"}</th>
                  <th className={"skill-col skill-attack"}>{"Tot"}</th>
                  <th className={"skill-col skill-attack"}>{"#"}</th>
                  <th className={"skill-col skill-attack"}>{"+"}</th>
                  <th className={"skill-col skill-attack"}>{"!"}</th>
                  <th className={"skill-col skill-attack"}>{"-"}</th>
                  <th className={"skill-col skill-attack"}>{"="}</th>
                  <th className={"skill-col skill-attack"}>{"/"}</th>
                  <th className={"skill-col skill-attack"}>{"Pos"}</th>
                  <th className={"skill-col skill-attack"}>{"Prf"}</th>
                  <th className={"skill-col skill-attack"}>{"Eff"}</th>
                </tr>
              </thead>
              <AnalysisTableBody id="agg-second-attack-body" />
            </table>
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"match-sheet"}>
          <div className={"match-sheet-panel"}>
            <MatchSheetControls />
            <MatchSheetPage />
          </div>
        </div>
        <div className={"agg-subpanel"} data-agg-tab={"player"}>
          <div className={"player-analysis"}>
            <div className={"player-analysis-controls"}>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Giocatrice"}</div>
                <PlayerAnalysisSelect />
              </div>
              <div className={"analysis-filter player-analysis-compare-toggle"}>
                <label className={"analysis-toggle"}>
                  <PlayerAnalysisToggle
                    id="player-analysis-compare-enabled"
                    field="compareEnabled"
                  />
                  {"\n                  Confronta\n                "}
                </label>
              </div>
              <div
                id={"player-analysis-compare-filter"}
                className={"analysis-filter hidden"}
              >
                <div className={"analysis-filter__label"}>
                  {"Confronta con"}
                </div>
                <PlayerAnalysisSelect compare />
              </div>
              <div className={"analysis-filter"}>
                <div className={"analysis-filter__label"}>{"Campo"}</div>
                <AnalysisFilter
                  id="player-analysis-court-side"
                  className="analysis-filter__options"
                />
              </div>
              <div className={"player-analysis-toggles"}>
                <label className={"analysis-toggle"}>
                  <PlayerAnalysisToggle
                    id="player-analysis-show-attack"
                    field="showAttack"
                  />
                  {"\n                Traiettorie attacco\n              "}
                </label>
                <label className={"analysis-toggle"}>
                  <PlayerAnalysisToggle
                    id="player-analysis-show-serve"
                    field="showServe"
                  />
                  {"\n                Traiettorie battute\n              "}
                </label>
                <label className={"analysis-toggle"}>
                  <PlayerAnalysisToggle
                    id="player-analysis-show-second"
                    field="showSecond"
                  />
                  {"\n                Distribuzione alzate\n              "}
                </label>
              </div>
            </div>
            <PlayerAnalysisHero />
            <div id={"player-analysis-table-wrap"} className={"table-wrapper"}>
              <table className={"agg-table player-analysis-table"}>
                <thead>
                  <tr>
                    <th rowSpan={"2"}>{"Atleta"}</th>
                    <th colSpan={"4"}>{"Punti"}</th>
                    <th colSpan={"5"} className={"skill-col skill-serve"}>
                      {"Battuta"}
                    </th>
                    <th colSpan={"6"} className={"skill-col skill-pass"}>
                      {"Ricezione"}
                    </th>
                    <th colSpan={"5"} className={"skill-col skill-freeball"}>
                      {"Freeball"}
                    </th>
                    <th colSpan={"6"} className={"skill-col skill-attack"}>
                      {"Attacco"}
                    </th>
                    <th colSpan={"2"} className={"skill-col skill-block"}>
                      {"Muro"}
                    </th>
                    <th colSpan={"3"} className={"skill-col skill-defense"}>
                      {"Difesa"}
                    </th>
                  </tr>
                  <tr>
                    <th>{"Fatti"}</th>
                    <th>{"Subiti"}</th>
                    <th>{"Δ"}</th>
                    <th>{"Falli/Errori"}</th>
                    <th className={"skill-col skill-serve"}>{"Tot"}</th>
                    <th className={"skill-col skill-serve"}>{"Err"}</th>
                    <th className={"skill-col skill-serve"}>{"Punti"}</th>
                    <th className={"skill-col skill-serve"}>{"Eff"}</th>
                    <th className={"skill-col skill-serve"}>{"Pos"}</th>
                    <th className={"skill-col skill-pass"}>{"Tot"}</th>
                    <th className={"skill-col skill-pass"}>{"Err"}</th>
                    <th className={"skill-col skill-pass"}>{"Ace"}</th>
                    <th className={"skill-col skill-pass"}>{"Pos"}</th>
                    <th className={"skill-col skill-pass"}>{"Prf"}</th>
                    <th className={"skill-col skill-pass"}>{"Eff"}</th>
                    <th className={"skill-col skill-freeball"}>{"Tot"}</th>
                    <th className={"skill-col skill-freeball"}>{"Err"}</th>
                    <th className={"skill-col skill-freeball"}>{"Pos"}</th>
                    <th className={"skill-col skill-freeball"}>{"Prf"}</th>
                    <th className={"skill-col skill-freeball"}>{"Eff"}</th>
                    <th className={"skill-col skill-attack"}>{"Tot"}</th>
                    <th className={"skill-col skill-attack"}>{"Err"}</th>
                    <th className={"skill-col skill-attack"}>{"Mur"}</th>
                    <th className={"skill-col skill-attack"}>{"Punti"}</th>
                    <th className={"skill-col skill-attack"}>{"% Punti"}</th>
                    <th className={"skill-col skill-attack"}>{"Eff"}</th>
                    <th className={"skill-col skill-block"}>{"Tot"}</th>
                    <th className={"skill-col skill-block"}>{"Punti"}</th>
                    <th className={"skill-col skill-defense"}>{"Tot"}</th>
                    <th className={"skill-col skill-defense"}>{"Err"}</th>
                    <th className={"skill-col skill-defense"}>{"Eff"}</th>
                  </tr>
                </thead>
                <PlayerAnalysisBody />
              </table>
            </div>
            <PlayerComparison />
            <div className={"player-analysis-columns"}>
              <div
                id={"player-analysis-attack"}
                className={"player-analysis-section"}
              >
                <div className={"player-analysis-column"}>
                  <AttackSummary id="player-attack-summary" />
                  <div className={"trajectory-layout"}>
                    <TrajectoryGrid
                      id="player-trajectory-grid"
                      variant="attack"
                    />
                    <div className={"analysis-filters trajectory-filters"}>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Set"}</div>
                        <AnalysisFilter
                          id="player-traj-filter-sets"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Tipo alzata"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-set-types"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Base"}</div>
                        <AnalysisFilter
                          id="player-traj-filter-bases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Fase (SO/BP)"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-phases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Valutazione rice"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-receive-evals"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Zona ricezione"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-receive-zones"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Valutazione attacco"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-codes"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Tipo attacco"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-attack-types"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Zona partenza"}
                        </div>
                        <AnalysisFilter
                          id="player-traj-filter-zones"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Skill precedente"}
                        </div>
                        <PreviousSkillSelect id="player-traj-filter-prev" />
                      </div>
                      <div className={"analysis-filter filter-actions"}>
                        <button
                          id={"player-traj-filter-reset"}
                          className={"secondary small"}
                          type={"button"}
                        >
                          {"Reset filtri"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                id={"player-analysis-serve"}
                className={"player-analysis-section"}
              >
                <div className={"player-analysis-column"}>
                  <div className={"trajectory-layout serve-trajectory-layout"}>
                    <TrajectoryGrid
                      id="player-serve-trajectory-grid"
                      variant="serve"
                    />
                    <div className={"analysis-filters trajectory-filters"}>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Set"}</div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-sets"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Tipo alzata"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-set-types"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Base"}</div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-bases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Fase (SO/BP)"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-phases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Valutazione rice"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-receive-evals"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Zona ricezione"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-receive-zones"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Valutazione battuta"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-codes"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Zona partenza"}
                        </div>
                        <AnalysisFilter
                          id="player-serve-traj-filter-zones"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter filter-actions"}>
                        <button
                          id={"player-serve-traj-filter-reset"}
                          className={"secondary small"}
                          type={"button"}
                        >
                          {"Reset filtri"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                id={"player-analysis-second"}
                className={"player-analysis-section"}
              >
                <div className={"player-analysis-column"}>
                  <div className={"second-layout player-second-layout"}>
                    <DistributionGrid id="player-second-distribution" />
                    <div className={"table-wrapper"}>
                      <table className={"agg-table"}>
                        <thead>
                          <tr>
                            <th>{"Alzate"}</th>
                            <th className={"skill-col skill-second"}>
                              {"Tot"}
                            </th>
                            <th className={"skill-col skill-second"}>{"#"}</th>
                            <th className={"skill-col skill-second"}>{"+"}</th>
                            <th className={"skill-col skill-second"}>{"!"}</th>
                            <th className={"skill-col skill-second"}>{"-"}</th>
                            <th className={"skill-col skill-second"}>{"="}</th>
                            <th className={"skill-col skill-second"}>{"/"}</th>
                            <th className={"skill-col skill-second"}>
                              {"Pos"}
                            </th>
                            <th className={"skill-col skill-second"}>
                              {"Prf"}
                            </th>
                            <th className={"skill-col skill-second"}>
                              {"Eff"}
                            </th>
                          </tr>
                        </thead>
                        <AnalysisTableBody id="player-second-body" />
                      </table>
                    </div>
                    <div className={"table-wrapper"}>
                      <table className={"agg-table"}>
                        <thead>
                          <tr>
                            <th>{"Attacchi dopo alzata"}</th>
                            <th className={"skill-col skill-attack"}>
                              {"Tot"}
                            </th>
                            <th className={"skill-col skill-attack"}>{"#"}</th>
                            <th className={"skill-col skill-attack"}>{"+"}</th>
                            <th className={"skill-col skill-attack"}>{"!"}</th>
                            <th className={"skill-col skill-attack"}>{"-"}</th>
                            <th className={"skill-col skill-attack"}>{"="}</th>
                            <th className={"skill-col skill-attack"}>{"/"}</th>
                            <th className={"skill-col skill-attack"}>
                              {"Pos"}
                            </th>
                            <th className={"skill-col skill-attack"}>
                              {"Prf"}
                            </th>
                            <th className={"skill-col skill-attack"}>
                              {"Eff"}
                            </th>
                          </tr>
                        </thead>
                        <AnalysisTableBody id="player-second-attack-body" />
                      </table>
                    </div>
                    <div
                      className={"analysis-filters"}
                      id={"player-second-filters"}
                    >
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Tipo alzata"}
                        </div>
                        <AnalysisFilter
                          id="player-second-filter-set-types"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Base"}</div>
                        <AnalysisFilter
                          id="player-second-filter-bases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Fase (SO/BP)"}
                        </div>
                        <AnalysisFilter
                          id="player-second-filter-phases"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Valutazione rice"}
                        </div>
                        <AnalysisFilter
                          id="player-second-filter-receive-evals"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Zona ricezione"}
                        </div>
                        <AnalysisFilter
                          id="player-second-filter-receive-zones"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>{"Set"}</div>
                        <AnalysisFilter
                          id="player-second-filter-sets"
                          className="analysis-filter__options"
                        />
                      </div>
                      <div className={"analysis-filter"}>
                        <div className={"analysis-filter__label"}>
                          {"Skill precedente"}
                        </div>
                        <select id={"player-second-filter-prev"}>
                          <option value={"any"}>{"Tutte"}</option>
                          <option value={"freeball-positive"}>
                            {"Freeball o ricezione positiva"}
                          </option>
                          <option value={"receive-positive"}>
                            {"Solo ricezione positiva"}
                          </option>
                          <option value={"defense-negative"}>
                            {"Difesa + ricezione negativa"}
                          </option>
                          <option value={"freeball-only"}>
                            {"Solo freeball"}
                          </option>
                          <option value={"dig-only"}>{"Solo difesa"}</option>
                        </select>
                      </div>
                      <div className={"analysis-filter filter-actions"}>
                        <button
                          id={"player-second-filter-reset"}
                          className={"secondary small"}
                          type={"button"}
                        >
                          {"Reset filtri"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={
                "analysis-skill-charts-panel player-skill-charts-panel"
              }
            >
              <div className={"analysis-filters"}>
                <div className={"analysis-filter"}>
                  <div className={"analysis-filter__label"}>
                    {"Metrica grafici skill"}
                  </div>
                  <div className={"analysis-filter__row"}>
                    <ChartMetricSelect
                      kind="player"
                      id="player-analysis-chart-metric"
                    />
                  </div>
                </div>
              </div>
              <SkillChartGrid
                kind="player"
                id="player-analysis-skill-chart-grid"
              />
            </div>
          </div>
        </div>
        <div className={"controls-row agg-actions"}>
          <AppActionButton id={"btn-export-pdf"} className={"secondary"}>
            {"Stampa / PDF"}
          </AppActionButton>
          <AppActionButton id={"btn-export-html"} className={"secondary"}>
            {"Esporta HTML"}
          </AppActionButton>
        </div>
      </div>
    </div>
  );
}
