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
import SegmentedControl from '../components/SegmentedControl';
import {
  analysisTypeOptions,
  countryOptions,
  formatPredictorList,
  getAvailablePredictorOptions,
  getAvailableTargetOptions,
  getOfficialModelOptions,
  getPredictorDefinition,
  getScenarioDefinition,
  getScenario2PredictorResolution,
  getScenarioPredictorKeys,
  getTargetDefinition,
  getUnivariateTargetOptions,
  hasNumericColumn,
  horizonOptions,
  isScenarioCompatible,
  labelFor,
  scenarioOptions,
  unitForTarget,
  vehiclePredictorKeys,
} from '../utils/constants';
import { compactNumber } from '../utils/data';
import {
  createForecastInterpretation,
  generateModelOutputForecast,
} from '../utils/forecast';
import { getMatchingForecastRows, getMatchingMetricRows } from '../utils/modelOutputs';

const unavailableVehicleMessage =
  'Vehicle-related predictors are not available in the active dataset. Upload a compatible regional dataset containing NO2, local electricity consumption, and at least one supported vehicle or transport indicator.';

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

const formatPeriod = (start, end) => {
  if (!start || !end) {
    return 'Not specified';
  }

  const formatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
  return `${formatter.format(new Date(start))}-${formatter.format(new Date(end))}`;
};

