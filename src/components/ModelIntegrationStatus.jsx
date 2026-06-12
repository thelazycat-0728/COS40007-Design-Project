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
        {statuses.map((status) => {
          const statusText = status.connected
            ? 'Connected output'
            : status.verificationRequired
              ? 'Integration paused - source verification required'
              : status.metricsOnly
              ? 'Metrics reported by team'
              : status.key === 'xgboost'
                ? 'Pending team export'
                : 'Pending for selected task';
          const className = status.connected
            ? 'connected'
            : status.verificationRequired
              ? 'verification-required'
              : 'pending';

          return (
            <article className={className} key={status.key}>
              <span>{status.label}</span>
              <strong>{statusText}</strong>
              <small>{status.targetLabel}</small>
              <small>{status.scenarioVariantLabel || status.scenarioLabel}</small>
              {status.resultTypeLabel ? <small>{status.resultTypeLabel}</small> : null}
              {status.unit ? <small>Unit: {status.unit}</small> : null}
              {status.evaluationStart && status.evaluationEnd ? (
                <small>
                  Period: {status.evaluationStart} to {status.evaluationEnd}
                </small>
              ) : null}
              {status.sourceNotebook ? <small>Source: {status.sourceNotebook}</small> : null}
              {status.statusMessage ? <small>{status.statusMessage}</small> : null}
              {status.legacySource ? <small>Legacy pollutant schema</small> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
