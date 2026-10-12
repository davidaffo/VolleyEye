import { PanelResizeHandle } from "../PanelResizeHandle.jsx";
import { DvwEntry } from "../DvwEntry.jsx";
import {
  AppActionButton,
  ScoutDrawerButton,
  ScoutDrawerBackdrop,
} from "../AppActions.jsx";
import {
  ScoutToggle,
  SetTypeShortcuts,
  ScoutActionButton,
  ScoutRotationSelect,
  ScoutLiberoSelect,
  ForceSkillButton,
} from "../ScoutOptions.jsx";
import { VideoSourceControls, VideoElement } from "../VideoControls.jsx";
import { LogServeTrajectories } from "../TrajectoryGrid.jsx";
import { EventTable } from "../EventTable.jsx";
import { ScoutCourt } from "../ScoutCourt.jsx";
import { NextSetPreparation } from "../NextSetPreparation.jsx";
import {
  CurrentSetControl,
  SetWinScore,
  ManualScoreButton,
  MatchPauseButton,
  NextSetButton,
} from "../ScoreControls.jsx";
import { LiveScoreValue } from "../RuntimeControls.jsx";
import { TeamCounter } from "../TeamCounter.jsx";

export function ScoutPage() {
  return (
    <div className={"tab-panel scout-live"} data-tab={"scout"}>
      <div className={"scout-mobile-bar"}>
        <ScoutDrawerButton
          drawer="menu"
          id={"btn-open-menu-mobile"}
          className={"secondary small"}
          type={"button"}
          aria-label={"Impostazioni"}
        >
          <svg viewBox={"0 0 24 24"} aria-hidden={"true"}>
            <path
              d={
                "M12 8.75a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 0 0 0-6.5ZM4.7 9.9l-1.65-1a1 1 0 0 1-.36-1.37l1.4-2.42a1 1 0 0 1 1.34-.4l1.8.78a7.7 7.7 0 0 1 1.64-.95l.28-1.94A1 1 0 0 1 9.15 1h2.7a1 1 0 0 1 .99.86l.28 1.94c.58.23 1.12.54 1.64.95l1.8-.78a1 1 0 0 1 1.34.4l1.4 2.42a1 1 0 0 1-.36 1.37l-1.65 1c.08.52.12 1.05.12 1.6s-.04 1.08-.12 1.6l1.65 1a1 1 0 0 1 .36 1.37l-1.4 2.42a1 1 0 0 1-1.34.4l-1.8-.78a7.7 7.7 0 0 1-1.64.95l-.28 1.94a1 1 0 0 1-.99.86h-2.7a1 1 0 0 1-.99-.86l-.28-1.94a7.7 7.7 0 0 1-1.64-.95l-1.8.78a1 1 0 0 1-1.34-.4l-1.4-2.42a1 1 0 0 1 .36-1.37l1.65-1a9.9 9.9 0 0 1-.12-1.6c0-.55.04-1.08.12-1.6Z"
              }
            ></path>
          </svg>
        </ScoutDrawerButton>
        <ScoutDrawerButton
          drawer="log"
          id={"btn-open-log-mobile"}
          className={"secondary small"}
          type={"button"}
        >
          {"Log"}
        </ScoutDrawerButton>
      </div>
      <ScoutDrawerBackdrop
        id={"scout-drawer-backdrop"}
        className={"drawer-backdrop"}
        aria-hidden={"true"}
      />
      <div className={"scout-grid"}>
        <div className={"section scout-col-left"} data-scout-panel={"match"}>
          <ScoutDrawerButton
            drawer=""
            className={"drawer-close secondary small"}
            type={"button"}
            data-close-drawer={"menu"}
          >
            {"Chiudi"}
          </ScoutDrawerButton>
          <div className={"set-controls grid-row"}>
            <div className={"score-card score-card-top"}>
              <div className={"score-top-row"}>
                <NextSetButton
                  id={"btn-next-set"}
                  className={
                    "small secondary score-top-action score-top-action-left"
                  }
                >
                  {"Set successivo"}
                </NextSetButton>
                <div className={"score-set-select"}>
                  <label htmlFor={"current-set"}>{"Set corrente"}</label>
                  <CurrentSetControl />
                </div>
                <MatchPauseButton
                  id={"btn-end-match"}
                  className={"small score-top-action score-top-action-right"}
                ></MatchPauseButton>
              </div>
              <div className={"score-layout"}>
                <div className={"score-side score-side-for"}>
                  <ManualScoreButton
                    direction="for"
                    delta={-1}
                    id={"btn-score-for-minus"}
                    className={"small secondary"}
                  >
                    {"- Fatti"}
                  </ManualScoreButton>
                  <ManualScoreButton
                    direction="for"
                    delta={1}
                    id={"btn-score-for-plus"}
                    className={"small"}
                  >
                    {"+ Fatti"}
                  </ManualScoreButton>
                </div>
                <div className={"score-center"}>
                  <label>{"Punteggio"}</label>
                  <div
                    id={"live-score"}
                    className={"score-value emph"}
                    data-react-managed="true"
                  >
                    <LiveScoreValue />
                  </div>
                  <div className={"score-set-row"}>
                    <span className={"score-set-label"}>{"Set"}</span>
                    <SetWinScore
                      id="live-set-score"
                      className="score-set-value"
                    />
                  </div>
                </div>
                <div className={"score-side score-side-against"}>
                  <ManualScoreButton
                    direction="against"
                    delta={-1}
                    id={"btn-score-against-minus"}
                    className={"small secondary"}
                  >
                    {"- Subiti"}
                  </ManualScoreButton>
                  <ManualScoreButton
                    direction="against"
                    delta={1}
                    id={"btn-score-against-plus"}
                    className={"small"}
                  >
                    {"+ Subiti"}
                  </ManualScoreButton>
                </div>
              </div>
            </div>
            <div className={"rotation-toggles"}>
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle type={"checkbox"} id={"auto-rotate-toggle"} />
                {
                  "\n              Rotazione automatica su cambio palla\n            "
                }
              </label>
              <br />
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle type={"checkbox"} id={"auto-role-toggle"} />
                {
                  "\n                Auto posizionamento per ruolo\n              "
                }
              </label>
              <br />
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle type={"checkbox"} id={"predictive-skill-toggle"} />
                {
                  "\n                Flusso di gioco automatico\n                "
                }
              </label>
              <br />
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle
                  type={"checkbox"}
                  id={"attack-trajectory-simple-toggle"}
                />
                {
                  "\n                Direzione attacco semplificata\n              "
                }
              </label>
              <br />
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle type={"checkbox"} id={"force-mobile-toggle"} />
                {"\n                Modalità mobile (test)\n              "}
              </label>
              <label className={"auto-rotate-toggle"}>
                <ScoutToggle type={"checkbox"} id={"video-scout-toggle"} />
                {"\n                Scout da video\n              "}
              </label>
            </div>
            <div
              id={"video-scout-controls"}
              className={"video-scout-controls hidden"}
            >
              <div className={"video-scout-actions"}>
                <VideoSourceControls scout />
              </div>
            </div>
            <div className={"set-bottom-actions"}>
              <ScoutActionButton
                id={"btn-toggle-court-view"}
                className={"small secondary"}
                type={"button"}
              >
                {"Cambia campo"}
              </ScoutActionButton>
            </div>
            <div
              className={"court-actions-bar team-panel team-panel--home"}
              data-team-panel={"home-settings"}
            >
              <div className={"panel-title-row"}>
                <h3 className={"panel-title"}>{"Impostazioni squadra"}</h3>
                <AppActionButton
                  id={"btn-open-live-team-editor"}
                  className={"icon-button team-panel-edit-btn"}
                  type={"button"}
                  aria-label={"Modifica squadra in partita"}
                  title={"Modifica squadra in partita"}
                >
                  {"✎"}
                </AppActionButton>
              </div>
              <div className={"rotation-toggles"}>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"auto-role-p1american-toggle"}
                  />
                  {"\n                  P1 americana\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"attack-trajectory-toggle"}
                  />
                  {"\n                  Traiettoria attacco\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"settype-prompt-toggle-inline"}
                  />
                  {"\n                  Tipo alzata\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"serve-trajectory-toggle-inline"}
                  />
                  {"\n                  Traiettoria servizio\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"serve-trajectory-log-toggle-inline"}
                  />
                  {
                    "\n                  Traiettorie del battitore\n                "
                  }
                </label>
              </div>
              <div className={"team-timeout-block"}>
                <AppActionButton
                  id={"btn-timeout"}
                  className={"small secondary"}
                >
                  {"Timeout"}
                </AppActionButton>
                <AppActionButton
                  id={"btn-open-lineup"}
                  className={"secondary small"}
                >
                  {"Formazione/Sostituzione"}
                </AppActionButton>
                <span className={"team-counter"}>
                  {"TO: "}
                  <strong id={"timeout-count"} data-react-managed="true">
                    <TeamCounter counter="timeoutsOur" />
                  </strong>
                </span>
                <span className={"team-counter"}>
                  {"Cambi: "}
                  <strong
                    id={"substitution-remaining"}
                    data-react-managed="true"
                  >
                    <TeamCounter counter="substitutionsOur" />
                  </strong>
                </span>
              </div>
            </div>
            <div
              className={"court-actions-bar team-panel team-panel--opponent"}
              data-team-panel={"opponent-settings"}
            >
              <div className={"panel-title-row"}>
                <h3 className={"panel-title"}>{"Impostazioni avversaria"}</h3>
                <AppActionButton
                  id={"btn-open-live-opponent-team-editor"}
                  className={"icon-button team-panel-edit-btn"}
                  type={"button"}
                  aria-label={"Modifica squadra avversaria in partita"}
                  title={"Modifica squadra avversaria in partita"}
                >
                  {"✎"}
                </AppActionButton>
              </div>
              <div className={"rotation-toggles"}>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"auto-role-p1american-toggle-opp"}
                  />
                  {"\n                  P1 americana\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"attack-trajectory-toggle-opp"}
                  />
                  {"\n                  Traiettoria attacco\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"settype-prompt-toggle-inline-opp"}
                  />
                  {"\n                  Tipo alzata\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"serve-trajectory-toggle-inline-opp"}
                  />
                  {"\n                  Traiettoria servizio\n                "}
                </label>
                <label className={"auto-rotate-toggle"}>
                  <ScoutToggle
                    type={"checkbox"}
                    id={"serve-trajectory-log-toggle-inline-opp"}
                  />
                  {
                    "\n                  Traiettorie del battitore\n                "
                  }
                </label>
              </div>
              <div className={"team-timeout-block"}>
                <AppActionButton
                  id={"btn-timeout-opp"}
                  className={"secondary small"}
                >
                  {"Timeout"}
                </AppActionButton>
                <AppActionButton
                  id={"btn-open-lineup-opp"}
                  className={"secondary small"}
                >
                  {"Formazione/Sostituzione"}
                </AppActionButton>
                <span className={"team-counter"}>
                  {"TO: "}
                  <strong id={"timeout-opp-count"} data-react-managed="true">
                    <TeamCounter counter="timeoutsOpponent" />
                  </strong>
                </span>
                <span className={"team-counter"}>
                  {"Cambi: "}
                  <strong
                    id={"substitution-remaining-opp"}
                    data-react-managed="true"
                  >
                    <TeamCounter counter="substitutionsOpponent" />
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
        <PanelResizeHandle
          panel="left"
          id={"scout-resize-left"}
          className={"scout-column-resizer"}
          type={"button"}
          role={"separator"}
          aria-orientation={"vertical"}
          aria-label={"Ridimensiona colonna partita"}
          title={"Trascina per ridimensionare. Doppio clic per ripristinare."}
        ></PanelResizeHandle>
        <div className={"section scout-col-center"} data-scout-panel={"team"}>
          <div className={"set-type-wrapper"}>
            <div
              className={"set-type-shortcuts set-type-inline"}
              id={"set-type-shortcuts"}
              style={{ display: "none" }}
            >
              <div className={"set-type-shortcuts__head"}>
                <span className={"set-type-shortcuts__label"}>
                  {"Tipo alzata"}
                </span>
              </div>
              <SetTypeShortcuts />
            </div>
          </div>
          <div
            id={"scout-widgets-center-top"}
            className={"scout-widget-zone scout-widget-zone--center"}
            data-scout-widget-zone={"center-top"}
          >
            <div
              id={"video-scout-container"}
              className={"video-scout-container scout-widget hidden"}
              data-scout-widget={"video"}
            >
              <div className={"video-scout-panel"}>
                <div className={"video-player-wrap video-player-wrap--scout"}>
                  <div className={"video-media"}>
                    <VideoElement scout />
                    <iframe
                      id={"youtube-frame-scout"}
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
                  </div>
                  <PanelResizeHandle
                    panel="scoutHeight"
                    id={"video-scout-resize-handle"}
                    className={"video-resize-handle"}
                    type={"button"}
                    aria-label={"Allarga finestra video scout"}
                    title={"Trascina per allargare. Doppio click per reset."}
                  ></PanelResizeHandle>
                </div>
              </div>
            </div>
          </div>
          <div className={"players-area"} id={"court-area"}>
            <div id="court-overlay" data-react-managed="true" />
            <div
              className={"team-panel team-panel--far team-panel--opponent"}
              data-team-panel={"opponent"}
            >
              <div className={"team-field-box team-field-box--opponent"}>
                <div
                  className={
                    "court-actions-bar court-actions-inline sl-toolbar team-panel__bar team-panel__bar--opponent"
                  }
                >
                  <div className={"rotation-block court-rotation-block"}>
                    <div className={"rotation-controls"}>
                      <ScoutActionButton
                        id={"btn-rotate-cw-opp"}
                        className={"small rotate-cw"}
                      >
                        {"↺"}
                      </ScoutActionButton>
                      <div className={"rotation-display"}>
                        <ScoutRotationSelect
                          id={"rotation-select-opp"}
                          className={"rotation-select"}
                        >
                          <option value={"1"}>{"P1"}</option>
                          <option value={"2"}>{"P2"}</option>
                          <option value={"3"}>{"P3"}</option>
                          <option value={"4"}>{"P4"}</option>
                          <option value={"5"}>{"P5"}</option>
                          <option value={"6"}>{"P6"}</option>
                        </ScoutRotationSelect>
                      </div>
                      <ScoutActionButton
                        id={"btn-rotate-ccw-opp"}
                        className={"small rotate-ccw"}
                      >
                        {"↻"}
                      </ScoutActionButton>
                    </div>
                  </div>
                  <div
                    className={"score-actions court-game-actions sl-action-row"}
                  >
                    <AppActionButton
                      id={"btn-score-opp-point"}
                      className={"small success"}
                    >
                      {"Punto"}
                    </AppActionButton>
                    <AppActionButton
                      id={"btn-score-opp-error"}
                      className={"small danger"}
                    >
                      {"Errore"}
                    </AppActionButton>
                    <ScoutActionButton
                      id={"btn-freeball-opp"}
                      className={"secondary small"}
                    >
                      {"Freeball"}
                    </ScoutActionButton>
                  </div>
                  <div className={"team-controls-panel sl-team-controls"}>
                    <div className={"libero-inline"}>
                      <label>{"Libero"}</label>
                      <div
                        id={"libero-tags-inline-opp"}
                        className={"libero-tags"}
                      ></div>
                      <label className={"auto-libero-inline"}>
                        <ScoutLiberoSelect
                          id={"auto-libero-select-opp"}
                          defaultValue={"C"}
                        >
                          <option value={""}>{"Nessuno"}</option>
                          <option value={"P"}>{"P"}</option>
                          <option value={"S"}>{"S"}</option>
                          <option value={"C"}>{"C"}</option>
                          <option value={"O"}>{"O"}</option>
                        </ScoutLiberoSelect>
                      </label>
                      <ScoutActionButton
                        type={"button"}
                        id={"btn-swap-libero-opp"}
                        className={"small secondary"}
                      >
                        {"Cambia L"}
                      </ScoutActionButton>
                    </div>
                    <div className={"skill-flow-panel"}>
                      <label>{"Forza prossima skill"}</label>
                      <div
                        className={"skill-flow-grid skill-flow-inline"}
                        id={"skill-flow-buttons-opp"}
                      >
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-serve"}
                          data-force-skill={"serve"}
                        >
                          {"Ba"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-pass"}
                          data-force-skill={"pass"}
                        >
                          {"Ri"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-second"}
                          data-force-skill={"second"}
                        >
                          {"Al"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-attack"}
                          data-force-skill={"attack"}
                        >
                          {"At"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-block"}
                          data-force-skill={"block"}
                        >
                          {"Mu"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="opponent"
                          type={"button"}
                          className={"skill-flow-btn badge badge-defense"}
                          data-force-skill={"defense"}
                        >
                          {"Di"}
                        </ForceSkillButton>
                      </div>
                    </div>
                  </div>
                </div>
                <ScoutCourt scope="opponent" />
              </div>
            </div>
            <div className={"court-net-divider"}>
              <span>{"Rete"}</span>
              <div id={"net-actions-default"} className={"net-actions-default"}>
                <AppActionButton
                  id={"btn-attack-base"}
                  className={"small secondary net-action-btn"}
                  type={"button"}
                >
                  {"Base (K)"}
                </AppActionButton>
                <AppActionButton
                  id={"btn-attack-setter"}
                  className={"small secondary net-action-btn"}
                  type={"button"}
                >
                  {"Alzatore (A)"}
                </AppActionButton>
                <AppActionButton
                  id={"btn-attack-type"}
                  className={"small secondary net-action-btn"}
                  type={"button"}
                >
                  {"Tipo attacco (T)"}
                </AppActionButton>
                <AppActionButton
                  id={"btn-block-number"}
                  className={"small secondary net-action-btn"}
                  type={"button"}
                >
                  {"N° muro (N)"}
                </AppActionButton>
              </div>
              <AppActionButton
                id={"btn-net-block-prompt"}
                className={
                  "small net-action-btn net-action-btn--block-prompt hidden"
                }
                type={"button"}
              >
                {"Muro"}
              </AppActionButton>
              <AppActionButton
                id={"btn-contesa"}
                className={"small danger net-action-btn"}
                type={"button"}
                title={"Annulla l’azione fino alla battuta inclusa"}
              >
                {"Contesa"}
              </AppActionButton>
              <AppActionButton
                id={"btn-undo"}
                className={"small danger net-action-btn"}
              >
                {"↩ Annulla ultimo"}
              </AppActionButton>
            </div>
            <div
              className={"team-panel team-panel--near team-panel--home"}
              data-team-panel={"home"}
            >
              <div className={"team-field-box team-field-box--home"}>
                <ScoutCourt scope="our" />
                <div
                  className={
                    "court-actions-bar court-actions-inline sl-toolbar team-panel__bar team-panel__bar--home"
                  }
                >
                  <div className={"rotation-block court-rotation-block"}>
                    <div className={"rotation-controls"}>
                      <ScoutActionButton
                        id={"btn-rotate-cw"}
                        className={"small rotate-cw"}
                      >
                        {"↺"}
                      </ScoutActionButton>
                      <div className={"rotation-display"}>
                        <ScoutRotationSelect
                          id={"rotation-select"}
                          className={"rotation-select"}
                        >
                          <option value={"1"}>{"P1"}</option>
                          <option value={"2"}>{"P2"}</option>
                          <option value={"3"}>{"P3"}</option>
                          <option value={"4"}>{"P4"}</option>
                          <option value={"5"}>{"P5"}</option>
                          <option value={"6"}>{"P6"}</option>
                        </ScoutRotationSelect>
                      </div>
                      <ScoutActionButton
                        id={"btn-rotate-ccw"}
                        className={"small rotate-ccw"}
                      >
                        {"↻"}
                      </ScoutActionButton>
                    </div>
                  </div>
                  <div
                    className={"score-actions court-game-actions sl-action-row"}
                  >
                    <AppActionButton
                      id={"btn-score-team-point"}
                      className={"small"}
                    >
                      {"Punto"}
                    </AppActionButton>
                    <AppActionButton
                      id={"btn-score-team-error"}
                      className={"small danger"}
                    >
                      {"Errore"}
                    </AppActionButton>
                    <div
                      id={"single-team-score-actions"}
                      className={"score-actions-inline hidden"}
                    >
                      <AppActionButton
                        id={"btn-score-opp-point-single"}
                        className={"small success"}
                      >
                        {"Punto avv"}
                      </AppActionButton>
                      <AppActionButton
                        id={"btn-score-opp-error-single"}
                        className={"small danger"}
                      >
                        {"Errore avv"}
                      </AppActionButton>
                    </div>
                    <div className={"freeball-actions-inline"}>
                      <ScoutActionButton
                        id={"btn-freeball"}
                        className={"secondary small"}
                      >
                        {"Freeball"}
                      </ScoutActionButton>
                      <ScoutActionButton
                        id={"btn-freeball-opp-single"}
                        className={"small danger hidden"}
                      >
                        {"Freeball avv"}
                      </ScoutActionButton>
                    </div>
                  </div>
                  <div className={"team-controls-panel sl-team-controls"}>
                    <div className={"libero-inline"}>
                      <label>{"Libero"}</label>
                      <div
                        id={"libero-tags-inline"}
                        className={"libero-tags"}
                      ></div>
                      <label className={"auto-libero-inline"}>
                        <ScoutLiberoSelect
                          id={"auto-libero-select"}
                          defaultValue={"C"}
                        >
                          <option value={""}>{"Nessuno"}</option>
                          <option value={"P"}>{"P"}</option>
                          <option value={"S"}>{"S"}</option>
                          <option value={"C"}>{"C"}</option>
                          <option value={"O"}>{"O"}</option>
                        </ScoutLiberoSelect>
                      </label>
                      <ScoutActionButton
                        type={"button"}
                        id={"btn-swap-libero"}
                        className={"small secondary"}
                      >
                        {"Cambia L"}
                      </ScoutActionButton>
                    </div>
                    <div className={"skill-flow-panel"}>
                      <label>{"Forza prossima skill"}</label>
                      <div
                        className={"skill-flow-grid skill-flow-inline"}
                        id={"skill-flow-buttons"}
                      >
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-serve"}
                          data-force-skill={"serve"}
                        >
                          {"Ba"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-pass"}
                          data-force-skill={"pass"}
                        >
                          {"Ri"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-second"}
                          data-force-skill={"second"}
                        >
                          {"Al"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-attack"}
                          data-force-skill={"attack"}
                        >
                          {"At"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-block"}
                          data-force-skill={"block"}
                        >
                          {"Mu"}
                        </ForceSkillButton>
                        <ForceSkillButton
                          scope="our"
                          type={"button"}
                          className={"skill-flow-btn badge badge-defense"}
                          data-force-skill={"defense"}
                        >
                          {"Di"}
                        </ForceSkillButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <NextSetPreparation />
          </div>
          <div
            id={"scout-widgets-center-bottom"}
            className={"scout-widget-zone scout-widget-zone--center"}
            data-scout-widget-zone={"center-bottom"}
          ></div>
        </div>
        <PanelResizeHandle
          panel="right"
          id={"scout-resize-right"}
          className={"scout-column-resizer"}
          type={"button"}
          role={"separator"}
          aria-orientation={"vertical"}
          aria-label={"Ridimensiona colonna log"}
          title={"Trascina per ridimensionare. Doppio clic per ripristinare."}
        ></PanelResizeHandle>
        <div
          className={"section log-section scout-col-right"}
          data-log-section={""}
          data-scout-panel={"log"}
        >
          <ScoutDrawerButton
            drawer=""
            className={"drawer-close secondary small"}
            type={"button"}
            data-close-drawer={"log"}
          >
            {"Chiudi"}
          </ScoutDrawerButton>
          <AppActionButton
            id={"btn-reset-scout-widgets"}
            className={"secondary small scout-widgets-reset"}
            type={"button"}
          >
            {"Ripristina disposizione"}
          </AppActionButton>
          <div
            id={"scout-widgets-right"}
            className={"scout-widget-zone scout-widget-zone--right"}
            data-scout-widget-zone={"right"}
          >
            <DvwEntry />
            <LogServeTrajectories />
            <div
              className={"scout-widget scout-events-widget"}
              data-scout-widget={"events"}
            >
              <div
                id={"events-log-summary"}
                className={"events-log-summary"}
                aria-live={"polite"}
              ></div>
              <EventTable id="events-log" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
