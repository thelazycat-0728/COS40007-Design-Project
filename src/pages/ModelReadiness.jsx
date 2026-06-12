import { getScenarioDefinition, getTargetDefinition } from '../utils/constants';

const statusLabels = {
  connected_output: 'Connected output',
  ready_for_export: 'Ready for export',
  metrics_only: 'Metrics only',
  artifact_found: 'Artifact found',
  notebook_only: 'Notebook only',
  branch_only: 'Branch only',
  stale_or_mismatched: 'Verification required',
  missing: 'Missing',
  metrics_pending_verification: 'Metrics pending verification',
};

const groupLabels = {
  univariate: 'Univariate',
  multivariate: 'Multivariate',
};

const officialModels = {
  univariate: ['SARIMA', 'LSTM'],
  multivariate: ['XGBoost', 'VAR'],
};

const statusLegendItems = [
  {
    status: 'connected_output',
    body: 'Verified row-level output is connected to GUI charts, counts, and comparisons.',
  },
  {
    status: 'ready_for_export',
    body: 'Model and metrics exist; normalized frontend row export is still pending.',
  },
  {
    status: 'branch_only',
    body: 'Implementation exists off main and must be reviewed or merged before GUI use.',
  },
  {
    status: 'notebook_only',
    body: 'Code exists, but model outputs are incomplete or not exported.',
  },
  {
    status: 'metrics_only',
    body: 'Evaluation metrics are verified, but row-level output is not available.',
  },
  {
    status: 'stale_or_mismatched',
    body: 'Hidden from charts and rankings until source, target, and metadata are verified.',
  },
];

const formatBoolean = (value) => (value ? 'Yes' : 'No');

const formatMetric = (value) => {
  if (!Number.isFinite(value)) return '';
  return Math.abs(value) < 0.01 ? value.toPrecision(4) : value.toFixed(3);
};

const formatMetricSummary = (metrics) => {
  if (!metrics) return 'Not exported';

  const parts = [
    Number.isFinite(metrics.rmse) ? `RMSE ${formatMetric(metrics.rmse)}` : '',
    Number.isFinite(metrics.r2) ? `R2 ${formatMetric(metrics.r2)}` : '',
  ].filter(Boolean);

  return parts.length ? `${parts.join(', ')}${metrics.scale ? ` (${metrics.scale})` : ''}` : 'Available';
};

const getTaskLabel = (artifact) => {
  if (artifact.scenarioId && getScenarioDefinition(artifact.scenarioId)?.id === artifact.scenarioId) {
    return getScenarioDefinition(artifact.scenarioId).label;
  }

  return getTargetDefinition(artifact.targetKey).label;
};

const StatusBadge = ({ status }) => (
  <span className={`status-badge status-${status}`}>{statusLabels[status] || status}</span>
);