const formatMetric = (value) => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value) < 0.01) {
    return value.toPrecision(4);
  }

  return value.toFixed(3);
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
  selectedAnalysisType,
  setSelectedAnalysisType,
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
  const isUnivariate = selectedAnalysisType === 'univariate';
  const activeContext = getActiveContext({ rows, selectedCountry, uploadedDataset });
  const activeRows = activeContext.rows;
  const scenario = getScenarioDefinition(selectedScenario);
  const targetDefinition = getTargetDefinition(selectedTarget);
  const modelOptionsForAnalysis = getOfficialModelOptions(selectedAnalysisType);
  const modelLabel = labelFor(modelOptionsForAnalysis, selectedModel);
  const horizonLabel = labelFor(horizonOptions, Number(forecastHorizon));
  const unit = unitForTarget(selectedTarget);
  const countrySelectOptions = buildCountryOptions(uploadedDataset);
  const scenario2Resolution = getScenario2PredictorResolution(activeRows);
  const scenario2PredictorKeyString = scenario2Resolution.keys.join('|');
  const univariateTargetOptions = getUnivariateTargetOptions().filter((option) =>
    hasNumericColumn(activeRows, option.key),
  );
  const targetOptions = isUnivariate
    ? univariateTargetOptions
    : scenario.id === 'custom'
      ? getAvailableTargetOptions(activeRows)
      : [getTargetDefinition(scenario.target)];
  const predictorOptions = isUnivariate
    ? []
    : getPredictorOptionsForScenario({
        scenarioId: selectedScenario,
        rows: activeRows,
        selectedTarget,
      });
  const forcedPredictors =
    isUnivariate
      ? []
      : scenario.id === 'ipi_electricity_to_so2'
        ? scenario2Resolution.keys
        : scenario.id === 'no2_to_pm25'
          ? ['air_no2']
          : scenario.id === 'vehicle_electricity_to_no2' && hasNumericColumn(activeRows, 'electricity_local')
            ? ['electricity_local']
            : [];
  const availableScenarioPredictors = isUnivariate ? [] : getScenarioPredictorKeys(selectedScenario, activeRows);
  const selectedAvailablePredictors = selectedPredictors.filter((key) =>
    availableScenarioPredictors.includes(key),
  );
  const effectivePredictors =
    isUnivariate
      ? []
      : scenario.id === 'ipi_electricity_to_so2' || scenario.id === 'no2_to_pm25'
        ? forcedPredictors
        : scenario.id === 'vehicle_electricity_to_no2'
          ? [...forcedPredictors, ...selectedAvailablePredictors.filter((key) => key !== 'electricity_local')]
          : selectedAvailablePredictors;

  useEffect(() => {
    if (!isUnivariate && scenario.id !== 'custom' && selectedTarget !== scenario.target) {
      setSelectedTarget(scenario.target);
    }
  }, [isUnivariate, scenario.id, scenario.target, selectedTarget, setSelectedTarget]);

  useEffect(() => {
    if (isUnivariate) {
      if (selectedPredictors.length) {
        setSelectedPredictors([]);
      }
      return;
    }

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
    isUnivariate,
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
    isUnivariate ||
    scenario.id !== 'vehicle_electricity_to_no2' ||
    effectivePredictors.some((key) => vehiclePredictorKeys.includes(key));
  const isVehicleUnavailableBuiltIn =
    !isUnivariate &&
    scenario.id === 'vehicle_electricity_to_no2' &&
    activeContext.isBuiltIn &&
    !isScenarioCompatible(selectedScenario, activeRows);
  const scenarioReady = isUnivariate
    ? hasTarget
    : !isVehicleUnavailableBuiltIn &&
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
  const isHeldOutTestOutput = modelForecast?.resultType === 'test_prediction';
  const outputUnit = modelForecast?.unit || unit;
  const matchingMetrics = isFinalOutput
    ? getMatchingMetricRows({
        modelOutputs,
        selectedTarget,
        selectedScenario,
        selectedCountry: activeContext.countryForModelOutputs,
      }).filter(
        (metric) =>
          metric.modelKey === selectedModel &&
          metric.integrationStatus !== 'metrics_only' &&
          metric.rowLevelOutputAvailable,
      )
    : [];
  const connectedMetric = matchingMetrics[0];
  const forecast = modelForecast;
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
  const predictorSetLabel = isUnivariate
    ? 'Predictors'
    : scenario.id === 'ipi_electricity_to_so2'
      ? scenario2Resolution.label
      : 'Configured predictors';
  const predictorSummary = isUnivariate
    ? 'None (univariate)'
    : effectivePredictors.length
      ? formatPredictorList(effectivePredictors)
      : 'Not available';
  const datasetReadiness = isVehicleUnavailableBuiltIn
    ? 'Requires uploaded vehicle data'
    : scenarioReady
      ? `Available in ${activeContext.countryLabel} dataset`
      : isUnivariate
        ? 'Missing compatible target column'
        : 'Missing compatible target or predictor columns';
  const outputSource = !scenarioReady
    ? 'Not available'
    : isHeldOutTestOutput
      ? 'Connected XGBoost held-out test predictions'
      : isFinalOutput
        ? 'Final model output'
        : 'Pending verified model export';
  const scenarioLimitation = isVehicleUnavailableBuiltIn
    ? unavailableVehicleMessage
    : scenarioReady && !isFinalOutput
      ? 'No verified official model output is currently connected for this task.'
      : isHeldOutTestOutput
        ? 'Connected held-out test predictions are shown for the fixed evaluation period. They are not a projection beyond that period.'
        : scenarioReady
          ? 'Matching final model output is connected for this selected task.'
          : 'Upload or select a dataset with the required target and predictor columns.';

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Forecast Simulator</p>
          <h1>
            {isFinalOutput
              ? isHeldOutTestOutput
                ? 'Connected model test output'
                : 'Connected model output'
              : 'Prototype forecast · No verified connected output'}
          </h1>
          <p>
            Choose univariate or multivariate first, then select only the matching official model
            family. Connected model files are used only when their metadata matches the selected task.
          </p>
        </div>
      </div>

      <div className="control-grid forecast-control-grid">
        <SegmentedControl
          id="forecast-analysis-type"
          label="Analysis type"
          value={selectedAnalysisType}
          options={analysisTypeOptions}
          onChange={setSelectedAnalysisType}
        />
        <Selector
          id="forecast-country"
          label="Country / dataset source"
          value={selectedCountry}
          options={countrySelectOptions}
          onChange={setSelectedCountry}
        />
        {!isUnivariate ? (
          <Selector
            id="forecast-scenario"
            label="Forecast scenario"
            value={selectedScenario}
            options={scenarioOptions.filter((option) => option.id !== 'custom')}
            onChange={setSelectedScenario}
          />
        ) : null}
        <Selector
          id="forecast-target"
          label="Target variable"
          value={selectedTarget}
          options={targetOptions}
          onChange={setSelectedTarget}
        />
        {isUnivariate ? (
          <div className="selector-field locked-field">
            <label>Predictor variables</label>
            <strong>None - univariate forecasting uses the target history only</strong>
            <small>SARIMA and LSTM only</small>
          </div>
        ) : (
          <CheckboxGroup
            options={predictorOptions}
            selectedKeys={effectivePredictors}
            disabledKeys={forcedPredictors}
            onChange={setSelectedPredictors}
          />
        )}
        <Selector
          id="forecast-model"
          label="Model display option"
          value={selectedModel}
          options={modelOptionsForAnalysis}
          onChange={setSelectedModel}
        />
        {isHeldOutTestOutput ? (
          <div className="selector-field locked-field">
            <label>Forecast horizon</label>
            <strong>Not configurable for held-out test predictions</strong>
            <small>Test period: {formatPeriod(modelForecast.evaluationStart, modelForecast.evaluationEnd)}</small>
          </div>
        ) : (
          <Selector
            id="forecast-horizon"
            label="Forecast horizon"
            value={Number(forecastHorizon)}
            options={horizonOptions}
            onChange={(value) => setForecastHorizon(Number(value))}
          />
        )}
      </div>

      <div className="text-panel scenario-definition-card">
        <h2>{isUnivariate ? 'Univariate task definition' : 'Scenario definition'}</h2>
        <div className="definition-grid">
          <div>
            <span>Target</span>
            <strong>{targetDefinition.label}</strong>
          </div>
          <div>
            <span>{predictorSetLabel}</span>
            <strong>{predictorSummary}</strong>
          </div>
          <div>
            <span>Dataset readiness</span>
            <strong>{datasetReadiness}</strong>
          </div>
          <div>
            <span>Current output source</span>
            <strong>{outputSource}</strong>
          </div>
          {isHeldOutTestOutput ? (
            <>
              <div>
                <span>Result type</span>
                <strong>{modelForecast.resultTypeLabel}</strong>
              </div>
              <div>
                <span>Test period</span>
                <strong>{formatPeriod(modelForecast.evaluationStart, modelForecast.evaluationEnd)}</strong>
              </div>
              <div>
                <span>Unit override</span>
                <strong>{outputUnit}</strong>
              </div>
              <div>
                <span>Scenario variant</span>
                <strong>{modelForecast.scenarioVariantLabel}</strong>
              </div>
            </>
          ) : null}
        </div>
        <p>
          {isUnivariate
            ? `Univariate ${modelLabel} uses the selected target history only.`
            : `${predictorSetLabel}: ${predictorSummary}.`}{' '}
          {scenarioLimitation}
        </p>
        {isHeldOutTestOutput ? (
          <p>
            External predictors: {formatPredictorList(modelForecast.predictors)}. Engineered inputs:{' '}
            {modelForecast.engineeredFeatures.join(', ')}.
          </p>
        ) : null}
      </div>

      {!scenarioReady || isFinalOutput || isVehicleUnavailableBuiltIn ? (
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
            isHeldOutTestOutput ? (
              <strong>Connected output · Held-out test predictions · Test period: January-December 2022</strong>
            ) : (
              `Using verified connected model output for ${targetDefinition.label}.`
            )
          ) : (
            <strong>
              This task needs a numeric {targetDefinition.label} target
              {isUnivariate ? '' : ' and compatible predictor columns'} in the active dataset.
            </strong>
          )}
        </div>
      ) : null}

      {scenarioReady && !isFinalOutput ? (
        <div className="pending-output-panel">
          <span>Integration pending</span>
          <h2>No verified official model output is currently connected for this task.</h2>
          <p>
            Current output source: Pending verified model export. The dashboard is intentionally not
            drawing forecast charts, comparison bars, or rankings from prototype fallback values.
          </p>
          <div className="inline-actions">
            <button
              className="template-button"
              type="button"
              onClick={() => setActiveSection('model-readiness')}
            >
              View Model Readiness
            </button>
          </div>
        </div>
      ) : null}

      {scenarioReady && forecast ? (
        <>
          <div className="text-panel">
            <h2>Selected forecasting task</h2>
            {isHeldOutTestOutput ? (
              <p>
                Connected variant: {modelForecast.scenarioVariantLabel}. Target: {targetDefinition.label}.
                Unit: {outputUnit}. These rows are held-out test predictions for the fixed evaluation period.
              </p>
            ) : (
              <p>
                {scenario.description} Active target: {targetDefinition.label}. Intended predictors:{' '}
                {formatPredictorList(effectivePredictors)}.
              </p>
            )}
          </div>

          <div className="chart-panel">
            <div className="panel-heading">
              <h2>
                {isHeldOutTestOutput
                  ? `Actual vs predicted ${targetDefinition.label}`
                  : `Historical and ${forecastKind} ${targetDefinition.label}`}
              </h2>
              <span>
                {activeContext.countryLabel}, {outputUnit || 'unit not specified'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                <YAxis
                  stroke="#5c7080"
                  label={outputUnit ? { value: outputUnit, angle: -90, position: 'insideLeft' } : undefined}
                />
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
                  name={`${isHeldOutTestOutput ? 'Predicted' : isFinalOutput ? 'Model forecast' : 'Prototype forecast'} ${targetDefinition.label}`}
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
                <h2>{isHeldOutTestOutput ? 'Held-out test prediction table' : 'Forecast table'}</h2>
                <span>
                  {isHeldOutTestOutput
                    ? 'Actual and predicted values by month'
                    : isFinalOutput
                      ? 'Final values by month'
                      : 'Prototype values by month'}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      {isHeldOutTestOutput ? <th>Actual {targetDefinition.label}</th> : null}
                      <th>{isHeldOutTestOutput ? 'Predicted' : 'Forecasted'} {targetDefinition.label}</th>
                      {hasBounds ? <th>Lower bound</th> : null}
                      {hasBounds ? <th>Upper bound</th> : null}
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecastRows.map((row) => (
                      <tr key={row.date}>
                        <td>{row.month}</td>
                        {isHeldOutTestOutput ? <td>{compactNumber(row.actual, outputUnit === 'ppm' ? 6 : 2)}</td> : null}
                        <td>{compactNumber(row.forecast, outputUnit === 'ppm' ? 6 : 2)}</td>
                        {hasBounds ? <td>{compactNumber(row.lowerBound, outputUnit === 'ppm' ? 6 : 2)}</td> : null}
                        {hasBounds ? <td>{compactNumber(row.upperBound, outputUnit === 'ppm' ? 6 : 2)}</td> : null}
                        <td>{row.unit || outputUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <article className="interpretation-panel">
              <span>{isHeldOutTestOutput ? 'Test performance interpretation' : 'Forecast interpretation'}</span>
              <h2>{isHeldOutTestOutput ? 'Held-out evaluation result' : `Trend direction: ${forecast.trendDirection}`}</h2>
              <p>{interpretation}</p>
              {connectedMetric ? (
                <p>
                  MAE: {formatMetric(connectedMetric.mae)} {connectedMetric.unit || outputUnit}; RMSE:{' '}
                  {formatMetric(connectedMetric.rmse)} {connectedMetric.unit || outputUnit}; R²:{' '}
                  {formatMetric(connectedMetric.r2)}.
                </p>
              ) : null}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
