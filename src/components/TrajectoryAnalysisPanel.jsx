import { AnalysisFilterPanel } from './AnalysisFilterPanel.jsx';
import { TrajectoryGrid, AttackSummary } from './TrajectoryGrid.jsx';

export function TrajectoryAnalysisPanel({ variant = 'attack', individual = false }) {
  const serve = variant === 'serve';
  const prefix = (individual ? 'player-' : '') + (serve ? 'serve-traj' : 'traj');
  const group = individual ? (serve ? 'playerServe' : 'playerAttack') : variant;
  const filter = (
    <AnalysisFilterPanel className="analysis-filters trajectory-filters"
      resetId={prefix + '-filter-reset'} group={group} prefix={prefix + '-filter-'}
      extra={individual ? [] : [[prefix + '-court-side', 'Campo']]} />
  );
  const grid = (
    <TrajectoryGrid id={(individual ? 'player-' : '') + (serve ? 'serve-' : '') + 'trajectory-grid'}
      variant={variant} />
  );
  return (
    <>
      {!serve && <AttackSummary id={(individual ? 'player' : 'trajectory') + '-attack-summary'} />}
      <div className={'trajectory-layout' + (serve ? ' serve-trajectory-layout' : '')}>
        {individual ? <>{grid}{filter}</> : <>{filter}{grid}</>}
      </div>
    </>
  );
}
