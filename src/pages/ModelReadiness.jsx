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

const statusLegendItems = [
  {
    status: 'official_scale_row_output',
    body: 'Dated notebook output exists in the official target scale and can be charted/table-rendered.',
  },
  {
    status: 'transformed_scale_row_output',
    body: 'Dated rows exist, but the target is differenced or transformed and must be interpreted in that scale.',
  },
  {
    status: 'metrics_and_plot_only',
    body: 'The notebook reports metrics and plot/artifact evidence, but no dated row export is present.',
  },
  {
    status: 'summary_metrics_only',
    body: 'Metrics exist without row output or a reusable plot.',
  },
  {
    status: 'artifact_only',
    body: 'A native saved model exists, but no result display is available.',
  },
  {
    status: 'stale_or_mismatched',
    body: 'Retained audit data conflicts with source evidence and is hidden from result displays.',
  },
];

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
            <th>Output scale</th>
            <th>Artifact</th>
            <th>Metrics</th>
            <th>Rows</th>
            <th>Plot</th>
            <th>Caveat / handoff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((artifact) => (
            <tr key={`${artifact.modelKey}-${artifact.scenarioId}-${artifact.targetKey}`}>
              <td>{artifact.model}</td>
              <td>
                {getTaskLabel(artifact)}
                {artifact.displayLabel ? <small>{artifact.displayLabel}</small> : null}
              </td>
              <td>
                <StatusBadge status={artifact.integrationStatus} />
              </td>
              <td>{artifact.location}</td>
              <td>{artifact.outputScale || 'Not specified'}</td>
              <td>{formatBoolean(artifact.artifactAvailable)}</td>
              <td>
                {artifact.metricsAvailable ? 'Yes' : 'No'}
                {artifact.metrics ? ` - ${formatMetricSummary(artifact.metrics)}` : ''}
              </td>
              <td>{formatBoolean(artifact.rowLevelOutputAvailable)}</td>
              <td>{formatBoolean(artifact.plotAvailable)}</td>
              <td>{artifact.caveat || artifact.nextHandoff || artifact.statusMessage}</td>
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
  const officialScaleRowCount = rows.filter((artifact) => artifact.integrationStatus === 'official_scale_row_output').length;
  const transformedRowCount = rows.filter((artifact) => artifact.integrationStatus === 'transformed_scale_row_output').length;
  const metricsPlotOnlyCount = rows.filter((artifact) => artifact.integrationStatus === 'metrics_and_plot_only').length;
  const artifactCount = rows.filter((artifact) => artifact.artifactAvailable).length;
  const staleXgboostRows = modelOutputs.forecasts?.xgboost?.auditRows ?? [];
  const staleMetricRows = (modelOutputs.metrics?.rows ?? []).filter(
    (metric) => metric.integrationStatus === 'stale_or_mismatched',
  );

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Evidence</p>
          <h1>Notebook-confirmed model evidence</h1>
          <p>
            Advanced evidence for the official model families. This section keeps notebook sources,
            metrics-only results, transformed targets, artifacts, and caveats available without making the
            normal user flow depend on every model detail.
          </p>
        </div>
      </div>

      <div className="description-band">
        Official scope: SARIMA, LSTM, and XGBoost Univariate for univariate forecasting; XGBoost
        Multivariate and VAR for multivariate forecasting. Prophet, VECM, and baselines remain outside
        the final GUI scope.
      </div>

      <div className="table-panel">
        <div className="panel-heading">
          <h2>Status legend</h2>
          <span>Advanced interpretation guide</span>
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
          <span>Official-scale row outputs</span>
          <strong>{officialScaleRowCount}</strong>
          <small>SARIMA targets and VAR PM2.5 have dated rows in the shown target scale.</small>
        </article>
        <article className="summary-card">
          <span>Transformed row outputs</span>
          <strong>{transformedRowCount}</strong>
          <small>VAR NO2 and SO2 rows are differenced outputs, not official concentrations.</small>
        </article>
        <article className="summary-card">
          <span>Metrics and plot only</span>
          <strong>{metricsPlotOnlyCount}</strong>
          <small>LSTM, XGBoost Univariate, and XGBoost Multivariate notebooks report metrics without exported dated rows.</small>
        </article>
        <article className="summary-card">
          <span>Native artifacts found</span>
          <strong>{artifactCount}</strong>
          <small>LSTM, XGBoost, and VAR include saved model/artifact files.</small>
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
          Normal users should start at Overview, validate or select a dataset, then open Forecast Results.
          Use this evidence section when a presenter or marker needs to verify the source notebook,
          output scale, metrics, or row-output status behind a result.
        </p>
        <p>
          Held-out test predictions compare actual and predicted rows for a fixed evaluation period. Future
          forecasts project beyond history. Transformed-scale outputs are notebook results but are not official
          concentration values. Metrics-only entries show cards and summaries instead of fake forecast lines.
        </p>
        <p>
          Upload datasets only when the required columns are present, and do not treat correlations or
          significance tests as causal proof.
        </p>
      </div>
    </section>
  );
}
