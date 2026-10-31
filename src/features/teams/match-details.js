import { session as matchState } from "../../../js/globals.js";

export function getTodayIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatUsDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function buildMatchDisplayName(matchObj) {
  const m = matchObj || matchState.state.match || {};
  const dateIso = m.date || getTodayIso();
  const datePart = formatUsDate(dateIso);
  const teamName = (m.teamName || "").trim();
  const typeLabels = {
    amichevole: "Amichevole",
    campionato: "Campionato",
    torneo: "Torneo",
    playoff: "Playoff",
    playout: "Playout",
    coppa: "Coppa"
  };
  const legLabels = {
    andata: "Andata",
    ritorno: "Ritorno",
    "gara-1": "Gara 1",
    "gara-2": "Gara 2",
    "gara-3": "Gara 3"
  };
  const parts = [
    datePart || getTodayIso(),
    teamName || "Squadra",
    m.opponent || "Match",
    m.category || "",
    typeLabels[m.matchType] || m.matchType || "",
    legLabels[m.leg] || m.leg || ""
  ].filter(Boolean);
  return parts.join(" - ") || "Match";
}

export function ensureMatchDefaults() {
  matchState.state.match = matchState.state.match || {};
  if (!matchState.state.match.date) {
    matchState.state.match.date = getTodayIso();
  }
  if (!matchState.state.match.matchType) {
    matchState.state.match.matchType = "amichevole";
  }
  if (typeof matchState.state.match.leg !== "string") {
    matchState.state.match.leg = "";
  }
}

export function safeMatchSlug() {
  const datePart = (matchState.state.match && matchState.state.match.date) || "";
  const opponentSlug = (matchState.state.match.opponent || "match").replace(/\s+/g, "_");
  return (datePart ? datePart + "_" : "") + opponentSlug;
}
