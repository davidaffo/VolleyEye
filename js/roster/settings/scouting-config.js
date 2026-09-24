function normalizeMetricConfig(skillId, cfg) {
  const def = METRIC_DEFAULTS[skillId] || METRIC_DEFAULTS.serve;
  const uniq = list =>
    Array.from(new Set((list || []).filter(code => allowedMetricCodes.has(code))));
  const positive = uniq((cfg && cfg.positive) || def.positive || ["#", "+"]);
  const negative = uniq((cfg && cfg.negative) || def.negative || ["-"]);
  const neutral = RESULT_CODES.filter(code => !positive.includes(code) && !negative.includes(code));
  const activeCodes = uniq((cfg && cfg.activeCodes) || def.activeCodes || RESULT_CODES).filter(
    code => skillId !== "block" || code !== "!"
  );
  const enabled = cfg && typeof cfg.enabled === "boolean" ? cfg.enabled : def.enabled !== false;
  return { positive, neutral, negative, activeCodes, enabled };
}
function sameCodeList(a, b) {
  const left = Array.isArray(a) ? a.slice().sort() : [];
  const right = Array.isArray(b) ? b.slice().sort() : [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
function normalizePointRule(skillId, cfg) {
  const def = POINT_RULE_DEFAULTS[skillId] || { for: [], against: [] };
  const uniq = list =>
    Array.from(new Set((list || []).filter(code => allowedPointCodes.has(code))));
  const made = uniq((cfg && cfg.for) || def.for || []);
  const conceded = uniq((cfg && cfg.against) || def.against || []);
  return { for: made, against: conceded };
}
function normalizeScoreOverrides(raw) {
  const cleaned = {};
  if (!raw || typeof raw !== "object") return cleaned;
  Object.keys(raw).forEach(key => {
    const setNum = parseInt(key, 10);
    if (!setNum || setNum < 1 || setNum > 5) return;
    const entry = raw[key] || {};
    const forVal = Number(entry.for);
    const againstVal = Number(entry.against);
    cleaned[setNum] = {
      for: Number.isFinite(forVal) ? forVal : 0,
      against: Number.isFinite(againstVal) ? againstVal : 0
    };
  });
  return cleaned;
}
function ensurePointRulesDefaults() {
  state.pointRules = state.pointRules || {};
  SKILLS.forEach(skill => {
    state.pointRules[skill.id] = normalizePointRule(skill.id, state.pointRules[skill.id]);
    if (skill.id === "serve") {
      const current = state.pointRules[skill.id];
      if (
        sameCodeList(current.for, ["#", "+", "!", "/"]) &&
        sameCodeList(current.against, ["="])
      ) {
        state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS.serve);
      }
    }
    if (skill.id === "pass" || skill.id === "freeball") {
      const current = state.pointRules[skill.id];
      if (
        Array.isArray(current.against) &&
        current.against.includes("/") &&
        sameCodeList(current.for, []) &&
        (sameCodeList(current.against, ["=", "/"]) || sameCodeList(current.against, ["/"]))
      ) {
        state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS.pass);
      }
    }
    if (skill.id === "defense") {
      state.pointRules[skill.id].against = state.pointRules[skill.id].against.filter(code => code !== "/");
    }
    if (
      skill.id === "second" &&
      Array.isArray(state.pointRules[skill.id].against) &&
      state.pointRules[skill.id].against.length === 1 &&
      state.pointRules[skill.id].against[0] === "="
    ) {
      state.pointRules[skill.id].against.push("/");
    }
  });
}
function getCodeTone(skillId, code) {
  ensureMetricsConfigDefaults();
  const cfg = normalizeMetricConfig(skillId, state.metricsConfig[skillId]);
  if (cfg.positive.includes(code)) return "positive";
  if (cfg.negative.includes(code)) return "negative";
  return "neutral";
}
function ensureMetricsConfigDefaults() {
  state.metricsConfig = state.metricsConfig || {};
  SKILLS.forEach(skill => {
    state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, state.metricsConfig[skill.id]);
    if (skill.id === "freeball") {
      const current = state.metricsConfig[skill.id];
      const legacyPositive = ["#", "+", "!"];
      const legacyNegative = ["/", "="];
      if (
        sameCodeList(current.positive, legacyPositive) &&
        sameCodeList(current.negative, legacyNegative)
      ) {
        state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, METRIC_DEFAULTS.pass);
      }
    }
  });
}
function ensureOpponentSkillConfigDefaults() {
  state.opponentSkillConfig = state.opponentSkillConfig || {};
  SKILLS.forEach(skill => {
    if (typeof state.opponentSkillConfig[skill.id] !== "boolean") {
      state.opponentSkillConfig[skill.id] = true;
    }
  });
}
function updateTeamButtonsState() {
  if (!elTeamsSelect) return;
  const selected = elTeamsSelect.value || "";
  if (typeof updateMatchStatusUI === "function") {
    updateMatchStatusUI();
  }
  if (elBtnDeleteTeam) {
    elBtnDeleteTeam.disabled = !selected;
  }
  if (elBtnDuplicateTeam) {
    elBtnDuplicateTeam.disabled = !selected;
  }

}
function updateOpponentTeamButtonsState() {
  if (!elOpponentTeamsSelect) return;
  const selected = elOpponentTeamsSelect.value || "";
  if (elBtnSaveOpponentTeam) {
    elBtnSaveOpponentTeam.textContent = selected ? "Sovrascrivi" : "Salva avversaria";
  }
  if (elBtnDeleteOpponentTeam) {
    elBtnDeleteOpponentTeam.disabled = !selected;
  }
  if (elBtnRenameOpponentTeam) {
    elBtnRenameOpponentTeam.disabled = !selected;
  }
}
function updateMatchButtonsState() {
  if (!elSavedMatchesSelect && !elSavedMatchesList) return;
  const selected = elSavedMatchesSelect ? elSavedMatchesSelect.value || "" : "";
  if (elBtnLoadMatch) {
    elBtnLoadMatch.disabled = !selected;
  }
  if (elBtnDeleteMatch) {
    elBtnDeleteMatch.disabled = !selected;
  }
}
function hasUsableMatch() {
  const names = Object.keys(state.savedMatches || {});
  if (names.length === 0) return false;
  const selected = (state.selectedMatch || "").trim();
  return !!selected && names.includes(selected);
}
function applyMatchRequirementLock() {
  const hasMatches = hasUsableMatch();
  if (!hasMatches) state.uiMatchSessionActive = false;
  if (document && document.body) {
    document.body.dataset.noMatch = hasMatches ? "false" : "true";
  }
  if (tabButtons && tabButtons.forEach) {
    tabButtons.forEach(btn => {
      const target = btn && btn.dataset ? btn.dataset.tabTarget : "";
      if (!target) return;
      btn.disabled = false;
      btn.dataset.noMatchLocked = !hasMatches && !["match", "info"].includes(target) ? "true" : "false";
    });
  }
  if (typeof syncMatchSessionUI === "function") syncMatchSessionUI();
  if (!hasMatches && typeof setActiveTab === "function" && !["match", "info"].includes(activeTab)) {
    setActiveTab("match");
  }
}
const STATE_DB_NAME = "volleyScoutStateDb";
const STATE_DB_VERSION = 2;
const STATE_DB_STORE = "state";
let stateDbPromise = null;
function getStateDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (stateDbPromise) return stateDbPromise;
  stateDbPromise = new Promise(resolve => {
    const request = indexedDB.open(STATE_DB_NAME, STATE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ARCHIVE_DB_STORE)) db.createObjectStore(ARCHIVE_DB_STORE);
      if (!db.objectStoreNames.contains(STATE_DB_STORE)) {
        db.createObjectStore(STATE_DB_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); stateDbPromise = null; archiveStorage.db = null; };
      resolve(db);
    };
    request.onblocked = () => {
      if (typeof alert === "function") alert("Chiudi le altre schede di VolleyEye per aggiornare l’archivio.");
    };
    request.onerror = () => resolve(null);
  });
  return stateDbPromise;
}
function readStateFromIndexedDb() {
  const raw = archiveStorage.getItem(STORAGE_KEY);
  return Promise.resolve(raw ? JSON.parse(raw) : null);
}
function writeStateToIndexedDb(snapshot) {
  return archiveStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
function makeUniqueMatchName(baseName, existingNames = []) {
  const base = String(baseName || "Match").trim() || "Match";
  const used = new Set(existingNames.map(name => String(name || "").trim()).filter(Boolean));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base} (${suffix})`)) suffix += 1;
  return `${base} (${suffix})`;
}
function generateMatchName(base = "") {
  if (base) return base;
  const existingNames = Array.from(
    new Set([
      ...Object.keys(state.savedMatches || {}),
      ...listMatchesFromStorage()
    ])
  );
  return makeUniqueMatchName(buildMatchDisplayName(state.match), existingNames);
}
function persistCurrentMatch(options = {}) {
  const { allowCreate = true } = options || {};
  if (typeof window !== "undefined") {
    const resetCooldownActive =
      Number.isFinite(window.__recentAppResetAt) &&
      Date.now() - window.__recentAppResetAt < 5000;
    if (window.__appResetInProgress || resetCooldownActive) {
      window.__resetWriteLog = window.__resetWriteLog || [];
      window.__resetWriteLog.push({
        kind: "persistCurrentMatch-blocked",
        at: new Date().toISOString(),
        allowCreate: !!allowCreate,
        selectedMatch: state && state.selectedMatch,
        loadedMatchName: state && state.loadedMatchName,
        stack: new Error().stack
      });
      return false;
    }
  }
  if (typeof buildMatchExportPayload !== "function") return false;
  state.savedMatches = state.savedMatches || {};
  const currentName = (state.loadedMatchName || state.selectedMatch || "").trim();
  if (!currentName && !allowCreate) {
    return false;
  }
  if (!allowCreate) {
    const knownInMemory = !!(state.savedMatches && state.savedMatches[currentName]);
    const knownInStorage = !!loadMatchFromStorage(currentName);
    if (!knownInMemory && !knownInStorage) {
      return false;
    }
  }
  const desiredName = currentName || generateMatchName(state.loadedMatchName || state.selectedMatch);
  const payload = getCurrentMatchPayload(desiredName);
  state.loadedMatchName = desiredName;
  state.selectedMatch = desiredName;
  state.savedMatches[desiredName] = cloneIsolationData(payload);
  const stored = saveMatchToStorage(desiredName, payload);
  updateMatchButtonsState();
  renderMatchesSelect();
  return stored;
}
