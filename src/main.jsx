import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { startRuntime } from "./compat/runtime.js";
import "../js/app-version.js";
import "./analytics.js";
import { runtimeStore } from "./state/runtime-store.mjs";
import "../style.css";
import "../styles/match-and-lineups.css";
import "../styles/analysis-base.css";
import "../styles/metrics-and-tables.css";
import "../styles/video-filters.css";
import "../styles/skill-charts.css";
import "../styles/video.css";
import "../styles/modals-and-trajectories.css";
import "../styles/team-management.css";
import "../styles/responsive.css";
import "../styles/scout-live.css";
import "../styles/light-theme.css";
import "../styles/skill-palette.css";
import "../styles/print.css";
import "./root.css";

window.__IS_LOCALHOST_DEV__ = import.meta.env.DEV;
window.__APP_PRODUCTION__ = import.meta.env.PROD;
window.__APP_ANALYSIS_RUNTIME_URL__ = import.meta.env.BASE_URL + "analysis-runtime.js";
window.__APP_CACHE_VERSION__ = window.__APP_VERSION__.cacheVersion;
window.__APP_ASSET_SUFFIX__ = window.__IS_LOCALHOST_DEV__
  ? ""
  : "?v=" + encodeURIComponent(window.__APP_CACHE_VERSION__);

const root = createRoot(document.getElementById("root"));
flushSync(() => root.render(<AppLayout />));
startRuntime()
  .then((runtime) => {
    window.VolleyEye.app = Object.freeze({
      invoke: runtime.invoke,
      getSnapshot: runtimeStore.getSnapshot,
      getMatchSnapshot: runtime.getMatchSnapshot,
    });
    document.documentElement.dataset.appReady = "true";
  })
  .catch((error) => {
    console.error("Avvio VolleyEye non riuscito", error);
    const message = document.createElement("div");
    message.setAttribute("role", "alert");
    message.className = "startup-error";
    message.textContent = "Impossibile aprire l’archivio. " + error.message;
    document.body.appendChild(message);
  });
