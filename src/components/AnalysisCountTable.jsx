import { COUNT_COLUMNS } from '../domain/analysis-columns.js';
import { HeaderCells } from './ui/HeaderCells.jsx';
import { AnalysisTableBody } from './AnalysisTable.jsx';

export function AnalysisCountTable({ title, skill, bodyId }) {
  return (
    <div className="table-wrapper">
      <table className="agg-table">
        <thead>
          <tr>
            <th>{title}</th>
            <HeaderCells labels={COUNT_COLUMNS}
              className={'skill-col skill-' + skill} />
          </tr>
        </thead>
        <AnalysisTableBody id={bodyId} />
      </table>
    </div>
  );
}
