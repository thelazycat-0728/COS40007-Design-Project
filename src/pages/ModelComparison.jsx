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
import { getBestModelByRmse, placeholderModelMetrics } from '../utils/modelMetrics';

export default function ModelComparison({ modelOutputs }) {
  const hasFinalMetrics = Boolean(modelOutputs?.metrics?.connected);
  const metrics = hasFinalMetrics ? modelOutputs.metrics.rows : placeholderModelMetrics;
  const bestModelByRmse = getBestModelByRmse(metrics);
  const chartRows = metrics.map((metric) => ({
    ...metric,
    chartLabel: metric.pollutant ? `${metric.model} ${metric.pollutant}` : metric.model,
  }));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Comparison</p>
          <h1>{hasFinalMetrics ? 'Forecast model evaluation results' : 'Forecast model evaluation placeholder'}</h1>
          <p>
            The comparison table is structured for MAE, RMSE, and MAPE outputs from XGBoost,
            SARIMA, VAR, and Prophet.
          </p>
        </div>
      </div>

      <div className="status-note">
        {hasFinalMetrics
          ? 'Using final model evaluation results'
          : 'Using placeholder evaluation metrics'}
      </div>

      <ModelIntegrationStatus modelOutputs={modelOutputs} />

      <div className="split-grid">
        <div className="table-panel">
          <div className="panel-heading">
            <h2>Evaluation metrics</h2>
            <span>Lowest RMSE highlighted</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  {hasFinalMetrics ? <th>Pollutant</th> : null}
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>MAPE</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr
                    key={`${metric.model}-${metric.pollutant ?? 'placeholder'}`}
                    className={metric === bestModelByRmse ? 'best-row' : ''}
                  >
                    <td>{metric.model}</td>
                    {hasFinalMetrics ? <td>{metric.pollutant}</td> : null}
                    <td>{metric.mae.toFixed(2)}</td>
                    <td>{metric.rmse.toFixed(2)}</td>
                    <td>{Number.isFinite(metric.mape) ? `${metric.mape.toFixed(1)}%` : '-'}</td>
                    <td>{metric === bestModelByRmse ? 'Current best model' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-panel compact-chart">
          <div className="panel-heading">
            <h2>RMSE comparison</h2>
            <span>Lower values indicate lower forecast error</span>
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
    </section>
  );
}
