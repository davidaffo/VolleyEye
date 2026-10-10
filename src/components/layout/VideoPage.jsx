import { VideoPresets, VideoPresetCreate } from "../VideoPresets.jsx";
import { AnalysisFilter, PreviousSkillSelect } from "../AnalysisFilter.jsx";
import { EventTable } from "../EventTable.jsx";
// The compatibility engine owns dynamic descendants until their renderer is migrated.
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
              <button
                id={"video-mobile-source-open"}
                className={"secondary video-mobile-source-open"}
                type={"button"}
              >
                {"Scegli video"}
              </button>
              <button
                id={"video-mobile-filter-open"}
                className={"secondary video-mobile-filter-open"}
                type={"button"}
              >
                {"\n              Filtri "}
                <span
                  id={"video-mobile-filter-count"}
                  className={"video-mobile-filter-count"}
                >
                  {"0"}
                </span>
              </button>
            </div>
          </div>
          <div className={"video-analysis__actions"}>
            <label
              id={"video-file-picker"}
              className={"file-btn"}
              htmlFor={"video-file-input"}
            >
              {"Carica video"}
            </label>
            <input
              id={"video-file-input"}
              type={"file"}
              accept={"video/*"}
              hidden={true}
            />
            <button id={"btn-clear-video"} className={"danger"} type={"button"}>
              {"Rimuovi video"}
            </button>
            <button id={"btn-sync-first-skill"} className={"secondary"}>
              {"Sincronizza prima skill"}
            </button>
            <button id={"btn-copy-ffmpeg"} className={"secondary"}>
              {"Copia ffmpeg veloce + overlay"}
            </button>
            <label className={"auto-rotate-toggle"}>
              <input type={"checkbox"} id={"video-playbyplay-toggle"} />
              {"\n            Play by play\n          "}
            </label>
            <div className={"youtube-input"}>
              <input
                id={"youtube-url-input"}
                type={"url"}
                placeholder={"https://youtu.be/..."}
              />
              <button id={"btn-load-youtube"} className={"secondary"}>
                {"Usa YouTube"}
              </button>
            </div>
          </div>
          <div className={"video-analysis__grid"}>
            <div className={"video-skills"}>
              <div className={"table-wrapper video-table-wrapper"}>
                <EventTable id="video-skills-container" />
              </div>
              <div id={"video-selection-count"} className={"section-note"}>
                {"Selezionati: 0"}
              </div>
              <div className={"video-analysis__footer-actions"}>
                <button
                  id={"btn-fix-video-score"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Correggi punteggio"}
                </button>
                <button
                  id={"btn-video-add-event"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Aggiungi evento"}
                </button>
                <button id={"btn-offset-skills"} className={"secondary"}>
                  {"Offset skill"}
                </button>
                <button id={"btn-unify-times"} className={"secondary"}>
                  {"Unifica tempi"}
                </button>
                <button id={"btn-skill-duration"} className={"secondary"}>
                  {"Durata skill"}
                </button>
                <button id={"btn-video-undo"} className={"danger"}>
                  {"Annulla ultima"}
                </button>
              </div>
            </div>
            <div className={"video-player-wrap video-player-wrap--analysis"}>
              <div className={"video-media"}>
                <div
                  id={"video-analysis-overlay"}
                  className={"video-overlay hidden"}
                  aria-hidden={"true"}
                >
                  <div
                    id={"video-overlay-set"}
                    className={"video-overlay-line"}
                  ></div>
                  <div
                    id={"video-overlay-player"}
                    className={"video-overlay-line"}
                  ></div>
                  <div
                    id={"video-overlay-skill"}
                    className={"video-overlay-line"}
                  ></div>
                  <div
                    id={"video-overlay-rotation"}
                    className={"video-overlay-line"}
                  ></div>
                </div>
                <video
                  id={"analysis-video"}
                  controls={true}
                  preload={"metadata"}
                ></video>
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
                  <button
                    id={"video-mobile-prev"}
                    className={
                      "video-mobile-overlay-nav__button video-mobile-overlay-nav__button--prev"
                    }
                    type={"button"}
                    aria-label={"Azione precedente"}
                  >
                    {"‹"}
                  </button>
                  <button
                    id={"video-mobile-next"}
                    className={
                      "video-mobile-overlay-nav__button video-mobile-overlay-nav__button--next"
                    }
                    type={"button"}
                    aria-label={"Azione successiva"}
                  >
                    {"›"}
                  </button>
                </div>
              </div>
              <button
                id={"video-analysis-resize-handle"}
                className={"video-resize-handle"}
                type={"button"}
                aria-label={"Allarga finestra video"}
                title={"Trascina per allargare. Doppio click per reset."}
              ></button>
              <div className={"video-frame-actions"}>
                <button
                  id={"btn-video-frame-prev"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Frame - (Shift + ←)"}
                </button>
                <button
                  id={"btn-video-frame-next"}
                  className={"secondary"}
                  type={"button"}
                >
                  {"Frame + (Shift + →)"}
                </button>
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
                <div
                  id={"video-mobile-results-count"}
                  className={"section-note"}
                >
                  {"0 azioni trovate"}
                </div>
              </div>
              <button
                id={"video-mobile-filter-close"}
                className={"icon-button"}
                type={"button"}
                aria-label={"Chiudi filtri"}
              >
                {"✕"}
              </button>
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
                    <button
                      id={"video-filter-reset"}
                      className={"secondary small"}
                      type={"button"}
                    >
                      {"Reset filtri"}
                    </button>
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
              <button
                id={"video-mobile-filter-apply"}
                className={"primary"}
                type={"button"}
              >
                {"Mostra le azioni"}
              </button>
            </div>
          </div>
          <button
            id={"video-mobile-filter-backdrop"}
            className={"video-mobile-filter-backdrop video-mobile-only"}
            type={"button"}
            aria-label={"Chiudi filtri"}
          ></button>
        </div>
      </div>
    </div>
  );
}
