import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

async function openApp(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.abort(),
  );
  await page.goto("./");
  const demos = page.locator('[data-demo-choice="keep"]');
  await Promise.race([
    demos.waitFor({ state: "visible" }).then(() => demos.click()),
    page
      .locator(".startup-error")
      .waitFor({ state: "visible" })
      .then(async () => {
        throw new Error(await page.locator(".startup-error").textContent());
      }),
    page.waitForFunction(
      () => document.documentElement.dataset.appReady === "true",
    ),
  ]);
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(page.locator(".startup-error")).toHaveCount(0);
  return errors;
}

test("React avvia archivio, navigazione e tema sul percorso GitHub Pages", async ({
  page,
}) => {
  const errors = await openApp(page);
  await expect(page.locator("#saved-matches-list")).toContainText("Aurora");
  await page.locator("#theme-light-lobby").click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.locator("#btn-load-match").click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-active-tab",
    "scout",
  );
  await page.locator('.tabs-nav [data-tab-target="aggregated"]').click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-active-tab",
    "aggregated",
  );
  await page.locator("#btn-exit-match").click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-active-tab",
    "match",
  );
  expect(errors).toEqual([]);
});

test("contatori React: 8 cambi, 2 tempi, superamento limiti, annulla e persistenza", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  match.events = [];
  match.currentSet = 1;
  await page.evaluate(async (snapshot) => {
    await window.VolleyEye.app.invoke("applyImportedMatch", snapshot, {
      silent: true,
    });
    await window.VolleyEye.app.invoke("saveState", { persistLocal: true });
    await window.VolleyEye.app.invoke("enterSelectedMatch");
  }, match);
  await expect(page.locator("#substitution-remaining")).toHaveText("8");
  await expect(page.locator("#timeout-count")).toHaveText("2");
  await expect(page.locator("#substitution-remaining-opp")).toHaveText("8");
  await expect(page.locator("#timeout-opp-count")).toHaveText("2");
  await page.evaluate(async () => {
    const app = window.VolleyEye.app;
    for (const teamScope of ["our", "opponent"]) {
      for (let i = 0; i < 9; i++) {
        await app.invoke("recordSubstitutionEvent", {
          playerIn: "Ingresso",
          playerOut: "Uscita",
          teamScope,
        });
      }
      for (let i = 0; i < 3; i++)
        await app.invoke(
          teamScope === "our"
            ? "recordTimeoutEvent"
            : "recordOpponentTimeoutEvent",
        );
    }
  });
  for (const id of [
    "substitution-remaining",
    "substitution-remaining-opp",
    "timeout-count",
    "timeout-opp-count",
  ]) {
    await expect(page.locator("#" + id)).toHaveText("0");
  }
  const snapshot = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(
    snapshot.events.filter((event) => event.actionType === "substitution"),
  ).toHaveLength(18);
  expect(
    snapshot.events.filter((event) => event.actionType === "timeout"),
  ).toHaveLength(6);
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++)
      await window.VolleyEye.app.invoke("undoLastEvent");
  });
  await expect(page.locator("#timeout-opp-count")).toHaveText("2");
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        await window.VolleyEye.app.invoke("flushStorage");
        return window.VolleyEye.app.getMatchSnapshot().events.length;
      }),
    )
    .toBe(21);
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  const reopened = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(reopened.events).toHaveLength(21);
  expect(errors).toEqual([]);
});

test("build PWA: manifest corretto e riapertura offline con chunk React in cache", async ({
  page,
  context,
}) => {
  const errors = await openApp(page);
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBe("/VolleyEye/manifest.json");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
    }
    return registration.scope;
  });
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(page.locator("#saved-matches-list")).toContainText("Aurora");
  expect(errors).toEqual([]);
});

