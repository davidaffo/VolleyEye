import { ScoutWidgetPortal, ScoutWidgetZone, ScoutWidgetDragFeedback } from '../ScoutWorkspace.jsx';
import { ManualScoreControls } from '../ScoreControls.jsx';
import { YouTubeFrame } from '../VideoControls.jsx';
import { ButtonList } from "../ui/ButtonList.jsx";
import { ScoutTeamPanel, SingleTeamOpponentPanel } from '../ScoutTeamPanel.jsx';
import { EventLogSummary } from '../EventTable.jsx';
import { TabPanel } from "../ui/TabPanel.jsx";
import { ScoutWidgetHandle } from "../ScoutWidgetHandle.jsx";

import { ScoutTeamSettings } from "../ScoutTeamSettings.jsx";
import { PanelResizeHandle } from "../PanelResizeHandle.jsx";
import { DvwEntry } from "../DvwEntry.jsx";
import { AppActionButton, ScoutDrawerButton, ScoutDrawerBackdrop } from "../AppActions.jsx";
import { ScoutToggle, SetTypeShortcuts, ScoutActionButton } from "../ScoutOptions.jsx";
import { VideoSourceControls, VideoElement } from "../VideoControls.jsx";
import { LogServeTrajectories } from "../TrajectoryGrid.jsx";
import { EventTable } from "../EventTable.jsx";

import { NextSetPreparation } from "../NextSetPreparation.jsx";
import { CurrentSetControl, SetWinScore, MatchPauseButton, NextSetButton } from "../ScoreControls.jsx";
import { LiveScoreValue } from "../RuntimeControls.jsx";

