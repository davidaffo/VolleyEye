import { MatchNoteComposer } from "../MatchNotes.jsx";
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
              <MatchNoteComposer />
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