test("export HTML autonomo conserva analisi funzionante senza React o rete", async ({
  page,
  browser,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.locator('.tabs-nav [data-tab-target="aggregated"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#btn-export-html").click();
  const download = await downloadPromise;
  const html = readFileSync(await download.path(), "utf8");
  expect(html).toContain("__exportedAnalysisState");
  expect(html).not.toContain('type="module"');
  const offlineContext = await browser.newContext({ offline: true });
  const exported = await offlineContext.newPage();
  const exportErrors = [];
  exported.on("pageerror", (error) => exportErrors.push(error.message));
  await exported.setContent(html, { waitUntil: "load" });
  await expect(exported.locator("#aggregated-panel")).toBeVisible();
  await expect(exported.locator("body")).toHaveAttribute(
    "data-active-tab",
    "aggregated",
  );
  expect(exportErrors).toEqual([]);
  await offlineContext.close();
  expect(errors).toEqual([]);
});

test("archivio React: selezione separata dal caricamento, creazione e cancellazione", async ({
  page,
}) => {
  const errors = await openApp(page);
  const options = page.locator("#saved-matches-list [role=option]");
  const originalName = await options.first().getAttribute("data-match-name");
  await page.locator("#btn-load-match").click();
  const original = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  await page.locator("#btn-exit-match").click();
  await page.locator("#btn-new-match").click();
  await expect(page.locator("#new-match-modal")).toBeVisible();
  await page
    .locator('#new-match-modal input[name="new-match-mode"][value="single"]')
    .check();
  await page.locator("#new-match-opponent-name").fill("Avversaria test React");
  await page.locator("#new-match-confirm").click();
  await expect(options).toHaveCount(2);
  const created = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(created.events).toHaveLength(0);
  const newName = await page.evaluate(
    () => window.VolleyEye.app.getSnapshot().selectedMatch,
  );
  await options
    .filter({ hasText: "Aurora" })
    .filter({ hasNotText: "Avversaria test React" })
    .click();
  await expect(
    page.locator(`#saved-matches-list [data-match-name="${originalName}"]`),
  ).toHaveAttribute("aria-selected", "true");
  const stillCreated = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(stillCreated.loadedMatchName).toBe(created.loadedMatchName);
  expect(stillCreated.events).toEqual(created.events);
  const dialog = page.locator("#new-match-modal");
  await page.locator('[data-tab="match"] [data-edit-match]').click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("#new-match-team")).toBeDisabled();
  await expect(page.locator("#new-match-opponent-team")).toBeDisabled();
  await expect(
    dialog.locator('input[name="new-match-mode"][value="double"]'),
  ).toBeChecked();
  await expect(
    dialog.locator('input[name="new-match-mode"][value="single"]'),
  ).toBeDisabled();
  await page.locator("#match-category").fill("Bozza annullata");
  await dialog.locator("button[data-close-new-match]").click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/modal-open/);
  await page.locator('[data-tab="match"] [data-edit-match]').click();
  await expect(page.locator("#match-category")).toHaveValue(
    original.match.category,
  );
  await page.locator("#match-category").fill("Under 18 React");
  await page.locator("#match-date").fill("2026-10-10");
  await page.locator("#match-type").selectOption("torneo");
  await page.locator("#match-leg").selectOption("gara-2");
  await page.locator("#new-match-confirm").click();
  await expect(dialog).toBeHidden();
  const untouchedActive = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(untouchedActive.match).toEqual(created.match);
  expect(untouchedActive.events).toEqual(created.events);
  await page.locator("#btn-load-match").click();
  const loaded = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(loaded.loadedMatchName).toBe(originalName);
  expect(loaded.events).toEqual(original.events);
  expect(loaded.match.category).toBe("Under 18 React");
  expect(loaded.match.date).toBe("2026-10-10");
  expect(loaded.match.matchType).toBe("torneo");
  expect(loaded.match.leg).toBe("gara-2");
  await expect(page.locator("#active-match-name")).toContainText("Aurora");
  await page.locator("#btn-exit-match").click();
  await page
    .locator(`#saved-matches-list [data-match-name="${newName}"]`)
    .click();
  await page.locator("#btn-delete-match").click();
  await expect(options).toHaveCount(1);
  await expect(page.locator("#btn-load-match")).toBeDisabled();
  await expect(page.locator("#btn-delete-match")).toBeDisabled();
  const afterDelete = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(afterDelete.events).toEqual(original.events);
  await page.evaluate(() => window.VolleyEye.app.invoke("flushStorage"));
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(options).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("dialogo React: validazione, doppia squadra e annullamento", async ({
  page,
}) => {
  const errors = await openApp(page);
  const initial = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  await page.locator("#btn-new-match").click();
  const dialog = page.locator("#new-match-modal");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#match-type")).toHaveValue("amichevole");
  const home = await page.locator("#new-match-team").inputValue();
  const opponent = await page.locator("#new-match-opponent-team").inputValue();
  expect(home).not.toBe(opponent);
  await page.locator("#new-match-team").selectOption(opponent);
  await expect(page.locator("#new-match-opponent-team")).toHaveValue(home);
  await dialog.locator('input[name="new-match-mode"][value="single"]').check();
  await page.locator("#new-match-opponent-name").fill("");
  const alert = page.waitForEvent("dialog");
  await page.locator("#new-match-confirm").click();
  expect((await alert).message()).toBe("Inserisci il nome dell'avversario.");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#new-match-confirm")).toBeEnabled();
  const unchanged = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(unchanged.match).toEqual(initial.match);
  expect(unchanged.events).toEqual(initial.events);
  await dialog.locator('input[name="new-match-mode"][value="double"]').check();
  await page.locator("#new-match-confirm").click();
  await expect(dialog).toBeHidden();
  const created = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(created.useOpponentTeam).toBe(true);
  expect(created.selectedTeam).toBe(opponent);
  expect(created.selectedOpponentTeam).toBe(home);
  expect(created.players.length).toBeGreaterThan(6);
  expect(created.opponentPlayers.length).toBeGreaterThan(6);
  expect(created.events).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("punteggio React: correzioni, pausa, preparazione set e annulla", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  Object.assign(match, {
    events: [],
    currentSet: 1,
    setResults: {},
    scoreOverrides: {},
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
  });
  await page.evaluate(async (snapshot) => {
    const app = window.VolleyEye.app;
    await app.invoke("applyImportedMatch", snapshot, { silent: true });
    await app.invoke("saveState", { persistLocal: true });
    await app.invoke("enterSelectedMatch");
  }, match);
  await expect(page.locator("#live-score")).toHaveText("0 - 0");
  await expect(page.locator("#current-set-display")).toHaveText("Set 1");
  await page.locator("#btn-score-for-minus").click();
  await expect(page.locator("#live-score")).toHaveText("0 - 0");
  await page.locator("#btn-score-for-plus").click();
  await page.locator("#btn-score-against-plus").click();
  await expect(page.locator("#live-score")).toHaveText("1 - 1");
  await page.locator("#btn-score-against-minus").click();
  await page.locator("#btn-score-for-plus").click();
  await expect(page.locator("#live-score")).toHaveText("2 - 0");
  await page.locator("#btn-end-match").click();
  await expect(page.locator("#btn-end-match")).toHaveText("Riprendi partita");
  await expect(page.locator("#live-set-score")).toHaveText("1 - 0");
  await expect(page.locator("#btn-score-for-plus")).toBeDisabled();
  await expect(page.locator("#btn-next-set")).toBeDisabled();
  await page.locator("#btn-end-match").click();
  await expect(page.locator("#live-set-score")).toHaveText("0 - 0");
  await expect(page.locator("#btn-score-for-plus")).toBeEnabled();
  await page.locator("#btn-next-set").click();
  await expect(page.locator("#next-set-inline")).toBeVisible();
  await expect(page.locator("#btn-score-for-plus")).toBeDisabled();
  const beforeDraft = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  const originalRotation = Number(
    await page.locator("#next-set-rotation-select-our").inputValue(),
  );
  await page.locator("#next-set-rotate-cw-our").click();
  await expect(page.locator("#next-set-rotation-select-our")).toHaveValue(
    String((originalRotation % 6) + 1),
  );
  await page.locator("#next-set-rotation-select-our").selectOption("4");
  await expect(page.locator("#next-set-rotation-select-our")).toHaveValue("4");
  const slot = page
    .locator("#next-set-court-our .lineup-slot:not(.empty)")
    .first();
  const playerName = await slot.getAttribute("data-player-name");
  await slot.click();
  await expect(
    page
      .locator("#next-set-bench-our .lineup-chip")
      .filter({ has: page.locator("span") }),
  ).not.toHaveCount(0);
  await page
    .locator("#next-set-bench-our .lineup-chip")
    .filter({ hasText: "" })
    .evaluateAll((elements, name) => {
      const player = elements.find(
        (element) => element.dataset.playerName === name,
      );
      if (!player) throw new Error("Player not returned to bench");
      player.click();
    }, playerName);
  const duringDraft = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(duringDraft.court).toEqual(beforeDraft.court);
  expect(duringDraft.rotation).toEqual(beforeDraft.rotation);
  await page.locator("#next-set-cancel").click();
  await expect(page.locator("#btn-score-for-plus")).toBeEnabled();
  await expect(page.locator("#current-set-display")).toHaveText("Set 1");
  await page.locator("#btn-next-set").click();
  await page.locator("#next-set-start").click();
  await expect(page.locator("#current-set-display")).toHaveText("Set 2");
  await expect(page.locator("#current-set")).toHaveValue("2");
  await expect(page.locator("#live-score")).toHaveText("0 - 0");
  await expect(page.locator("#live-set-score")).toHaveText("1 - 0");
  let snapshot = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(snapshot.events).toHaveLength(1);
  expect(snapshot.events[0].actionType).toBe("set-change");
  await page.evaluate(() => window.VolleyEye.app.invoke("undoLastEvent"));
  await expect(page.locator("#current-set-display")).toHaveText("Set 1");
  await expect(page.locator("#live-score")).toHaveText("2 - 0");
  // The existing undo snapshot retains the winner recorded before the transition.
  await expect(page.locator("#live-set-score")).toHaveText("1 - 0");
  await page.locator("#btn-next-set").click();
  await page.locator("#next-set-start").click();
  await page.locator("#btn-score-against-plus").click();
  await page.locator("#btn-end-match").click();
  await expect(page.locator("#live-set-score")).toHaveText("1 - 1");
  await page.locator('.tabs-nav [data-tab-target="aggregated"]').click();
  await expect(page.locator("#agg-set-score")).toHaveText("1 - 1");
  await page.evaluate(() => window.VolleyEye.app.invoke("flushStorage"));
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  snapshot = await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot());
  expect(snapshot.currentSet).toBe(2);
  expect(snapshot.matchFinished).toBe(true);
  await page.locator('.tabs-nav [data-tab-target="scout"]').click();
  await expect(page.locator("#current-set-display")).toHaveText("Set 2");
  await expect(page.locator("#btn-end-match")).toHaveText("Riprendi partita");
  await expect(page.locator("#live-score")).toHaveText("0 - 1");
  await expect(page.locator("#live-set-score")).toHaveText("1 - 1");
  expect(errors).toEqual([]);
});

test("squadre React: selezione, duplicazione persistente e unione con abbinamenti", async ({
  page,
}) => {
  const errors = await openApp(page);
  const before = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openTeamsManagerModal"),
  );
  const modal = page.locator("#teams-manager-modal");
  await expect(modal).toBeVisible();
  const first = modal.locator("[data-team-name]").first();
  const teamName = await first.getAttribute("data-team-name");
  await first.click();
  await expect(page.locator("#teams-manager-duplicate")).toBeEnabled();
  const selected = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(selected.selectedTeam).toBe(before.selectedTeam);
  expect(selected.events).toEqual(before.events);
  const copy = teamName + " React copia";
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) =>
    dialog.type() === "prompt" ? dialog.accept(copy) : dialog.accept(),
  );
  await page.locator("#teams-manager-duplicate").click();
  await expect(modal.locator(".teams-manager-item.selected")).toHaveText(copy);
  await page.evaluate(() => window.VolleyEye.app.invoke("flushStorage"));
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openTeamsManagerModal"),
  );
  await expect(
    modal.locator("[data-team-name]").filter({ hasText: copy }),
  ).toHaveCount(1);
  await modal
    .locator("[data-team-name]")
    .evaluateAll(
      (elements, name) =>
        elements.find((element) => element.dataset.teamName === name).click(),
      teamName,
    );
  await modal.getByLabel("Squadra da unire ed eliminare").selectOption(copy);
  const mappings = modal.locator(
    "#team-merge-panel select[aria-label^='Abbina ']",
  );
  expect(await mappings.count()).toBeGreaterThan(6);
  for (const mapping of await mappings.all())
    await expect(mapping).toBeDisabled();
  await modal
    .getByRole("button", { name: "Unisci squadre", exact: true })
    .click();
  await expect(
    modal.locator("[data-team-name]").filter({ hasText: copy }),
  ).toHaveCount(0);
  const after = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(after.events).toEqual(before.events);
  await page.locator("#teams-manager-close").click();
  await expect(modal).toBeHidden();
  expect(errors).toEqual([]);
});

