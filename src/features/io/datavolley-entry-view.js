import { DV_SKILLS_BY_CODE } from "./datavolley-skills.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { dvwEntryStore } from "../../state/roster-import-store.mjs";
import { session as matchState } from "../../../js/globals.js";
import { buildDataVolleySkillCode, getDataVolleyTeamPayload } from "./datavolley-export.js";
import { getTeamScopeFromEvent } from "../teams/selectors.js";

export function setDvwScoutStatus(message, tone = "") {
  if (!teamManagementState.elDvwScoutStatus) return;
   dvwEntryStore.publish({ status: message || "", tone }); return;

}

export function getDvwScoutSkillLabel(letter) {
  const map = {
    S: "Battuta",
    R: "Ricezione",
    A: "Attacco",
    B: "Muro",
    D: "Difesa",
    E: "Alzata",
    F: "Freeball"
  };
  return map[String(letter || "").toUpperCase()] || String(letter || "").toUpperCase();
}

export function getDvwScoutTypeLabel(letter, skillLetter = "") {
  const type = String(letter || "").toUpperCase();
  const skill = String(skillLetter || "").toUpperCase();
  const genericMap = {
    H: "High",
    M: "Medium",
    Q: "Quick",
    T: "Tense",
    U: "Super",
    N: "Fast",
    O: "Other"
  };
  const contextualMap = {
    S: {
      H: "Float",
      M: "Jump Float",
      Q: "Jump Serve"
    },
    R: {
      H: "Su Float",
      M: "Su Jump Float",
      Q: "Su Jump Serve"
    },
    A: {
      H: "Alta",
      M: "Mezza",
      Q: "Quick",
      T: "Tesa",
      U: "Super",
      N: "Fast",
      O: "Altro"
    },
    B: {
      H: "Su Alta",
      M: "Su Mezza",
      Q: "Su Quick",
      T: "Su Tesa",
      U: "Su Super",
      N: "Su Fast",
      O: "Su Altro"
    },
    D: {
      H: "Su Alta",
      M: "Su Mezza",
      Q: "Su Quick",
      T: "Su Tesa",
      U: "Su Super",
      N: "Su Fast",
      O: "Su Altro"
    },
    E: {
      H: "Per Alta",
      M: "Per Mezza",
      Q: "Per Quick",
      T: "Per Tesa",
      U: "Per Super",
      N: "Per Fast",
      O: "Per Altro"
    },
    F: {
      H: "Alta",
      M: "Media",
      Q: "Rapida",
      O: "Altra"
    }
  };
  return (contextualMap[skill] && contextualMap[skill][type]) || genericMap[type] || type;
}

export function getDvwScoutEvalLabel(symbol) {
  const map = {
    "#": "#",
    "+": "+",
    "!": "!",
    "-": "-",
    "/": "/",
    "=": "="
  };
  return map[String(symbol || "")] || String(symbol || "");
}

export function getDvwScoutChipSkillClass(parsed) {
  if (!parsed || parsed.kind !== "skill") return "";
  const skillMap = DV_SKILLS_BY_CODE;
  const skillId = skillMap[String(parsed.skillLetter || "").toUpperCase()] || "";
  return skillId ? `is-skill-${skillId}` : "";
}

export function updateLiveDvwMirror() {
  const last = [...(matchState.state.events || [])].reverse().find(event => event && event.skillId !== "manual" && !event.actionType);
  const code = last ? buildDataVolleySkillCode(last, getDataVolleyTeamPayload(getTeamScopeFromEvent(last))) : "";
  dvwEntryStore.publish({ lastCode: code ? `Ultimo codice: ${code}` : "Ultimo codice: —" });
}
