import { normalizeAutoLiberoRolePreference } from '../teams/preferences.js';
import { AUTO_LIBERO_ROLE_DEFAULT_VERSION } from '../../../js/globals.js';
import { getCurrentMatchPayload } from '../teams/current-payload.js';
import { cloneIsolationData } from '../../domain/snapshots.js';
import { normalizeThemePreference } from './ui-preferences.js';

export function buildCompactLocalStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const selectedMatch = snapshot.selectedMatch || "";
  const currentMatchPayload =
    selectedMatch
      ? getCurrentMatchPayload(selectedMatch)
      : null;
  const compact = {
    __compactLocalSnapshot: true,
    lastSavedAt: Number(snapshot.lastSavedAt || Date.now()) || Date.now(),
    theme: normalizeThemePreference(snapshot.theme),
    match: snapshot.match || {},
    selectedMatch: snapshot.selectedMatch || "",
    selectedTeam: snapshot.selectedTeam || "",
    selectedOpponentTeam: snapshot.selectedOpponentTeam || "",
    loadedMatchName: snapshot.loadedMatchName || snapshot.selectedMatch || "",
    currentSet: snapshot.currentSet || 1,
    rotation: snapshot.rotation || 1,
    opponentRotation: snapshot.opponentRotation || 1,
    courtSideSwapped: !!snapshot.courtSideSwapped,
    useOpponentTeam: !!snapshot.useOpponentTeam,
    matchFinished: !!snapshot.matchFinished,
    autoRolePositioning: snapshot.autoRolePositioning !== false,
    uiActiveTab: snapshot.uiActiveTab || "match",
    uiMatchSessionActive: snapshot.uiMatchSessionActive === true,
    uiAggTab: snapshot.uiAggTab || "summary",
    uiTopBarHidden: !!snapshot.uiTopBarHidden,
    forceMobileLayout: !!snapshot.forceMobileLayout,
    uiScoutColumns: {
      left: Number(snapshot.uiScoutColumns && snapshot.uiScoutColumns.left) || 280,
      right: Number(snapshot.uiScoutColumns && snapshot.uiScoutColumns.right) || 380
    },
    uiScoutWidgetLayout: snapshot.uiScoutWidgetLayout || null,
    uiPlayerAnalysis: snapshot.uiPlayerAnalysis || null,
    uiVideoLayout: snapshot.uiVideoLayout || null,
    uiVideoAnalysisSort: snapshot.uiVideoAnalysisSort || null,
    video: snapshot.video || { offsetSeconds: 0, fileName: "", youtubeId: "", youtubeUrl: "", lastPlaybackSeconds: 0 },
    players: Array.isArray(snapshot.players) ? snapshot.players : [],
    playerNumbers: snapshot.playerNumbers || {},
    liberos: Array.isArray(snapshot.liberos) ? snapshot.liberos : [],
    liberoAutoMap: snapshot.liberoAutoMap || {},
    autoLiberoBackline: snapshot.autoLiberoBackline !== false,
    autoLiberoRole: normalizeAutoLiberoRolePreference(snapshot.autoLiberoRole, snapshot.autoLiberoRoleDefaultVersion),
    autoLiberoRoleDefaultVersion: AUTO_LIBERO_ROLE_DEFAULT_VERSION,
    preferredLibero: snapshot.preferredLibero || "",
    captains: Array.isArray(snapshot.captains) ? snapshot.captains.slice(0, 1) : [],
    opponentPlayers: Array.isArray(snapshot.opponentPlayers) ? snapshot.opponentPlayers : [],
    opponentPlayerNumbers: snapshot.opponentPlayerNumbers || {},
    opponentLiberos: Array.isArray(snapshot.opponentLiberos) ? snapshot.opponentLiberos : [],
    opponentLiberoAutoMap: snapshot.opponentLiberoAutoMap || {},
    opponentAutoLiberoBackline: snapshot.opponentAutoLiberoBackline !== false,
    opponentAutoLiberoRole: normalizeAutoLiberoRolePreference(snapshot.opponentAutoLiberoRole, snapshot.autoLiberoRoleDefaultVersion),
    opponentPreferredLibero: snapshot.opponentPreferredLibero || "",
    opponentCaptains: Array.isArray(snapshot.opponentCaptains) ? snapshot.opponentCaptains.slice(0, 1) : [],
    events: Array.isArray(snapshot.events) ? snapshot.events : [],
    stats: snapshot.stats || {},
    opponentStats: snapshot.opponentStats || {},
    court: Array.isArray(snapshot.court) ? snapshot.court : [],
    opponentCourt: Array.isArray(snapshot.opponentCourt) ? snapshot.opponentCourt : [],
    autoRoleBaseCourt: Array.isArray(snapshot.autoRoleBaseCourt) ? snapshot.autoRoleBaseCourt : [],
    opponentAutoRoleBaseCourt: Array.isArray(snapshot.opponentAutoRoleBaseCourt) ? snapshot.opponentAutoRoleBaseCourt : [],
    autoRoleP1American: !!snapshot.autoRoleP1American,
    opponentAutoRoleP1American: !!snapshot.opponentAutoRoleP1American,
    isServing: !!snapshot.isServing,
    autoRotate: snapshot.autoRotate !== false,
    autoRotatePending: !!snapshot.autoRotatePending,
    opponentAutoRotatePending: !!snapshot.opponentAutoRotatePending,
    predictiveSkillFlow: snapshot.predictiveSkillFlow !== false,
    attackTrajectoryEnabled: snapshot.attackTrajectoryEnabled !== false,
    attackTrajectorySimplified: snapshot.attackTrajectorySimplified !== false,
    serveTrajectoryEnabled: snapshot.serveTrajectoryEnabled !== false,
    opponentAttackTrajectoryEnabled: snapshot.opponentAttackTrajectoryEnabled !== false,
    opponentServeTrajectoryEnabled: snapshot.opponentServeTrajectoryEnabled !== false,
    setTypePromptEnabled: snapshot.setTypePromptEnabled !== false,
    opponentSetTypePromptEnabled: snapshot.opponentSetTypePromptEnabled !== false,
    showServeTrajectoryLogOur: snapshot.showServeTrajectoryLogOur !== false,
    showServeTrajectoryLogOpp: snapshot.showServeTrajectoryLogOpp !== false,
    videoScoutMode: !!snapshot.videoScoutMode,
    videoPlayByPlay: !!snapshot.videoPlayByPlay,
    defaultSetType: snapshot.defaultSetType || "",
    nextSetType: snapshot.nextSetType || "",
    videoFilterPresets: snapshot.videoFilterPresets || [],
    skillFlowOverride: snapshot.skillFlowOverride || null,
    opponentSkillFlowOverride: snapshot.opponentSkillFlowOverride || null,
    flowTeamScope: snapshot.flowTeamScope || "our",
    forceSkillActive: !!snapshot.forceSkillActive,
    forceSkillScope: snapshot.forceSkillScope || null,
    pendingServe: snapshot.pendingServe || null,
    freeballPending: !!snapshot.freeballPending,
    freeballPendingScope: snapshot.freeballPendingScope || "our",
    opponentSkillConfig: snapshot.opponentSkillConfig || {},
    skillClock: snapshot.skillClock || null,
    metricsConfig: snapshot.metricsConfig || {},
    pointRules: snapshot.pointRules || {},
    savedTeams: snapshot.savedTeams || {},
    savedOpponentTeams: snapshot.savedOpponentTeams || snapshot.savedTeams || {},
    savedMatches:
      currentMatchPayload && selectedMatch
        ? { [selectedMatch]: currentMatchPayload }
        : {},
    scoreOverrides: snapshot.scoreOverrides || {},
    setResults: snapshot.setResults || {},
    setStarts: snapshot.setStarts || {}
  };
  return cloneIsolationData(compact);
}
