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
  getAvailableTargetOptions,
  getScenarioDefinition,
  getTargetDefinition,
  labelFor,
  modelOptions,
  scenarioOptions,
  unitForTarget,
  univariateTargetsUnderConsideration,
} from '../utils/constants';
import { getModelIntegrationStatuses } from '../utils/modelOutputs';
import { calculateKpis } from '../utils/stats';

const builtInScenarioCards = [
  {
    id: 'vehicle_electricity_to_no2',
    title: 'Vehicle activity + local electricity → NO2',
    status: 'Supported by verified frontend data sync',
    body: 'The built-in Malaysia dataset now includes the canonical car_registration vehicle column plus NO2 and local electricity consumption. Final trained model output is still pending.',
  },
  {
    id: 'ipi_electricity_to_so2',
    title: 'IPI + electricity → SO2',
    status: 'Supported by current Malaysia cleaned dataset',
    body: 'The built-in Malaysia dataset includes SO2, seasonally adjusted IPI, and local electricity consumption. Final trained model output is still pending unless a matching model-output file is connected.',
  },
  {
    id: 'no2_to_pm25',
    title: 'NO2 → PM2.5',
    status: 'Optional extension',
    body: 'The built-in Malaysia dataset includes PM2.5 and NO2, so this optional extension can be reviewed as a prototype fallback scenario.',
  },
];

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

export default function Overview({
  rows,
  selectedCountry,
  setSelectedCountry,
  selectedScenario,
  setSelectedScenario,
  selectedTarget,
  setSelectedTarget,
  selectedModel,
  setSelectedModel,
  modelOutputs,
  uploadedDataset,
}) {
  const activeRows = selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.rows : rows;
  const availableTargets = getAvailableTargetOptions(activeRows);
  const targetDefinition = getTargetDefinition(selectedTarget);
  const kpis = calculateKpis(activeRows, selectedTarget);
  const genericUnit = unitForTarget(selectedTarget);
  const scenario = getScenarioDefinition(selectedScenario);
  const connectedSelectedModelRow = (modelOutputs.forecasts?.[selectedModel]?.rows ?? []).find(
    (row) =>
      row.targetKey === selectedTarget &&
      row.scenarioId === selectedScenario &&
      row.countryKey === selectedCountry,
  );
  const unit = connectedSelectedModelRow?.unit || genericUnit;
  const integrationStatuses = getModelIntegrationStatuses({
    modelOutputs,
    selectedTarget,
    selectedScenario,
    selectedCountry,
  });
  const hasMatchingFinalOutput = integrationStatuses.some((status) => status.connected);
  const verifiedXgboostOutputs = modelOutputs.forecasts?.xgboost?.rows?.length ?? 0;

  const chartRows = activeRows.map((row) => ({
    month: row.month,
    value: row[selectedTarget],
  }));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Regional Time-Series Forecasting Dashboard</h1>
          <p>
            Forecasting environmental and industrial indicators using transport, electricity,
            pollution, and industrial data.
          </p>
        </div>
      </div>

      <div className="description-band">
        <strong>Meeting demo:</strong> forecasting directions are subject to confirmation by the modelling team.
      </div>

      <div className="description-band">
        This prototype is scoped to time-series forecasting. It separates the forecast target, intended
        predictors, scenario, model, horizon, and output source so NO2, SO2, PM2.5, electricity, and
        IPI discussions are not treated as the same target type.
      </div>

      <div className="country-grid scenario-card-grid">
        {builtInScenarioCards.map((card) => (
          <article className={`country-card ${card.id === selectedScenario ? 'active' : ''}`} key={card.id}>
            <span>{card.status}</span>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      <div className="control-grid">
        <Selector
          id="overview-country"
          label="Country"
          value={selectedCountry}
          options={buildCountryOptions(uploadedDataset)}
          onChange={setSelectedCountry}
        />
        <Selector
          id="overview-scenario"
          label="Forecast scenario"
          value={selectedScenario}
          options={scenarioOptions}
          onChange={setSelectedScenario}
        />
        <Selector
          id="overview-target"
          label="Target variable"
          value={selectedTarget}
          options={scenario.id === 'custom' ? availableTargets : [targetDefinition]}
          onChange={setSelectedTarget}
        />
        <Selector
          id="overview-model"
          label="Forecast model"
          value={selectedModel}
          options={modelOptions}
          onChange={setSelectedModel}
        />
      </div>

      <div className="status-note">
        {hasMatchingFinalOutput
          ? 'A matching final model output is connected for the selected target and scenario.'
          : 'Final trained model output is pending for the selected target and scenario. Prototype pages use frontend fallback logic where allowed.'}
        {verifiedXgboostOutputs ? ` Verified connected rows: ${verifiedXgboostOutputs}.` : ''}
      </div>

      <div className="table-panel">
        <div className="panel-heading">
          <h2>Univariate targets under consideration</h2>
          <span>Meeting discussion only; no trained model is implied</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Target</th>
                <th>Column key</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {univariateTargetsUnderConsideration.map((target) => (
                <tr key={target.key}>
                  <td>{target.label}</td>
                  <td>{target.key}</td>
                  <td>{target.availability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label={`Latest ${targetDefinition.shortLabel ?? targetDefinition.label}`} value={kpis.latest} unit={unit} />
        <KpiCard label={`Average ${targetDefinition.shortLabel ?? targetDefinition.label}`} value={kpis.average} unit={unit} />
        <KpiCard label={`Highest ${targetDefinition.shortLabel ?? targetDefinition.label}`} value={kpis.highest} unit={unit} />
        <KpiCard label={`Lowest ${targetDefinition.shortLabel ?? targetDefinition.label}`} value={kpis.lowest} unit={unit} />
      </div>

      <div className="chart-panel">
        <div className="panel-heading">
          <h2>{targetDefinition.label} trend over time</h2>
          <span>
            {labelFor(buildCountryOptions(uploadedDataset), selectedCountry)} monthly dataset, unit: {unit || 'not specified'}
          </span>
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
              name={targetDefinition.label}
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
