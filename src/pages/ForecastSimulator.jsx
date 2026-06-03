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
  generateModelOutputForecast,
  generatePrototypeForecast,
} from '../utils/forecast';
import { getMatchingForecastRows } from '../utils/modelOutputs';

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
  modelOutputs,
}) {
  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);
  const modelLabel = labelFor(modelOptions, selectedModel);
  const horizonLabel = labelFor(horizonOptions, Number(selectedHorizon));
  const unit = unitForPollutant(selectedPollutant);
  const matchingModelRows = getMatchingForecastRows({
    modelOutputs,
    selectedModel,
    selectedCountry,
    selectedPollutant,
    horizonMonths: Number(selectedHorizon),
  });
  const modelForecast = generateModelOutputForecast(rows, selectedPollutant, matchingModelRows);
  const isFinalOutput = Boolean(modelForecast);
  const forecast =
    modelForecast ?? generatePrototypeForecast(rows, selectedPollutant, Number(selectedHorizon));
  const hasBounds = forecast.forecastRows.some(
    (row) => Number.isFinite(row.lowerBound) || Number.isFinite(row.upperBound),
  );
  const interpretation = createForecastInterpretation({
    pollutantLabel,
    modelLabel,
    horizonLabel,
    trendDirection: forecast.trendDirection,
    isFinalOutput,
  });
  const forecastKind = isFinalOutput ? 'model forecast' : 'prototype forecast';

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Forecast Simulator</p>
          <h1>{isFinalOutput ? 'Model forecast output' : 'Prototype forecast output'}</h1>
          <p>
            {isFinalOutput
              ? 'Forecast values are loaded from the matching final model output file in public/model_outputs.'
              : 'Forecast values are prototype/demo values generated from recent pollutant trend logic until final trained model outputs are integrated.'}
          </p>
        </div>
      </div>

      <div className="status-note">
        {isFinalOutput ? 'Using final model output' : 'Using prototype forecast fallback'}
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
          <h2>Historical and {forecastKind} {pollutantLabel}</h2>
          <span>{isFinalOutput ? 'Actual values and final model output' : 'Actual values and demo forecast values'}</span>
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
              name={`${isFinalOutput ? 'Model forecast' : 'Prototype forecast'} ${pollutantLabel}`}
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
            <span>{isFinalOutput ? 'Final values by month' : 'Demo values by month'}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Forecasted {pollutantLabel}</th>
                  {hasBounds ? <th>Lower bound</th> : null}
                  {hasBounds ? <th>Upper bound</th> : null}
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {forecast.forecastRows.map((row) => (
                  <tr key={row.date}>
                    <td>{row.month}</td>
                    <td>{compactNumber(row.forecast)}</td>
                    {hasBounds ? <td>{compactNumber(row.lowerBound)}</td> : null}
                    {hasBounds ? <td>{compactNumber(row.upperBound)}</td> : null}
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
