
import { actions as appActions } from "../../app/actions.mjs";
export function AppFooter() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer-meta">
        <span>
          <strong>{"VolleyEye"}</strong>
        </span>
        <span>
          {"Versione "}
          <span id="app-version-label">
            {typeof window !== "undefined"
              ? window.__APP_VERSION__?.version || "0.1.0"
              : "0.1.0"}
          </span>
        </span>
        <span>{"Autore: Davide Daffonchio"}</span>
        <span>{"Licenza: GPL-3.0"}</span>
      </div>
      <div className="app-footer-links">
        <button
          id="btn-force-refresh-app"
          onClick={() =>
            appActions.forceRefreshAppAssets().catch(console.error)
          }
          className="app-footer-refresh"
          type="button"
          title="Pulisce cache web e ricarica la pagina"
        >
          {"\n        ↻ Forza aggiornamento\n      "}
        </button>
        <a
          className="app-footer-manual"
          href="docs/markdown-viewer.html?doc=manual.md&amp;title=Manuale"
          target="_blank"
          rel="noopener"
          title="Apri il manuale utente"
        >
          {"\n        Manuale\n      "}
        </a>
        <a
          id="btn-report-bug"
          className="app-footer-bug"
          href="https://github.com/davidaffo/VolleyEye/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          title="Apri una segnalazione bug su GitHub"
        >
          <span aria-hidden="true">{"🐞"}</span>
          {"\n        Segnala un bug\n      "}
        </a>
        <a
          className="app-footer-github"
          href="https://github.com/davidaffo/VolleyEye"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apri repository GitHub"
          title="Repository GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61c-.55-1.38-1.33-1.75-1.33-1.75c-1.09-.74.08-.73.08-.73c1.2.08 1.84 1.23 1.84 1.23c1.08 1.84 2.82 1.31 3.51 1c.11-.78.42-1.31.76-1.61c-2.67-.3-5.47-1.34-5.47-5.95c0-1.31.47-2.38 1.23-3.22c-.12-.3-.53-1.52.12-3.16c0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23c.65 1.64.24 2.86.12 3.16c.76.84 1.23 1.91 1.23 3.22c0 4.62-2.8 5.64-5.48 5.94c.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z"
            ></path>
          </svg>
          {"\n        Contribuisci su GitHub\n      "}
        </a>
        <a
          className="app-footer-sponsor"
          href="https://github.com/sponsors/davidaffo"
          target="_blank"
          rel="noopener noreferrer"
        >
          {"\n        ❤ Supportami su GitHub Sponsors\n      "}
        </a>
      </div>
    </footer>
  );
}