export function ScoutPage() {
  return (
    <TabPanel className="tab-panel scout-live" data-tab="scout">
      <div className="scout-mobile-bar">
        <ScoutDrawerButton
          drawer="menu"
          id="btn-open-menu-mobile"
          className="secondary small"
          type="button"
          aria-label="Impostazioni"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 0 0 0-6.5ZM4.7 9.9l-1.65-1a1 1 0 0 1-.36-1.37l1.4-2.42a1 1 0 0 1 1.34-.4l1.8.78a7.7 7.7 0 0 1 1.64-.95l.28-1.94A1 1 0 0 1 9.15 1h2.7a1 1 0 0 1 .99.86l.28 1.94c.58.23 1.12.54 1.64.95l1.8-.78a1 1 0 0 1 1.34.4l1.4 2.42a1 1 0 0 1-.36 1.37l-1.65 1c.08.52.12 1.05.12 1.6s-.04 1.08-.12 1.6l1.65 1a1 1 0 0 1 .36 1.37l-1.4 2.42a1 1 0 0 1-1.34.4l-1.8-.78a7.7 7.7 0 0 1-1.64.95l-.28 1.94a1 1 0 0 1-.99.86h-2.7a1 1 0 0 1-.99-.86l-.28-1.94a7.7 7.7 0 0 1-1.64-.95l-1.8.78a1 1 0 0 1-1.34-.4l-1.4-2.42a1 1 0 0 1 .36-1.37l1.65-1a9.9 9.9 0 0 1-.12-1.6c0-.55.04-1.08.12-1.6Z"></path>
          </svg>
        </ScoutDrawerButton>
        <ScoutDrawerButton
          drawer="log"
          id="btn-open-log-mobile"
          className="secondary small"
          type="button"
        >
          {"Log"}
        </ScoutDrawerButton>
      </div>
      <ScoutDrawerBackdrop
        id="scout-drawer-backdrop"
        className="drawer-backdrop"
        aria-hidden="true"
      />
      <div className="scout-grid">
        <div className="section scout-col-left" data-scout-panel="match">
          <ScoutDrawerButton
            drawer=""
            className="drawer-close secondary small"
            type="button"
            data-close-drawer="menu"
          >
            {"Chiudi"}
          </ScoutDrawerButton>
          <div className="set-controls grid-row">
            <div className="score-card score-card-top">
              <div className="score-top-row">
                <NextSetButton
                  id="btn-next-set"
                  className="small secondary score-top-action score-top-action-left"
                >
                  {"Set successivo"}
                </NextSetButton>
                <div className="score-set-select">
                  <label htmlFor="current-set">{"Set corrente"}</label>
                  <CurrentSetControl />
                </div>
                <MatchPauseButton
                  id="btn-end-match"
                  className="small score-top-action score-top-action-right"
                ></MatchPauseButton>
              </div>
              <div className="score-layout">
                <ManualScoreControls direction="for" />
                <div className="score-center">
                  <label>{"Punteggio"}</label>
                  <div
                    id="live-score"
                    className="score-value emph"
                  >
                    <LiveScoreValue />
                  </div>
                  <div className="score-set-row">
                    <span className="score-set-label">{"Set"}</span>
                    <SetWinScore
                      id="live-set-score"
                      className="score-set-value"
                    />
                  </div>
                </div>
                <ManualScoreControls direction="against" />
              </div>
            </div>
            <div className="rotation-toggles">
              <label className="auto-rotate-toggle">
                <ScoutToggle type="checkbox" id="auto-rotate-toggle" />
                {
                  "\n              Rotazione automatica su cambio palla\n            "
                }
              </label>
              <br />
              <label className="auto-rotate-toggle">
                <ScoutToggle type="checkbox" id="auto-role-toggle" />
                {
                  "\n                Auto posizionamento per ruolo\n              "
                }
              </label>
              <br />
              <label className="auto-rotate-toggle">
                <ScoutToggle type="checkbox" id="predictive-skill-toggle" />
                {
                  "\n                Flusso di gioco automatico\n                "
                }
              </label>
              <br />
              <label className="auto-rotate-toggle">
                <ScoutToggle
                  type="checkbox"
                  id="attack-trajectory-simple-toggle"
                />
                {
                  "\n                Direzione attacco semplificata\n              "
                }
              </label>
              <br />
              <label className="auto-rotate-toggle">
                <ScoutToggle type="checkbox" id="force-mobile-toggle" />
                {"\n                Modalità mobile (test)\n              "}
              </label>
              <label className="auto-rotate-toggle">
                <ScoutToggle type="checkbox" id="video-scout-toggle" />
                {"\n                Scout da video\n              "}
              </label>
            </div>
            <div
              id="video-scout-controls"
              className="video-scout-controls hidden"
            >
              <div className="video-scout-actions">
                <VideoSourceControls scout />
              </div>
            </div>
            <div className="set-bottom-actions">
              <ScoutActionButton
                id="btn-toggle-court-view"
                className="small secondary"
                type="button"
              >
                {"Cambia campo"}
              </ScoutActionButton>
            </div>
            <ScoutTeamSettings scope="our" />
            <ScoutTeamSettings scope="opponent" />
          </div>
        </div>
        <PanelResizeHandle panel="left" />
        <div className="section scout-col-center" data-scout-panel="team">
          <ScoutWidgetZone
            id="scout-widgets-center-top"
            className="scout-widget-zone scout-widget-zone--center"
            data-scout-widget-zone="center-top"
          >
            <ScoutWidgetPortal
              id="video-scout-container"
              className="video-scout-container scout-widget hidden"
              data-scout-widget="video"
            >
              <ScoutWidgetHandle label="video" />
              <div className="video-scout-panel">
                <div className="video-player-wrap video-player-wrap--scout">
                  <div className="video-media">
                    <VideoElement scout />
                    <YouTubeFrame scout />
                  </div>
                  <PanelResizeHandle panel="scoutHeight" />
                </div>
              </div>
            </ScoutWidgetPortal>
          </ScoutWidgetZone>
          <ScoutWidgetZone className="scout-widget-zone scout-widget-zone--center" data-scout-widget-zone="center-court">
            <ScoutWidgetPortal className="scout-widget scout-court-widget" data-scout-widget="court">
          <div className="set-type-wrapper">
            <div
              className="set-type-shortcuts set-type-inline"
              id="set-type-shortcuts"
              style={{ display: "none" }}
            >
              <div className="set-type-shortcuts__head">
                <span className="set-type-shortcuts__label">
                  {"Tipo alzata"}
                </span>
              </div>
              <SetTypeShortcuts />
            </div>
          </div>
          <div className="players-area" id="court-area">
            <div id="court-overlay" />
            <SingleTeamOpponentPanel />
            <ScoutTeamPanel scope="opponent" />
            <div className="court-net-divider">
              <span>{"Rete"}</span>
              <div id="net-actions-default" className="net-actions-default">
                <ButtonList as={AppActionButton} className="small secondary net-action-btn" type="button"
                items={[
                  ["btn-attack-base","Base (K)"],
                  ["btn-attack-setter","Alzatore (A)"],
                  ["btn-attack-type","Tipo attacco (T)"],
                  ["btn-block-number","N° muro (N)"],
                ]}
              />
              </div>
              <ButtonList as={AppActionButton}
                items={[
                  ["btn-net-block-prompt","Muro",{"className":"small net-action-btn net-action-btn--block-prompt hidden","type":"button"}],
                  ["btn-contesa","Contesa",{"className":"small danger net-action-btn","type":"button","title":"Annulla l’azione fino alla battuta inclusa"}],
                  ["btn-undo","↩ Annulla ultimo",{"className":"small danger net-action-btn"}],
                ]}
              />
            </div>
            <ScoutTeamPanel scope="our" />
          </div>
            </ScoutWidgetPortal>
          </ScoutWidgetZone>
          <NextSetPreparation />
          <ScoutWidgetZone
            id="scout-widgets-center-bottom"
            className="scout-widget-zone scout-widget-zone--center"
            data-scout-widget-zone="center-bottom"
          ></ScoutWidgetZone>
        </div>
        <PanelResizeHandle panel="right" />
        <div
          className="section log-section scout-col-right"
          data-log-section=""
          data-scout-panel="log"
        >
          <ScoutDrawerButton
            drawer=""
            className="drawer-close secondary small"
            type="button"
            data-close-drawer="log"
          >
            {"Chiudi"}
          </ScoutDrawerButton>
          <AppActionButton
            id="btn-reset-scout-widgets"
            className="secondary small scout-widgets-reset"
            type="button"
          >
            {"Ripristina disposizione"}
          </AppActionButton>
          <ScoutWidgetZone
            id="scout-widgets-right"
            className="scout-widget-zone scout-widget-zone--right"
            data-scout-widget-zone="right"
          >
            <DvwEntry />
            <LogServeTrajectories />
            <ScoutWidgetPortal
              className="scout-widget scout-events-widget"
              data-scout-widget="events"
            >
              <ScoutWidgetHandle label="eventi" />
              <EventLogSummary />
              <EventTable id="events-log" />
            </ScoutWidgetPortal>
          </ScoutWidgetZone>
        </div>
      </div>
      <ScoutWidgetDragFeedback />
    </TabPanel>
  );
}
