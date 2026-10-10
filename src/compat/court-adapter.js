// View construction preserves the established court and skill-flow rules.
function publishScoutCourtView(
  scope,
  { hidden, compact, nextSkillId, animate },
) {
  if (hidden) {
    scoutCourtStore.publish(scope, {
      hidden: true,
      cards: Object.freeze([]),
      bench: Object.freeze([]),
    });
    return;
  }
  const selector = `.court-card[data-team-scope="${scope}"]`;
  const animationKey = (element) =>
    element.dataset.playerName || "pos-" + (element.dataset.posIndex || "");
  const previousRects = animate ? captureRects(selector, animationKey) : null;
  const players = getPlayersForScope(scope);
  const valid = new Set(players);
  const court = ensureCourtShapeFor(getTeamCourt(scope)).map((slot) => ({
    main: valid.has(slot.main) ? slot.main : "",
    replaced: valid.has(slot.replaced) ? slot.replaced : "",
  }));
  if (scope === "opponent") state.opponentCourt = court;
  else state.court = court;
  const mirrored =
    scope === "opponent"
      ? state.opponentCourtViewMirrored
      : state.courtViewMirrored;
  const predicted = nextSkillId || getScoutCourtSkill(scope);
  const layoutSkill =
    state.predictiveSkillFlow && predicted
      ? predicted
      : isAnySelectedSkillForScope(scope, "pass")
        ? "pass"
        : isAnySelectedSkillForScope(scope, "serve")
          ? "serve"
          : null;
  const displayCourt = getAutoRoleDisplayCourt(layoutSkill, scope);
  const numbers = getPlayerNumbersForScope(scope);
  const captainSet = new Set(
    getCaptainsForScope(scope).map((name) => name.toLowerCase()),
  );
  const liberos = new Set(getLiberosForScope(scope));
  const errorPick = isErrorPickModeForScope(scope);
  const pointPick = isPointPickModeForScope(scope);
  const cards = [3, 2, 1, 4, 5, 0].map((index) => {
    const info = displayCourt[index] || { slot: { main: "" }, idx: index };
    const slot = info.slot || { main: "" };
    const posIndex = info.idx != null ? info.idx : index;
    const effective = !slot.main && court[index]?.main ? court[index] : slot;
    const name = effective.main;
    const playerIndex = name ? players.indexOf(name) : -1;
    const libero = liberos.has(effective.main);
    const setter =
      playerIndex >= 0 && isSetterPlayerForScope(scope, playerIndex);
    const photo = name ? getPlayerPhotoForScope(scope, name) : "";
    return Object.freeze({
      index,
      posIndex,
      name,
      playerIndex,
      libero,
      setter,
      photo,
      label: name
        ? formatNameWithNumberFor(name, numbers, {
            scope,
            captainSet,
            compactCourt: true,
          })
        : "—",
      role:
        typeof getRoleLabelForRotation === "function"
          ? getRoleLabelForRotation(
              (posIndex || 0) + 1,
              (scope === "opponent"
                ? state.opponentRotation
                : state.rotation) || 1,
            )
          : getRoleLabel((posIndex || 0) + 1),
      gridArea: POSITIONS_META[index]?.gridArea,
      restoreLabel:
        libero && effective.replaced ? "Rientra " + effective.replaced : null,
      onRestore:
        libero && effective.replaced
          ? () => restorePlayerFromLiberoForScope(posIndex, scope)
          : null,
      onPick:
        name && playerIndex !== -1
          ? pointPick
            ? () => applyPointForPickedPlayer(scope, playerIndex, name)
            : errorPick
              ? () => openErrorModalForPickedPlayer(scope, playerIndex, name)
              : null
          : null,
      skills:
        name && playerIndex !== -1 && !pointPick && !errorPick
          ? buildScoutSkillView(playerIndex, name, {
              nextSkillId: predicted,
              scope,
            })
          : null,
    });
  });
  const bench = errorPick
    ? getBenchEntriesForScope(scope).map(({ name, idx }) =>
        Object.freeze({
          name,
          label: formatNameWithNumberFor(name, numbers, { scope }),
          onPick: () => openErrorModalForPickedPlayer(scope, idx, name),
        }),
      )
    : [];
  scoutCourtStore.publish(scope, {
    hidden: false,
    compact,
    mirrored: !!mirrored,
    previousRects,
    cards: Object.freeze(cards),
    bench: Object.freeze(bench),
    errorPick,
    pointPick,
    far:
      scope === "opponent" ? !state.courtSideSwapped : !!state.courtSideSwapped,
    onCancelPick: pointPick ? stopPointPickMode : stopErrorPickMode,
    onTeamPoint: () => {
      handleTeamPoint(scope);
      stopPointPickMode();
    },
    onTeamError: () => openErrorModal({ scope, teamFromPicker: true }),
  });
}
