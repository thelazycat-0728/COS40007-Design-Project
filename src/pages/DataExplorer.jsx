import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Selector from '../components/Selector';
import { compactNumber, tableColumns } from '../utils/data';
import {
  labelFor,
  pollutantOptions,
  predictorOptions,
} from '../utils/constants';
import { calculateCorrelation, describeCorrelation } from '../utils/stats';

export default function DataExplorer({
  rows,
  selectedPollutant,
  setSelectedPollutant,
  selectedPredictor,
  setSelectedPredictor,
}) {
  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);
  const predictorLabel = labelFor(predictorOptions, selectedPredictor);
  const correlation = calculateCorrelation(rows, selectedPollutant, selectedPredictor);
  const chartRows = rows.map((row) => ({
    month: row.month,
    pollutant: row[selectedPollutant],
    predictor: row[selectedPredictor],
  }));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Data Explorer</p>
          <h1>Pollution and predictor relationship</h1>
          <p>
            Electricity and IPI indicators are used as predictors for air pollution forecasting.
          </p>
        </div>
      </div>

      <div className="control-grid two-column">
        <Selector
          id="explorer-pollutant"
          label="Pollutant"
          value={selectedPollutant}
          options={pollutantOptions}
          onChange={setSelectedPollutant}
        />
        <Selector
          id="explorer-predictor"
          label="Predictor"
          value={selectedPredictor}
          options={predictorOptions}
          onChange={setSelectedPredictor}
        />
      </div>

      <div className="insight-row">
        <article className="insight-card">
          <span>Pearson correlation</span>
          <strong>{correlation === null ? 'No data' : correlation.toFixed(3)}</strong>
          <small>{describeCorrelation(correlation)}</small>
        </article>
        <div className="text-panel">
          <h2>Predictor rationale</h2>
          <p>
            The selected predictor is compared against {pollutantLabel} to assess whether energy
            demand or industrial activity may provide useful explanatory signals for forecasting.
          </p>
        </div>
      </div>

      <div className="chart-panel">
        <div className="panel-heading">
          <h2>{pollutantLabel} and {predictorLabel}</h2>
          <span>Dual-axis comparison over time</span>
        </div>
        <ResponsiveContainer width="100%" height={330}>
          <LineChart data={chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
            <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
            <YAxis yAxisId="left" stroke="#0891b2" />
            <YAxis yAxisId="right" orientation="right" stroke="#16a34a" />
            <Tooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pollutant"
              name={pollutantLabel}
              stroke="#0891b2"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="predictor"
              name={predictorLabel}
              stroke="#16a34a"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-panel">
        <div className="panel-heading">
          <h2>Cleaned dataset preview</h2>
          <span>First 10 rows</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row) => (
                <tr key={row.date}>
                  {tableColumns.map((column) => (
                    <td key={column}>{column === 'date' ? row[column] : compactNumber(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