test("dialoghi React: punti, errori e formazione di partenza con bozza annullabile", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  Object.assign(match, {
    events: [],
    currentSet: 1,
    setResults: {},
    scoreOverrides: {},
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
  });
  await page.evaluate(async (snapshot) => {
    await window.VolleyEye.app.invoke("applyImportedMatch", snapshot, {
      silent: true,
    });
    await window.VolleyEye.app.invoke("saveState", { persistLocal: true });
    await window.VolleyEye.app.invoke("enterSelectedMatch");
    await window.VolleyEye.app.invoke("openPointModal");
  }, match);
  const point = page.locator("#point-modal");
  await expect(point).toBeVisible();
  await point
    .getByRole("button", { name: "Assegna alla squadra", exact: true })
    .click();
  await expect(point).toBeHidden();
  await expect(page.locator("#live-score")).toHaveText("1 - 0");
  await page.evaluate(() => window.VolleyEye.app.invoke("openErrorModal"));
  const error = page.locator("#error-modal");
  await expect(error).toBeVisible();
  await error.locator('[data-error-type="Invasion"]').click();
  await expect(error.locator('[data-error-type="Invasion"]')).toHaveClass(
    /active/,
  );
  await expect(page.locator("#live-score")).toHaveText("1 - 0");
  await error
    .getByRole("button", { name: "Assegna alla squadra", exact: true })
    .click();
  await expect(error).toBeHidden();
  await expect(page.locator("#live-score")).toHaveText("1 - 1");
  let snapshot = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(snapshot.events).toHaveLength(2);
  expect(snapshot.events[1].errorType).toBe("Invasion");
  const pickedName = snapshot.opponentPlayers[0];
  await page.evaluate(
    (name) =>
      window.VolleyEye.app.invoke("openErrorModal", {
        scope: "opponent",
        playerIdx: 0,
        playerName: name,
        fromPicker: true,
      }),
    pickedName,
  );
  await error.locator('[data-error-type="Double"]').click();
  await expect(error).toBeHidden();
  snapshot = await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot());
  expect(snapshot.events).toHaveLength(3);
  expect(snapshot.events[2].team).toBe("opponent");
  expect(snapshot.events[2].playerName).toBe(pickedName);
  expect(snapshot.events[2].errorType).toBe("Double");
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openSetStartEditor", 1, "our"),
  );
  const start = page.locator("#set-start-modal");
  await expect(start).toBeVisible();
  const originalStarts = await page.evaluate(
    () => window.VolleyEye.app.getMatchSnapshot().setStarts,
  );
  const selects = start.locator(".set-start-select");
  await selects.nth(0).selectOption("1");
  await selects.nth(1).selectOption("1");
  await expect(selects.nth(0)).toHaveValue("");
  await expect(selects.nth(1)).toHaveValue("1");
  expect(
    await page.evaluate(
      () => window.VolleyEye.app.getMatchSnapshot().setStarts,
    ),
  ).toEqual(originalStarts);
  await page.locator("#set-start-modal-cancel").click();
  await expect(start).toBeHidden();
  expect(
    await page.evaluate(
      () => window.VolleyEye.app.getMatchSnapshot().setStarts,
    ),
  ).toEqual(originalStarts);
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openSetStartEditor", 1, "our"),
  );
  const secondPlayer = await start
    .locator(".set-start-name")
    .nth(1)
    .textContent();
  await selects.nth(1).selectOption("1");
  await page.locator("#set-start-modal-save").click();
  await expect(start).toBeHidden();
  snapshot = await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot());
  expect(snapshot.setStarts[1].our.court[0].main).toBeTruthy();
  expect(snapshot.events).toHaveLength(3);
  expect(secondPlayer).toBeTruthy();
  expect(errors).toEqual([]);
});

test("formazione React: annullamento, numeri di maglia e sostituzione registrata", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  Object.assign(match, {
    events: [],
    currentSet: 1,
    setResults: {},
    scoreOverrides: {},
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
  });
  await page.evaluate(async (snapshot) => {
    const app = window.VolleyEye.app;
    await app.invoke("applyImportedMatch", snapshot, { silent: true });
    await app.invoke("saveState", { persistLocal: true });
    await app.invoke("enterSelectedMatch");
    await app.invoke("openMobileLineupModal", "our");
  }, match);
  const modal = page.locator("#lineup-modal");
  await expect(modal).toBeVisible();
  const before = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  await modal.locator(".lineup-slot").first().click();
  await expect(modal.locator(".lineup-slot").first()).toHaveClass(/empty/);
  expect(
    await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot().court),
  ).toEqual(before.court);
  await page.locator("#lineup-modal-cancel").click();
  await expect(modal).toBeHidden();
  expect(
    await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot().court),
  ).toEqual(before.court);
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openMobileLineupModal", "our"),
  );
  await page.locator("#lineup-modal-toggle-numbers").click();
  const inputs = modal.locator(".lineup-number-input");
  await expect(inputs).toHaveCount(6);
  await inputs.first().fill(await inputs.nth(1).inputValue());
  await inputs.first().press("Tab");
  await expect(inputs.nth(1)).toBeFocused();
  await inputs.nth(1).press("Enter");
  await expect(inputs).toHaveCount(0);
  await page.locator("#lineup-modal-cancel").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openMobileLineupModal", "opponent"),
  );
  await expect(page.locator("#lineup-modal-title")).toHaveText(
    "Imposta formazione avversaria",
  );
  await page.locator("#lineup-modal-cancel").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openMobileLineupModal", "our"),
  );
  const bench = modal.locator(".lineup-chip").first();
  const incoming = await bench.getAttribute("data-player-name");
  await bench.click();
  await page.locator("#lineup-modal-save-substitution").click();
  await expect(modal).toBeHidden();
  const after = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(
    after.court.some(
      (slot) => slot.main === incoming || slot.replaced === incoming,
    ),
  ).toBe(true);
  expect(after.events.length).toBeGreaterThan(before.events.length);
  expect(
    after.events.some((event) => event.actionType === "substitution"),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("campo React: valutazione di ricezione su entrambe le squadre e dialogo fondamentali", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  Object.assign(match, {
    events: [],
    currentSet: 1,
    setResults: {},
    scoreOverrides: {},
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
    predictiveSkillFlow: false,
    autoRotate: false,
    useOpponentTeam: true,
    skillFlowOverride: null,
    opponentSkillFlowOverride: null,
    pendingServe: null,
  });
  await page.evaluate(async (snapshot) => {
    const app = window.VolleyEye.app;
    await app.invoke("applyImportedMatch", snapshot, { silent: true });
    await app.invoke("saveState", { persistLocal: true });
    await app.invoke("enterSelectedMatch");
  }, match);
  for (const scope of ["our", "opponent"]) {
    const container = page.locator(
      scope === "our" ? "#players-container" : "#opponent-players-container",
    );
    await expect(container.locator(".court-card")).toHaveCount(6);
    const card = container.locator(".court-card:not(.empty)").first();
    const name = await card.getAttribute("data-player-name");
    await card.locator(".skill-picker-btn.skill-pass").click();
    const selectedCard = container.locator(
      ".court-card[data-player-name=" + JSON.stringify(name) + "]",
    );
    await expect(selectedCard.locator(".skill-title.skill-pass")).toHaveText(
      "Ricezione",
    );
    await selectedCard
      .locator('.event-btn[data-skill-id="pass"][data-code="+"]')
      .click();
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() =>
          window.VolleyEye.app.getMatchSnapshot(),
        );
        return snapshot.events.filter(
          (event) =>
            event.skillId === "pass" &&
            event.team === scope &&
            event.playerName === name,
        ).length;
      })
      .toBe(1);
  }
  const snapshot = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  const name = snapshot.players[0];
  await page.evaluate(
    (playerName) =>
      window.VolleyEye.app.invoke("openSkillModal", 0, playerName, "our"),
    name,
  );
  const modal = page.locator("#skill-modal");
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Ricezione R", exact: true }).click();
  await expect(page.locator("#skill-modal-cancel")).toBeVisible();
  await modal
    .locator('.event-btn[data-skill-id="pass"][data-code="!"]')
    .click();
  await expect(modal).toBeHidden();
  const after = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(after.events).toHaveLength(3);
  expect(after.events[2].skillId).toBe("pass");
  expect(after.events[2].code).toBe("!");
  await page.evaluate(() => window.VolleyEye.app.invoke("undoLastEvent"));
  expect(
    (await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot())).events,
  ).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("editor squadra React: bozza, salvataggio archivio e creazione senza modificare la partita", async ({
  page,
}) => {
  const errors = await openApp(page);
  const before = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  await page.evaluate(async () => {
    const app = window.VolleyEye.app;
    await app.invoke("openTeamsManagerModal");
    await app.invoke("openSelectedManagedTeam");
  });
  const modal = page.locator("#team-manager-modal");
  await expect(modal).toBeVisible();
  await expect(page.locator("#team-meta-name")).toBeDisabled();
  const originalCoach = await page.locator("#team-meta-head").inputValue();
  await page.locator("#team-meta-head").fill("Coach bozza");
  await page.locator("#team-manager-cancel").click();
  await expect(modal).toBeHidden();
  await page.evaluate(async () => {
    await window.VolleyEye.app.invoke("openTeamsManagerModal");
    await window.VolleyEye.app.invoke("openSelectedManagedTeam");
  });
  await expect(page.locator("#team-meta-head")).toHaveValue(originalCoach);
  await page.locator("#team-meta-head").fill("Coach React");
  const row = modal.locator(".team-manager-row").first();
  const identity = await row.getAttribute("data-player-id");
  await row.getByPlaceholder("Cognome").fill("Cognome React");
  await row.getByPlaceholder("Nome", { exact: true }).fill("Nome React");
  await page.locator("#default-lineup-rotation").selectOption("3");
  await page.locator("#default-lineup-rotate-cw").click();
  await expect(page.locator("#default-lineup-rotation")).toHaveValue("4");
  await page.locator("#team-manager-save").click();
  await expect(modal).toBeHidden();
  const unchanged = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(unchanged.events).toEqual(before.events);
  expect(unchanged.court).toEqual(before.court);
  expect(unchanged.players).toEqual(before.players);
  await page.evaluate(async () => {
    await window.VolleyEye.app.invoke("openTeamsManagerModal");
    await window.VolleyEye.app.invoke("openSelectedManagedTeam");
  });
  await expect(page.locator("#team-meta-head")).toHaveValue("Coach React");
  await expect(page.locator("#default-lineup-rotation")).toHaveValue("4");
  const savedRow = modal.locator(
    '.team-manager-row[data-player-id="' + identity + '"]',
  );
  await expect(savedRow.getByPlaceholder("Cognome")).toHaveValue(
    "Cognome React",
  );
  await expect(savedRow.getByPlaceholder("Nome", { exact: true })).toHaveValue(
    "Nome React",
  );
  await page.locator("#team-manager-close").click();
  await page.evaluate(() => window.VolleyEye.app.invoke("openNewTeamManager"));
  await expect(page.locator("#team-meta-name")).toBeEnabled();
  await page.locator("#team-meta-name").fill("Squadra React nuova");
  await page.locator("#team-manager-add").click();
  const newRow = modal.locator(".team-manager-row").first();
  await newRow.getByPlaceholder("Cognome").fill("Giocatrice");
  await newRow.getByPlaceholder("Nome", { exact: true }).fill("Nuova");
  await page.locator("#team-manager-save").click();
  await expect(modal).toBeHidden();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openTeamsManagerModal"),
  );
  await expect(
    page.locator('#teams-manager-list [data-team-name="Squadra React nuova"]'),
  ).toHaveText("Squadra React nuova");
  const after = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(after.events).toEqual(before.events);
  expect(after.selectedTeam).toBe(before.selectedTeam);
  expect(errors).toEqual([]);
});

