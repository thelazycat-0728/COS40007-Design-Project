import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import KpiCard from '../components/KpiCard';
import Selector from '../components/Selector';
import {
  countryOptions,
  labelFor,
  modelOptions,
  pollutantOptions,
  unitForPollutant,
} from '../utils/constants';
import { calculateKpis } from '../utils/stats';

export default function Overview({
  rows,
  selectedCountry,
  setSelectedCountry,
  selectedPollutant,
  setSelectedPollutant,
  selectedModel,
  setSelectedModel,
}) {
  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);
  const kpis = calculateKpis(rows, selectedPollutant);
  const unit = unitForPollutant(selectedPollutant);

  const chartRows = rows.map((row) => ({
    month: row.month,
    value: row[selectedPollutant],
  }));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Regional Air Pollution Forecasting Dashboard</h1>
          <p>
            Forecasting air pollution trends using electricity consumption and industrial activity
            indicators.
          </p>
        </div>
      </div>

      <div className="description-band">
        This prototype investigates whether electricity consumption and Industrial Production Index
        indicators can help forecast air pollution trends in Malaysia and selected regional
        countries when compatible datasets are added.
      </div>

      <div className="control-grid">
        <Selector
          id="overview-country"
          label="Country"
          value={selectedCountry}
          options={countryOptions}
          onChange={setSelectedCountry}
        />
        <Selector
          id="overview-pollutant"
          label="Pollutant"
          value={selectedPollutant}
          options={pollutantOptions}
          onChange={setSelectedPollutant}
        />
        <Selector
          id="overview-model"
          label="Forecast model"
          value={selectedModel}
          options={modelOptions}
          onChange={setSelectedModel}
        />
      </div>

      <div className="kpi-grid">
        <KpiCard label={`Latest ${pollutantLabel}`} value={kpis.latest} unit={unit} />
        <KpiCard label={`Average ${pollutantLabel}`} value={kpis.average} unit={unit} />
        <KpiCard label={`Highest ${pollutantLabel}`} value={kpis.highest} unit={unit} />
        <KpiCard label={`Lowest ${pollutantLabel}`} value={kpis.lowest} unit={unit} />
      </div>

      <div className="chart-panel">
        <div className="panel-heading">
          <h2>{pollutantLabel} trend over time</h2>
          <span>Malaysia monthly cleaned dataset</span>
        </div>
        <ResponsiveContainer width="100%" height={330}>
          <LineChart data={chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
            <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
            <YAxis stroke="#5c7080" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              name={pollutantLabel}
              stroke="#0891b2"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
