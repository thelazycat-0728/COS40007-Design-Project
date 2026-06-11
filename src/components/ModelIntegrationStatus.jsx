import { getModelIntegrationStatuses } from '../utils/modelOutputs';

export default function ModelIntegrationStatus({
  modelOutputs,
  selectedTarget,
  selectedScenario,
  selectedCountry,
}) {
  const statuses = getModelIntegrationStatuses({
    modelOutputs,
    selectedTarget,
    selectedScenario,
    selectedCountry,
  });

  return (
    <div className="integration-status-card">
      <div className="panel-heading">
        <h2>Model Integration Status</h2>
        <span>Matching forecast output files</span>
      </div>
      <div className="integration-status-grid">
        {statuses.map((status) => (
          <article className={status.connected ? 'connected' : 'pending'} key={status.key}>
            <span>{status.label}</span>
            <strong>{status.connected ? 'Final output connected' : 'Pending for selected task'}</strong>
            <small>{status.targetLabel}</small>
            <small>{status.scenarioLabel}</small>
            {status.legacySource ? <small>Legacy pollutant schema</small> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