test("attacco React: base, tipo, alzatrice e muro con scorciatoie conservate", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  match.events = match.events
    .filter((event) => event.skillId === "attack")
    .slice(-1);
  Object.assign(match, {
    currentSet: match.events[0].set,
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
  });
  await page.evaluate(async (snapshot) => {
    const app = window.VolleyEye.app;
    await app.invoke("applyImportedMatch", snapshot, { silent: true });
    await app.invoke("saveState", { persistLocal: true });
    await app.invoke("enterSelectedMatch");
  }, match);
  await page.keyboard.press("k");
  await expect(page.locator("#base-modal")).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.locator("#base-modal")).toBeHidden();
  expect(
    (await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot()))
      .events[0].base,
  ).toBe("K2");
  await page.evaluate(() => window.VolleyEye.app.invoke("openAttackTypeModal"));
  await page
    .locator('#attack-type-modal [data-attack-type="Pallonetto"]')
    .click();
  await expect(page.locator("#attack-type-modal")).toBeHidden();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openBlockNumberModal"),
  );
  await page.locator('#block-number-modal [data-block-number="3"]').click();
  await expect(page.locator("#block-number-modal")).toBeHidden();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openAttackSetterModal"),
  );
  await expect(page.locator("#attack-setter-modal")).toBeVisible();
  await page.locator('#attack-setter-modal [data-setter-index=""]').click();
  await expect(page.locator("#attack-setter-modal")).toBeHidden();
  const after = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(after.events).toHaveLength(1);
  expect(after.events[0].base).toBe("K2");
  expect(after.events[0].attackType).toBe("Pallonetto");
  expect(after.events[0].blockNumber).toBe(3);
  expect(after.events[0].dv.numPlayersNumeric).toBe(3);
  expect(after.events[0].setterIdx).toBeNull();
  expect(errors).toEqual([]);
});

test("import React: CAMP3 modificabile, annullamento e ritaglio foto", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.evaluate(() => window.VolleyEye.app.invoke("openNewTeamManager"));
  await page.evaluate(() => {
    window.camp3Result = "pending";
    window.VolleyEye.app
      .invoke("showCamp3ImportConfirm", {
        rows: [
          {
            id: "camp3-one",
            enabled: true,
            lastName: "Rossi",
            firstName: "Sara",
            number: "12",
            role: "",
            isCaptain: false,
          },
          {
            id: "camp3-two",
            enabled: true,
            lastName: "Verdi",
            firstName: "Anna",
            number: "8",
            role: "",
            isCaptain: false,
          },
        ],
        outRows: [{ id: "camp3-out", enabled: true, name: "Fuori rosa" }],
      })
      .then((result) => (window.camp3Result = result));
  });
  const modal = page.locator("#camp3-confirm-modal");
  await expect(modal).toBeVisible();
  const rows = modal.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await rows.first().locator('input[type="text"]').first().fill("Bianchi");
  await rows.first().locator('input[type="checkbox"]').last().check();
  await rows.last().locator('input[type="checkbox"]').last().check();
  await expect(
    rows.first().locator('input[type="checkbox"]').last(),
  ).not.toBeChecked();
  await rows.first().getByRole("button", { name: "Elimina modifica" }).click();
  await modal.getByRole("button", { name: "Non mettere fuori rosa" }).click();
  await expect(rows).toHaveCount(1);
  await page.locator("#camp3-confirm-apply").click();
  await page.waitForFunction(() => window.camp3Result !== "pending");
  const result = await page.evaluate(() => window.camp3Result);
  expect(result.rows[0].lastName).toBe("Bianchi");
  expect(result.rows[0].enabled).toBe(false);
  expect(result.rows[1].isCaptain).toBe(true);
  expect(result.outRows[0].enabled).toBe(false);
  await page.evaluate(() => {
    window.camp3Result = "pending";
    window.VolleyEye.app
      .invoke("showCamp3ImportConfirm", { rows: [], outRows: [] })
      .then((result) => (window.camp3Result = result));
  });
  await expect(modal).toBeVisible();
  await page.locator("#camp3-confirm-cancel").click();
  await page.waitForFunction(() => window.camp3Result === null);
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 640, 480);
    window.photoResult = "pending";
    window.VolleyEye.app
      .invoke("openPlayerPhotoEditor", canvas.toDataURL(), {
        allowRemove: true,
        maxZoom: 4,
      })
      .then((result) => (window.photoResult = result));
  });
  await expect(page.locator("#player-photo-modal")).toBeVisible();
  await expect(page.locator("#player-photo-zoom")).toHaveAttribute("max", "4");
  await page.locator("#player-photo-zoom").fill("2");
  await expect(page.locator("#player-photo-image")).toHaveAttribute(
    "style",
    /scale\(/,
  );
  await page.locator("#player-photo-save").click();
  await page.waitForFunction(() => window.photoResult !== "pending");
  expect(await page.evaluate(() => window.photoResult)).toMatch(
    /^data:image\/jpeg;base64,/,
  );
  await expect(page.locator("#player-photo-modal")).toBeHidden();
  expect(errors).toEqual([]);
});

