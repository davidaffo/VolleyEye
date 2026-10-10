function publishReactEventTable(target, events, options = {}) {
  const contextKey = options.contextKey || target.id || "events",
    enableSelection = options.enableSelection !== false,
    showCheckbox = enableSelection && options.showCheckbox !== false,
    showIndex = options.showIndex !== false,
    showVideoTime = options.showVideoTime,
    baseMs = options.baseMs || null,
    showSeek = options.showSeek,
    sortState = options.sortState || null;
  const headers = [
    ...(enableSelection && showCheckbox ? [{ label: "✓" }] : []),
    ...(showIndex ? [{ label: "ID", sortKey: "eventId" }] : []),
    ...(showVideoTime
      ? [{ label: "Tempo", bulkKey: "videoTime", sortKey: "videoTime" }]
      : []),
    { label: "Set", bulkKey: "set", sortKey: "set" },
    { label: "Pt N", sortKey: "homeScore" },
    { label: "Pt A", sortKey: "visitorScore" },
    { label: "Squadra", sortKey: "team" },
    { label: "Giocatrice", bulkKey: "player", sortKey: "player" },
    { label: "Alzatore", bulkKey: "setter", sortKey: "setter" },
    { label: "Fondamentale", bulkKey: "skill", sortKey: "skill" },
    { label: "Codice", bulkKey: "code", sortKey: "code" },
    { label: "Link" },
    { label: "Tipo errore" },
    { label: "FB N" },
    { label: "Zona", bulkKey: "zone", sortKey: "zone" },
    {
      label: "Pos Palleggio",
      bulkKey: "setterPosition",
      sortKey: "setterPosition",
    },
    {
      label: "Pos Palleggio Avv",
      bulkKey: "opponentSetterPosition",
      sortKey: "opponentSetterPosition",
    },
    {
      label: "Zona Rice",
      bulkKey: "receivePosition",
      sortKey: "receivePosition",
    },
    { label: "Base", bulkKey: "base", sortKey: "base" },
    { label: "Tipo Alzata", bulkKey: "setType", sortKey: "setType" },
    { label: "Combinazione", bulkKey: "combination", sortKey: "combination" },
    { label: "Tipo Servizio", bulkKey: "serveType", sortKey: "serveType" },
    { label: "Servizio Start" },
    { label: "Servizio End" },
    {
      label: "Valut Rice",
      bulkKey: "receiveEvaluation",
      sortKey: "receiveEvaluation",
    },
    {
      label: "Valut Att",
      bulkKey: "attackEvaluation",
      sortKey: "attackEvaluation",
    },
    { label: "Att BP", bulkKey: "attackBp", sortKey: "attackBp" },
    { label: "Tipo Att", bulkKey: "attackType", sortKey: "attackType" },
    { label: "Direzione Att" },
    { label: "Muro N", bulkKey: "blockNumber", sortKey: "blockNumber" },
    { label: "In", bulkKey: "playerIn" },
    { label: "Out", bulkKey: "playerOut" },
    { label: "Dur (ms)", bulkKey: "durationMs", sortKey: "durationMs" },
  ];
  headers.push({ label: "Elimina" });
  const old = eventTableContexts[contextKey],
    records = [];
  const viewRows = events.map((ev, index) => {
    const key = getEventKey(ev, index),
      videoTime = showVideoTime ? computeEventVideoTime(ev, baseMs) : null,
      scope = getTeamScopeFromEvent(ev),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope),
      name = ev.playerName || players[resolvePlayerIdx(ev)],
      setter =
        ev.setterName ||
        (typeof ev.setterIdx === "number" ? players[ev.setterIdx] : "");
    const record = {
      key,
      idx: index,
      ev,
      videoTime,
      tr: old?.rows?.find((row) => row.key === key)?.tr || null,
      checkbox: null,
    };
    records.push(record);
    const traj = ev.attackTrajectory || {},
      start = traj.start || ev.attackStart || null,
      end = traj.end || ev.attackEnd || null;
    const formatPoint = (point) =>
      point && typeof point.x === "number" && typeof point.y === "number"
        ? `${point.x.toFixed(2)},${point.y.toFixed(2)}`
        : "";
    const direction = ev.attackDirection || traj || null,
      dirStart =
        direction && typeof direction === "object"
          ? formatPoint(direction.start || start)
          : "",
      dirEnd =
        direction && typeof direction === "object"
          ? formatPoint(direction.end || end)
          : "";
    const teamLabel =
      ev.team === "opponent"
        ? state.selectedOpponentTeam || "Avversaria"
        : ev.team && ev.team !== "opponent"
          ? ev.teamName || state.selectedTeam || "Squadra"
          : ev.code === "opp-error" ||
              ev.code === "opp-point" ||
              ev.playerName === "Avversari"
            ? state.selectedOpponentTeam || "Avversaria"
            : state.selectedTeam || "Squadra";
    const cells = [];
    const add = (field, text, classes = []) =>
      cells.push(
        Object.freeze({
          text: text != null ? String(text) : "",
          classes,
          onEdit: () => {
            if (!selectedEventIds.has(key))
              setSelectionForContext(contextKey, new Set([key]), key);
            closeCurrentEdit();
            return buildReactEventControl(ev, field, baseMs, videoTime);
          },
          onDone: () => {
            currentEditControl = null;
            currentEditCell = null;
            renderVideoAnalysis();
            if (
              [
                "eventId",
                "homeScore",
                "visitorScore",
                "combination",
                "attackType",
                "relatedEvents",
                "blockNumber",
                "durationMs",
              ].includes(field)
            )
              renderEventsLog();
          },
        }),
      );
    if (showIndex) add("eventId", ev.eventId != null ? String(ev.eventId) : "");
    if (showVideoTime)
      add("videoTime", formatVideoTimestamp(videoTime), ["event-time-cell"]);
    add("set", ev.set || "1");
    add("homeScore", valueToString(ev.homeScore));
    add("visitorScore", valueToString(ev.visitorScore));
    add("team", teamLabel);
    add(
      "player",
      name
        ? scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name)
        : "—",
    );
    add("setter", setter ? formatNameWithNumberFor(setter, numbers) : "");
    add(
      "skill",
      ev.actionType === "timeout"
        ? "Timeout"
        : ev.actionType === "substitution"
          ? "Cambio"
          : (SKILLS.find((skill) => skill.id === ev.skillId) || {}).label ||
            ev.skillId ||
            "",
    );
    add("code", ev.code || "");
    add(
      "relatedEvents",
      Array.isArray(ev.relatedEvents)
        ? ev.relatedEvents
            .map((id) => (id != null ? String(id) : ""))
            .filter(Boolean)
            .join(" ")
        : "",
    );
    add(
      "errorType",
      ev.errorType && (ev.code === "error" || ev.code === "team-error")
        ? getErrorTypeLabel(ev.errorType)
        : "",
    );
    add("fromFreeball", ev.skillId === "attack" && ev.fromFreeball ? "FB" : "");
    add("zone", ev.zone || ev.playerPosition || "");
    add(
      "setterPosition",
      valueToString(ev.setterPosition || ev.rotation || ""),
    );
    add("opponentSetterPosition", valueToString(ev.opponentSetterPosition));
    add("receivePosition", valueToString(ev.receivePosition));
    for (const field of ["base", "setType", "combination", "serveType"])
      add(field, valueToString(ev[field]));
    for (const field of ["serveStart", "serveEnd"])
      cells.push(
        Object.freeze({
          text: formatPoint(ev[field]),
          classes: ["traj-cell"],
          onDoubleClick: (event) => {
            event.stopPropagation();
            captureServeTrajectory(ev, { forcePopup: true }).then(() =>
              renderEventTableRows(target, events, options),
            );
          },
        }),
      );
    add("receiveEvaluation", valueToString(ev.receiveEvaluation));
    add("attackEvaluation", valueToString(ev.attackEvaluation));
    add("attackBp", formatAttackPhaseLabel(ev.attackBp));
    add("attackType", valueToString(ev.attackType));
    cells.push(
      Object.freeze({
        text:
          direction && typeof direction === "object"
            ? dirStart && dirEnd
              ? `${dirStart}→${dirEnd}`
              : dirStart || dirEnd || ""
            : valueToString(direction),
        classes: ["traj-cell"],
        onDoubleClick: (e) => {
          e.stopPropagation();
          const dir = ev.attackDirection || traj || null;
          const baseZonePrefill =
            ev.originZone || ev.zone || ev.playerPosition || null;
          const evScope = getTeamScopeFromEvent(ev);
          const forceFar = false;
          const prefill =
            dir && typeof dir === "object" && dir.start && dir.end
              ? {
                  start: dir.start,
                  end: dir.end,
                  startZone: dir.startZone,
                  endZone: dir.endZone,
                  baseZone: baseZonePrefill,
                  setType: ev.setType || null,
                  forceFar,
                  scope: evScope,
                }
              : traj && traj.start && traj.end
                ? {
                    start: traj.start,
                    end: traj.end,
                    startZone: traj.startZone,
                    endZone: traj.endZone,
                    baseZone: baseZonePrefill,
                    setType: ev.setType || null,
                    forceFar,
                    scope: evScope,
                  }
                : {
                    baseZone: baseZonePrefill,
                    setType: ev.setType || null,
                    forceFar,
                    scope: evScope,
                  };
          openAttackTrajectoryModal(
            Object.assign({ forcePopup: true }, prefill),
          ).then((coords) => {
            if (!coords || !coords.start || !coords.end) return;
            const mapZone = (z) => mapBackRowZone(z, baseZonePrefill);
            const trajectoryPayload = {
              start: coords.start,
              end: coords.end,
              startZone: mapZone(coords.startZone || null),
              endZone: mapZone(coords.endZone || null),
              directionDeg: null,
            };
            ev.attackStart = coords.start;
            ev.attackEnd = coords.end;
            ev.attackStartZone = trajectoryPayload.startZone;
            ev.attackEndZone = trajectoryPayload.endZone;
            ev.attackDirection = trajectoryPayload;
            ev.attackTrajectory = trajectoryPayload;
            if (!ev.originZone) {
              ev.originZone = baseZonePrefill;
            }
            if (trajectoryPayload.startZone) {
              ev.zone = trajectoryPayload.startZone;
              ev.playerPosition = trajectoryPayload.startZone;
            }
            saveState();
            renderEventsLog({ suppressScroll: true });
            renderVideoAnalysis();
            renderTrajectoryAnalysis();
            renderServeTrajectoryAnalysis();
          });
        },
      }),
    );
    for (const field of ["blockNumber", "playerIn", "playerOut"])
      add(field, valueToString(ev[field]));
    add("durationMs", valueToString(ev.durationMs || ""));
    return Object.freeze({
      key,
      cells: Object.freeze(cells),
      onDelete: () => deleteEventByKey(key),
      onSeek: () => {
        if (showSeek) seekVideoToTime(videoTime);
      },
      onToggle: () => {
        toggleSelectionForContext(contextKey, key, {
          userAction: true,
          preserveSelection: true,
        });
        scrollRowIntoView(record);
      },
      onSelect: (event) => {
        if (!enableSelection) return;
        if (
          event.shiftKey &&
          lastSelectedEventId &&
          selectedEventIds.has(lastSelectedEventId)
        ) {
          selectRangeForContext(contextKey, lastSelectedEventId, key, {
            userAction: true,
          });
          scrollRowIntoView(record);
          return;
        }
        if (event.metaKey || event.ctrlKey)
          toggleSelectionForContext(contextKey, key, { userAction: true });
        else
          setSelectionForContext(contextKey, new Set([key]), key, {
            userAction: true,
          });
        scrollRowIntoView(record);
      },
    });
  });
  const ctx = {
    rows: records,
    onSelectionChange: options.onSelectionChange || null,
    baseMs,
    native: true,
    targetId: target.id,
  };
  if (enableSelection) eventTableContexts[contextKey] = ctx;
  else removeEventTableContext(contextKey);
  eventTableStore.publish(target.id, {
    contextKey: enableSelection ? contextKey : "",
    tableClass: options.tableClass || "event-edit-table",
    showCheckbox,
    rows: Object.freeze(viewRows),
    empty: options.empty || "",
    selected: Object.freeze([...selectedEventIds]),
    headers: Object.freeze(
      headers.map((header, index) =>
        Object.freeze({
          ...header,
          checkbox: showCheckbox && index === 0,
          dir:
            sortState && sortState.key === header.sortKey ? sortState.dir : "",
        }),
      ),
    ),
    sortable: !!options.onSortChange,
    onHeader: (header) => {
      if (header.sortKey && options.onSortChange)
        options.onSortChange(header.sortKey);
      if (header.bulkKey && getSelectedRows(contextKey).length >= 2)
        openBulkEditModal(contextKey, header.bulkKey);
    },
    onSelectAll: (checked) => {
      const rows = getRowsForContext(contextKey);
      setSelectionForContext(
        contextKey,
        new Set(checked ? rows.map((row) => row.key) : []),
        checked ? rows[0]?.key || null : null,
        { userAction: true },
      );
    },
  });
  updateSelectionStyles();
}
function bindReactEventTable(id, root) {
  const view = eventTableStore.getView(id),
    ctx = eventTableContexts[view.contextKey];
  if (!ctx || ctx.targetId !== id) return;
  const elements = new Map(
    [...root.querySelectorAll("tr[data-event-key]")].map((element) => [
      element.dataset.eventKey,
      element,
    ]),
  );
  ctx.table = root.querySelector("table");
  ctx.bulkHeaders = [...root.querySelectorAll("th.bulk-editable")];
  ctx.selectAllCheckbox = root.querySelector("thead input[type=checkbox]");
  ctx.rows.forEach((record) => {
    record.tr = elements.get(String(record.key)) || null;
    record.checkbox = record.tr?.querySelector(".row-select input") || null;
  });
  updateSelectionStyles();
  handleSeekForSelection(view.contextKey);
}
function registerReactEventEdit(cell, control) {
  currentEditCell = cell;
  currentEditControl = control;
}
function publishReactEventSelection() {
  eventTableStore.select([...selectedEventIds]);
}
function buildReactEventControl(ev, field, baseMs, videoTime) {
  let model;
  const empty = { value: "", label: "—" };
  if (field === "team")
    model = {
      type: "select",
      value: getTeamScopeFromEvent(ev),
      options: [
        { value: "our", label: state.selectedTeam || "Squadra" },
        {
          value: "opponent",
          label: state.selectedOpponentTeam || "Avversaria",
        },
      ],
      onChange: (value) => {
        const scope = value === "opponent" ? "opponent" : "our";
        ev.team = scope;
        ev.teamName = getTeamNameForScope(scope);
        ev.playerIdx = null;
        ev.playerId = null;
        ev.playerName = null;
        ev.setterIdx = null;
        ev.setterName = null;
        syncManualEventPointDirection(ev);
      },
    };
  else if (field === "errorType")
    model = {
      type: "select",
      value: ev.errorType || "",
      options: [
        empty,
        ...ERROR_TYPES.map((item) => ({ value: item.id, label: item.label })),
      ],
      onChange: (value) => {
        ev.errorType = value || null;
      },
    };
  else if (field === "fromFreeball")
    model = {
      type: "checkbox",
      value: !!ev.fromFreeball,
      onChange: (value) => {
        ev.fromFreeball = !!value;
      },
    };
  else if (field === "relatedEvents")
    model = {
      type: "text",
      value: Array.isArray(ev.relatedEvents) ? ev.relatedEvents.join(" ") : "",
      onChange: (value) => {
        ev.relatedEvents = String(value || "")
          .split(/[\s,;]+/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => (/^\d+$/.test(value) ? Number(value) : value));
      },
    };
  else if (["eventId", "homeScore", "visitorScore"].includes(field))
    model = {
      type: "number",
      min: field === "eventId" ? 1 : 0,
      value: ev[field] == null ? "" : String(ev[field]),
      onChange: (value) => {
        const number = parseFloat(value);
        if (!Number.isNaN(number) && number >= (field === "eventId" ? 1 : 0))
          ev[field] = number;
      },
    };
  else model = buildReactBulkControl(ev, field, { baseMs });
  if (field === "videoTime") {
    const time = Math.max(0, Number.isFinite(videoTime) ? videoTime : 0);
    model.value = [
      String(Math.floor(time / 3600)),
      String(Math.floor((time % 3600) / 60)),
      String(Math.floor(time % 60)),
    ];
  }
  let captured = false;
  const change = model.onChange;
  return {
    ...model,
    onChange: (value) => {
      if (!captured) {
        pushVideoUndoSnapshot();
        captured = true;
      }
      change(value);
      refreshAfterVideoEdit(
        ![
          "videoTime",
          "combination",
          "attackType",
          "zone",
          "receivePosition",
          "set",
        ].includes(field),
      );
    },
  };
}
