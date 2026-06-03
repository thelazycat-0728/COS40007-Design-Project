import { getModelIntegrationStatuses } from '../utils/modelOutputs';

export default function ModelIntegrationStatus({ modelOutputs }) {
  const statuses = getModelIntegrationStatuses(modelOutputs);

  return (
    <div className="integration-status-card">
      <div className="panel-heading">
        <h2>Model Integration Status</h2>
        <span>Forecast output files</span>
      </div>
      <div className="integration-status-grid">
        {statuses.map((status) => (
          <article className={status.connected ? 'connected' : 'pending'} key={status.key}>
            <span>{status.label}</span>
            <strong>{status.connected ? 'Final output connected' : 'Pending'}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