test("tempi video React: bozza annullabile, durata e unificazione dei collegamenti", async ({
  page,
}) => {
  const errors = await openApp(page);
  const before = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  const serve = before.events.find((ev) => ev.skillId === "serve");
  const pass = before.events.find((ev) => ev.skillId === "pass");
  const match = {
    ...before,
    currentSet: 1,
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
    events: [
      {
        ...serve,
        eventId: 88001,
        set: 1,
        videoTime: 2,
        relatedLinks: [{ type: "serve-pass", eventId: 88002 }],
      },
      {
        ...pass,
        eventId: 88002,
        set: 1,
        videoTime: 9,
        relatedLinks: [{ type: "serve-pass", eventId: 88001 }],
      },
    ],
  };
  await page.evaluate(async (snapshot) => {
    await window.VolleyEye.app.invoke("applyImportedMatch", snapshot, {
      silent: true,
    });
    await window.VolleyEye.app.invoke("saveState", { persistLocal: true });
    await window.VolleyEye.app.invoke("enterSelectedMatch");
  }, match);
  await page.evaluate(async () => {
    await window.VolleyEye.app.invoke("setActiveTab", "video");
    return window.VolleyEye.app.invoke("openSkillDurationModal");
  });
  const duration = page.locator(
    '#skill-duration-grid input[data-skill-id="serve"]',
  );
  await expect(duration).toHaveValue("5000");
  await duration.fill("2750");
  await page.locator("#skill-duration-close").click();
  expect(
    (await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot())).events,
  ).toEqual(match.events);
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openSkillDurationModal"),
  );
  await expect(duration).toHaveValue("5000");
  await duration.fill("2750");
  await page.locator("#skill-duration-apply").click();
  await expect(page.locator("#skill-duration-modal")).toBeHidden();
  const changed = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(changed.events[0].durationMs).toBe(2750);
  expect(changed.events[1].durationMs).toBe(5000);
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openSkillDurationModal"),
  );
  await expect(duration).toHaveValue("2750");
  await page.locator("#skill-duration-close").click();
  await page.evaluate(() => window.VolleyEye.app.invoke("openUnifyTimesModal"));
  for (const checkbox of await page
    .locator("#unify-times-grid input[data-link-type]")
    .all())
    await checkbox.uncheck();
  const link = page
    .locator(".unify-times-row")
    .filter({ has: page.locator('[data-link-type="serve-pass"]') });
  await link.locator('input[type="checkbox"]').check();
  await link.locator('input[value="pass"]').check();
  await page.locator("#unify-times-apply").click();
  await expect(page.locator("#unify-times-modal")).toBeHidden();
  const unified = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(unified.events.map((ev) => ev.videoTime)).toEqual([9, 9]);
  await page.evaluate(() => window.VolleyEye.app.invoke("openOffsetModal"));
  const offset = page.locator(
    '#offset-skill-grid input[data-skill-id="serve"]',
  );
  await expect(offset).toHaveValue("0");
  await offset.fill("-2");
  await page.locator("#offset-close").click();
  expect(
    (await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot())).events,
  ).toEqual(unified.events);
  expect(errors).toEqual([]);
});

test("archivio giocatrici React: selezione e unione ID aggiornano il roster", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.evaluate(() => window.VolleyEye.app.invoke("openPlayersDbModal"));
  const modal = page.locator("#players-db-modal");
  await expect(modal).toBeVisible();
  const rows = modal.locator("#players-db-body tr");
  const total = await rows.count();
  expect(total).toBeGreaterThan(2);
  const ids = await rows.evaluateAll((elements) =>
    elements.slice(0, 2).map((el) => el.dataset.playerId),
  );
  await page.locator("#players-db-merge-primary").selectOption(ids[1]);
  await page.locator("#players-db-merge-secondary").selectOption(ids[0]);
  await page.locator("#btn-merge-players").click();
  await expect(rows).toHaveCount(total - 1);
  await expect(modal.locator('[data-player-id="' + ids[0] + '"]')).toHaveCount(
    0,
  );
  await expect(modal.locator('[data-player-id="' + ids[1] + '"]')).toHaveCount(
    1,
  );
  await page.locator("#players-db-close").click();
  await expect(modal).toBeHidden();
  await page.evaluate(() => window.VolleyEye.app.invoke("openPlayersDbModal"));
  await expect(rows).toHaveCount(total - 1);
  expect(errors).toEqual([]);
});

test("analisi React: grafici SVG, dettaglio codici e metrica interattiva", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "aggregated"),
  );
  await page.locator('[data-agg-tab-target="skill-charts"]').click();
  const charts = page.locator("#analysis-skill-chart-grid .skill-chart-card");
  await expect(charts).toHaveCount(7);
  await page.locator("#analysis-skill-chart-metric").selectOption("code");
  await expect(page.locator("#analysis-skill-chart-metric")).toHaveValue(
    "code",
  );
  const plot = page
    .locator("#analysis-skill-chart-grid .skill-chart-card__plot")
    .first();
  await plot.hover();
  await expect(plot.locator(".skill-chart-tooltip")).toBeVisible();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openAggSkillModal", "serve", "team"),
  );
  const modal = page.locator("#agg-skill-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".agg-skill-summary-card").first()).toContainText(
    "Totale",
  );
  const total = Number(
    await modal.locator(".agg-skill-summary-value").first().textContent(),
  );
  const counts = await modal
    .locator(".agg-skill-codes tbody tr td:nth-child(2)")
    .allTextContents();
  expect(counts.reduce((sum, count) => sum + Number(count), 0)).toBe(total);
  await modal.locator("select").selectOption("prf");
  await expect(modal.locator("select")).toHaveValue("prf");
  await expect(modal.locator("svg")).toHaveCount(1);
  await page.locator("#agg-skill-modal-close").click();
  await expect(modal).toBeHidden();
  expect(errors).toEqual([]);
});

test("eventi React: selezione, modifica singola e multipla, punteggio video e undo", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "video"),
  );
  const table = page.locator("#video-skills-container table"),
    rows = table.locator("tbody tr.event-row");
  expect(await rows.count()).toBeGreaterThan(2);
  const identities = await rows.evaluateAll((elements) =>
    elements.slice(0, 2).map((el) => el.dataset.eventKey),
  );
  const first = rows.first();
  await first.locator(".row-select input").check();
  const heading = await table.locator("thead th").allTextContents(),
    combinationIndex = heading.findIndex((text) =>
      text.startsWith("Combinazione"),
    );
  await first.locator("td").nth(combinationIndex).dblclick();
  const input = first.locator("td").nth(combinationIndex).locator("input");
  await input.fill("K9 React");
  await input.press("Tab");
  await expect(first.locator("td").nth(combinationIndex)).toHaveText(
    "K9 React",
  );
  await rows.nth(1).locator(".row-select input").check();
  await expect(table).toHaveClass(/bulk-edit-active/);
  await table.locator('th[data-bulk-key="durationMs"]').click();
  await expect(page.locator("#bulk-edit-modal")).toBeVisible();
  await page.locator("#bulk-edit-body input").fill("3250");
  await page.locator("#bulk-edit-apply").click();
  await expect(page.locator("#bulk-edit-modal")).toBeHidden();
  let snapshot = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(
    snapshot.events
      .filter((ev) => identities.includes(String(ev.eventId)))
      .map((ev) => ev.durationMs),
  ).toEqual([3250, 3250]);
  await page.evaluate(() => window.VolleyEye.app.invoke("openVideoScoreModal"));
  await page.locator("#video-score-home").fill("11");
  await page.locator("#video-score-away").fill("9");
  await page.locator("#video-score-cancel").click();
  const unchanged = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(unchanged.events).toEqual(snapshot.events);
  await page.evaluate(() => window.VolleyEye.app.invoke("openVideoScoreModal"));
  await page.locator("#video-score-home").fill("11");
  await page.locator("#video-score-away").fill("9");
  await page.locator("#video-score-apply").click();
  await expect(page.locator("#video-score-modal")).toBeHidden();
  snapshot = await page.evaluate(() => window.VolleyEye.app.getMatchSnapshot());
  const corrected = snapshot.events.filter((ev) =>
    identities.includes(String(ev.eventId)),
  );
  expect(corrected[0].homeScore).toBe(11);
  expect(corrected[0].visitorScore).toBe(9);
  await page.evaluate(() => window.VolleyEye.app.invoke("undoLastVideoEdit"));
  const undone = await page.evaluate(() =>
    window.VolleyEye.app.getMatchSnapshot(),
  );
  expect(undone.events).toEqual(unchanged.events);
  expect(errors).toEqual([]);
});

