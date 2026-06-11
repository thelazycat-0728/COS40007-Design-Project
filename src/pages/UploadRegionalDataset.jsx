import { useEffect, useMemo, useState } from 'react';
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
  defaultPredictorKeys,
  formatPredictorList,
  getPredictorDefinition,
  getScenarioDefinition,
  getTargetDefinition,
  horizonOptions,
  labelFor,
  scenarioOptions,
  unitForTarget,
  vehiclePredictorKeys,
} from '../utils/constants';
import { compactNumber } from '../utils/data';
import { generatePrototypeForecast, prototypeFallbackNotice } from '../utils/forecast';
import { calculateCorrelation, describeCorrelation } from '../utils/stats';
import {
  getUploadedColumnLabel,
  parseUploadedCsvFile,
  uploadedTemplatePath,
  validateAndNormalizeUploadedDataset,
} from '../utils/uploadedDataset';

const forecastDisclaimer =
  'Uploaded dataset forecasts use prototype trend logic only. They are not trained XGBoost, SARIMA, VAR, or Prophet outputs.';

const getInitialScenario = (scenarioCompatibility) => {
  if (scenarioCompatibility?.vehicle_to_pm25) return 'vehicle_to_pm25';
  if (scenarioCompatibility?.electricity_so2_to_ipi) return 'electricity_so2_to_ipi';
  return 'custom';
};

const getScenarioPredictorOptions = (dataset, scenarioId, selectedTarget) => {
  if (!dataset) return [];

  if (scenarioId === 'vehicle_to_pm25') {
    return vehiclePredictorKeys
      .filter((key) => dataset.detectedPredictors.includes(key))
      .map((key) => getPredictorDefinition(key));
  }

  if (scenarioId === 'electricity_so2_to_ipi') {
    return defaultPredictorKeys
      .filter((key) => dataset.detectedPredictors.includes(key))
      .map((key) => getPredictorDefinition(key));
  }

  return dataset.detectedPredictors
    .filter((key) => key !== selectedTarget)
    .map((key) => getPredictorDefinition(key));
};

