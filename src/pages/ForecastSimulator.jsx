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
import {
  countryOptions,
  defaultPredictorKeys,
  formatPredictorList,
  getAvailablePredictorOptions,
  getAvailableTargetOptions,
  getPredictorDefinition,
  getScenarioDefinition,
  getScenarioPredictorKeys,
  getTargetDefinition,
  hasNumericColumn,
  horizonOptions,
  labelFor,
  modelOptions,
  scenarioOptions,
  unitForTarget,
  vehiclePredictorKeys,
} from '../utils/constants';
import { compactNumber } from '../utils/data';
import {
  createForecastInterpretation,
  generateModelOutputForecast,
  generatePrototypeForecast,
  prototypeFallbackNotice,
} from '../utils/forecast';
import { getMatchingForecastRows } from '../utils/modelOutputs';

const unavailableVehicleMessage =
  'Vehicle-related predictors are not available in the built-in Malaysia dataset. Upload a compatible regional dataset containing PM2.5 and at least one supported vehicle or transport indicator.';

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

const getActiveContext = ({ rows, selectedCountry, uploadedDataset }) => {
  if (selectedCountry === 'uploaded' && uploadedDataset) {
    return {
      rows: uploadedDataset.rows,
      countryLabel: uploadedDataset.countryName,
      countryForModelOutputs: uploadedDataset.countryName,
      isBuiltIn: false,
    };
  }

  return {
    rows,
    countryLabel: 'Malaysia',
    countryForModelOutputs: 'malaysia',
    isBuiltIn: true,
  };
};