test("filtri e preset React: applicazione, rinomina, reset e selezione multiscout", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "video"),
  );
  const serve = page.locator('#video-filter-skills input[value="serve"]');
  await serve.check();
  await expect(serve).toBeChecked();
  await page.locator("#video-filter-preset-name").fill("Servizio React");
  await page.locator("#video-filter-preset-save").click();
  const saved = page
    .locator(".video-filter-preset-card")
    .filter({ hasText: "Servizio React" });
  await expect(saved).toBeVisible();
  const presetId = await saved.getAttribute("data-video-filter-preset-id"),
    preset = page.locator(`[data-video-filter-preset-id="${presetId}"]`);
  await expect(preset).toBeVisible();
  await page.locator("#video-filter-reset").click();
  await expect(serve).not.toBeChecked();
  await preset.click();
  await expect(serve).toBeChecked();
  await preset.locator(".video-filter-preset-rename").click();
  await preset.locator("input").fill("Battute React");
  await preset.locator("input").press("Enter");
  const renamed = preset;
  await expect(renamed).toContainText("Battute React");
  await expect(renamed).toBeVisible();
  await renamed.locator(".video-filter-preset-rename").click();
  await renamed.locator("input").fill("Da annullare");
  await renamed.locator("input").press("Escape");
  await expect(renamed).toBeVisible();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "aggregated"),
  );
  await page.locator("#btn-open-multiscout").click();
  await expect(page.locator("#multiscout-modal")).toBeVisible();
  await expect(page.locator("#multiscout-team-select option")).toHaveCount(2);
  await page.locator("#multiscout-team-select").selectOption("opponent");
  await expect(page.locator("#multiscout-team-select")).toHaveValue("opponent");
  await page.locator("#multiscout-reset").click();
  await page.locator("#multiscout-cancel").click();
  await expect(page.locator("#multiscout-modal")).toBeHidden();
  expect(errors).toEqual([]);
});

test("scheda partita React: campi SVG, filtri e note dopo aggiornamento", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "aggregated"),
  );
  await page.locator('[data-agg-tab-target="match-sheet"]').click();
  const sheet = page.locator("#match-sheet-page");
  await expect(sheet).toHaveAttribute("data-react-managed", "true");
  expect(await sheet.locator("svg").count()).toBeGreaterThan(10);
  const note = sheet.locator("textarea").first(),
    key = await note.getAttribute("data-match-sheet-note");
  await note.fill("Nota React\nSeconda riga");
  await expect(
    note.locator("..").locator(".match-sheet-notes-print"),
  ).toContainText("Seconda riga");
  await page.locator('[data-match-sheet-filter="includeAttackErrors"]').check();
  await expect(note).toHaveValue("Nota React\nSeconda riga");
  await page.locator(".match-sheet-sideout-filters summary").click();
  const set = page.locator('[data-sideout-filter="sets"]').first();
  await set.check();
  await expect(set).toBeChecked();
  await expect(page.locator(".match-sheet-sideout-filters")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(`[data-match-sheet-note="${key}"]`)).toHaveValue(
    "Nota React\nSeconda riga",
  );
  await expect(
    page.locator('[data-match-sheet-filter="includeAttackErrors"]'),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test("statistiche React: tabellino, dettaglio, play by play, andamento e metriche", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "aggregated"),
  );
  const body = page.locator("#agg-table-body");
  await expect(body).toHaveAttribute("data-react-managed", "true");
  await expect(body).toContainText("Totale squadra");
  await body.locator(".agg-body-header .skill-attack").first().click();
  await expect(page.locator(".agg-table-back")).toContainText("Attacco");
  await expect(
    page.locator("#agg-summary-extra-body .skill-chart-card"),
  ).toHaveCount(4);
  await page.locator(".agg-table-back").click();
  await expect(body).toContainText("Totale squadra");
  await page.locator('[data-agg-tab-target="play-by-play"]').click();
  await expect(page.locator("#analysis-play-by-play")).toHaveAttribute(
    "data-react-managed",
    "true",
  );
  await expect(page.locator(".play-by-play-row").first()).toBeVisible();
  await page.locator(".play-by-play-token").first().hover();
  await expect(page.locator(".play-by-play-tooltip")).toBeVisible();
  await page.locator("#analysis-play-by-play-set").selectOption("2");
  await expect(page.locator("#analysis-play-by-play-set")).toHaveValue("2");
  await page.locator('[data-agg-tab-target="set-trend"]').click();
  const hit = page.locator(".set-trend__hit").first(),
    key = await hit.getAttribute("data-point-key");
  await hit.click();
  await expect(
    page.locator(`.set-trend__dot[data-point-key="${key}"]`),
  ).toHaveClass(/is-selected/);
  await expect(
    page.locator("#set-trend-detail .set-trend-detail__head"),
  ).toBeVisible();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "info"),
  );
  await expect(page.locator("#metrics-config")).toHaveAttribute(
    "data-react-managed",
    "true",
  );
  const toggle = page.locator(".metric-block.skill-attack .toggle-skill");
  await expect(toggle).toHaveText("ON");
  await toggle.click();
  await expect(toggle).toHaveText("OFF");
  await toggle.click();
  await expect(toggle).toHaveText("ON");
  await expect(
    page
      .locator(".metric-block.skill-block .metric-row")
      .filter({ hasText: "Codici abilitati" })
      .getByRole("button", { name: "!", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("analisi giocatrici React: traiettorie, selezioni, distribuzione e confronto", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "aggregated"),
  );
  await page.locator('[data-agg-tab-target="trajectory"]').click();
  await expect(page.locator("#trajectory-grid")).toHaveAttribute(
    "data-react-managed",
    "true",
  );
  await expect(page.locator("#trajectory-grid canvas")).toHaveCount(6);
  await page.locator('[data-agg-tab-target="second"]').click();
  await expect(page.locator("#agg-second-attack-body")).toHaveAttribute(
    "data-react-managed",
    "true",
  );
  await expect(
    page.locator("#second-distribution .distribution-card"),
  ).toHaveCount(7);
  await page.locator('[data-agg-tab-target="player"]').click();
  await expect(page.locator("#player-analysis-body")).toHaveAttribute(
    "data-react-managed",
    "true",
  );
  await expect(page.locator("#player-analysis-hero")).toBeVisible();
  const options = await page
    .locator("#player-analysis-select option")
    .evaluateAll((options) =>
      options.map((option) => ({
        value: option.value,
        label: option.textContent,
      })),
    );
  await page.locator("#player-analysis-select").selectOption(options[1].value);
  await expect(page.locator("#player-analysis-hero")).toContainText(
    options[1].label,
  );
  await page.locator("#player-analysis-show-second").check();
  await expect(
    page.locator("#player-second-distribution .distribution-card"),
  ).toHaveCount(7);
  await page.locator("#player-analysis-compare-enabled").check();
  const compare = page.locator("#player-analysis-compare-view");
  await expect(compare).toBeVisible();
  await expect(compare.locator(".player-analysis-compare-card")).toHaveCount(2);
  await expect(page.locator("#player-analysis-hero")).toBeHidden();
  await expect(compare.locator(".distribution-card")).toHaveCount(14);
  await expect(compare.locator(".skill-chart-card")).toHaveCount(14);
  const next = await page
    .locator("#player-analysis-compare-select option")
    .nth(1)
    .getAttribute("value");
  await page.locator("#player-analysis-compare-select").selectOption(next);
  await expect(page.locator("#player-analysis-compare-select")).toHaveValue(
    next,
  );
  await page.locator("#player-analysis-compare-enabled").uncheck();
  await expect(compare).toBeHidden();
  await expect(page.locator("#player-analysis-hero")).toBeVisible();
  expect(errors).toEqual([]);
});

