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
  analysisTypeOptions,
  countryOptions,
  getAvailableTargetOptions,
  getOfficialModelOptions,
  getScenarioDefinition,
  getTargetDefinition,
  getUnivariateTargetOptions,
  labelFor,
  scenarioOptions,
  unitForTarget,
  univariateTargetsUnderConsideration,
} from '../utils/constants';
import { getModelIntegrationStatuses } from '../utils/modelOutputs';
import { calculateKpis } from '../utils/stats';
import SegmentedControl from '../components/SegmentedControl';

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
    body: 'The built-in Malaysia dataset includes SO2, seasonally adjusted IPI, and local electricity consumption. XGBoost is metrics-and-plot-only; VAR2 is a differenced SO2 change forecast, not official-scale SO2 concentration.',
  },
  {
    id: 'no2_to_pm25',
    title: 'NO2 → PM2.5',
    status: 'Optional extension',
    body: 'The built-in Malaysia dataset includes PM2.5 and NO2. VAR3 forecasts PM2.5 in official target scale while using differenced NO2 as a transformed predictor.',
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
  selectedAnalysisType,
  setSelectedAnalysisType,
  selectedScenario,
  setSelectedScenario,
  selectedTarget,
  setSelectedTarget,
  selectedModel,
  setSelectedModel,
  modelOutputs,
  uploadedDataset,
}) {
  const isUnivariate = selectedAnalysisType === 'univariate';
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
    allowedModelKeys: getOfficialModelOptions(selectedAnalysisType).map((model) => model.key),
  });
  const hasMatchingRowOutput = integrationStatuses.some((status) => status.connected);
  const artifactRows = modelOutputs.artifacts?.rows ?? [];
  const rowOutputCount = artifactRows.filter((artifact) => artifact.rowLevelOutputAvailable).length;
  const transformedOutputCount = artifactRows.filter(
    (artifact) => artifact.integrationStatus === 'transformed_scale_row_output',
  ).length;
  const metricsOnlyCount = artifactRows.filter(
    (artifact) => artifact.integrationStatus === 'metrics_and_plot_only',
  ).length;
  const staleXgboostAuditRows = modelOutputs.forecasts?.xgboost?.auditRows?.length ?? 0;
  const modelSelectorOptions = getOfficialModelOptions(selectedAnalysisType);
  const targetSelectorOptions = isUnivariate
    ? getUnivariateTargetOptions().filter((option) => activeRows.some((row) => Number.isFinite(row[option.key])))
    : scenario.id === 'custom'
      ? availableTargets
      : [targetDefinition];

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
            Presenting notebook-confirmed results for the official COS40007 forecasting models across
            transport, electricity, pollution, and industrial time-series data.
          </p>
        </div>
      </div>

      <div className="description-band">
        <strong>Model-results dashboard:</strong> results are shown as produced by the team notebooks and
        output folders. Different models use different variables, transformations, metrics, and export formats.
      </div>

      <div className="description-band">
        Some outputs are official-scale predictions, some are transformed-scale outputs, and some are
        metrics-and-plot-only notebook results. Transformed outputs are labelled and should not be read as
        official concentration values.
      </div>

      <div className="description-band">
        Official model scope remains SARIMA and LSTM for univariate forecasting, plus XGBoost and VAR for
        multivariate forecasting. Ranking stays disabled unless target, period, scale, unit, metric
        definition, and result type are directly comparable.
      </div>

      <div className="control-grid">
        <SegmentedControl
          id="overview-analysis-type"
          label="Analysis type"
          value={selectedAnalysisType}
          options={analysisTypeOptions}
          onChange={setSelectedAnalysisType}
        />
        <Selector
          id="overview-country"
          label="Country"
          value={selectedCountry}
          options={buildCountryOptions(uploadedDataset)}
          onChange={setSelectedCountry}
        />
        {!isUnivariate ? (
          <Selector
            id="overview-scenario"
            label="Forecast scenario"
            value={selectedScenario}
            options={scenarioOptions.filter((option) => option.id !== 'custom')}
            onChange={setSelectedScenario}
          />
        ) : null}
        <Selector
          id="overview-target"
          label="Target variable"
          value={selectedTarget}
          options={targetSelectorOptions}
          onChange={setSelectedTarget}
        />
        <Selector
          id="overview-model"
          label="Forecast model"
          value={selectedModel}
          options={modelSelectorOptions}
          onChange={setSelectedModel}
        />
      </div>

      <div className="status-note">
        {hasMatchingRowOutput
          ? 'A notebook-confirmed row output is available for the selected target and scenario.'
          : 'This selected model has no dated row output; check metrics/plot-only status before interpreting it.'}
        {staleXgboostAuditRows ? ' XGBoost SO2 export paused · Source verification required.' : ''}
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>Row-level outputs</span>
          <strong>{rowOutputCount}</strong>
          <small>Notebook-confirmed SARIMA and VAR rows are available for display.</small>
        </article>
        <article className="summary-card">
          <span>Transformed row outputs</span>
          <strong>{transformedOutputCount}</strong>
          <small>VAR NO2/SO2 are differenced-scale outputs, not official concentrations.</small>
        </article>
        <article className="summary-card">
          <span>Metrics/plot-only results</span>
          <strong>{metricsOnlyCount}</strong>
          <small>LSTM and XGBoost show notebook metrics without row-level charts.</small>
        </article>
        <article className="summary-card">
          <span>Model ranking</span>
          <strong>Disabled</strong>
          <small>Enabled only for directly comparable outputs.</small>
        </article>
      </div>

      {!isUnivariate ? (
        <div className="country-grid scenario-card-grid">
          {builtInScenarioCards.map((card) => (
            <article className={`country-card ${card.id === selectedScenario ? 'active' : ''}`} key={card.id}>
              <span>{card.status}</span>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      ) : null}

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
