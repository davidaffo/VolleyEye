import { AppLayout } from "./components/AppLayout.jsx";
import { useEffect } from 'react';
import { applySkillThemeVars } from '../js/globals.js';
import { session as persistentStorageState } from "./features/state/storage-persistent-storage.js";
import { prepareMatchSheetPrint, clearMatchSheetPrint } from './features/io/exports.js';
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { start as startApplication, invoke, getMatchSnapshot } from "./app/application.js";
import { stop as stopApplication } from "./app/dispose.js";
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
window.__APP_ANALYSIS_RUNTIME_URL__ =
  import.meta.env.BASE_URL + "analysis-react.js";
window.__APP_CACHE_VERSION__ = window.__APP_VERSION__.cacheVersion;
window.__APP_ASSET_SUFFIX__ = window.__IS_LOCALHOST_DEV__
  ? ""
  : "?v=" + encodeURIComponent(window.__APP_CACHE_VERSION__);

function Application() {
  useEffect(() => {
    let mounted = true;
    applySkillThemeVars();
    const beforeUnload = event => {
      if (!persistentStorageState.archiveStorage.pending.size && !persistentStorageState.archiveStorage.failed) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('beforeprint', prepareMatchSheetPrint);
    window.addEventListener('afterprint', clearMatchSheetPrint);
    startApplication().then(() => {
      if (!mounted) return;
      window.VolleyEye ||= {};
      window.VolleyEye.app = Object.freeze({ invoke, getSnapshot: runtimeStore.getSnapshot, getMatchSnapshot });
      document.documentElement.dataset.appReady = 'true';
    }).catch(error => {
      if (!mounted) return;
      console.error('Avvio VolleyEye non riuscito', error);
      runtimeStore.publish({ ...runtimeStore.getSnapshot(), startupError: error.message });
    });
    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('beforeprint', prepareMatchSheetPrint);
      window.removeEventListener('afterprint', clearMatchSheetPrint);
      stopApplication();
    };
  }, []);
  return <AppLayout />;
}

const root = createRoot(document.getElementById('root'));
flushSync(() => root.render(<Application />));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
  });
}
