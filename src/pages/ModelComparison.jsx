import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { bestModelByRmse, modelMetrics } from '../utils/modelMetrics';

export default function ModelComparison() {
  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Comparison</p>
          <h1>Forecast model evaluation placeholder</h1>
          <p>
            The comparison table is structured for MAE, RMSE, and MAPE outputs from XGBoost,
            SARIMA, VAR, and Prophet.
          </p>
        </div>
      </div>

      <div className="status-note">
        Metric values are placeholders until final model evaluation results are integrated.
      </div>

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
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>MAPE</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {modelMetrics.map((metric) => (
                  <tr
                    key={metric.model}
                    className={metric.model === bestModelByRmse.model ? 'best-row' : ''}
                  >
                    <td>{metric.model}</td>
                    <td>{metric.mae.toFixed(2)}</td>
                    <td>{metric.rmse.toFixed(2)}</td>
                    <td>{metric.mape.toFixed(1)}%</td>
                    <td>{metric.model === bestModelByRmse.model ? 'Current best model' : '-'}</td>
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
            <BarChart data={modelMetrics} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
              <XAxis dataKey="model" stroke="#5c7080" />
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
