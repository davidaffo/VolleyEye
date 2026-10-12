import { PanelResizeHandle } from "../PanelResizeHandle.jsx";
import { AppActionButton } from "../AppActions.jsx";
import {
  VideoActionButton,
  VideoSourceControls,
  VideoMobileSourceButton,
  VideoMobileNavigation,
  VideoViewText,
  VideoFilterCount,
  VideoOverlay,
  VideoElement,
} from "../VideoControls.jsx";
import { VideoPresets, VideoPresetCreate } from "../VideoPresets.jsx";
import { AnalysisFilter, PreviousSkillSelect } from "../AnalysisFilter.jsx";
import { EventTable } from "../EventTable.jsx";
export function VideoPage() {
  return (
    <div className={"tab-panel"} data-tab={"video"} id={"video-panel"}>
      <div id={"video-analysis-host"}>
        <div className={"section video-analysis"} id={"video-analysis-section"}>
          <div className={"video-analysis__head"}>
            <div>
              <h2 className={"video-analysis__desktop-title"}>
                {"Analisi video"}
              </h2>
              <h2 className={"video-mobile-only"}>{"Le mie azioni"}</h2>
            </div>
            <div className={"video-mobile-head-actions video-mobile-only"}>
              <VideoMobileSourceButton />
              <VideoActionButton
                id={"video-mobile-filter-open"}
                className={"secondary video-mobile-filter-open"}
                type={"button"}
              >
                {"\n              Filtri "}
                <VideoFilterCount />
              </VideoActionButton>
            </div>
          </div>
          <div className={"video-analysis__actions"}>
            <VideoSourceControls />
          </div>
          <div className={"video-analysis__grid"}>
            <div className={"video-skills"}>
              <div className={"table-wrapper video-table-wrapper"}>
                <EventTable id="video-skills-container" />
              </div>
              <VideoViewText
                kind="selection"
                id="video-selection-count"
                className="section-note"
              />
              <div className={"video-analysis__footer-actions"}>
                <VideoActionButton
                  id={"btn-fix-video-score"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Correggi punteggio"}
                </VideoActionButton>
                <VideoActionButton
                  id={"btn-video-add-event"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Aggiungi evento"}
                </VideoActionButton>
                <VideoActionButton
                  id={"btn-offset-skills"}
                  className={"secondary"}
                >
                  {"Offset skill"}
                </VideoActionButton>
                <VideoActionButton
                  id={"btn-unify-times"}
                  className={"secondary"}
                >
                  {"Unifica tempi"}
                </VideoActionButton>
                <VideoActionButton
                  id={"btn-skill-duration"}
                  className={"secondary"}
                >
                  {"Durata skill"}
                </VideoActionButton>
                <VideoActionButton id={"btn-video-undo"} className={"danger"}>
                  {"Annulla ultima"}
                </VideoActionButton>
              </div>
            </div>
            <div className={"video-player-wrap video-player-wrap--analysis"}>
              <div className={"video-media"}>
                <VideoOverlay />
                <VideoElement />
                <iframe
                  id={"youtube-frame"}
                  className={"youtube-frame"}
                  title={"YouTube player"}
                  tabIndex={"-1"}
                  allow={
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  }
                  allowFullScreen={true}
                ></iframe>
                <div
                  className={"youtube-focus-guard"}
                  data-youtube-guard={""}
                ></div>
                <div
                  className={"video-mobile-overlay-nav video-mobile-only"}
                  aria-label={"Navigazione azioni"}
                >
                  <VideoMobileNavigation
                    direction={-1}
                    id={"video-mobile-prev"}
                    className={
                      "video-mobile-overlay-nav__button video-mobile-overlay-nav__button--prev"
                    }
                    type={"button"}
                    aria-label={"Azione precedente"}
                  >
                    {"‹"}
                  </VideoMobileNavigation>
                  <VideoMobileNavigation
                    direction={1}
                    id={"video-mobile-next"}
                    className={
                      "video-mobile-overlay-nav__button video-mobile-overlay-nav__button--next"
                    }
                    type={"button"}
                    aria-label={"Azione successiva"}
                  >
                    {"›"}
                  </VideoMobileNavigation>
                </div>
              </div>
              <PanelResizeHandle
                panel="analysisHeight"
                id={"video-analysis-resize-handle"}
                className={"video-resize-handle"}
                type={"button"}
                aria-label={"Allarga finestra video"}
                title={"Trascina per allargare. Doppio click per reset."}
              ></PanelResizeHandle>
              <div className={"video-frame-actions"}>
                <VideoActionButton
                  id={"btn-video-frame-prev"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Frame - (Shift + ←)"}
                </VideoActionButton>
                <VideoActionButton
                  id={"btn-video-frame-next"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Frame + (Shift + →)"}
                </VideoActionButton>
              </div>
              <p className={"section-note"}>
                {
                  "Seleziona una skill per spostarti al timestamp calcolato. Puoi usare un file o un link YouTube.\n            "
                }
                <br />
                {"Shortcuts:\n            "}
              </p>
              <ul>
                <li>
                  {
                    "spazio play/pausa, frecce sinistra/destra ±3s, shift+frecce sinistra/destra frame-by-frame."
                  }
                </li>
                <li>
                  {
                    "Q-W diminuisci/aumenta il timestamp della skill attuale di 0.5s"
                  }
                </li>
              </ul>
              <br />
              <p></p>
            </div>
          </div>
          <div className={"video-filters-panel"}>
            <div className={"video-mobile-filter-sheet-head video-mobile-only"}>
              <div>
                <strong>{"Filtra le azioni"}</strong>
                <VideoViewText
                  kind="results"
                  id="video-mobile-results-count"
                  className="section-note"
                />
              </div>
              <VideoActionButton
                id={"video-mobile-filter-close"}
                className={"icon-button"}
                type={"button"}
                aria-label={"Chiudi filtri"}
              >
                {"✕"}
              </VideoActionButton>
            </div>
            <div className={"video-filters-layout"}>
              <div className={"video-filters-main"}>
                <div className={"video-filters-header"}>{"Filtri"}</div>
                <div className={"analysis-filters"} id={"video-filters"}>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Squadra"}</div>
                    <AnalysisFilter
                      id="video-filter-teams"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Giocatrici"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-players"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Alzatore"}</div>
                    <AnalysisFilter
                      id="video-filter-setters"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Fondamentale"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-skills"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Codice"}</div>
                    <AnalysisFilter
                      id="video-filter-codes"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Skill precedente"}
                    </div>
                    <PreviousSkillSelect id="video-filter-prev" />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Set"}</div>
                    <AnalysisFilter
                      id="video-filter-sets"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Rotazione"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-rotations"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Zona"}</div>
                    <AnalysisFilter
                      id="video-filter-zones"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>{"Base"}</div>
                    <AnalysisFilter
                      id="video-filter-bases"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Tipo alzata"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-set-types"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Fase (SO/BP)"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-phases"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Valutazione rice"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-receive-evals"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Zona ricezione"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-receive-zones"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Tipo servizio"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-serve-types"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter"}>
                    <div className={"analysis-filter__label"}>
                      {"Tipo attacco"}
                    </div>
                    <AnalysisFilter
                      id="video-filter-attack-types"
                      className="analysis-filter__options"
                    />
                  </div>
                  <div className={"analysis-filter filter-actions"}>
                    <AppActionButton
                      id={"video-filter-reset"}
                      className={"secondary small"}
                      type={"button"}
                    >
                      {"Reset filtri"}
                    </AppActionButton>
                  </div>
                </div>
              </div>
              <aside
                className={"video-filter-presets-panel"}
                aria-label={"Preset filtri"}
              >
                <div className={"video-filters-header"}>{"Preset filtri"}</div>
                <VideoPresetCreate />
                <VideoPresets />
              </aside>
            </div>
            <div className={"video-mobile-filter-footer video-mobile-only"}>
              <VideoActionButton
                id={"video-mobile-filter-apply"}
                className={"primary"}
                type={"button"}
              >
                {"Mostra le azioni"}
              </VideoActionButton>
            </div>
          </div>
          <VideoActionButton
            id={"video-mobile-filter-backdrop"}
            className={"video-mobile-filter-backdrop video-mobile-only"}
            type={"button"}
            aria-label={"Chiudi filtri"}
          ></VideoActionButton>
        </div>
      </div>
    </div>
  );
}
