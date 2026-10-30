import { SKILL_COLUMNS } from "../domain/analysis-columns.js";
import { HeaderCells } from "./ui/HeaderCells.jsx";
import { AnalysisCountTable } from "./AnalysisCountTable.jsx";
import { Fragment } from "react";
import { TrajectoryGrid, AttackSummary } from "./TrajectoryGrid.jsx";
import { DistributionGrid } from "./AnalysisTable.jsx";
import { SkillChart } from "./SkillChart.jsx";
import { useViewStore } from "../hooks/useViewStore.js";
import { useLayoutEffect } from "react";
import { playerAnalysisStore } from "../state/roster-import-store.mjs";
import { analysisTableStore } from "../state/analysis-table-store.mjs";
import { actions as appActions, events as appEvents } from "../app/actions.mjs";

const sections = [['', 'Punti', ['Fatti', 'Subiti', 'Δ', 'Falli/Errori']],
  ...SKILL_COLUMNS.map(({ id, label, columns }) => [id, label, columns])];
const comparisonClasses = Object.fromEntries(sections.map(([skill, title]) =>
  [title, 'skill-' + (skill || 'points')]));

export function PlayerAnalysisHeader() {
  return (
    <thead>
      <tr>
        <th rowSpan="2">Atleta</th>
        {sections.map(([skill, title, columns]) => (
          <th key={title} colSpan={columns.length} className={skill ? 'skill-col skill-' + skill : undefined}>
            {title}
          </th>
        ))}
      </tr>
      <tr>
        {sections.map(([skill, title, columns]) => (
          <HeaderCells key={title} labels={columns} className={skill ? 'skill-col skill-' + skill : undefined} />
        ))}
      </tr>
    </thead>
  );
}

function useView() {
  return useViewStore(playerAnalysisStore);
}

export function PlayerAnalysisRegion({
  as: Component = "div",
  region = "single",
  preference,
  className = "",
  ...props
}) {
  const view = useView();
  const visible = preference
    ? view.preferences[preference] !== false
    : region === "compareFilter"
      ? !!view.preferences.compareEnabled && view.entries.length >= 2
      : !view.compare;
  return (
    <Component {...props} className={className + (visible ? "" : " hidden")} />
  );
}

const change = (field, value) =>
  appActions.changeReactPlayerAnalysis(field, value).catch(console.error);
