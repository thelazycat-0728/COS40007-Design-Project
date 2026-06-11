import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ModelIntegrationStatus from '../components/ModelIntegrationStatus';
import {
  countryOptions,
  getScenarioDefinition,
  getTargetDefinition,
  labelFor,
  modelOptions,
  scenarioOptions,
} from '../utils/constants';
import { getBestModelByRmse } from '../utils/modelMetrics';
import {
  getConnectedComparableMetricRows,
  getMatchingMetricRows,
  getMatchingMetricsOnlyRows,
} from '../utils/modelOutputs';

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

  if (Math.abs(value) < 0.01) {
    return value.toPrecision(4);
  }

  return value.toFixed(3);
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
  const countryLabel = labelFor(buildCountryOptions(uploadedDataset), selectedCountry);
  const metrics = getMatchingMetricRows({
    modelOutputs,
    selectedTarget,
    selectedScenario,
    selectedCountry: selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.countryName : selectedCountry,
  });
  const connectedMetrics = getConnectedComparableMetricRows(metrics);
  const metricsOnlyRows = getMatchingMetricsOnlyRows({
    modelOutputs,
    selectedCountry: selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.countryName : selectedCountry,
  });
  const hasFinalMetrics = connectedMetrics.length > 0;
  const canRankModels = connectedMetrics.length >= 2;
  const bestModelByRmse = canRankModels ? getBestModelByRmse(connectedMetrics) : null;
  const chartRows = connectedMetrics.map((metric) => ({
    ...metric,
    chartLabel: metric.scenarioLabel ? `${metric.model} ${metric.scenarioLabel}` : metric.model,
  }));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Comparison</p>
          <h1>{hasFinalMetrics ? 'Forecast model evaluation results' : 'Pending team results'}</h1>
          <p>
            Metrics are filtered by country, target, and scenario so different forecasting tasks are
            not compared as though they share the same target.
          </p>
        </div>
      </div>

      <div className="status-note">
        Selected task: {countryLabel}, {targetDefinition.label}, {scenario.label}.
      </div>

      <ModelIntegrationStatus
        modelOutputs={modelOutputs}
        selectedTarget={selectedTarget}
        selectedScenario={selectedScenario}
        selectedCountry={selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.countryName : selectedCountry}
      />

      {!hasFinalMetrics ? (
        <>
          <div className="text-panel">
            <h2>Pending team results</h2>
            <p>
              No real `model_metrics.json` entries match the selected target and scenario. Metric
              bars and ranking are hidden until teammates provide trained results and evaluation
              metrics.
            </p>
            <p>
              The final model set and ranking will be confirmed after all team members provide trained
              results and evaluation metrics.
            </p>
          </div>
          <div className="table-panel">
            <div className="panel-heading">
              <h2>Model result status</h2>
              <span>No placeholder comparison values are shown</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modelOptions.map((model) => (
                    <tr key={model.key}>
                      <td>{model.label}</td>
                      <td>Pending team results</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="table-panel">
            <div className="panel-heading">
              <h2>Evaluation metrics</h2>
              <span>
                {canRankModels
                  ? 'Lowest RMSE highlighted within this task only'
                  : 'Ranking hidden until at least two comparable models are connected'}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Country</th>
                    <th>Target</th>
                    <th>Scenario</th>
                    <th>Predictors</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                    <th>R²</th>
                    <th>MAPE</th>
                    <th>Period</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedMetrics.map((metric) => (
                    <tr
                      key={`${metric.model}-${metric.country}-${metric.targetKey}-${metric.scenarioId || 'legacy'}`}
                      className={metric === bestModelByRmse ? 'best-row' : ''}
                    >
                      <td>{metric.model}</td>
                      <td>{metric.country}</td>
                      <td>{metric.target}</td>
                      <td>{metric.scenarioVariantLabel || metric.scenarioLabel || 'Not specified'}</td>
                      <td>{metric.predictorLabels.length ? metric.predictorLabels.join(', ') : 'Not specified'}</td>
                      <td>{formatMetric(metric.mae)}</td>
                      <td>{formatMetric(metric.rmse)}</td>
                      <td>{formatMetric(metric.r2)}</td>
                      <td>{Number.isFinite(metric.mape) ? `${metric.mape.toFixed(1)}%` : '-'}</td>
                      <td>
                        {metric.evaluationStart && metric.evaluationEnd
                          ? `${metric.evaluationStart} to ${metric.evaluationEnd}`
                          : 'Not specified'}
                      </td>
                      <td>{metric.unit || 'Not specified'}</td>
                      <td>
                        {bestModelByRmse && metric === bestModelByRmse
                          ? 'Lowest connected RMSE'
                          : metric.legacySource
                            ? 'Legacy schema'
                            : metric.resultTypeLabel || 'Connected metric'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canRankModels ? (
            <div className="chart-panel compact-chart">
              <div className="panel-heading">
                <h2>RMSE comparison</h2>
                <span>Same target, scenario, period, frequency, unit, and result type only</span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                  <XAxis dataKey="chartLabel" stroke="#5c7080" />
                  <YAxis stroke="#5c7080" />
                  <Tooltip />
                  <Bar dataKey="rmse" name="RMSE" fill="#0891b2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-panel">
              <h2>No model ranking yet</h2>
              <p>
                One connected metric is available for this selected task. Ranking and RMSE bars remain hidden
                until at least two comparable model results use the same target, scenario, period, frequency,
                unit, and result type.
              </p>
            </div>
          )}
        </>
      )}

      {metricsOnlyRows.length ? (
        <div className="table-panel">
          <div className="panel-heading">
            <h2>Metrics reported by team</h2>
            <span>Metrics-only entries do not count as connected forecast outputs</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Target</th>
                  <th>RMSE</th>
                  <th>R²</th>
                  <th>Source notebook</th>
                  <th>Caveat</th>
                </tr>
              </thead>
              <tbody>
                {metricsOnlyRows.map((metric) => (
                  <tr key={`${metric.modelKey}-${metric.targetKey}-${metric.sourceNotebook}`}>
                    <td>{metric.model}</td>
                    <td>{metric.target}</td>
                    <td>{formatMetric(metric.rmse)}</td>
                    <td>{formatMetric(metric.r2)}</td>
                    <td>{metric.sourceNotebook}</td>
                    <td>{metric.caveat || 'No row-level output available.'}</td>
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
