import { FilterVisibility } from "./ui/FilterField.jsx";
import { AnalysisFilterFields } from "./AnalysisFilter.jsx";
import { AppActionButton } from "./AppActions.jsx";

export function AnalysisFilterPanel({ fields, group, prefix, extra, resetId, ...props }) {
  return (
    <div {...props}>
      <AnalysisFilterFields fields={fields} group={group} prefix={prefix} extra={extra} />
      <FilterVisibility filterId={resetId} className="analysis-filter filter-actions">
        <AppActionButton id={resetId} className="secondary small" type="button">
          Reset filtri
        </AppActionButton>
      </FilterVisibility>
    </div>
  );
}
