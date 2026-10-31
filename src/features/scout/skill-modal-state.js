import { session as matchState } from "../../../js/globals.js";
import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { isDesktopCourtModalLayout, setModalOpenState } from "../layout/modals.js";
import { session as scoutUiState } from "../state/scout-ui.js";

export function publishSkillModalCancel(cancelVisible) {
  skillModalStore.publish({ cancelVisible });
}

export function setSkillModalOpen(open) {
  skillModalStore.publish({ open, courtModal: isDesktopCourtModalLayout() });
}

export function setSkillModalCancelVisibility(visible) {
  if (!matchState.elSkillModalCancel) return;
  publishSkillModalCancel(visible);
}

export function closeSkillModal() {
  if (!matchState.elSkillModal) return;
  setSkillModalOpen(false);
  setModalOpenState(false);
  scoutUiState.activeSkillModalContext = null;
  setSkillModalCancelVisibility(false);
}
