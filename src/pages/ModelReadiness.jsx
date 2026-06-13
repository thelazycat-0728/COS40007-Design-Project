import { getScenarioDefinition, getTargetDefinition } from '../utils/constants';

const statusLabels = {
  connected_output: 'Connected output',
  official_scale_row_output: 'Chart-ready rows',
  transformed_scale_row_output: 'Transformed rows',
  metrics_and_plot_only: 'Metrics and plots',
  summary_metrics_only: 'Summary metrics',
  artifact_only: 'Artifact only',
  branch_or_pending: 'Pending',
  ready_for_export: 'Ready for export',
  metrics_only: 'Metrics only',
  artifact_found: 'Artifact found',
  notebook_only: 'Notebook only',
  branch_only: 'Branch only',
  stale_or_mismatched: 'Hidden from results',
  missing: 'Missing',
  metrics_pending_verification: 'Metrics pending review',
};

const officialModelGroups = [
  {
    analysisType: 'univariate',
    title: 'Univariate',
    models: ['SARIMA', 'LSTM', 'XGBoost Univariate'],
  },
  {
    analysisType: 'multivariate',
    title: 'Multivariate',
    models: ['XGBoost Multivariate', 'VAR'],
  },
];

const modelNotes = {
  SARIMA: 'SARIMA rows are shown as exported by the notebook. Some R² values are weak.',
  LSTM: 'LSTM notebooks provide metrics and plots, but no dated row export.',
  'XGBoost Univariate': 'XGBoost notebooks provide metrics and plots, but no dated row export.',
  'XGBoost Multivariate': 'XGBoost notebooks provide metrics and plots, but no dated row export.',
  VAR: 'VAR1 and VAR2 are differenced change forecasts; VAR3 is PM2.5 scale.',
};

const sourceLabels = {
  SARIMA: 'SARIMA notebook',
  LSTM: 'LSTM notebook',
  'XGBoost Univariate': 'XGBoost Univariate notebook',
  'XGBoost Multivariate': 'XGBoost Multivariate notebook',
  VAR: 'VAR notebook',
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
    Number.isFinite(metrics.r2) ? `R² ${formatMetric(metrics.r2)}` : '',
  ].filter(Boolean);

  return parts.length ? `${parts.join(' · ')}${metrics.scale ? ` (${metrics.scale})` : ''}` : 'Available';
};

const formatPredictors = (artifact) => {
  const predictors = Array.isArray(artifact.predictors) ? artifact.predictors : [];
  return predictors.length ? predictors.join(', ') : 'None / target history only';
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

const EvidenceRow = ({ artifact }) => {
  const taskLabel = getTaskLabel(artifact);
  const displayDetail =
    artifact.displayLabel && artifact.displayLabel !== taskLabel ? artifact.displayLabel : '';
  const outputLabel =
    artifact.rowLevelOutputAvailable && displayDetail
      ? displayDetail
      : statusLabels[artifact.integrationStatus] || artifact.integrationStatus;

  return (
    <details className="evidence-row">
      <summary>
        <span>{taskLabel}</span>
        <span>{outputLabel}</span>
        <span>{artifact.metricsAvailable ? 'Metrics available' : 'No metrics'}</span>
        <span>{artifact.rowLevelOutputAvailable ? 'Rows available' : 'No dated rows'}</span>
      </summary>
      <div className="evidence-row-body">
        <div className="definition-grid compact-definition-grid">
          <div>
            <span>Output</span>
            <strong><StatusBadge status={artifact.integrationStatus} /></strong>
          </div>
          <div>
            <span>Metrics</span>
            <strong>{formatMetricSummary(artifact.metrics)}</strong>
          </div>
          <div>
            <span>Rows</span>
            <strong>{formatBoolean(artifact.rowLevelOutputAvailable)}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>{sourceLabels[artifact.model] || 'Notebook'}</strong>
          </div>
        </div>
        <dl className="evidence-detail-list">
          <div>
            <dt>Exact source path</dt>
            <dd>{artifact.location}</dd>
          </div>
          <div>
            <dt>Notebook target</dt>
            <dd>{artifact.notebookTarget || artifact.targetKey}</dd>
          </div>
          <div>
            <dt>Official target</dt>
            <dd>{artifact.officialTarget || artifact.targetKey}</dd>
          </div>
          <div>
            <dt>Predictors</dt>
            <dd>{formatPredictors(artifact)}</dd>
          </div>
          <div>
            <dt>Output scale</dt>
            <dd>{artifact.outputScale || 'Notebook-reported scale'}</dd>
          </div>
          <div>
            <dt>Result type</dt>
            <dd>{artifact.resultType || 'Notebook result'}</dd>
          </div>
          {(artifact.caveat || artifact.nextHandoff || artifact.statusMessage) ? (
            <div>
              <dt>Note</dt>
              <dd>{artifact.caveat || artifact.nextHandoff || artifact.statusMessage}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </details>
  );
};

const ModelEvidenceCard = ({ model, rows }) => (
  <article className="model-evidence-card">
    <div className="model-evidence-header">
      <div>
        <h3>{model}</h3>
        <p>{modelNotes[model]}</p>
      </div>
      <span>{rows.length} result{rows.length === 1 ? '' : 's'}</span>
    </div>
    <div className="evidence-column-headings" aria-hidden="true">
      <span>Target</span>
      <span>Output</span>
      <span>Metrics</span>
      <span>Rows</span>
    </div>
    <div className="evidence-row-list">
      {rows.map((artifact) => (
        <EvidenceRow
          artifact={artifact}
          key={`${artifact.modelKey}-${artifact.scenarioId}-${artifact.targetKey}`}
        />
      ))}
    </div>
  </article>
);

const EvidenceSection = ({ group, rows }) => (
  <div className="evidence-section">
    <div className="panel-heading">
      <h2>{group.title}</h2>
      <span>{group.models.join(' · ')}</span>
    </div>
    <div className="evidence-section-grid">
      {group.models.map((model) => (
        <ModelEvidenceCard
          key={model}
          model={model}
          rows={rows.filter((artifact) => artifact.model === model)}
        />
      ))}
    </div>
  </div>
);

export default function ModelReadiness({ modelOutputs }) {
  const rows = modelOutputs.artifacts?.rows ?? [];
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
          <h1>Model Evidence</h1>
          <p>
            This page records the source notebooks and output type for each official model. It is mainly
            for evidence and review.
          </p>
        </div>
      </div>

      <div className="summary-grid compact-summary-grid">
        <article className="summary-card">
          <span>Chart-ready outputs</span>
          <strong>{officialScaleRowCount}</strong>
          <small>Dated rows in the shown target scale.</small>
        </article>
        <article className="summary-card">
          <span>Transformed outputs</span>
          <strong>{transformedRowCount}</strong>
          <small>VAR NO2 and SO2 are change forecasts.</small>
        </article>
        <article className="summary-card">
          <span>Metrics-only results</span>
          <strong>{metricsPlotOnlyCount}</strong>
          <small>LSTM and XGBoost scores without fake rows.</small>
        </article>
      </div>

      {staleXgboostRows.length || staleMetricRows.length ? (
        <details className="audit-note">
          <summary>Audit note</summary>
          <p>
            A stale XGBoost SO2 export is retained for audit only. It is hidden from Forecast Results
            and is not treated as a connected output.
          </p>
        </details>
      ) : null}

      {officialModelGroups.map((group) => (
        <EvidenceSection
          group={group}
          key={group.analysisType}
          rows={rows.filter((artifact) => artifact.analysisType === group.analysisType)}
        />
      ))}
    </section>
  );
}