test("dialoghi React: coordinate battuta, traiettoria attacco, encoder e sorgente mobile", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "video"),
  );
  await page.evaluate(() => {
    window.trajectoryResult = undefined;
    window.VolleyEye.app
      .invoke("openAttackTrajectoryModal", {
        mode: "serve-start",
        forcePopup: true,
        scope: "our",
      })
      .then((value) => (window.trajectoryResult = value));
  });
  await expect(page.locator("#attack-trajectory-modal")).toBeVisible();
  await page.locator('[data-serve-type="F"]').click();
  const canvas = page.locator("#attack-trajectory-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((el) => el.width)).toBeGreaterThan(0);
  await canvas.click({ position: { x: 100, y: 80 } });
  await expect(page.locator("#attack-trajectory-modal")).toBeHidden();
  let result = await page.evaluate(() => window.trajectoryResult);
  expect(result.serveType).toBe("F");
  expect(result.point.x).toBeGreaterThanOrEqual(0);
  expect(result.point.x).toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    window.trajectoryResult = undefined;
    window.VolleyEye.app.invoke(
      "changeReactSetting",
      "attackTrajectorySimplified",
      true,
    );
    window.VolleyEye.app
      .invoke("openAttackTrajectoryModal", {
        mode: "attack",
        forcePopup: true,
        scope: "our",
        baseZone: 4,
      })
      .then((value) => (window.trajectoryResult = value));
  });
  await expect(page.locator("#attack-trajectory-modal")).toBeVisible();
  await page.locator('[data-net-point="3"]').click();
  await expect(page.locator('[data-net-point="3"]')).toHaveClass("active");
  await canvas.click({ position: { x: 130, y: 70 } });
  await expect(page.locator("#attack-trajectory-modal")).toBeHidden();
  result = await page.evaluate(() => window.trajectoryResult);
  expect(result.start).toBeTruthy();
  expect(result.end).toBeTruthy();
  expect(Number.isFinite(result.directionDeg)).toBe(true);
  await page.evaluate(() => {
    window.encoderResult = undefined;
    window.VolleyEye.app
      .invoke("chooseFfmpegEncoder")
      .then((value) => (window.encoderResult = value));
  });
  await expect(page.locator("#ffmpeg-encoder-modal")).toBeVisible();
  await page.locator("#ffmpeg-copy-gpu").click();
  await expect(page.locator("#ffmpeg-encoder-modal")).toBeHidden();
  expect(await page.evaluate(() => window.encoderResult)).toBe("gpu");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("openVideoMobileSourceModal"),
  );
  await expect(page.locator("#video-mobile-source-modal")).toBeVisible();
  await page.locator("#video-mobile-youtube-url").fill("link invalido");
  await page.locator("#video-mobile-youtube-load").click();
  await expect(page.locator("#video-mobile-source-modal")).toBeVisible();
  await page.locator("#video-mobile-source-later").click();
  await expect(page.locator("#video-mobile-source-modal")).toBeHidden();
  expect(errors).toEqual([]);
});

test("video React: sorgente locale condivisa, frame, sincronizzazione e rimozione", async ({
  page,
}) => {
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const snapshot = demo.state || demo;
  snapshot.events = snapshot.events
    .filter((event) => event.skillId)
    .slice(0, 3)
    .map((event, index) => ({
      ...event,
      id: "video-react-" + index,
      videoTime: index + 1,
    }));
  snapshot.video = {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0,
  };
  snapshot.videoPlayByPlay = false;
  await page.evaluate(async (match) => {
    await window.VolleyEye.app.invoke("applyImportedMatch", match, {
      silent: true,
    });
    await window.VolleyEye.app.invoke("enterSelectedMatch");
    await window.VolleyEye.app.invoke("setActiveTab", "video");
  }, snapshot);
  await page
    .locator("#video-file-input")
    .setInputFiles("tests/fixtures/video/blank.webm");
  await expect
    .poll(() =>
      page.locator("#analysis-video").evaluate((video) => video.duration),
    )
    .toBe(10);
  const source = await page.locator("#analysis-video").getAttribute("src");
  expect(source).toMatch(/^blob:/);
  await expect(page.locator("#analysis-video-scout")).toHaveAttribute(
    "src",
    source,
  );
  await expect(page.locator("#video-file-input")).toHaveValue("");
  await page
    .locator("#video-skills-container tbody input[type=checkbox]")
    .first()
    .check();
  await expect(page.locator("#video-selection-count")).toHaveText(
    "Selezionati: 1",
  );
  await page.locator("#analysis-video").evaluate((video) => {
    video.pause();
    video.currentTime = 4;
  });
  await expect
    .poll(() =>
      page.locator("#analysis-video").evaluate((video) => video.currentTime),
    )
    .toBe(4);
  await page.locator("#btn-video-frame-next").click();
  await expect
    .poll(() =>
      page.locator("#analysis-video").evaluate((video) => video.currentTime),
    )
    .toBeCloseTo(4 + 1 / 30, 3);
  await page.locator("#btn-video-frame-prev").click();
  const beforeSync = await page.evaluate(
    () => window.VolleyEye.app.getMatchSnapshot().events[0].videoTime,
  );
  await page.locator("#btn-sync-first-skill").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.VolleyEye.app.getMatchSnapshot().events[0].videoTime,
      ),
    )
    .toBeCloseTo(4, 3);
  await page.locator("#btn-video-undo").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.VolleyEye.app.getMatchSnapshot().events[0].videoTime,
      ),
    )
    .toBe(beforeSync);
  await page.locator("#video-playbyplay-toggle").check();
  await expect(page.locator("#video-analysis-overlay")).toBeVisible();
  await expect(page.locator("#video-overlay-set")).toContainText("Set");
  await page.locator("#video-playbyplay-toggle").uncheck();
  await expect(page.locator("#video-analysis-overlay")).toBeHidden();
  await page.locator("#btn-clear-video").click();
  await expect(page.locator("#analysis-video")).not.toHaveAttribute("src");
  await expect(page.locator("#analysis-video-scout")).not.toHaveAttribute(
    "src",
  );
  expect(errors).toEqual([]);
});

test("video React mobile: filtri, navigazione e scelta sorgente aggiornano la vista", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "video"),
  );
  await page.locator("#video-mobile-source-later").click();
  await expect(page.locator("#video-mobile-prev")).toBeDisabled();
  await expect(page.locator("#video-mobile-next")).toBeEnabled();
  await page.locator("#video-mobile-next").click();
  await expect(page.locator("#video-selection-count")).toHaveText(
    "Selezionati: 1",
  );
  await page.locator("#video-mobile-next").click();
  await expect(page.locator("#video-mobile-prev")).toBeEnabled();
  await page.locator("#video-mobile-filter-open").click();
  await expect(page.locator("body")).toHaveClass(/video-mobile-filters-open/);
  await page.locator("#video-filter-skills input").first().check();
  await expect(page.locator("#video-mobile-filter-count")).not.toHaveText("0");
  await expect(page.locator("#video-mobile-results-count")).toContainText(
    "azion",
  );
  await page.locator("#video-mobile-filter-apply").click();
  await expect(page.locator("body")).not.toHaveClass(
    /video-mobile-filters-open/,
  );
  await page
    .locator("#video-file-input")
    .setInputFiles("tests/fixtures/video/blank.webm");
  await expect(page.locator("#video-mobile-source-open")).toHaveText(
    "Cambia video",
  );
  await page.locator("#video-mobile-source-open").click();
  await expect(page.locator("#video-mobile-source-modal")).toBeVisible();
  await page.locator("#video-mobile-source-later").click();
  await page.evaluate(() => window.VolleyEye.app.invoke("clearLoadedVideo"));
  await expect(page.locator("#video-mobile-source-open")).toHaveText(
    "Scegli video",
  );
  expect(errors).toEqual([]);
});

