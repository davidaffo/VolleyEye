import { MatchActionButton, ActiveMatchName } from "../MatchArchive.jsx";
import { TabButton } from "../RuntimeControls.jsx";

// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function AppNavigation() {
  return (
    <div className={"tabs-nav centered app-shell-nav"}>
      <h1 className={"app-title"}>{"VolleyEye"}</h1>
      <a
        className={"manual-link-btn hidden"}
        href={"docs/markdown-viewer.html?doc=manual.md&title=Manuale"}
        target={"_blank"}
        rel={"noopener"}
      >
        {"Manuale"}
      </a>
      <div
        className={"match-session-identity match-session-only"}
        aria-live={"polite"}
      >
        <span className={"match-session-identity__label"}>{"Partita"}</span>
        <ActiveMatchName />
      </div>
      <TabButton
        className={"tab-btn lobby-only active"}
        data-tab-target={"match"}
      >
        {"Partite"}
      </TabButton>
      <TabButton
        className={"tab-btn match-session-only"}
        data-tab-target={"scout"}
      >
        {"Scout live"}
      </TabButton>
      <TabButton
        className={"tab-btn match-session-only"}
        data-tab-target={"aggregated"}
      >
        {"Analisi"}
      </TabButton>
      <TabButton
        className={"tab-btn match-session-only"}
        data-tab-target={"video"}
      >
        {"Video"}
      </TabButton>
      <TabButton
        className={"tab-btn global-settings-btn"}
        data-tab-target={"info"}
      >
        {"Impostazioni"}
      </TabButton>
      <MatchActionButton
        command="editMatch"
        className={"secondary match-session-only"}
        type={"button"}
        data-edit-match={""}
      >
        {"Modifica dati partita"}
      </MatchActionButton>
      <MatchActionButton
        command="exitCurrentMatch"
        id={"btn-exit-match"}
        className={"secondary match-session-only match-session-exit"}
        type={"button"}
        data-exit-match={""}
      >
        {"Esci dalla partita"}
      </MatchActionButton>
    </div>
  );
}
