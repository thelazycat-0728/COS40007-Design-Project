import ModelIntegrationStatus from '../components/ModelIntegrationStatus';
import {
  countryOptions,
  getScenarioDefinition,
  getTargetDefinition,
  labelFor,
} from '../utils/constants';
import {
  getConnectedComparableMetricRows,
  getMatchingMetricRows,
  getMatchingMetricsOnlyRows,
} from '../utils/modelOutputs';
import { formatNumericValue, precisionForValue } from '../utils/data';

const buildCountryOptions = (uploadedDataset) =>
  uploadedDataset
    ? [
        ...countryOptions,
        {
          key: 'uploaded',
          label: uploadedDataset.countryName,
          status: 'Uploaded browser-session dataset',
          disabled: false,
        },
      ]
    : countryOptions;

const formatMetric = (value) => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return formatNumericValue(value, precisionForValue(value));
};

const comparisonGroups = [
  {
    title: 'Univariate comparison',
    models: ['sarima', 'lstm'],
    description:
      'SARIMA and LSTM can only be compared when they share the same target, dataset, test period, frequency, unit, metric definition, and result type.',
  },
  {
    title: 'Multivariate comparison',
    models: ['xgboost', 'var'],
    description:
      'XGBoost and VAR can only be compared when they share the same scenario, target, predictor setup, dataset, test period, frequency, unit, metric definition, and result type.',
  },
];

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
  metrics_pending_verification: 'Metrics pending verification',
  missing: 'Missing',
};

const metricKey = (metric) =>
  [
    metric.countryKey,
    metric.targetKey,
    metric.scenarioId,
    metric.evaluationStart,
    metric.evaluationEnd,
    metric.frequency,
    metric.unit,
    metric.resultType,
  ].join('|');

const getStrictComparableMetrics = (metrics) => {
  const connected = getConnectedComparableMetricRows(metrics);
  const groups = connected.reduce((acc, metric) => {
    const key = metricKey(metric);
    acc.set(key, [...(acc.get(key) ?? []), metric]);
    return acc;
  }, new Map());

  return [...groups.values()].find((group) => group.length >= 2) ?? [];
};

const getArtifactRowsForGroup = (artifacts, group) =>
  artifacts.filter((artifact) => group.models.includes(artifact.modelKey));

