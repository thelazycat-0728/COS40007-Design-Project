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
          label: `Uploaded: ${uploadedDataset.countryName}`,
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

const modelSortOrder = {
  SARIMA: 1,
  LSTM: 2,
  'XGBoost Univariate': 3,
  'XGBoost Multivariate': 4,
  VAR: 5,
};

const formatShortPeriod = (start, end) => {
  if (!start || !end) return 'Not specified';

  const formatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

const getArtifactTaskLabel = (artifact) => {
  if (artifact.scenarioId && getScenarioDefinition(artifact.scenarioId)?.id === artifact.scenarioId) {
    return getScenarioDefinition(artifact.scenarioId).label;
  }

  return getTargetDefinition(artifact.targetKey).label;
};

const getResultKindLabel = (artifact) => {
  if (artifact.model === 'VAR' && artifact.displayLabel) return '';
  if (artifact.integrationStatus === 'metrics_and_plot_only') return 'metrics';
  if (artifact.integrationStatus === 'transformed_scale_row_output') return '';
  if (artifact.resultType === 'test_prediction') return 'test prediction';
  if (artifact.resultType === 'future_forecast') return 'forecast';
  return 'result';
};

const buildSavedResultOptions = (artifacts) =>
  artifacts
    .filter((artifact) => ['univariate', 'multivariate'].includes(artifact.analysisType))
    .filter((artifact) =>
      ['official_scale_row_output', 'transformed_scale_row_output', 'metrics_and_plot_only'].includes(
        artifact.integrationStatus,
      ),
    )
    .sort((a, b) => {
      const modelDelta = (modelSortOrder[a.model] ?? 99) - (modelSortOrder[b.model] ?? 99);
      if (modelDelta) return modelDelta;
      return getArtifactTaskLabel(a).localeCompare(getArtifactTaskLabel(b));
    })
    .map((artifact) => {
      const task = artifact.model === 'VAR' && artifact.displayLabel
        ? artifact.displayLabel
        : getArtifactTaskLabel(artifact);
      const resultKind = getResultKindLabel(artifact);
      return {
        key: `${artifact.analysisType}|${artifact.modelKey}|${artifact.scenarioId || 'custom'}|${artifact.targetKey}`,
        label: `${artifact.model} · ${task}${resultKind ? ` ${resultKind}` : ''}`,
        artifact,
      };
    });

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
  const unit = unitForTarget(selectedTarget);
  const resultOptions = buildSavedResultOptions(modelOutputs.artifacts?.rows ?? []);
  const selectedResultOption =
    resultOptions.find((option) => {
      const artifact = option.artifact;
      return (
        artifact.analysisType === selectedAnalysisType &&
        artifact.modelKey === selectedModel &&
        artifact.targetKey === selectedTarget &&
        (selectedAnalysisType === 'univariate' || artifact.scenarioId === selectedScenario)
      );
    }) ?? resultOptions[0];
  const selectedResultArtifact = selectedResultOption?.artifact;
  const selectedResultValue = selectedResultOption?.key ?? '';
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

  const outputHorizonMonths = selectedResultArtifact?.resultType === 'future_forecast' ? 999 : Number(forecastHorizon);
  const matchingModelRows = scenarioReady
    ? getMatchingForecastRows({
        modelOutputs,
        selectedModel,
        selectedCountry: activeContext.countryForModelOutputs,
        selectedTarget,
        selectedScenario,
        selectedAnalysisType,
        horizonMonths: outputHorizonMonths,
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
  const outputHorizonLabel = forecast?.forecastRows?.length ? `${forecast.forecastRows.length} months` : labelFor(horizonOptions, Number(forecastHorizon));
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
            horizonLabel: outputHorizonLabel,
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
  const firstForecastMonth = forecast?.forecastRows[0]?.month;
  const boundaryNote = firstForecastMonth
    ? isHeldOutTestOutput
      ? `Test prediction starts: ${firstForecastMonth}`
      : `Forecast starts: ${firstForecastMonth}`
    : '';
  const outputPeriod =
    forecast?.forecastRows?.length
      ? `${forecast.forecastRows[0].month} - ${forecast.forecastRows[forecast.forecastRows.length - 1].month}`
      : selectedMetric?.evaluationStart || selectedMetric?.evaluationEnd
        ? formatShortPeriod(selectedMetric.evaluationStart, selectedMetric.evaluationEnd)
        : 'Not specified';
  const rowOutputResultType = modelForecast?.resultType === 'future_forecast'
    ? 'Future forecast'
    : modelForecast?.resultTypeLabel || 'Forecast';
  const setupResultType = isTransformedOutput
      ? 'Change forecast'
      : isHeldOutTestOutput
        ? 'Test prediction'
        : isFinalOutput
          ? rowOutputResultType
          : selectedMetric
            ? 'Metrics only'
            : 'Pending';
  const setupTargetLabel = displayTargetLabel;
  const setupModelLabel = modelLabel;
  const setupSource = outputSource;
  const setupDatasetReadiness = datasetReadiness;
  const setupPeriodLabel =
    isHeldOutTestOutput
        ? 'Test period'
        : 'Forecast period';
  const setupPeriod = outputPeriod;
  const setupPredictorSummary = predictorSummary;
  const setupUnit = outputUnit;
  const setupOutputScale = isTransformedOutput
      ? 'Transformed / differenced'
      : isFinalOutput
        ? 'Official target scale'
        : selectedMetric?.outputScale || 'Notebook metric scale';
  const setupNotebookTarget = modelForecast?.notebookTarget || selectedMetric?.notebookTarget || targetDefinition.label;
  const setupSourceNotebook = modelForecast?.sourceNotebook || selectedMetric?.sourceNotebook || 'Pending';
  const setupScenario = isUnivariate
      ? 'Univariate target history'
      : scenario.label;
  const humanStatus = isVehicleUnavailableBuiltIn
    ? 'Needs uploaded vehicle data before this result can be viewed.'
    : isTransformedOutput
      ? 'Change forecast: output is shown in differenced scale.'
      : isHeldOutTestOutput
        ? 'Test prediction: chart compares actual vs predicted values.'
        : isFinalOutput
          ? 'Forecast: notebook row output is available for this saved result.'
          : selectedMetric
            ? 'Metrics only: no dated rows were exported for this notebook.'
            : scenarioReady
              ? 'Saved result selected.'
              : 'Select or upload compatible data for this result.';
  const yAxisLabel = isTransformedOutput && outputUnit ? `${displayTargetLabel} (${outputUnit})` : outputUnit;

  const handleSavedResultChange = (value) => {
    const option = resultOptions.find((item) => item.key === value);
    const artifact = option?.artifact;
    if (!artifact) return;

    setSelectedAnalysisType(artifact.analysisType);
    setSelectedModel(artifact.modelKey);
    setSelectedTarget(artifact.targetKey);
    if (artifact.analysisType !== 'univariate') {
      setSelectedScenario(artifact.scenarioId || 'custom');
    }
    setSelectedPredictors(artifact.analysisType === 'univariate' ? [] : artifact.predictors ?? []);
    setForecastHorizon(24);
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <h1>Forecast Results</h1>
          <p>
            Choose a saved model result. Charts appear only when the team exported dated rows;
            metrics-only notebooks show score cards instead.
          </p>
        </div>
      </div>

      <div className="result-picker-panel">
        <Selector
          id="forecast-saved-result"
          label="Choose saved result"
          value={selectedResultValue}
          options={resultOptions.length ? resultOptions : [{ key: '', label: 'Loading saved results...' }]}
          onChange={handleSavedResultChange}
        />
        <div className="status-note result-status-note">{humanStatus}</div>
      </div>

      <details className="table-panel advanced-filter-panel">
        <summary>Advanced filters</summary>
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
        </div>
      </details>

      <div className="text-panel scenario-definition-card">
        <h2>Result setup</h2>
        <div className="definition-grid compact-definition-grid">
          <div>
            <span>Result type</span>
            <strong>{setupResultType}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{setupTargetLabel}</strong>
          </div>
          <div>
            <span>Model</span>
            <strong>{setupModelLabel}</strong>
          </div>
          <div>
            <span>Source/status</span>
            <strong>{setupSource}</strong>
          </div>
        </div>
        <details className="inline-details result-details">
          <summary>Result details</summary>
          <div className="definition-grid">
            <div>
              <span>Dataset readiness</span>
              <strong>{setupDatasetReadiness}</strong>
            </div>
            <div>
              <span>{setupPeriodLabel}</span>
              <strong>{setupPeriod}</strong>
            </div>
            <div>
              <span>{predictorSetLabel}</span>
              <strong>{setupPredictorSummary}</strong>
            </div>
            <div>
              <span>Unit</span>
              <strong>{setupUnit || 'Not specified'}</strong>
            </div>
            <div>
              <span>Output scale</span>
              <strong>{setupOutputScale}</strong>
            </div>
            <div>
              <span>Notebook target</span>
              <strong>{setupNotebookTarget}</strong>
            </div>
            <div>
              <span>Source notebook</span>
              <strong>{setupSourceNotebook}</strong>
            </div>
            <div>
              <span>Scenario</span>
              <strong>{setupScenario}</strong>
            </div>
          </div>
        </details>
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
          <h2>{modelLabel} metrics</h2>
          <p>
            This notebook exported metrics and plots, but no dated prediction rows. No forecast line is drawn.
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
          <p>Source notebook: {selectedMetric.sourceNotebook}. {selectedMetric.caveat || selectedMetric.metricNote}</p>
          <div className="inline-actions">
            <button
              className="template-button"
              type="button"
              onClick={() => setActiveSection('model-readiness')}
            >
              View model evidence
            </button>
          </div>
        </div>
      ) : null}

      {scenarioReady && forecast ? (
        <>
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
                {isTransformedOutput
                  ? 'Transformed output from VAR notebook · transformed-scale output'
                  : `${activeContext.countryLabel}, ${outputUnit || 'unit not specified'}`}
              </span>
            </div>
            {boundaryNote ? <p className="chart-boundary-note">{boundaryNote}</p> : null}
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 28, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                <YAxis
                  width={82}
                  stroke="#5c7080"
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 8, dx: -18 } : undefined}
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
              {isTransformedOutput ? <p>Interpret this as a change value, not a concentration value.</p> : null}
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
