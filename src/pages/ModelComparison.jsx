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
import { getMatchingMetricRows } from '../utils/modelOutputs';

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
  const hasFinalMetrics = metrics.length > 0;
  const bestModelByRmse = getBestModelByRmse(metrics);
  const chartRows = metrics.map((metric) => ({
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
        <div className="split-grid">
          <div className="table-panel">
            <div className="panel-heading">
              <h2>Evaluation metrics</h2>
              <span>Lowest RMSE highlighted within this task only</span>
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
                    <th>MAPE</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr
                      key={`${metric.model}-${metric.country}-${metric.targetKey}-${metric.scenarioId || 'legacy'}`}
                      className={metric === bestModelByRmse ? 'best-row' : ''}
                    >
                      <td>{metric.model}</td>
                      <td>{metric.country}</td>
                      <td>{metric.target}</td>
                      <td>{metric.scenarioLabel || 'Not specified'}</td>
                      <td>{metric.predictorLabels.length ? metric.predictorLabels.join(', ') : 'Not specified'}</td>
                      <td>{metric.mae.toFixed(2)}</td>
                      <td>{metric.rmse.toFixed(2)}</td>
                      <td>{Number.isFinite(metric.mape) ? `${metric.mape.toFixed(1)}%` : '-'}</td>
                      <td>
                        {metric === bestModelByRmse
                          ? 'Lowest connected RMSE'
                          : metric.legacySource
                            ? 'Legacy schema'
                            : 'Connected metric'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-panel compact-chart">
            <div className="panel-heading">
              <h2>RMSE comparison</h2>
              <span>Same target and scenario only</span>
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
        </div>
      )}
    </section>
  );
}
