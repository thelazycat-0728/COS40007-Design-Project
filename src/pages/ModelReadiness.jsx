import { getScenarioDefinition, getTargetDefinition } from '../utils/constants';

const statusLabels = {
  connected_output: 'Connected output',
  official_scale_row_output: 'Official-scale rows',
  transformed_scale_row_output: 'Transformed-scale rows',
  metrics_and_plot_only: 'Metrics and plot only',
  summary_metrics_only: 'Summary metrics only',
  artifact_only: 'Artifact only',
  branch_or_pending: 'Branch or pending',
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
  univariate: ['SARIMA', 'LSTM', 'XGBoost Univariate'],
  multivariate: ['XGBoost Multivariate', 'VAR'],
};

const formatBoolean = (value) => (value ? 'Yes' : 'No');

const formatMetric = (value) => {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 100) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  if (Math.abs(value) >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
};

const formatMetricSummary = (metrics) => {
  if (!metrics) return 'Not exported';

  const parts = [
    Number.isFinite(metrics.mse) ? `MSE ${formatMetric(metrics.mse)}` : '',
    Number.isFinite(metrics.mae) ? `MAE ${formatMetric(metrics.mae)}` : '',
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
            <th>Notebook/source</th>
            <th>Metrics</th>
            <th>Rows</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((artifact) => {
            const taskLabel = getTaskLabel(artifact);
            const displayDetail =
              artifact.displayLabel && artifact.displayLabel !== taskLabel ? artifact.displayLabel : '';

            return (
              <tr key={`${artifact.modelKey}-${artifact.scenarioId}-${artifact.targetKey}`}>
                <td>{artifact.model}</td>
                <td>
                  {taskLabel}
                  {displayDetail ? <small>{displayDetail}</small> : null}
                </td>
                <td>
                  <StatusBadge status={artifact.integrationStatus} />
                </td>
                <td>{artifact.location}</td>
                <td>
                  {artifact.metricsAvailable ? 'Yes' : 'No'}
                  {artifact.metrics ? ` - ${formatMetricSummary(artifact.metrics)}` : ''}
                </td>
                <td>{formatBoolean(artifact.rowLevelOutputAvailable)}</td>
                <td>{artifact.caveat || artifact.nextHandoff || artifact.statusMessage}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default function ModelReadiness({ modelOutputs }) {
  const rows = modelOutputs.artifacts?.rows ?? [];
  const univariateRows = rows.filter((artifact) => artifact.analysisType === 'univariate');
  const multivariateRows = rows.filter((artifact) => artifact.analysisType === 'multivariate');
  const officialScaleRowCount = rows.filter((artifact) => artifact.integrationStatus === 'official_scale_row_output').length;
  const transformedRowCount = rows.filter((artifact) => artifact.integrationStatus === 'transformed_scale_row_output').length;
  const metricsPlotOnlyCount = rows.filter((artifact) => artifact.integrationStatus === 'metrics_and_plot_only').length;
  const staleXgboostRows = modelOutputs.forecasts?.xgboost?.auditRows ?? [];
  const staleMetricRows = (modelOutputs.metrics?.rows ?? []).filter(
    (metric) => metric.integrationStatus === 'stale_or_mismatched',
  );

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Evidence</p>
          <h1>Model Evidence</h1>
          <p>
            Source notebooks, result status, and metrics for the official forecasting models.
          </p>
        </div>
      </div>

      <div className="scope-note">
        <strong>Official scope:</strong> Univariate SARIMA, LSTM, and XGBoost; multivariate XGBoost and VAR.
      </div>

      <div className="summary-grid compact-summary-grid">
        <article className="summary-card">
          <span>Official-scale row outputs</span>
          <strong>{officialScaleRowCount}</strong>
          <small>Chartable rows in the shown target scale.</small>
        </article>
        <article className="summary-card">
          <span>Transformed row outputs</span>
          <strong>{transformedRowCount}</strong>
          <small>VAR NO2 and SO2 are change forecasts.</small>
        </article>
        <article className="summary-card">
          <span>Metrics and plot only</span>
          <strong>{metricsPlotOnlyCount}</strong>
          <small>LSTM and XGBoost show scores without fake rows.</small>
        </article>
      </div>

      {staleXgboostRows.length || staleMetricRows.length ? (
        <div className="upload-message error">
          <strong>Integration paused · Source verification required.</strong>
          <p>
            A stale XGBoost SO2 export is kept for audit only and hidden from result charts.
          </p>
        </div>
      ) : null}

      <ReadinessTable title={groupLabels.univariate} rows={univariateRows} />
      <ReadinessTable title={groupLabels.multivariate} rows={multivariateRows} />
    </section>
  );
}
