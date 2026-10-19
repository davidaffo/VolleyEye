import { YouTubeFrame } from '../VideoControls.jsx';
import { AnalysisFilterFields } from "../AnalysisFilter.jsx";
import { ButtonList } from "../ui/ButtonList.jsx";
import { TabPanel } from "../ui/TabPanel.jsx";

import { PanelResizeHandle } from "../PanelResizeHandle.jsx";
import { AppActionButton } from "../AppActions.jsx";
import { VideoActionButton, VideoSourceControls, VideoMobileSourceButton, VideoMobileNavigation, VideoViewText, VideoFilterCount, VideoOverlay, VideoElement } from "../VideoControls.jsx";
import { VideoPresets, VideoPresetCreate } from "../VideoPresets.jsx";

import { EventTable } from "../EventTable.jsx";

export function VideoPage() {
  return (
    <TabPanel className="tab-panel" data-tab="video" id="video-panel">
      <div id="video-analysis-host">
        <div className="section video-analysis" id="video-analysis-section">
          <div className="video-analysis__head">
            <div>
              <h2 className="video-analysis__desktop-title">
                {"Analisi video"}
              </h2>
              <h2 className="video-mobile-only">{"Le mie azioni"}</h2>
            </div>
            <div className="video-mobile-head-actions video-mobile-only">
              <VideoMobileSourceButton />
              <VideoActionButton
                id="video-mobile-filter-open"
                className="secondary video-mobile-filter-open"
                type="button"
              >
                {"\n              Filtri "}
                <VideoFilterCount />
              </VideoActionButton>
            </div>
          </div>
          <div className="video-analysis__actions">
            <VideoSourceControls />
          </div>
          <div className="video-analysis__grid">
            <div className="video-skills">
              <div className="table-wrapper video-table-wrapper">
                <EventTable id="video-skills-container" />
              </div>
              <VideoViewText
                kind="selection"
                id="video-selection-count"
                className="section-note"
              />
              <div className="video-analysis__footer-actions">
                <ButtonList as={VideoActionButton}
                items={[
                  ["btn-fix-video-score","Correggi punteggio",{"className":"secondary","type":"button"}],
                  ["btn-video-add-event","Aggiungi evento",{"className":"secondary","type":"button"}],
                  ["btn-offset-skills","Offset skill",{"className":"secondary"}],
                  ["btn-unify-times","Unifica tempi",{"className":"secondary"}],
                  ["btn-skill-duration","Durata skill",{"className":"secondary"}],
                  ["btn-video-undo","Annulla ultima",{"className":"danger"}],
                ]}
              />
              </div>
            </div>
            <div className="video-player-wrap video-player-wrap--analysis">
              <div className="video-media">
                <VideoOverlay />
                <VideoElement />
                <YouTubeFrame />
                <div
                  className="video-mobile-overlay-nav video-mobile-only"
                  aria-label="Navigazione azioni"
                >
                  <VideoMobileNavigation
                    direction={-1}
                    id="video-mobile-prev"
                    className="video-mobile-overlay-nav__button video-mobile-overlay-nav__button--prev"
                    type="button"
                    aria-label="Azione precedente"
                  >
                    {"‹"}
                  </VideoMobileNavigation>
                  <VideoMobileNavigation
                    direction={1}
                    id="video-mobile-next"
                    className="video-mobile-overlay-nav__button video-mobile-overlay-nav__button--next"
                    type="button"
                    aria-label="Azione successiva"
                  >
                    {"›"}
                  </VideoMobileNavigation>
                </div>
              </div>
              <PanelResizeHandle panel="analysisHeight" />
              <div className="video-frame-actions">
                <VideoActionButton
                  id="btn-video-frame-prev"
                  className="secondary"
                  type="button"
                >
                  {"Frame - (Shift + ←)"}
                </VideoActionButton>
                <VideoActionButton
                  id="btn-video-frame-next"
                  className="secondary"
                  type="button"
                >
                  {"Frame + (Shift + →)"}
                </VideoActionButton>
              </div>
              <p className="section-note">
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
          <div className="video-filters-panel">
            <div className="video-mobile-filter-sheet-head video-mobile-only">
              <div>
                <strong>{"Filtra le azioni"}</strong>
                <VideoViewText
                  kind="results"
                  id="video-mobile-results-count"
                  className="section-note"
                />
              </div>
              <VideoActionButton
                id="video-mobile-filter-close"
                className="icon-button"
                type="button"
                aria-label="Chiudi filtri"
              >
                {"✕"}
              </VideoActionButton>
            </div>
            <div className="video-filters-layout">
              <div className="video-filters-main">
                <div className="video-filters-header">{"Filtri"}</div>
                <div className="analysis-filters" id="video-filters">
                  <AnalysisFilterFields group="video" prefix="video-filter-" />
                  <div className="analysis-filter filter-actions">
                    <AppActionButton
                      id="video-filter-reset"
                      className="secondary small"
                      type="button"
                    >
                      {"Reset filtri"}
                    </AppActionButton>
                  </div>
                </div>
              </div>
              <aside
                className="video-filter-presets-panel"
                aria-label="Preset filtri"
              >
                <div className="video-filters-header">{"Preset filtri"}</div>
                <VideoPresetCreate />
                <VideoPresets />
              </aside>
            </div>
            <div className="video-mobile-filter-footer video-mobile-only">
              <VideoActionButton
                id="video-mobile-filter-apply"
                className="primary"
                type="button"
              >
                {"Mostra le azioni"}
              </VideoActionButton>
            </div>
          </div>
          <VideoActionButton
            id="video-mobile-filter-backdrop"
            className="video-mobile-filter-backdrop video-mobile-only"
            type="button"
            aria-label="Chiudi filtri"
          ></VideoActionButton>
        </div>
      </div>
    </TabPanel>
  );
}
