import { useEffect } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
import { compactNumber, formatNumericValue, precisionForValue } from '../utils/data';
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

  return formatNumericValue(value, precisionForValue(value));
};

const tooltipFormatter = (value, name, item) => [
  formatNumericValue(value, precisionForValue(value)),
  `${name} (${item?.payload?.phase || 'value'})`,
];

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

    if (scenario.id === 'vehicle_electricity_to_no2') {
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
        selectedAnalysisType,
        horizonMonths: Number(forecastHorizon),
      })
    : [];
  const modelForecast = scenarioReady
    ? generateModelOutputForecast(activeRows, selectedTarget, matchingModelRows)
    : null;
  const isFinalOutput = Boolean(modelForecast);
  const isHeldOutTestOutput = modelForecast?.resultType === 'test_prediction';
  const isTransformedOutput = modelForecast?.outputScale?.includes('transformed');
  const displayTargetLabel = modelForecast?.displayTarget || targetDefinition.label;
  const forecastValueLabel = modelForecast?.displayLabel || `Forecasted ${displayTargetLabel}`;
  const outputUnit = modelForecast?.unit || unit;
  const matchingMetrics = scenarioReady
    ? getMatchingMetricRows({
        modelOutputs,
        selectedTarget,
        selectedScenario,
        selectedCountry: activeContext.countryForModelOutputs,
        selectedAnalysisType,
      }).filter(
        (metric) => metric.modelKey === selectedModel,
      )
    : [];
  const selectedMetric = matchingMetrics[0];
  const connectedMetric = matchingMetrics.find((metric) => metric.rowLevelOutputAvailable) ?? selectedMetric;
  const forecast = modelForecast;
  const hasBounds = forecast?.forecastRows.some(
    (row) => Number.isFinite(row.lowerBound) || Number.isFinite(row.upperBound),
  );
  const interpretation = !forecast
    ? ''
    : isTransformedOutput
      ? `This is a change forecast from the ${modelLabel} notebook, not official-scale concentration.`
      : isHeldOutTestOutput
        ? `The ${modelLabel} notebook compares actual and predicted ${displayTargetLabel} values for a fixed test period.`
        : createForecastInterpretation({
            targetKey: selectedTarget,
            targetDefinition,
            modelLabel,
            horizonLabel,
            trendDirection: forecast.trendDirection,
            isFinalOutput,
            scenarioId: selectedScenario,
            predictorKeys: effectivePredictors,
          });
  const forecastKind = isFinalOutput ? 'final model output' : 'notebook output';
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
    : isFinalOutput
      ? `${modelLabel} notebook row output`
      : selectedMetric
        ? `${modelLabel} notebook metrics and plot only`
        : 'Pending notebook result export';
  const scenarioLimitation = isVehicleUnavailableBuiltIn
    ? unavailableVehicleMessage
    : scenarioReady && !isFinalOutput && selectedMetric
      ? 'This model has notebook metrics but no dated row export. No forecast line is drawn.'
      : scenarioReady && !isFinalOutput
        ? 'No saved row output or metric result is available for this selection.'
        : isTransformedOutput
          ? modelForecast.caveat
        : isHeldOutTestOutput
            ? 'Held-out test predictions are shown for the fixed evaluation period.'
            : scenarioReady
              ? 'Saved notebook output is shown for this selection.'
              : 'Upload or select a dataset with the required columns.';
  const outputHeading = isFinalOutput
    ? isTransformedOutput
      ? `Transformed row output · ${displayTargetLabel}`
      : isHeldOutTestOutput
        ? 'Test prediction rows'
        : 'Forecast rows'
    : selectedMetric
      ? 'Metrics and plot only'
      : 'Result pending';
  const firstForecastMonth = forecast?.forecastRows[0]?.month;
  const boundaryNote = firstForecastMonth
    ? isHeldOutTestOutput
      ? `Test prediction starts: ${firstForecastMonth}`
      : `Forecast starts: ${firstForecastMonth}`
    : '';

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Forecast Results</p>
          <h1>Forecast Results</h1>
          <p>
            Choose a model result. Charts appear only when the team exported dated rows; otherwise
            this page shows the notebook metrics.
          </p>
        </div>
      </div>

      <div className="status-note">Showing: {outputHeading}</div>

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
            <small>SARIMA, LSTM, and XGBoost Univariate</small>
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
        <h2>Result setup</h2>
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
            <span>Source</span>
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
          {isFinalOutput && !isHeldOutTestOutput ? (
            <>
              <div>
                <span>Result type</span>
                <strong>{modelForecast.resultTypeLabel || 'Future forecast'}</strong>
              </div>
              <div>
                <span>Output scale</span>
                <strong>{isTransformedOutput ? 'Transformed / differenced' : 'Official target scale'}</strong>
              </div>
              <div>
                <span>Display label</span>
                <strong>{forecastValueLabel}</strong>
              </div>
              <div>
                <span>Notebook target</span>
                <strong>{modelForecast.notebookTarget || displayTargetLabel}</strong>
              </div>
              <div>
                <span>Unit</span>
                <strong>{outputUnit}</strong>
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
              <strong>Notebook row output · Held-out test predictions · Test period: January-December 2022</strong>
            ) : isTransformedOutput ? (
              <strong>{modelForecast.caveat}</strong>
            ) : (
              `Using notebook-confirmed row output for ${displayTargetLabel}.`
            )
          ) : (
            <strong>
              This task needs a numeric {targetDefinition.label} target
              {isUnivariate ? '' : ' and compatible predictor columns'} in the active dataset.
            </strong>
          )}
        </div>
      ) : null}

      {scenarioReady && !isFinalOutput && !selectedMetric ? (
        <div className="pending-output-panel">
          <span>Result pending</span>
          <h2>No notebook-confirmed row or metric result is available for this task.</h2>
          <p>
            No chart is drawn until the team provides a saved result for this selection.
          </p>
          <div className="inline-actions">
            <button
              className="template-button"
              type="button"
              onClick={() => setActiveSection('model-readiness')}
            >
              View Model Evidence
            </button>
          </div>
        </div>
      ) : null}

      {scenarioReady && !isFinalOutput && selectedMetric ? (
        <div className="pending-output-panel metrics-only-panel">
          <span>Metrics and plot only</span>
          <h2>{modelLabel} has notebook-reported metrics, but no row-level export.</h2>
          <p>
            Source: {selectedMetric.sourceNotebook}. This page shows metrics only and does not
            synthesize a forecast chart.
          </p>
          <div className="metric-chip-grid">
            {Number.isFinite(selectedMetric.mse) ? (
              <article><span>MSE</span><strong>{formatMetric(selectedMetric.mse)}</strong></article>
            ) : null}
            {Number.isFinite(selectedMetric.mae) ? (
              <article><span>MAE</span><strong>{formatMetric(selectedMetric.mae)}</strong></article>
            ) : null}
            {Number.isFinite(selectedMetric.rmse) ? (
              <article><span>RMSE</span><strong>{formatMetric(selectedMetric.rmse)}</strong></article>
            ) : null}
            {Number.isFinite(selectedMetric.r2) ? (
              <article><span>R2</span><strong>{formatMetric(selectedMetric.r2)}</strong></article>
            ) : null}
          </div>
          <p>{selectedMetric.caveat || selectedMetric.metricNote}</p>
        </div>
      ) : null}

      {scenarioReady && forecast ? (
        <>
          <div className="text-panel">
            <h2>Result note</h2>
            {isHeldOutTestOutput ? (
              <p>
                Held-out test prediction rows from {modelForecast.scenarioVariantLabel}. Unit: {outputUnit}.
              </p>
            ) : isTransformedOutput ? (
              <p>
                This transformed-scale chart is not official-scale concentration. {modelForecast.caveat}
              </p>
            ) : (
              <p>
                Saved notebook rows for {displayTargetLabel}. Intended predictors:{' '}
                {formatPredictorList(effectivePredictors)}.
              </p>
            )}
          </div>

          <div className="chart-panel">
            <div className="panel-heading">
              <h2>
                {isHeldOutTestOutput
                  ? `Actual vs predicted ${displayTargetLabel}`
                  : isTransformedOutput
                    ? forecastValueLabel
                    : `Historical and ${forecastKind} ${displayTargetLabel}`}
              </h2>
              <span>
                {activeContext.countryLabel}, {outputUnit || 'unit not specified'}
                {isTransformedOutput ? ' · transformed-scale output' : ''}
              </span>
            </div>
            {boundaryNote ? <p className="chart-boundary-note">{boundaryNote}</p> : null}
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                <YAxis
                  stroke="#5c7080"
                  label={outputUnit ? { value: outputUnit, angle: -90, position: 'insideLeft' } : undefined}
                  tickFormatter={(value) => formatNumericValue(value, precisionForValue(value))}
                />
                <Tooltip formatter={tooltipFormatter} />
                <Legend verticalAlign="top" height={32} />
                {forecast.forecastRows[0]?.month ? (
                  <ReferenceLine
                    x={forecast.forecastRows[0].month}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    label={{
                      value: isHeldOutTestOutput ? 'Test start' : 'Forecast start',
                      position: 'top',
                      fill: '#9a3412',
                      fontSize: 12,
                    }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Historical / Actual"
                  stroke="#0891b2"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Predicted / Forecast"
                  stroke={isTransformedOutput ? '#dc2626' : '#16a34a'}
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
                      : 'Notebook values by month'}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      {isHeldOutTestOutput ? <th>Actual {displayTargetLabel}</th> : null}
                      <th>{isHeldOutTestOutput ? `Predicted ${displayTargetLabel}` : forecastValueLabel}</th>
                      {hasBounds ? <th>Lower bound</th> : null}
                      {hasBounds ? <th>Upper bound</th> : null}
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecastRows.map((row) => (
                      <tr key={row.date}>
                        <td>{row.month}</td>
                        {isHeldOutTestOutput ? <td>{compactNumber(row.actual)}</td> : null}
                        <td>{compactNumber(row.forecast)}</td>
                        {hasBounds ? <td>{compactNumber(row.lowerBound)}</td> : null}
                        {hasBounds ? <td>{compactNumber(row.upperBound)}</td> : null}
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
              {isTransformedOutput ? <p>{modelForecast.caveat}</p> : null}
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
