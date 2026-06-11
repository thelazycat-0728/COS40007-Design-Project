import { useEffect } from 'react';
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
  countryOptions,
  defaultPredictorKeys,
  getAvailablePredictorOptions,
  getAvailableTargetOptions,
  getPredictorDefinition,
  getScenarioDefinition,
  getTargetDefinition,
  hasNumericColumn,
  scenarioOptions,
  vehiclePredictorKeys,
} from '../utils/constants';
import { calculateCorrelation, describeCorrelation } from '../utils/stats';

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

const getActiveRows = ({ rows, selectedCountry, uploadedDataset }) =>
  selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.rows : rows;

const getTargetOptions = ({ scenario, rows }) =>
  scenario.id === 'custom' ? getAvailableTargetOptions(rows) : [getTargetDefinition(scenario.target)];

const getPredictorOptions = ({ scenario, rows, selectedTarget }) => {
  if (scenario.id === 'vehicle_to_pm25') {
    return vehiclePredictorKeys
      .filter((key) => hasNumericColumn(rows, key))
      .map((key) => getPredictorDefinition(key));
  }

  if (scenario.id === 'electricity_so2_to_ipi') {
    return defaultPredictorKeys.map((key) => getPredictorDefinition(key));
  }

  return getAvailablePredictorOptions(rows).filter((option) => option.key !== selectedTarget);
};

export default function DataExplorer({
  rows,
  selectedCountry,
  setSelectedCountry,
  selectedScenario,
  setSelectedScenario,
  selectedTarget,
  setSelectedTarget,
  selectedPredictors,
  setSelectedPredictors,
  uploadedDataset,
  setActiveSection,
}) {
  const activeRows = getActiveRows({ rows, selectedCountry, uploadedDataset });
  const scenario = getScenarioDefinition(selectedScenario);
  const targetOptions = getTargetOptions({ scenario, rows: activeRows });
  const predictorOptions = getPredictorOptions({ scenario, rows: activeRows, selectedTarget });
  const selectedPredictor =
    selectedPredictors.find((key) => predictorOptions.some((option) => option.key === key)) ??
    predictorOptions[0]?.key ??
    '';
  const targetDefinition = getTargetDefinition(selectedTarget);
  const predictorDefinition = selectedPredictor ? getPredictorDefinition(selectedPredictor) : null;
  const isVehicleUnavailableBuiltIn = scenario.id === 'vehicle_to_pm25' && selectedCountry !== 'uploaded';
  const hasComparison = Boolean(
    !isVehicleUnavailableBuiltIn &&
      hasNumericColumn(activeRows, selectedTarget) &&
      selectedPredictor &&
      hasNumericColumn(activeRows, selectedPredictor),
  );
  const correlation = hasComparison ? calculateCorrelation(activeRows, selectedTarget, selectedPredictor) : null;
  const chartRows = activeRows.map((row) => ({
    month: row.month,
    target: row[selectedTarget],
    predictor: selectedPredictor ? row[selectedPredictor] : null,
  }));
  const previewColumns =
    selectedCountry === 'uploaded' && uploadedDataset ? uploadedDataset.previewColumns : tableColumns;

  useEffect(() => {
    if (scenario.id !== 'custom' && selectedTarget !== scenario.target) {
      setSelectedTarget(scenario.target);
    }
  }, [scenario.id, scenario.target, selectedTarget, setSelectedTarget]);

  useEffect(() => {
    if (selectedPredictor && !selectedPredictors.includes(selectedPredictor)) {
      setSelectedPredictors([selectedPredictor]);
    }
  }, [selectedPredictor, selectedPredictors, setSelectedPredictors]);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Data Explorer</p>
          <h1>Target and predictor relationship</h1>
          <p>
            Compare a forecast target with one predictor at a time. Correlation indicates statistical
            association and does not prove causation.
          </p>
        </div>
      </div>

      <div className="control-grid">
        <Selector
          id="explorer-country"
          label="Country"
          value={selectedCountry}
          options={buildCountryOptions(uploadedDataset)}
          onChange={setSelectedCountry}
        />
        <Selector
          id="explorer-scenario"
          label="Forecast scenario"
          value={selectedScenario}
          options={scenarioOptions}
          onChange={setSelectedScenario}
        />
        <Selector
          id="explorer-target"
          label="Target variable"
          value={selectedTarget}
          options={targetOptions}
          onChange={setSelectedTarget}
        />
        <Selector
          id="explorer-predictor"
          label="Predictor variable"
          value={selectedPredictor}
          options={predictorOptions}
          onChange={(value) => setSelectedPredictors([value])}
        />
      </div>

      {isVehicleUnavailableBuiltIn ? (
        <div className="upload-message error">
          <strong>
            Vehicle-related predictors are not available in the built-in Malaysia dataset. Upload a
            compatible regional dataset containing PM2.5 and at least one supported vehicle or
            transport indicator.
          </strong>
          <div className="inline-actions">
            <button
              className="template-button"
              type="button"
              onClick={() => setActiveSection('upload-regional-dataset')}
            >
              Go to Upload Regional Dataset
            </button>
          </div>
        </div>
      ) : null}

      <div className="insight-row">
        <article className="insight-card">
          <span>Pearson correlation</span>
          <strong>{correlation === null ? 'No data' : correlation.toFixed(3)}</strong>
          <small>
            {describeCorrelation(correlation)}. Correlation indicates statistical association and does
            not prove causation.
          </small>
        </article>
        <div className="text-panel">
          <h2>Exploration scope</h2>
          <p>
            {scenario.description} This chart is exploratory only; it is not a trained forecast and
            does not prove that {predictorDefinition?.label ?? 'the predictor'} causes changes in{' '}
            {targetDefinition.label}.
          </p>
        </div>
      </div>

      {hasComparison ? (
        <div className="chart-panel">
          <div className="panel-heading">
            <h2>{targetDefinition.label} and {predictorDefinition.label}</h2>
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
                dataKey="target"
                name={targetDefinition.label}
                stroke="#0891b2"
                strokeWidth={3}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="predictor"
                name={predictorDefinition.label}
                stroke="#16a34a"
                strokeWidth={3}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="table-panel">
        <div className="panel-heading">
          <h2>Cleaned dataset preview</h2>
          <span>First 10 rows</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {previewColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.slice(0, 10).map((row) => (
                <tr key={`${row.date}-${row.country ?? 'built-in'}`}>
                  {previewColumns.map((column) => (
                    <td key={column}>
                      {column === 'date' || column === 'country' ? row[column] : compactNumber(row[column])}
                    </td>
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