test("video React: YouTube sincronizza le sorgenti e conserva le bozze locali", async ({
  page,
}) => {
  await page.route("https://www.youtube.com/**", (route) => route.abort());
  await page.addInitScript(() => {
    window.YT = {
      Player: class {
        constructor(id, options) {
          this.time = 0;
          this.options = options;
          queueMicrotask(() => options.events.onReady());
        }
        loadVideoById(id, start) {
          this.time = start;
        }
        seekTo(time) {
          this.time = time;
        }
        getCurrentTime() {
          return this.time;
        }
        stopVideo() {}
        playVideo() {}
        getPlayerState() {
          return 2;
        }
      },
    };
  });
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke("setActiveTab", "video"),
  );
  await page.locator("#youtube-url-input").fill("https://youtu.be/abcdefghi01");
  await page.locator("#youtube-url-input").press("Enter");
  await expect(page.locator("#analysis-video")).toBeHidden();
  await expect(page.locator("#youtube-frame")).toBeVisible();
  await expect(page.locator("#youtube-url-input-scout")).toHaveValue(
    "https://youtu.be/abcdefghi01",
  );
  await page.locator("#youtube-url-input").fill("bozza non valida");
  await page
    .locator("#video-skills-container tbody input[type=checkbox]")
    .first()
    .check();
  await expect(page.locator("#youtube-url-input")).toHaveValue(
    "bozza non valida",
  );
  await page.locator("#btn-load-youtube").click();
  await expect(page.locator("#youtube-url-input")).toHaveValue(
    "bozza non valida",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.VolleyEye.app.getMatchSnapshot().video.youtubeId,
      ),
    )
    .toBe("abcdefghi01");
  await page.locator("#btn-clear-video").click();
  await expect(page.locator("#youtube-url-input")).toHaveValue("");
  await expect(page.locator("#youtube-url-input-scout")).toHaveValue("");
  await expect(page.locator("#analysis-video")).toBeVisible();
  expect(errors).toEqual([]);
});

test("opzioni scout React: squadre indipendenti, rotazione, libero e impostazioni sincronizzate", async ({
  page,
}) => {
  test.setTimeout(30000);
  const errors = await openApp(page);
  // The compact desktop layout keeps these legacy inline options behind the
  // scout panel; their native React change handlers also serve the settings UI.
  const toggleInline = async (id, checked) => {
    const input = page.locator(id);
    if ((await input.isChecked()) !== checked)
      await input.evaluate((element) => element.click());
  };
  await page.locator("#btn-load-match").click();
  if (
    (await page.locator("#btn-end-match").textContent()) === "Riprendi partita"
  )
    await page.locator("#btn-end-match").click();
  await page.evaluate(() => window.VolleyEye.app.invoke("closeNextSetModal"));
  await toggleInline("#auto-rotate-toggle", false);
  await page.evaluate(() => window.VolleyEye.app.invoke("openSettingsModal"));
  await expect(page.locator("#auto-rotate-toggle-settings")).not.toBeChecked();
  await page.locator("#auto-rotate-toggle-settings").check();
  await page.locator("#settings-close").click();
  await expect(page.locator("#auto-rotate-toggle")).toBeChecked();
  await page.locator("#rotation-select").selectOption("3");
  await expect
    .poll(() =>
      page.evaluate(() => window.VolleyEye.app.getMatchSnapshot().rotation),
    )
    .toBe(3);
  await page.locator("#btn-rotate-cw").click();
  await expect(page.locator("#rotation-select")).not.toHaveValue("3");
  await page.locator("#auto-libero-select").selectOption("S");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.VolleyEye.app.getMatchSnapshot().autoLiberoRole,
      ),
    )
    .toBe("S");
  await toggleInline("#attack-trajectory-toggle-opp", false);
  await toggleInline("#attack-trajectory-toggle", true);
  await expect(page.locator("#attack-trajectory-toggle-opp")).not.toBeChecked();
  await toggleInline("#video-scout-toggle", true);
  await expect(page.locator("#video-scout-controls")).toBeVisible();
  await toggleInline("#video-scout-toggle", false);
  await expect(page.locator("#video-scout-controls")).toBeHidden();
  await page
    .locator('#skill-flow-buttons [data-force-skill="pass"]')
    .evaluate((button) => button.click());
  await expect(page.locator("#predictive-skill-toggle")).toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.VolleyEye.app.getMatchSnapshot().skillFlowOverride,
      ),
    )
    .toBe("pass");
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(page.locator("#auto-libero-select")).toHaveValue("S");
  await expect(page.locator("#attack-trajectory-toggle-opp")).not.toBeChecked();
  expect(errors).toEqual([]);
});

test("portal React: traiettoria passa dal campo al popup mantenendo canvas e comandi", async ({
  page,
}) => {
  const errors = await openApp(page);
  await page.locator("#btn-load-match").click();
  await page.evaluate(() => {
    window.portalResult = undefined;
    window.VolleyEye.app
      .invoke("openAttackTrajectoryModal", {
        mode: "serve-start",
        scope: "our",
      })
      .then((result) => (window.portalResult = result));
    window.portalCanvas = document.getElementById("attack-trajectory-canvas");
  });
  await expect(
    page.locator("#court-overlay #attack-trajectory-modal"),
  ).toBeVisible();
  await page.evaluate(() =>
    window.VolleyEye.app.invoke(
      "changeReactSetting",
      "forceMobileLayout",
      true,
    ),
  );
  await expect(page.locator("#attack-trajectory-modal")).not.toHaveClass(
    /court-modal/,
  );
  expect(
    await page.evaluate(
      () =>
        window.portalCanvas ===
        document.getElementById("attack-trajectory-canvas"),
    ),
  ).toBe(true);
  await page.locator('#serve-type-buttons [data-serve-type="F"]').click();
  await page
    .locator("#attack-trajectory-canvas")
    .click({ position: { x: 100, y: 80 } });
  await expect(page.locator("#attack-trajectory-modal")).toBeHidden();
  expect(await page.evaluate(() => window.portalResult.serveType)).toBe("F");
  expect(errors).toEqual([]);
});

test("DataVolley React: anteprima, coda, rimozione e tempi oltre il limite", async ({
  page,
}) => {
  test.setTimeout(30000);
  const errors = await openApp(page);
  const demo = JSON.parse(readFileSync("match_demo.json", "utf8"));
  const match = demo.state || demo;
  Object.assign(match, {
    events: [],
    currentSet: 1,
    setResults: {},
    scoreOverrides: {},
    matchFinished: false,
    matchEndSetSnapshot: null,
    matchEndSetRecorded: null,
  });
  await page.evaluate(async (snapshot) => {
    await window.VolleyEye.app.invoke("applyImportedMatch", snapshot, {
      silent: true,
    });
    await window.VolleyEye.app.invoke("saveState", { persistLocal: true });
    await window.VolleyEye.app.invoke("enterSelectedMatch");
    await window.VolleyEye.app.invoke("closeNextSetModal");
  }, match);
  const input = page.locator("#dvw-scout-input");
  await input.fill("*T");
  await expect(page.locator("#dvw-scout-breakdown")).toContainText("Timeout");
  await input.press("Space");
  await expect(input).toHaveValue("");
  await expect(page.locator(".scout-dvw-chip:not(.is-draft)")).toHaveCount(1);
  await page.locator(".scout-dvw-chip__remove").click();
  await expect(page.locator(".scout-dvw-chip")).toHaveCount(0);
  for (let i = 0; i < 3; i++) {
    await input.fill("*T");
    await input.press("Enter");
    await expect(input).toHaveValue("");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.VolleyEye.app
              .getMatchSnapshot()
              .events.filter((event) => event.actionType === "timeout").length,
        ),
      )
      .toBe(i + 1);
  }
  await expect(page.locator("#timeout-count")).toHaveText("0");
  await input.fill("codice-errato");
  await input.press("Enter");
  await expect(page.locator("#dvw-scout-status")).toHaveClass(/is-error/);
  await page.locator("#btn-dvw-scout-clear").click();
  await expect(input).toHaveValue("");
  await expect(page.locator(".scout-dvw-chip")).toHaveCount(0);
  await expect(
    page.locator('[data-scout-widget="serve-trajectories"]'),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("database React: selettore file conserva il gesto e backup esportabile", async ({
  page,
}) => {
  test.setTimeout(30000);
  const errors = await openApp(page);
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#btn-import-db").click();
  await chooser;
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#btn-export-db").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await page.locator("#btn-open-teams-manager").click();
  await expect(page.locator("#teams-manager-modal")).toBeVisible();
  expect(errors).toEqual([]);
});

test("azioni database React: cancellazione demo aggiorna visibilità e archivio", async ({
  page,
}) => {
  test.setTimeout(30000);
  const errors = await openApp(page);
  const button = page.locator("#btn-delete-demo-data");
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toBeHidden();
  await expect(page.locator("#saved-matches-list")).not.toContainText("Aurora");
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
  );
  await expect(button).toBeHidden();
  expect(errors).toEqual([]);
});
