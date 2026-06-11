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
  formatPredictorList,
  getAvailablePredictorOptions,
  getAvailableTargetOptions,
  getPredictorDefinition,
  getScenarioDefinition,
  getScenario2PredictorResolution,
  getScenarioPredictorKeys,
  getTargetDefinition,
  hasNumericColumn,
  horizonOptions,
  isScenarioCompatible,
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
  'Vehicle-related predictors are not available in the built-in Malaysia dataset. Upload a compatible regional dataset containing NO2, local electricity consumption, and at least one supported vehicle or transport indicator.';

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

  if (scenario.id === 'vehicle_electricity_to_no2') {
    const electricityOption = hasNumericColumn(rows, 'electricity_local')
      ? [getPredictorDefinition('electricity_local')]
      : [];
    const vehicleOptions = vehiclePredictorKeys
      .filter((key) => hasNumericColumn(rows, key))
      .map((key) => getPredictorDefinition(key));
    return [...electricityOption, ...vehicleOptions];
  }

  if (scenario.id === 'ipi_electricity_to_so2') {
    return getScenario2PredictorResolution(rows).keys.map((key) => getPredictorDefinition(key));
  }

  if (scenario.id === 'no2_to_pm25') {
    return scenario.acceptedPredictors
      .filter((key) => hasNumericColumn(rows, key))
      .map((key) => getPredictorDefinition(key));
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
  const scenario2Resolution = getScenario2PredictorResolution(activeRows);
  const scenario2PredictorKeyString = scenario2Resolution.keys.join('|');
  const targetOptions =
    scenario.id === 'custom' ? getAvailableTargetOptions(activeRows) : [getTargetDefinition(scenario.target)];
  const predictorOptions = getPredictorOptionsForScenario({
    scenarioId: selectedScenario,
    rows: activeRows,
    selectedTarget,
  });
  const forcedPredictors =
    scenario.id === 'ipi_electricity_to_so2'
      ? scenario2Resolution.keys
      : scenario.id === 'no2_to_pm25'
        ? ['air_no2']
        : scenario.id === 'vehicle_electricity_to_no2' && hasNumericColumn(activeRows, 'electricity_local')
          ? ['electricity_local']
          : [];
  const availableScenarioPredictors = getScenarioPredictorKeys(selectedScenario, activeRows);
  const selectedAvailablePredictors = selectedPredictors.filter((key) =>
    availableScenarioPredictors.includes(key),
  );
  const effectivePredictors =
    scenario.id === 'ipi_electricity_to_so2' || scenario.id === 'no2_to_pm25'
      ? forcedPredictors
      : scenario.id === 'vehicle_electricity_to_no2'
        ? [...forcedPredictors, ...selectedAvailablePredictors.filter((key) => key !== 'electricity_local')]
        : selectedAvailablePredictors;

  useEffect(() => {
    if (scenario.id !== 'custom' && selectedTarget !== scenario.target) {
      setSelectedTarget(scenario.target);
    }
  }, [scenario.id, scenario.target, selectedTarget, setSelectedTarget]);

  useEffect(() => {
    if (scenario.id === 'ipi_electricity_to_so2') {
      if (selectedPredictors.join('|') !== scenario2PredictorKeyString) {
        setSelectedPredictors(scenario2Resolution.keys);
      }
      return;
    }

    if (scenario.id === 'no2_to_pm25') {
      if (selectedPredictors.join('|') !== 'air_no2') {
        setSelectedPredictors(['air_no2']);
      }
      return;
    }

    if (scenario.id === 'vehicle_electricity_to_no2' && selectedCountry === 'uploaded') {
      const availableVehiclePredictors = vehiclePredictorKeys.filter((key) => hasNumericColumn(activeRows, key));
      const selectedAvailable = selectedPredictors.filter((key) => availableVehiclePredictors.includes(key));
      if (!selectedAvailable.length && availableVehiclePredictors.length) {
        setSelectedPredictors([availableVehiclePredictors[0]]);
      }
    }
  }, [
    activeRows,
    scenario.id,
    scenario2PredictorKeyString,
    scenario2Resolution.keys,
    selectedCountry,
    selectedPredictors,
    setSelectedPredictors,
  ]);

  const hasTarget = hasNumericColumn(activeRows, selectedTarget);
  const hasSelectedPredictors = effectivePredictors.length > 0;
  const hasSelectedVehiclePredictor =
    scenario.id !== 'vehicle_electricity_to_no2' ||
    effectivePredictors.some((key) => vehiclePredictorKeys.includes(key));
  const isVehicleUnavailableBuiltIn = scenario.id === 'vehicle_electricity_to_no2' && activeContext.isBuiltIn;
  const scenarioReady =
    !isVehicleUnavailableBuiltIn &&
    hasTarget &&
    isScenarioCompatible(selectedScenario, activeRows) &&
    hasSelectedVehiclePredictor &&
    (scenario.id === 'custom' ? hasSelectedPredictors : true);

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
  const forecastKind = isFinalOutput ? 'final model output' : 'prototype forecast';
  const predictorSetLabel =
    scenario.id === 'ipi_electricity_to_so2' ? scenario2Resolution.label : 'Configured predictors';
  const datasetReadiness = isVehicleUnavailableBuiltIn
    ? 'Requires uploaded vehicle data'
    : scenarioReady
      ? `Available in ${activeContext.countryLabel} dataset`
      : 'Missing compatible target or predictor columns';
  const outputSource = !scenarioReady ? 'Not available' : isFinalOutput ? 'Final model output' : 'Prototype fallback';
  const scenarioLimitation = isVehicleUnavailableBuiltIn
    ? unavailableVehicleMessage
    : scenarioReady && !isFinalOutput
      ? prototypeFallbackNotice
      : scenarioReady
        ? 'Matching final model output is connected for this selected task.'
        : 'Upload or select a dataset with the required target and predictor columns.';

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
          label="Country / dataset source"
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
          selectedKeys={effectivePredictors}
          disabledKeys={forcedPredictors}
          onChange={setSelectedPredictors}
        />
        <Selector
          id="forecast-model"
          label="Model display option"
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

      <div className="text-panel scenario-definition-card">
        <h2>Scenario definition</h2>
        <div className="definition-grid">
          <div>
            <span>Target</span>
            <strong>{targetDefinition.label}</strong>
          </div>
          <div>
            <span>{predictorSetLabel}</span>
            <strong>{effectivePredictors.length ? formatPredictorList(effectivePredictors) : 'Not available'}</strong>
          </div>
          <div>
            <span>Dataset readiness</span>
            <strong>{datasetReadiness}</strong>
          </div>
          <div>
            <span>Current output source</span>
            <strong>{outputSource}</strong>
          </div>
        </div>
        <p>
          {predictorSetLabel}: {effectivePredictors.length ? formatPredictorList(effectivePredictors) : 'Not available'}.{' '}
          {scenarioLimitation}
        </p>
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