const CheckboxGroup = ({ options, selectedKeys, onChange, disabledKeys = [] }) => (
  <fieldset className="checkbox-field">
    <legend>Predictor variables</legend>
    <div className="checkbox-grid">
      {options.map((option) => {
        const isDisabled = disabledKeys.includes(option.key);
        return (
          <label key={option.key} className={isDisabled ? 'checkbox-option disabled' : 'checkbox-option'}>
            <input
              type="checkbox"
              checked={selectedKeys.includes(option.key)}
              disabled={isDisabled}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...new Set([...selectedKeys, option.key])]);
                } else {
                  onChange(selectedKeys.filter((key) => key !== option.key));
                }
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);

const ScenarioCompatibilityCard = ({ label, compatible, children }) => (
  <article className={`summary-card ${compatible ? 'compatible' : 'incompatible'}`}>
    <span>{compatible ? 'Compatible' : 'Not compatible'}</span>
    <strong>{label}</strong>
    <small>{children}</small>
  </article>
);

export default function UploadRegionalDataset({ uploadedDataset, setUploadedDataset }) {
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedScenario, setUploadedScenario] = useState('custom');
  const [uploadedTarget, setUploadedTarget] = useState('air_pm_25');
  const [uploadedPredictors, setUploadedPredictors] = useState([]);
  const [uploadedHorizon, setUploadedHorizon] = useState(6);

  useEffect(() => {
    if (!uploadedDataset) return;

    const nextScenario = getInitialScenario(uploadedDataset.scenarioCompatibility);
    setUploadedScenario(nextScenario);
  }, [uploadedDataset]);

  useEffect(() => {
    if (!uploadedDataset) return;

    if (uploadedScenario === 'vehicle_to_pm25') {
      setUploadedTarget('air_pm_25');
      setUploadedPredictors(
        vehiclePredictorKeys.filter((key) => uploadedDataset.detectedPredictors.includes(key)).slice(0, 1),
      );
      return;
    }

    if (uploadedScenario === 'electricity_so2_to_ipi') {
      setUploadedTarget('ipi_abs_index');
      setUploadedPredictors(defaultPredictorKeys);
      return;
    }

    const firstTarget = uploadedDataset.detectedTargets[0] ?? 'air_pm_25';
    const firstPredictor =
      uploadedDataset.detectedPredictors.find((key) => key !== firstTarget) ??
      uploadedDataset.detectedPredictors[0] ??
      '';
    setUploadedTarget(firstTarget);
    setUploadedPredictors(firstPredictor ? [firstPredictor] : []);
  }, [uploadedDataset, uploadedScenario]);

  const targetSelectorOptions = useMemo(
    () =>
      (uploadedDataset?.detectedTargets ?? []).map((key) => ({
        key,
        label: getUploadedColumnLabel(key),
      })),
    [uploadedDataset],
  );

  const scenarioTargetOptions =
    uploadedScenario === 'custom'
      ? targetSelectorOptions
      : [{ key: getScenarioDefinition(uploadedScenario).target, label: getTargetDefinition(getScenarioDefinition(uploadedScenario).target).label }];
  const predictorSelectorOptions = getScenarioPredictorOptions(uploadedDataset, uploadedScenario, uploadedTarget);
  const forcedPredictors = uploadedScenario === 'electricity_so2_to_ipi' ? defaultPredictorKeys : [];
  const effectivePredictors = forcedPredictors.length ? forcedPredictors : uploadedPredictors;
  const targetDefinition = getTargetDefinition(uploadedTarget);
  const horizonLabel = labelFor(horizonOptions, Number(uploadedHorizon));
  const unit = unitForTarget(uploadedTarget);
  const rows = uploadedDataset?.rows ?? [];
  const scenario = getScenarioDefinition(uploadedScenario);
  const scenarioCompatible =
    uploadedScenario === 'custom'
      ? Boolean(uploadedTarget && effectivePredictors.length)
      : Boolean(uploadedDataset?.scenarioCompatibility?.[uploadedScenario]);
  const forecast = scenarioCompatible
    ? generatePrototypeForecast(rows, uploadedTarget, Number(uploadedHorizon))
    : null;
  const selectedCorrelationKey = effectivePredictors[0];
  const correlation =
    scenarioCompatible && selectedCorrelationKey
      ? calculateCorrelation(rows, uploadedTarget, selectedCorrelationKey)
      : null;
  const trendRows = rows.map((row) => ({
    month: row.month,
    target: row[uploadedTarget],
    predictor: selectedCorrelationKey ? row[selectedCorrelationKey] : null,
  }));

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setValidationMessage('');
    setValidationErrors([]);

    try {
      const result = await parseUploadedCsvFile(file);
      const validation = validateAndNormalizeUploadedDataset(result);

      if (!validation.ok) {
        setUploadedDataset(null);
        setValidationErrors(validation.errors);
        setValidationMessage('Upload validation failed.');
        return;
      }

      setUploadedDataset(validation.dataset);
      setValidationMessage('Upload validation passed. Dataset is available for this browser session.');
      setValidationErrors([]);
    } catch (error) {
      setUploadedDataset(null);
      setValidationMessage('Upload parsing failed.');
      setValidationErrors([error.message || 'Unable to parse uploaded CSV.']);
    } finally {
      setIsParsing(false);
      event.target.value = '';
    }
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Upload Regional Dataset</p>
          <h1>Browser-only scenario dataset testing</h1>
          <p>
            Upload a compatible cleaned CSV to validate target and predictor columns, check scenario
            compatibility, and generate a prototype target-trend forecast for the current browser
            session.
          </p>
        </div>
      </div>

      <div className="upload-panel">
        <div>
          <h2>Upload instructions</h2>
          <p>
            CSV must include date and country, at least one supported forecast target, and at least
            one supported predictor. The template contains demo values only and should be replaced
            with real regional observations for project analysis.
          </p>
        </div>
        <div className="upload-actions">
          <a className="template-button" href={uploadedTemplatePath} download>
            Download CSV Template
          </a>
          <label className="file-upload">
            <span>{isParsing ? 'Validating CSV...' : 'Choose CSV file'}</span>
            <input accept=".csv,text/csv" type="file" onChange={handleUpload} disabled={isParsing} />
          </label>
        </div>
      </div>

      {validationMessage ? (
        <div className={`upload-message ${validationErrors.length ? 'error' : 'success'}`}>
          <strong>{validationMessage}</strong>
          {validationErrors.length ? (
            <ul>
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!uploadedDataset ? (
        <div className="text-panel">
          <h2>No uploaded dataset loaded</h2>
          <p>
            Upload a cleaned regional CSV to view validation results, scenario compatibility, target
            and predictor summaries, correlation, and prototype forecast output. The file is not saved
            permanently.
          </p>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Detected country</span>
              <strong>{uploadedDataset.countryName}</strong>
            </article>
            <article className="summary-card">
              <span>Rows</span>
              <strong>{uploadedDataset.rowCount}</strong>
            </article>
            <article className="summary-card">
              <span>Date range</span>
              <strong>{uploadedDataset.dateRange}</strong>
            </article>
            <article className="summary-card">
              <span>Forecast source</span>
              <strong>Prototype target trend</strong>
            </article>
          </div>

          <div className="summary-grid">
            <ScenarioCompatibilityCard
              label="Vehicle activity → PM2.5"
              compatible={uploadedDataset.scenarioCompatibility.vehicle_to_pm25}
            >
              Requires `air_pm_25` and at least one vehicle or transport predictor.
            </ScenarioCompatibilityCard>
            <ScenarioCompatibilityCard
              label="Electricity + SO2 → IPI"
              compatible={uploadedDataset.scenarioCompatibility.electricity_so2_to_ipi}
            >
              Requires `ipi_abs_index`, `electricity_total`, and `air_so2`.
            </ScenarioCompatibilityCard>
            <ScenarioCompatibilityCard label="Custom scenario" compatible={uploadedDataset.scenarioCompatibility.custom}>
              Requires at least one supported target and one supported predictor.
            </ScenarioCompatibilityCard>
          </div>

          <div className="split-grid">
            <div className="text-panel">
              <h2>Detected targets</h2>
              <p>{uploadedDataset.detectedTargets.map((key) => getUploadedColumnLabel(key)).join(', ')}</p>
            </div>
            <div className="text-panel">
              <h2>Detected predictors</h2>
              <p>{uploadedDataset.detectedPredictors.map((key) => getUploadedColumnLabel(key)).join(', ')}</p>
            </div>
          </div>

          <div className="control-grid forecast-control-grid">
            <Selector
              id="upload-scenario"
              label="Forecast scenario"
              value={uploadedScenario}
              options={scenarioOptions}
              onChange={setUploadedScenario}
            />
            <Selector
              id="upload-target"
              label="Target variable"
              value={uploadedTarget}
              options={scenarioTargetOptions}
              onChange={setUploadedTarget}
            />
            <CheckboxGroup
              options={predictorSelectorOptions}
              selectedKeys={effectivePredictors}
              disabledKeys={forcedPredictors}
              onChange={setUploadedPredictors}
            />
            <Selector
              id="upload-horizon"
              label="Forecast horizon"
              value={Number(uploadedHorizon)}
              options={horizonOptions}
              onChange={(value) => setUploadedHorizon(Number(value))}
            />
          </div>

          <div className={scenarioCompatible ? 'status-note' : 'upload-message error'}>
            {scenarioCompatible ? (
              `${scenario.label} is compatible with the uploaded dataset. ${prototypeFallbackNotice}`
            ) : (
              <strong>The selected scenario is not compatible with the detected uploaded columns.</strong>
            )}
          </div>

          <div className="insight-row">
            <article className="insight-card">
              <span>Correlation</span>
              <strong>{correlation === null ? 'No data' : correlation.toFixed(3)}</strong>
              <small>{describeCorrelation(correlation)}. This may indicate association, not causation.</small>
            </article>
            <div className="text-panel">
              <h2>Relationship note</h2>
              <p>
                {selectedCorrelationKey
                  ? `${getPredictorDefinition(selectedCorrelationKey).label} is compared with ${targetDefinition.label}.`
                  : 'Select at least one predictor to calculate an exploratory correlation.'}{' '}
                This correlation does not prove causation and is not itself a forecast.
              </p>
            </div>
          </div>

          {scenarioCompatible && forecast ? (
            <>
              <div className="split-grid">
                <div className="chart-panel">
                  <div className="panel-heading">
                    <h2>{targetDefinition.label} trend</h2>
                    <span>Uploaded dataset</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                      <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                      <YAxis stroke="#5c7080" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name={targetDefinition.label}
                        stroke="#0891b2"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-panel">
                  <div className="panel-heading">
                    <h2>{selectedCorrelationKey ? getPredictorDefinition(selectedCorrelationKey).label : 'Predictor'} trend</h2>
                    <span>First selected predictor</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                      <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                      <YAxis stroke="#5c7080" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="predictor"
                        name={selectedCorrelationKey ? getPredictorDefinition(selectedCorrelationKey).label : 'Predictor'}
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-panel">
                <div className="panel-heading">
                  <h2>Actual and prototype forecasted {targetDefinition.label}</h2>
                  <span>Uploaded dataset prototype forecast</span>
                </div>
                <ResponsiveContainer width="100%" height={330}>
                  <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                    <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                    <YAxis stroke="#5c7080" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name={`Actual ${targetDefinition.label}`}
                      stroke="#0891b2"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name={`Prototype forecast ${targetDefinition.label}`}
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
                    <span>Prototype values by month</span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Forecasted value</th>
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
                  <span>Uploaded forecast interpretation</span>
                  <h2>Trend direction: {forecast.trendDirection}</h2>
                  <p>
                    The uploaded dataset prototype suggests a {forecast.trendDirection} {targetDefinition.label}
                    trend over the next {horizonLabel}. {forecastDisclaimer} Intended predictors:{' '}
                    {formatPredictorList(effectivePredictors)}.
                  </p>
                </article>
              </div>
            </>
          ) : null}

          <div className="table-panel">
            <div className="panel-heading">
              <h2>Missing values summary</h2>
              <span>Detected fields</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Missing values</th>
                    <th>Total rows</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedDataset.missingSummary.map((item) => (
                    <tr key={item.column}>
                      <td>{item.label}</td>
                      <td>{item.missing}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-panel">
            <div className="panel-heading">
              <h2>Uploaded dataset preview</h2>
              <span>First 10 rows</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {uploadedDataset.previewColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row) => (
                    <tr key={`${row.date}-${row.country}`}>
                      {uploadedDataset.previewColumns.map((column) => (
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
        </>
      )}
    </section>
  );
}
