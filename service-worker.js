const APP_CACHE_VERSION = "v0.19.7-420-53ca3a9";
const withVersion = asset => `${asset}?v=${encodeURIComponent(APP_CACHE_VERSION || "dev")}`;

importScripts(withVersion("./js/app-version.js"));
const CACHE_VERSION =
  (self.__APP_VERSION__ && self.__APP_VERSION__.cacheVersion) || "dev";
const CACHE_NAME = `volleyeye-cache-${CACHE_VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  withVersion("./style.css"),
  withVersion("./styles/match-and-lineups.css"),
  withVersion("./styles/analysis-base.css"),
  withVersion("./styles/metrics-and-tables.css"),
  withVersion("./styles/video-filters.css"),
  withVersion("./styles/skill-charts.css"),
  withVersion("./styles/video.css"),
  withVersion("./styles/modals-and-trajectories.css"),
  withVersion("./styles/team-management.css"),
  withVersion("./styles/responsive.css"),
  withVersion("./styles/scout-live.css"),
  withVersion("./styles/light-theme.css"),
  withVersion("./styles/skill-palette.css"),
  withVersion("./styles/print.css"),
  "./version.json",
  "./match_demo.json",
  "./docs/manual.md",
  "./docs/markdown-viewer.html",
  "./js/vendor/marked.umd.js",
  withVersion("./js/app-version.js"),
  withVersion("./js/globals.js"),
  withVersion("./js/shared/namespace.js"),
  withVersion("./js/shared/state-isolation.js"),
  withVersion("./js/shared/persistent-storage.js"),
  withVersion("./js/shared/team-ui.js"),
  withVersion("./js/shared/lineup-core.js"),
  withVersion("./js/shared/auto-role.js"),
  withVersion("./js/shared/roster-manager.js"),
  withVersion("./js/match-settings.js"),
  withVersion("./js/opponent-settings.js"),
  withVersion("./js/roster-lineup.js"),
  withVersion("./js/roster/core/state-store.js"),
  withVersion("./js/roster/core/player-model.js"),
  withVersion("./js/roster/court/court-engine.js"),
  withVersion("./js/roster/storage/team-repository.js"),
  withVersion("./js/roster/storage/match-repository.js"),
  withVersion("./js/roster/storage/archive-actions.js"),
  withVersion("./js/roster/imports/camp3-import.js"),
  withVersion("./js/roster/settings/scouting-config.js"),
  withVersion("./js/roster/editor/team-editor.js"),
  withVersion("./js/roster/settings/metrics-editor.js"),
  withVersion("./js/roster/court/court-ui-bootstrap.js"),
  withVersion("./js/scout-ui.js"),
  withVersion("./js/scout/live/next-set-lineups.js"),
  withVersion("./js/scout/live/skill-selection.js"),
  withVersion("./js/scout/live/lineup-editor.js"),
  withVersion("./js/scout/live/game-flow.js"),
  withVersion("./js/scout/live/trajectories.js"),
  withVersion("./js/scout/live/workspace-layout.js"),
  withVersion("./js/scout/live/team-management.js"),
  withVersion("./js/scout/live/live-entry.js"),
  withVersion("./js/scout/live/roster-entry.js"),
  withVersion("./js/scout/live/court-rendering.js"),
  withVersion("./js/scout/live/team-rendering.js"),
  withVersion("./js/scout/live/event-recording.js"),
  withVersion("./js/scout/analysis/skill-analysis.js"),
  withVersion("./js/scout/analysis/skill-tables.js"),
  withVersion("./js/scout/analysis/stats-update.js"),
  withVersion("./js/scout/video/video-events.js"),
  withVersion("./js/scout/video/video-sources.js"),
  withVersion("./js/scout/video/event-editor.js"),
  withVersion("./js/scout/video/playback.js"),
  withVersion("./js/scout/live/score-analysis.js"),
  withVersion("./js/scout/live/live-score-and-set.js"),
  withVersion("./js/scout/live/scout-shortcuts.js"),
  withVersion("./js/scout/analysis/analysis-filters.js"),
  withVersion("./js/scout/analysis/trajectory-filters.js"),
  withVersion("./js/scout/analysis/player-trajectories.js"),
  withVersion("./js/scout/analysis/player-second-distribution.js"),
  withVersion("./js/scout/analysis/video-filters.js"),
  withVersion("./js/scout/analysis/trajectory-rendering.js"),
  withVersion("./js/scout/analysis/match-sheet.js"),
  withVersion("./js/scout/analysis/aggregated-table.js"),
  withVersion("./js/scout/analysis/second-distribution.js"),
  withVersion("./js/scout/io/exports.js"),
  withVersion("./js/scout/io/datavolley-export.js"),
  withVersion("./js/scout/io/match-io.js"),
  withVersion("./js/scout/io/datavolley-codec.js"),
  withVersion("./js/scout/io/datavolley-live-entry.js"),
  withVersion("./js/scout/io/datavolley-match-import.js"),
  withVersion("./js/scout/io/file-and-url-import.js"),
  withVersion("./js/scout/analysis/reports.js"),
  withVersion("./js/scout/core/app-lifecycle.js"),
  withVersion("./js/scout/core/bootstrap-state.js"),
  withVersion("./js/scout/core/bindings-roster.js"),
  withVersion("./js/scout/core/bindings-scout-settings.js"),
  withVersion("./js/scout/core/bindings-data.js"),
  withVersion("./js/scout/core/bindings-video.js"),
  withVersion("./js/scout/core/bindings-score.js"),
  withVersion("./js/scout/core/bindings-modals.js"),
  withVersion("./js/scout/core/bootstrap.js"),
  "./images/trajectory/attack_empty_near.png",
  "./images/trajectory/attack_empty_far.png",
  "./images/trajectory/attack_2_near.png",
  "./images/trajectory/attack_3_near.png",
  "./images/trajectory/attack_4_near.png",
  "./images/trajectory/attack_2_far.png",
  "./images/trajectory/attack_3_far.png",
  "./images/trajectory/attack_4_far.png",
  "./images/trajectory/service_start_near.png",
  "./images/trajectory/service_start_far.png",
  "./images/trajectory/service_end_near.png",
  "./images/trajectory/service_end_far.png",
  withVersion("./manifest.json"),
  withVersion("./icons/icon-192.png"),
  withVersion("./icons/icon-512.png"),
  withVersion("./icons/icon-1024.png")
];
const NETWORK_FIRST_PATHS = new Set([
  "/",
  "/index.html",
  "/style.css",
  "/styles/match-and-lineups.css",
  "/styles/analysis-base.css",
  "/styles/metrics-and-tables.css",
  "/styles/video-filters.css",
  "/styles/skill-charts.css",
  "/styles/video.css",
  "/styles/modals-and-trajectories.css",
  "/styles/team-management.css",
  "/styles/responsive.css",
  "/styles/scout-live.css",
  "/styles/light-theme.css",
  "/styles/skill-palette.css",
  "/styles/print.css",
  "/manifest.json",
  "/js/app-version.js",
  "/js/globals.js",
  "/js/shared/namespace.js",
  "/js/shared/state-isolation.js",
  "/js/shared/team-ui.js",
  "/js/shared/lineup-core.js",
  "/js/shared/auto-role.js",
  "/js/shared/roster-manager.js",
  "/js/match-settings.js",
  "/js/opponent-settings.js",
  "/js/roster-lineup.js",
  "/js/roster/core/state-store.js",
  "/js/roster/core/player-model.js",
  "/js/roster/court/court-engine.js",
  "/js/roster/storage/team-repository.js",
  "/js/roster/storage/match-repository.js",
  "/js/roster/storage/archive-actions.js",
  "/js/roster/imports/camp3-import.js",
  "/js/roster/settings/scouting-config.js",
  "/js/roster/editor/team-editor.js",
  "/js/roster/settings/metrics-editor.js",
  "/js/roster/court/court-ui-bootstrap.js",
  "/js/scout-ui.js",
  "/js/scout/live/next-set-lineups.js",
  "/js/scout/live/skill-selection.js",
  "/js/scout/live/lineup-editor.js",
  "/js/scout/live/game-flow.js",
  "/js/scout/live/trajectories.js",
  "/js/scout/live/workspace-layout.js",
  "/js/scout/live/team-management.js",
  "/js/scout/live/live-entry.js",
  "/js/scout/live/roster-entry.js",
  "/js/scout/live/court-rendering.js",
  "/js/scout/live/team-rendering.js",
  "/js/scout/live/event-recording.js",
  "/js/scout/analysis/skill-analysis.js",
  "/js/scout/analysis/skill-tables.js",
  "/js/scout/analysis/stats-update.js",
  "/js/scout/video/video-events.js",
  "/js/scout/video/video-sources.js",
  "/js/scout/video/event-editor.js",
  "/js/scout/video/playback.js",
  "/js/scout/live/score-analysis.js",
  "/js/scout/live/live-score-and-set.js",
  "/js/scout/live/scout-shortcuts.js",
  "/js/scout/analysis/analysis-filters.js",
  "/js/scout/analysis/trajectory-filters.js",
  "/js/scout/analysis/player-trajectories.js",
  "/js/scout/analysis/player-second-distribution.js",
  "/js/scout/analysis/video-filters.js",
  "/js/scout/analysis/trajectory-rendering.js",
  "/js/scout/analysis/match-sheet.js",
  "/js/scout/analysis/aggregated-table.js",
  "/js/scout/analysis/second-distribution.js",
  "/js/scout/io/exports.js",
  "/js/scout/io/datavolley-export.js",
  "/js/scout/io/match-io.js",
  "/js/scout/io/datavolley-codec.js",
  "/js/scout/io/datavolley-live-entry.js",
  "/js/scout/io/datavolley-match-import.js",
  "/js/scout/io/file-and-url-import.js",
  "/js/scout/analysis/reports.js",
  "/js/scout/core/app-lifecycle.js",
  "/js/scout/core/bootstrap-state.js",
  "/js/scout/core/bindings-roster.js",
  "/js/scout/core/bindings-scout-settings.js",
  "/js/scout/core/bindings-data.js",
  "/js/scout/core/bindings-video.js",
  "/js/scout/core/bindings-score.js",
  "/js/scout/core/bindings-modals.js",
  "/js/scout/core/bootstrap.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-1024.png"
]);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  // Per le navigazioni: prova rete prima (per avere l'ultima versione), poi cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(match => {
            if (match) return match;
            return caches.match("./");
          })
        )
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname === "/__local-video__") {
    return;
  }
  if (request.destination === "video" || request.destination === "audio") {
    return;
  }
  if (NETWORK_FIRST_PATHS.has(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Statici: stale-while-revalidate per aggiornarsi senza perdere offline
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "SKIP_WAITING") return;
  self.skipWaiting();
});