export function PlayerAnalysisSelect({ compare = false }) {
  const view = useView(),
    entries = compare ? view.compareEntries : view.entries,
    disabled = compare
      ? !view.preferences.compareEnabled || !entries.length
      : !entries.length;
  return (
    <select
      id={compare ? "player-analysis-compare-select" : "player-analysis-select"}
      disabled={disabled}
      value={disabled ? "" : compare ? view.compareIdx : view.playerIdx}
      onChange={(event) =>
        change(compare ? "comparePlayerIdx" : "playerIdx", event.target.value)
      }
    >
      {disabled ? (
        <option value="">
          {compare
            ? entries.length
              ? "Confronto disattivato"
              : "Nessuna altra giocatrice"
            : "Nessuna giocatrice"}
        </option>
      ) : (
        entries.map((entry) => (
          <option key={entry.idx} value={String(entry.idx)}>
            {entry.label}
          </option>
        ))
      )}
    </select>
  );
}
export function PlayerAnalysisToggle({ id, field }) {
  const view = useView();
  return (
    <input
      type="checkbox"
      id={id}
      checked={!!view.preferences[field]}
      onChange={(event) => change(field, event.target.checked)}
    />
  );
}
function Identity({ snapshot, compact = false, badge }) {
  return (
    <div
      className={"player-analysis-identity" + (compact ? " is-compact" : "")}
    >
      {snapshot.photo && (
        <img
          className="player-analysis-identity__avatar"
          src={snapshot.photo}
          alt={`Foto di ${snapshot.name}`}
        />
      )}
      <div className="player-analysis-identity__text">
        {badge && (
          <div className="player-analysis-hero-card__badge">{badge}</div>
        )}
        <h3 className="player-analysis-hero-card__title">{snapshot.name}</h3>
      </div>
    </div>
  );
}
export function PlayerAnalysisHero() {
  const view = useView();
  return (
    <div
      id="player-analysis-hero"
      className={
        "player-analysis-hero" +
        (!view.primary || view.compare ? " hidden" : "")
      }
    >
      {view.primary && !view.compare && (
        <div
          className={
            "player-analysis-hero-card" +
            (view.primary.photo ? " has-photo" : "")
          }
        >
          <Identity
            snapshot={view.primary}
            badge={
              view.scope === "opponent"
                ? "Squadra avversaria"
                : "La tua squadra"
            }
          />
        </div>
      )}
    </div>
  );
}
export function PlayerAnalysisBody() {
  const view = useView(),
    skills = sections.map(([skill]) => skill);
  return (
    <tbody id="player-analysis-body">
      {view.primary ? (
        [view.primary, ...(view.compare ? [view.compare] : [])].map(
          (snapshot, index) => (
            <tr
              key={snapshot.playerIdx}
              className={
                view.preferences.compareEnabled
                  ? "player-analysis-compare-row " +
                    (index ? "is-compare" : "is-primary")
                  : undefined
              }
            >
              <td>{snapshot.name}</td>
              {snapshot.metrics.flatMap((section, index) =>
                section.entries.map((entry) => (
                  <td
                    key={section.title + entry.label}
                    className={
                      skills[index]
                        ? "skill-col skill-" + skills[index]
                        : undefined
                    }
                  >
                    {entry.text}
                  </td>
                )),
              )}
            </tr>
          ),
        )
      ) : (
        <tr>
          <td colSpan={32}>
            Seleziona una giocatrice per vedere il tabellino.
          </td>
        </tr>
      )}
    </tbody>
  );
}
function CompareCharts({ id }) {
  useViewStore(analysisTableStore);
  const view = analysisTableStore.getView(id);
  return (
    <div
      id={id}
      className="analysis-skill-chart-grid player-analysis-skill-chart-grid"
    >
      {view.charts?.map((chart, index) => (
        <SkillChart key={index} model={chart} />
      ))}
    </div>
  );
}
function CompareCard({ snapshot, other, view, index }) {
  const prefix = `compare-${index}`,
    prefs = view.preferences;
  useLayoutEffect(() => {
    appEvents.refreshReactCompareSections(snapshot.playerIdx, other.playerIdx, {
      attackSummary: prefs.showAttack ? prefix + "-attack-summary" : null,
      attackGrid: prefs.showAttack ? prefix + "-attack-grid" : null,
      serveGrid: prefs.showServe ? prefix + "-serve-grid" : null,
      secondBody: prefs.showSecond ? prefix + "-second-body" : null,
      attackBody: prefs.showSecond ? prefix + "-attack-body" : null,
      distribution: prefs.showSecond ? prefix + "-distribution" : null,
      charts: prefix + "-charts",
    });
  }, [view, snapshot.playerIdx, other.playerIdx, prefix]);
  return (
    <div
      className={
        "player-analysis-compare-card " + (index ? "is-compare" : "is-primary")
      }
    >
      <Identity snapshot={snapshot} compact />
      <table className="player-analysis-compare-table">
        <tbody>
          {snapshot.metrics.map((section, sectionIndex) => (
            <Fragment key={section.title}>
              <tr
                className={
                  "player-analysis-compare-section-row " +
                  (comparisonClasses[section.title] || "")
                }
              >
                <th colSpan={2}>{section.title}</th>
              </tr>
              {section.entries.map((entry, entryIndex) => {
                const otherEntry =
                  other.metrics[sectionIndex]?.entries[entryIndex];
                let tone = "is-neutral";
                if (
                  otherEntry &&
                  entry.better !== "neutral" &&
                  entry.value !== null &&
                  otherEntry.value !== null &&
                  entry.value !== otherEntry.value
                )
                  tone = (
                    entry.better === "lower"
                      ? entry.value < otherEntry.value
                      : entry.value > otherEntry.value
                  )
                    ? "is-better"
                    : "is-worse";
                return (
                  <tr key={entry.label}>
                    <td>{entry.label}</td>
                    <td className={"player-analysis-compare-value " + tone}>
                      {entry.text}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="player-analysis-compare-sections">
        {prefs.showAttack && (
          <section className="player-analysis-compare-subsection">
            <h4>Attacco</h4>
            <AttackSummary id={prefix + "-attack-summary"} />
            <TrajectoryGrid id={prefix + "-attack-grid"} />
          </section>
        )}
        {prefs.showServe && (
          <section className="player-analysis-compare-subsection">
            <h4>Traiettorie battuta</h4>
            <TrajectoryGrid id={prefix + "-serve-grid"} variant="serve" />
          </section>
        )}
        {prefs.showSecond && (
          <section className="player-analysis-compare-subsection">
            <h4>Distribuzione alzate</h4>
            <DistributionGrid id={prefix + "-distribution"} />
            <AnalysisCountTable bodyId={prefix + "-second-body"} title="Alzate" skill="second" />
            <AnalysisCountTable bodyId={prefix + "-attack-body"} title="Attacchi dopo alzata" skill="attack" />
          </section>
        )}
        <section className="player-analysis-compare-subsection">
          <h4>Grafici skill</h4>
          <CompareCharts id={prefix + "-charts"} />
        </section>
      </div>
    </div>
  );
}
export function PlayerComparison() {
  const view = useView();
  return (
    <div
      id="player-analysis-compare-view"
      className={
        "player-analysis-compare-view" + (!view.compare ? " hidden" : "")
      }
    >
      {view.primary && view.compare && (
        <div className="player-analysis-compare-layout">
          <CompareCard
            snapshot={view.primary}
            other={view.compare}
            view={view}
            index={0}
          />
          <CompareCard
            snapshot={view.compare}
            other={view.primary}
            view={view}
            index={1}
          />
        </div>
      )}
    </div>
  );
}
