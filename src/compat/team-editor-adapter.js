function publishTeamEditorView() {
  if (!teamManagerState) return;
  const players = (teamManagerState.players || []).map((player, idx) => ({
    player,
    idx,
  }));
  players.sort((a, b) => {
    const number = (player) =>
      player.number !== undefined &&
      player.number !== null &&
      player.number !== ""
        ? parseInt(player.number, 10)
        : null;
    const rawA = number(a.player),
      rawB = number(b.player);
    const nA = Number.isFinite(rawA) ? rawA : null,
      nB = Number.isFinite(rawB) ? rawB : null;
    if (nA === null && nB === null) return a.idx - b.idx;
    if (nA === null) return -1;
    if (nB === null) return 1;
    if (nA !== nB) return nA - nB;
    return (a.player.name || "").localeCompare(b.player.name || "", "it", {
      sensitivity: "base",
    });
  });
  const rows = players.map(({ player: p }) => {
    if (!isValidPlayerId(p.id)) p.id = generatePlayerId();
    p.lastName = (p.lastName || (!p.firstName ? p.name : "") || "").trim();
    p.firstName = (p.firstName || "").trim();
    p.name = buildFullName(p.lastName, p.firstName);
    return Object.freeze({
      ...p,
      onNumber: (value) => {
        p.number = value;
        renderTeamManagerTable();
      },
      onName: (first, last) => changeTeamEditorPlayerName(p, first, last),
      onCaptain: (checked) => {
        p.isCaptain = checked;
        enforceSingleCaptainFlag(
          teamManagerState.players,
          p.isCaptain ? p.name : "",
        );
        renderTeamManagerTable();
      },
      onLibero: (checked) => {
        p.role = checked ? "L" : "";
        renderTeamManagerTable();
      },
      onOut: (checked) => {
        if (teamManagerLiveEditMode) return;
        p.out = checked;
        renderTeamManagerTable();
      },
      onDelete: () => {
        if (
          teamManagerLiveEditMode ||
          !confirm("Eliminare " + (p.name || "questa giocatrice") + "?")
        )
          return;
        const index = (teamManagerState.players || []).findIndex(
          (entry) => entry.id === p.id,
        );
        if (index >= 0) teamManagerState.players.splice(index, 1);
        else
          teamManagerState.players = (teamManagerState.players || []).filter(
            (entry) => entry !== p,
          );
        renderTeamManagerTable();
      },
      onPhoto: () => changeTeamEditorPlayerPhoto(p),
    });
  });
  const rawRotation = parseInt(teamManagerState.defaultRotation, 10);
  teamManagerState.defaultRotation =
    Number.isFinite(rawRotation) && rawRotation >= 1 && rawRotation <= 6
      ? rawRotation
      : 1;
  const roster = getDefaultLineupRoster(),
    rosterNames = roster.map((player) => player.name);
  const numbers = {},
    captains = new Set(),
    out = new Set();
  const all = (teamManagerState.players || []).filter((player) =>
    (player.name || "").trim(),
  );
  all.forEach((player) => {
    const name =
      buildFullName(player.lastName, player.firstName) || player.name.trim();
    if (player.number) numbers[name] = String(player.number);
    if (player.isCaptain) captains.add(name);
    if (player.out) out.add(name);
  });
  const liberos = all
    .filter(
      (player) =>
        String(player.role || "").toUpperCase() === "L" && !player.out,
    )
    .map(
      (player) =>
        buildFullName(player.lastName, player.firstName) || player.name.trim(),
    );
  const preferred =
    teamManagerState.preferredLibero &&
    liberos.includes(teamManagerState.preferredLibero)
      ? teamManagerState.preferredLibero
      : liberos[0] || "";
  teamManagerState.preferredLibero = preferred;
  const lineup = normalizeDefaultLineup(
    teamManagerState.defaultLineup || [],
    rosterNames,
  );
  teamManagerState.defaultLineup = lineup;
  const used = new Set(lineup.filter(Boolean));
  const label = (name) =>
    formatDefaultLineupName(name, numbers, captains, { compactCourt: true }) ||
    name;
  teamEditorStore.publish({
    players: Object.freeze(rows),
    liveEdit: !!teamManagerLiveEditMode,
    rotation: teamManagerState.defaultRotation,
    preferredLibero: preferred,
    court: Object.freeze(
      [3, 2, 1, 4, 5, 0].map((index) =>
        Object.freeze({
          index,
          name: lineup[index],
          label: lineup[index] ? label(lineup[index]) : "",
          out: out.has(lineup[index]),
          onClear: () => clearDefaultLineupSlot(index),
          onDrop: (name) => setDefaultLineupSlot(index, name),
        }),
      ),
    ),
    bench: Object.freeze(
      roster
        .filter((player) => !used.has(player.name))
        .map((player) =>
          Object.freeze({
            ...player,
            label: label(player.name),
            onChoose: () => {
              const index = lineup.findIndex((name) => !name);
              if (index !== -1) setDefaultLineupSlot(index, player.name);
            },
          }),
        ),
    ),
    liberos: Object.freeze(
      sortNamesByNumber(liberos, numbers).map((name) =>
        Object.freeze({ name, label: formatNameWithNumberFor(name, numbers) }),
      ),
    ),
    onRotation: (value) => {
      const rotation = parseInt(value, 10);
      teamManagerState.defaultRotation = Number.isFinite(rotation)
        ? Math.min(6, Math.max(1, rotation))
        : 1;
      publishTeamEditorView();
    },
    onRotate: (direction) => rotateDefaultLineup(direction),
    onLibero: (value) => {
      teamManagerState.preferredLibero = value || "";
      publishTeamEditorView();
    },
  });
  if (
    elTeamManagerTemplate &&
    elTeamManagerTemplate.dataset.reactManaged !== "true"
  )
    elTeamManagerTemplate.classList.toggle("hidden", rows.length !== 0);
}
function changeTeamEditorPlayerName(player, first, last) {
  player.firstName = first.trim();
  player.lastName = last.trim();
  player.name = buildFullName(player.lastName, player.firstName);
  const key = (player.lastName + "|" + player.firstName).toLowerCase().trim();
  if (!player.firstName || !player.lastName) {
    player.__dbPromptKey = "";
    return;
  }
  if (player.__dbPromptKey === key) return;
  const match = findPlayersDbMatchByName(
    player.firstName,
    player.lastName,
    player.id,
  );
  if (match) {
    const label =
      buildFullName(match.lastName, match.firstName) ||
      match.name ||
      "questa giocatrice";
    if (
      confirm(
        "Giocatrice già presente in archivio (" +
          label +
          "). Vuoi usare quella esistente?",
      )
    ) {
      player.id = match.id;
      player.firstName = match.firstName || player.firstName;
      player.lastName = match.lastName || player.lastName;
      player.name = buildFullName(player.lastName, player.firstName);
      player.photo =
        typeof match.photo === "string" ? match.photo : player.photo || "";
      renderTeamManagerTable();
      return;
    }
  }
  player.__dbPromptKey = key;
}
async function changeTeamEditorPlayerPhoto(player) {
  try {
    let photo = "";
    if (player.photo && typeof openPlayerPhotoEditor === "function") {
      const edited = await openPlayerPhotoEditor(player.photo, {
        allowRemove: true,
      });
      if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
        player.photo = "";
        renderTeamManagerTable();
        return;
      }
      photo = edited || "";
    } else {
      const file =
        typeof pickImageFile === "function"
          ? await pickImageFile("image/*")
          : null;
      if (!file) return;
      photo =
        typeof preparePlayerPhotoDataUrl === "function"
          ? await preparePlayerPhotoDataUrl(file, {
              allowRemove: !!player.photo,
            })
          : "";
    }
    if (!photo) return;
    player.photo = photo;
    renderTeamManagerTable();
  } catch (error) {
    logError("Errore caricamento foto giocatrice", error);
    alert("Immagine non valida o non caricabile.");
  }
}

function openReactTeamEditor({ isNew = false } = {}) {
  teamEditorStore.publish({
    open: true,
    isNew,
    title: isNew
      ? "Nuova squadra"
      : teamManagerLiveEditMode
        ? "Modifica squadra in partita"
        : teamManagerScope === "opponent"
          ? "Gestione squadra avversaria"
          : "Gestione squadra",
    meta: Object.freeze({
      name: teamManagerState.name || "",
      headCoach: teamManagerState.staff?.headCoach || "",
      assistantCoach: teamManagerState.staff?.assistantCoach || "",
      manager: teamManagerState.staff?.manager || "",
    }),
  });
  publishTeamEditorView();
  setGlobalModalState(true);
}
function closeReactTeamEditor() {
  teamEditorStore.publish({ open: false });
}
function publishTeamEditorMode() {
  teamEditorStore.publish({ liveEdit: !!teamManagerLiveEditMode });
}
function getReactTeamEditorMetadata() {
  return teamEditorStore.getSnapshot().meta;
}
