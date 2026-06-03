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
import {
  countryOptions,
  horizonOptions,
  labelFor,
  modelOptions,
  pollutantOptions,
  unitForPollutant,
} from '../utils/constants';
import { compactNumber } from '../utils/data';
import {
  createForecastInterpretation,
  generatePrototypeForecast,
} from '../utils/forecast';

export default function ForecastSimulator({
  rows,
  selectedCountry,
  setSelectedCountry,
  selectedPollutant,
  setSelectedPollutant,
  selectedModel,
  setSelectedModel,
  selectedHorizon,
  setSelectedHorizon,
}) {
  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);
  const modelLabel = labelFor(modelOptions, selectedModel);
  const horizonLabel = labelFor(horizonOptions, Number(selectedHorizon));
  const unit = unitForPollutant(selectedPollutant);
  const forecast = generatePrototypeForecast(rows, selectedPollutant, Number(selectedHorizon));
  const interpretation = createForecastInterpretation({
    pollutantLabel,
    modelLabel,
    horizonLabel,
    trendDirection: forecast.trendDirection,
  });

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Forecast Simulator</p>
          <h1>Prototype forecast output</h1>
          <p>
            Forecast values are prototype/demo values generated from recent pollutant trend logic
            until final trained model outputs are integrated.
          </p>
        </div>
      </div>

      <div className="control-grid">
        <Selector
          id="forecast-country"
          label="Country"
          value={selectedCountry}
          options={countryOptions}
          onChange={setSelectedCountry}
        />
        <Selector
          id="forecast-pollutant"
          label="Pollutant"
          value={selectedPollutant}
          options={pollutantOptions}
          onChange={setSelectedPollutant}
        />
        <Selector
          id="forecast-model"
          label="Forecast model"
          value={selectedModel}
          options={modelOptions}
          onChange={setSelectedModel}
        />
        <Selector
          id="forecast-horizon"
          label="Forecast horizon"
          value={Number(selectedHorizon)}
          options={horizonOptions}
          onChange={(value) => setSelectedHorizon(Number(value))}
        />
      </div>

      <div className="chart-panel">
        <div className="panel-heading">
          <h2>Historical and prototype forecasted {pollutantLabel}</h2>
          <span>Actual values and demo forecast values</span>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
            <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
            <YAxis stroke="#5c7080" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="actual"
              name={`Actual ${pollutantLabel}`}
              stroke="#0891b2"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name={`Prototype forecast ${pollutantLabel}`}
              stroke="#16a34a"
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="split-grid">
        <div className="table-panel forecast-table">
          <div className="panel-heading">
            <h2>Forecast table</h2>
            <span>Demo values by month</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Forecasted {pollutantLabel}</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {forecast.forecastRows.map((row) => (
                  <tr key={row.date}>
                    <td>{row.month}</td>
                    <td>{compactNumber(row.forecast)}</td>
                    <td>{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <article className="interpretation-panel">
          <span>Forecast interpretation</span>
          <h2>Trend direction: {forecast.trendDirection}</h2>
          <p>{interpretation}</p>
        </article>
      </div>
    </section>
  );
}