const getPredictorOptionsForScenario = ({ scenarioId, rows, selectedTarget }) => {
  const scenario = getScenarioDefinition(scenarioId);

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

const CheckboxGroup = ({ options, selectedKeys, onChange, disabledKeys = [] }) => (
  <fieldset className="checkbox-field">
    <legend>Predictor variables</legend>
    <div className="checkbox-grid">
      {options.length ? (
        options.map((option) => {
          const isDisabled = disabledKeys.includes(option.key);
          const isChecked = selectedKeys.includes(option.key);

          return (
            <label key={option.key} className={isDisabled ? 'checkbox-option disabled' : 'checkbox-option'}>
              <input
                type="checkbox"
                checked={isChecked}
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
        })
      ) : (
        <p>No compatible predictors detected for this scenario.</p>
      )}
    </div>
  </fieldset>
);

export default function ForecastSimulator({
  rows,
  selectedCountry,
  setSelectedCountry,
  selectedScenario,
  setSelectedScenario,
  selectedTarget,
  setSelectedTarget,
  selectedPredictors,
  setSelectedPredictors,
  selectedModel,
  setSelectedModel,
  forecastHorizon,
  setForecastHorizon,
  modelOutputs,
  uploadedDataset,
  setActiveSection,
}) {
  const activeContext = getActiveContext({ rows, selectedCountry, uploadedDataset });
  const activeRows = activeContext.rows;
  const scenario = getScenarioDefinition(selectedScenario);
  const targetDefinition = getTargetDefinition(selectedTarget);
  const modelLabel = labelFor(modelOptions, selectedModel);
  const horizonLabel = labelFor(horizonOptions, Number(forecastHorizon));
  const unit = unitForTarget(selectedTarget);
  const countrySelectOptions = buildCountryOptions(uploadedDataset);
  const targetOptions =
    scenario.id === 'custom' ? getAvailableTargetOptions(activeRows) : [getTargetDefinition(scenario.target)];
  const predictorOptions = getPredictorOptionsForScenario({
    scenarioId: selectedScenario,
    rows: activeRows,
    selectedTarget,
  });
  const forcedPredictors = scenario.id === 'electricity_so2_to_ipi' ? defaultPredictorKeys : [];
  const availableScenarioPredictors = getScenarioPredictorKeys(selectedScenario, activeRows);
  const effectivePredictors =
    scenario.id === 'electricity_so2_to_ipi'
      ? defaultPredictorKeys
      : selectedPredictors.filter((key) => availableScenarioPredictors.includes(key));

  useEffect(() => {
    if (scenario.id !== 'custom' && selectedTarget !== scenario.target) {
      setSelectedTarget(scenario.target);
    }
  }, [scenario.id, scenario.target, selectedTarget, setSelectedTarget]);

  useEffect(() => {
    if (scenario.id === 'electricity_so2_to_ipi') {
      setSelectedPredictors(defaultPredictorKeys);
      return;
    }

    if (scenario.id === 'vehicle_to_pm25' && selectedCountry === 'uploaded') {
      const availableVehiclePredictors = vehiclePredictorKeys.filter((key) => hasNumericColumn(activeRows, key));
      const selectedAvailable = selectedPredictors.filter((key) => availableVehiclePredictors.includes(key));
      if (!selectedAvailable.length && availableVehiclePredictors.length) {
        setSelectedPredictors([availableVehiclePredictors[0]]);
      }
    }
  }, [activeRows, scenario.id, selectedCountry, selectedPredictors, setSelectedPredictors]);

  const hasTarget = hasNumericColumn(activeRows, selectedTarget);
  const hasRequiredPredictors =
    scenario.id === 'electricity_so2_to_ipi'
      ? defaultPredictorKeys.every((key) => hasNumericColumn(activeRows, key))
      : true;
  const hasSelectedPredictors = effectivePredictors.length > 0;
  const isVehicleUnavailableBuiltIn = scenario.id === 'vehicle_to_pm25' && activeContext.isBuiltIn;
  const scenarioReady =
    !isVehicleUnavailableBuiltIn &&
    hasTarget &&
    hasRequiredPredictors &&
    (scenario.id === 'custom' || scenario.id === 'vehicle_to_pm25' ? hasSelectedPredictors : true);

  const matchingModelRows = scenarioReady
    ? getMatchingForecastRows({
        modelOutputs,
        selectedModel,
        selectedCountry: activeContext.countryForModelOutputs,
        selectedTarget,
        selectedScenario,
        horizonMonths: Number(forecastHorizon),
      })
    : [];
  const modelForecast = scenarioReady
    ? generateModelOutputForecast(activeRows, selectedTarget, matchingModelRows)
    : null;
  const isFinalOutput = Boolean(modelForecast);
  const forecast = scenarioReady
    ? modelForecast ?? generatePrototypeForecast(activeRows, selectedTarget, Number(forecastHorizon))
    : null;
  const hasBounds = forecast?.forecastRows.some(
    (row) => Number.isFinite(row.lowerBound) || Number.isFinite(row.upperBound),
  );
  const interpretation = forecast
    ? createForecastInterpretation({
        targetKey: selectedTarget,
        targetDefinition,
        modelLabel,
        horizonLabel,
        trendDirection: forecast.trendDirection,
        isFinalOutput,
        scenarioId: selectedScenario,
        predictorKeys: effectivePredictors,
      })
    : '';
  const forecastKind = isFinalOutput ? 'model forecast' : 'prototype forecast';

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Forecast Simulator</p>
          <h1>{isFinalOutput ? 'Model forecast output' : 'Scenario forecast prototype'}</h1>
          <p>
            Select a target, predictor set, model, and horizon. Final model files are used only when
            they match the selected country, target, and scenario.
          </p>
        </div>
      </div>

      <div className="control-grid forecast-control-grid">
        <Selector
          id="forecast-country"
          label="Country"
          value={selectedCountry}
          options={countrySelectOptions}
          onChange={setSelectedCountry}
        />
        <Selector
          id="forecast-scenario"
          label="Forecast scenario"
          value={selectedScenario}
          options={scenarioOptions}
          onChange={setSelectedScenario}
        />
        <Selector
          id="forecast-target"
          label="Target variable"
          value={selectedTarget}
          options={targetOptions}
          onChange={setSelectedTarget}
        />
        <CheckboxGroup
          options={predictorOptions}
          selectedKeys={forcedPredictors.length ? forcedPredictors : selectedPredictors}
          disabledKeys={forcedPredictors}
          onChange={setSelectedPredictors}
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
          value={Number(forecastHorizon)}
          options={horizonOptions}
          onChange={(value) => setForecastHorizon(Number(value))}
        />
      </div>

      <div className={scenarioReady ? 'status-note' : 'upload-message error'}>
        {isVehicleUnavailableBuiltIn ? (
          <>
            <strong>{unavailableVehicleMessage}</strong>
            <div className="inline-actions">
              <button
                className="template-button"
                type="button"
                onClick={() => setActiveSection('upload-regional-dataset')}
              >
                Go to Upload Regional Dataset
              </button>
            </div>
          </>
        ) : scenarioReady ? (
          isFinalOutput ? (
            `Using final model output for ${targetDefinition.label}.`
          ) : (
            prototypeFallbackNotice
          )
        ) : (
          <strong>
            This scenario needs a numeric {targetDefinition.label} target and compatible predictor
            columns in the active dataset.
          </strong>
        )}
      </div>

      {scenarioReady && forecast ? (
        <>
          <div className="text-panel">
            <h2>Selected forecasting task</h2>
            <p>
              {scenario.description} Active target: {targetDefinition.label}. Intended predictors:{' '}
              {formatPredictorList(effectivePredictors)}.
            </p>
          </div>

          <div className="chart-panel">
            <div className="panel-heading">
              <h2>Historical and {forecastKind} {targetDefinition.label}</h2>
              <span>
                {activeContext.countryLabel}, {unit || 'unit not specified'}
              </span>
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
                  name={`Actual ${targetDefinition.label}`}
                  stroke="#0891b2"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name={`${isFinalOutput ? 'Model forecast' : 'Prototype forecast'} ${targetDefinition.label}`}
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
                <span>{isFinalOutput ? 'Final values by month' : 'Prototype values by month'}</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Forecasted {targetDefinition.label}</th>
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
                        <td>{row.unit || unit}</td>
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
        </>
      ) : null}
    </section>
  );
}