const ComparisonReadinessTable = ({ group, artifacts }) => {
  const rows = getArtifactRowsForGroup(artifacts, group);

  return (
    <div className="table-panel">
      <div className="panel-heading">
        <h2>{group.title}</h2>
        <span>{group.description}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Target / scenario</th>
              <th>Status</th>
              <th>Metrics</th>
              <th>Rows</th>
              <th>Output scale</th>
              <th>Caveat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((artifact) => (
              <tr key={`${artifact.modelKey}-${artifact.scenarioId}-${artifact.targetKey}`}>
                <td>{artifact.model}</td>
                <td>
                  {artifact.scenarioId && getScenarioDefinition(artifact.scenarioId)?.id === artifact.scenarioId
                    ? getScenarioDefinition(artifact.scenarioId).label
                    : getTargetDefinition(artifact.targetKey).label}
                </td>
                <td>
                  <span className={`status-badge status-${artifact.integrationStatus}`}>
                    {statusLabels[artifact.integrationStatus] || artifact.integrationStatus}
                  </span>
                </td>
                <td>{artifact.metricsAvailable ? 'Available' : 'Not exported'}</td>
                <td>{artifact.rowLevelOutputAvailable ? 'Available' : 'Not verified on main'}</td>
                <td>{artifact.outputScale || 'Not specified'}</td>
                <td>{artifact.caveat || artifact.nextHandoff || artifact.statusMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ModelComparison({
  modelOutputs,
  selectedTarget,
  selectedScenario,
  selectedCountry,
  uploadedDataset,
}) {
  const targetDefinition = getTargetDefinition(selectedTarget);
  const scenario = getScenarioDefinition(selectedScenario);
  const countryForModelOutputs =
    selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.countryName : selectedCountry;
  const countryLabel = labelFor(buildCountryOptions(uploadedDataset), selectedCountry);
  const metrics = getMatchingMetricRows({
    modelOutputs,
    selectedTarget,
    selectedScenario,
    selectedCountry: countryForModelOutputs,
  });
  const strictComparableMetrics = getStrictComparableMetrics(metrics);
  const nonConnectedMetricRows = getMatchingMetricsOnlyRows({
    modelOutputs,
    selectedCountry: countryForModelOutputs,
  });
  const allNotebookMetrics = (modelOutputs.metrics?.rows ?? []).filter(
    (metric) => metric.countryKey === (countryForModelOutputs || 'malaysia'),
  );
  const artifacts = modelOutputs.artifacts?.rows ?? [];

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Comparison</p>
          <h1>Notebook-reported model results, not forced rankings</h1>
          <p>
            The dashboard shows each official model result as reported by its notebook. Rankings remain
            hidden unless at least two outputs share the same task, period, scale, frequency, unit, metric
            definition, and result type.
          </p>
        </div>
      </div>

      <div className="status-note">
        Selected task: {countryLabel}, {targetDefinition.label}, {scenario.label}.
      </div>

      <div className="description-band">
        Ranking is hidden until two notebook-confirmed outputs share the same target/scenario, period,
        output scale, unit, frequency, metric definition, and result type.
      </div>

      <ModelIntegrationStatus
        modelOutputs={modelOutputs}
        selectedTarget={selectedTarget}
        selectedScenario={selectedScenario}
        selectedCountry={countryForModelOutputs}
      />

      {comparisonGroups.map((group) => (
        <ComparisonReadinessTable key={group.title} group={group} artifacts={artifacts} />
      ))}

      {strictComparableMetrics.length >= 2 ? (
        <div className="table-panel">
          <div className="panel-heading">
            <h2>Comparable row-output metrics</h2>
            <span>Same task metadata confirmed</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Target</th>
                  <th>Scenario</th>
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>R2</th>
                  <th>Period</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {strictComparableMetrics.map((metric) => (
                  <tr key={`${metric.modelKey}-${metric.targetKey}-${metric.scenarioId}`}>
                    <td>{metric.model}</td>
                    <td>{metric.displayLabel || metric.displayTarget || metric.target}</td>
                    <td>{metric.scenarioLabel || 'Not specified'}</td>
                    <td>{formatMetric(metric.mae)}</td>
                    <td>{formatMetric(metric.rmse)}</td>
                    <td>{formatMetric(metric.r2)}</td>
                    <td>{metric.evaluationStart} to {metric.evaluationEnd}</td>
                    <td>{metric.unit || 'Not specified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-panel">
          <h2>No model ranking yet</h2>
          <p>
            Current repository data has mixed scales and export formats. Individual metrics can be reviewed,
            but comparison bars and winner labels are hidden until the strict comparability rule is satisfied.
          </p>
        </div>
      )}

      {allNotebookMetrics.length ? (
        <div className="table-panel">
          <div className="panel-heading">
            <h2>Notebook-reported metric summary</h2>
            <span>Displayed without ranking because outputs are not all directly comparable</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Target</th>
                  <th>Scenario</th>
                  <th>Display mode</th>
                  <th>Scale</th>
                  <th>MSE</th>
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>R2</th>
                  <th>Unit</th>
                  <th>Caveat</th>
                </tr>
              </thead>
              <tbody>
                {allNotebookMetrics.map((metric) => (
                  <tr key={`${metric.modelKey}-${metric.targetKey}-${metric.scenarioId}-${metric.sourceNotebook}`}>
                    <td>{metric.model}</td>
                    <td>{metric.displayLabel || metric.displayTarget || metric.notebookTarget || metric.target}</td>
                    <td>{metric.scenarioLabel || metric.scenarioId || 'Univariate'}</td>
                    <td>{statusLabels[metric.integrationStatus] || metric.integrationStatus}</td>
                    <td>{metric.outputScale || 'Not specified'}</td>
                    <td>{formatMetric(metric.mse)}</td>
                    <td>{formatMetric(metric.mae)}</td>
                    <td>{formatMetric(metric.rmse)}</td>
                    <td>{formatMetric(metric.r2)}</td>
                    <td>{metric.unit || 'Not specified'}</td>
                    <td>{metric.caveat || metric.metricNote || 'No caveat supplied'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {nonConnectedMetricRows.length ? (
        <div className="table-panel">
          <div className="panel-heading">
            <h2>Non-row-output metric entries</h2>
            <span>These entries are not eligible for ranking</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>RMSE</th>
                  <th>R2</th>
                  <th>Source notebook</th>
                  <th>Caveat</th>
                </tr>
              </thead>
              <tbody>
                {nonConnectedMetricRows.map((metric) => (
                  <tr key={`${metric.modelKey}-${metric.targetKey}-${metric.scenarioId}-${metric.sourceNotebook}`}>
                    <td>{metric.model}</td>
                    <td>{metric.displayLabel || metric.displayTarget || metric.target}</td>
                    <td>{statusLabels[metric.integrationStatus] || metric.integrationStatus}</td>
                    <td>{formatMetric(metric.rmse)}</td>
                    <td>{formatMetric(metric.r2)}</td>
                    <td>{metric.sourceNotebook || 'Not specified'}</td>
                    <td>{metric.caveat || metric.metricNote || 'No caveat supplied'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