const ReadinessTable = ({ title, rows }) => (
  <div className="table-panel readiness-table">
    <div className="panel-heading">
      <h2>{title}</h2>
      <span>{officialModels[title.toLowerCase()]?.join(' vs ')}</span>
    </div>
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Target / scenario</th>
            <th>Status</th>
            <th>Location</th>
            <th>Artifact</th>
            <th>Metrics</th>
            <th>Rows</th>
            <th>GUI</th>
            <th>Required next handoff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((artifact) => (
            <tr key={`${artifact.modelKey}-${artifact.scenarioId}-${artifact.targetKey}`}>
              <td>{artifact.model}</td>
              <td>{getTaskLabel(artifact)}</td>
              <td>
                <StatusBadge status={artifact.integrationStatus} />
              </td>
              <td>{artifact.location}</td>
              <td>{formatBoolean(artifact.artifactAvailable)}</td>
              <td>
                {artifact.metricsAvailable ? 'Yes' : 'No'}
                {artifact.metrics ? ` - ${formatMetricSummary(artifact.metrics)}` : ''}
              </td>
              <td>{formatBoolean(artifact.rowLevelOutputAvailable)}</td>
              <td>{artifact.guiConnected ? 'Connected' : 'Not connected'}</td>
              <td>{artifact.nextHandoff || artifact.statusMessage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function ModelReadiness({ modelOutputs }) {
  const rows = modelOutputs.artifacts?.rows ?? [];
  const univariateRows = rows.filter((artifact) => artifact.analysisType === 'univariate');
  const multivariateRows = rows.filter((artifact) => artifact.analysisType === 'multivariate');
  const connectedCount = rows.filter((artifact) => artifact.guiConnected).length;
  const readyForExportCount = rows.filter((artifact) => artifact.integrationStatus === 'ready_for_export').length;
  const branchOnlyCount = rows.filter((artifact) => artifact.integrationStatus === 'branch_only').length;
  const notebookOnlyCount = rows.filter((artifact) => artifact.integrationStatus === 'notebook_only').length;
  const staleXgboostRows = modelOutputs.forecasts?.xgboost?.auditRows ?? [];
  const staleMetricRows = (modelOutputs.metrics?.rows ?? []).filter(
    (metric) => metric.integrationStatus === 'stale_or_mismatched',
  );

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Readiness</p>
          <h1>Official model readiness registry</h1>
          <p>
            This page separates notebooks, native artifacts, metrics, row-level exports, and GUI connection
            state for the four official model families.
          </p>
        </div>
      </div>

      <div className="description-band">
        Official scope: SARIMA and LSTM for univariate forecasting; XGBoost and VAR for multivariate
        forecasting. Prophet, univariate XGBoost, VECM, and baselines remain secondary or experimental.
      </div>

      <div className="table-panel">
        <div className="panel-heading">
          <h2>Status legend</h2>
          <span>Read before interpreting simulator or comparison output</span>
        </div>
        <div className="status-legend-grid">
          {statusLegendItems.map((item) => (
            <article key={item.status}>
              <StatusBadge status={item.status} />
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>GUI connected official outputs</span>
          <strong>{connectedCount}</strong>
          <small>Must be zero until verified exports arrive.</small>
        </article>
        <article className="summary-card">
          <span>Ready for export</span>
          <strong>{readyForExportCount}</strong>
          <small>LSTM and official multivariate XGBoost need normalized row files.</small>
        </article>
        <article className="summary-card">
          <span>Branch only</span>
          <strong>{branchOnlyCount}</strong>
          <small>SARIMA outputs remain on origin/daryl-sarima.</small>
        </article>
        <article className="summary-card">
          <span>Notebook only</span>
          <strong>{notebookOnlyCount}</strong>
          <small>VAR still needs forecast rows and metrics export.</small>
        </article>
      </div>

      {staleXgboostRows.length || staleMetricRows.length ? (
        <div className="upload-message error">
          <strong>Integration paused · Source verification required.</strong>
          <p>
            The exported XGBoost SO2 rows reference a notebook whose current target no longer matches the
            output. The result is hidden from charts, connected counts, and comparisons until the model owner
            provides a verified current export.
          </p>
        </div>
      ) : null}

      <ReadinessTable title={groupLabels.univariate} rows={univariateRows} />
      <ReadinessTable title={groupLabels.multivariate} rows={multivariateRows} />

      <div className="text-panel">
        <h2>How to use the dashboard</h2>
        <p>
          Choose an analysis type, select the target or scenario, then select only an allowed official model:
          SARIMA or LSTM for univariate work, XGBoost or VAR for multivariate work. Read the integration
          status before interpreting any chart.
        </p>
        <p>
          Held-out test predictions compare actual and predicted rows for a fixed evaluation period. Future
          forecasts project beyond history. Prototype fallback values are frontend trend demos only. Metrics-only
          and artifact-only entries are not connected outputs.
        </p>
        <p>
          Upload datasets only when the required columns are present, and do not treat correlations or
          significance tests as causal proof.
        </p>
      </div>
    </section>
  );
}
