import Papa from 'papaparse';
import {
  getPredictorDefinition,
  getScenarioDefinition,
  getScenarioVariantLabel,
  getTargetDefinition,
  labelFor,
  modelOptions,
  officialModelKeys,
  scenarioOptions,
  targetAliases,
} from './constants';

export const MODEL_OUTPUT_BASE_PATH = '/model_outputs';
export const connectedOutputStatus = 'connected_output';
export const rowOutputStatuses = new Set([
  connectedOutputStatus,
  'official_scale_row_output',
  'transformed_scale_row_output',
]);
export const metricsOnlyStatuses = new Set(['metrics_and_plot_only', 'summary_metrics_only', 'metrics_only']);

export const forecastFileNames = {
  sarima: 'sarima_forecast.csv',
  lstm: 'lstm_forecast.csv',
  xgboost: 'xgboost_forecast.csv',
  var: 'var_forecast.csv',
  prophet: 'prophet_forecast.csv',
};

export const defaultModelOutputs = {
  forecasts: Object.fromEntries(
    modelOptions.map((model) => [model.key, { connected: false, rows: [] }]),
  ),
  metrics: {
    connected: false,
    rows: [],
  },
  artifacts: {
    connected: false,
    rows: [],
    officialScope: null,
  },
  loadErrors: [],
};

const modelAliases = {
  xgboost: 'xgboost',
  xgb: 'xgboost',
  lstm: 'lstm',
  sarima: 'sarima',
  var: 'var',
  prophet: 'prophet',
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeToken = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/µ/g, 'u')
    .replace(/[^\w.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

export const normalizeCountryKey = (value) => normalizeToken(value).replace(/_/g, '');

export const normalizeTargetKey = (value) => {
  const direct = normalizeToken(value);
  const compact = direct.replace(/[_.\s]/g, '');
  return targetAliases[direct] ?? targetAliases[compact] ?? direct;
};

export const normalizePollutantKey = normalizeTargetKey;

export const normalizeModelKey = (value) => {
  const direct = normalizeToken(value);
  const compact = direct.replace(/[_.\s-]/g, '');
  return modelAliases[direct] ?? modelAliases[compact] ?? direct;
};

const formatMonth = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};

const isHtmlFallback = (text) => {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
};

const fetchOptionalText = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  if (!text.trim() || isHtmlFallback(text)) {
    return null;
  }

  return text;
};

const parsePredictorList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTargetKey(item)).filter(Boolean);
  }

  return String(value ?? '')
    .split(/[;,]/)
    .map((item) => normalizeTargetKey(item))
    .filter(Boolean);
};

const parseMetadataList = (value) =>
  String(value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseSourceFileList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return parseMetadataList(value);
};

const isValidDateValue = (value) => {
  const date = new Date(value);
  return Boolean(value) && !Number.isNaN(date.getTime());
};

export const resultTypeLabels = {
  test_prediction: 'Held-out test predictions',
  validation_prediction: 'Validation predictions',
  future_forecast: 'Future forecast',
};

const normalizeArtifactEntry = (entry) => ({
  ...entry,
  modelKey: normalizeModelKey(entry.model_key || entry.model),
  analysisType: normalizeToken(entry.analysis_type),
  targetKey: normalizeTargetKey(entry.target),
  displayTarget: entry.display_target || entry.target_label || entry.target || '',
  displayLabel: entry.display_label || entry.display_target || entry.target_label || entry.target || '',
  notebookTarget: entry.notebook_target || entry.target || '',
  officialTarget: entry.official_target || entry.target || '',
  scenarioId: entry.scenario_id || '',
  sourceFiles: parseSourceFileList(entry.source_files),
  artifactAvailable: Boolean(entry.artifact_available),
  metricsAvailable: Boolean(entry.metrics_available),
  rowLevelOutputAvailable: Boolean(entry.row_level_output_available),
  plotAvailable: Boolean(entry.plot_available),
  guiConnected: Boolean(entry.gui_connected),
  guiDisplayed: Boolean(entry.gui_displayed),
  integrationStatus: entry.integration_status || 'missing',
  displayMode: entry.display_mode || entry.integration_status || 'missing',
  outputScale: entry.output_scale || '',
  resultType: entry.result_type || '',
  statusMessage: entry.status_message || '',
  caveat: entry.caveat || '',
  nextHandoff: entry.next_handoff || '',
});

const parseArtifactRegistry = (text) => {
  if (!text.trim().startsWith('{')) {
    return { connected: false, rows: [], officialScope: null };
  }

  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed.artifacts) ? parsed.artifacts.map(normalizeArtifactEntry) : [];

  return {
    connected: rows.length > 0,
    rows,
    officialScope: parsed.official_scope || null,
  };
};

const loadArtifactRegistry = async () => {
  const text = await fetchOptionalText(`${MODEL_OUTPUT_BASE_PATH}/model_artifacts.json`);
  if (!text) {
    return { connected: false, rows: [], officialScope: null };
  }

  return parseArtifactRegistry(text);
};

const getScenarioById = (scenarioId) => scenarioOptions.find((scenario) => scenario.id === scenarioId);

const findDisplayableArtifactForForecast = (row, artifactRows) =>
  artifactRows.find(
    (artifact) =>
      rowOutputStatuses.has(artifact.integrationStatus) &&
      artifact.branch === 'main' &&
      artifact.modelKey === row.modelKey &&
      artifact.targetKey === row.targetKey &&
      (!row.scenarioId || artifact.scenarioId === row.scenarioId) &&
      (artifact.location === row.sourceNotebook || artifact.sourceFiles.includes(row.sourceNotebook)),
  );

const getForecastValidationIssue = (row, artifactRows) => {
  if (row.integrationStatus === 'stale_or_mismatched') {
    return 'Integration paused · Source verification required';
  }

  if (!rowOutputStatuses.has(row.integrationStatus)) {
    return 'Not a notebook-confirmed row output';
  }

  if (!isValidDateValue(row.date)) {
    return 'Invalid or missing date';
  }

  if (!Number.isFinite(row.forecast)) {
    return 'Missing numeric forecast value';
  }

  if (!row.unit) {
    return 'Missing unit metadata';
  }

  if (!row.resultType) {
    return 'Missing result type metadata';
  }

  if (!row.sourceNotebook) {
    return 'Missing source notebook metadata';
  }

  const scenario = getScenarioById(row.scenarioId);
  if (scenario?.target && scenario.target !== row.targetKey) {
    return 'Scenario target does not match row target';
  }

  if (!findDisplayableArtifactForForecast(row, artifactRows)) {
    return 'Source is not registered as a notebook-confirmed row output in model_artifacts.json';
  }

  return '';
};

const parseForecastRows = (csvText, modelKey, artifactRows = []) => {
  const header = csvText.split(/\r?\n/, 1)[0] ?? '';
  if (!header.includes('forecast_value')) {
    return [];
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    return [];
  }

  return parsed.data
    .map((row) => {
      const forecast = toNumberOrNull(row.forecast_value);
      const actualValue = toNumberOrNull(row.actual_value);
      const date = row.date;
      const rawTarget = row.target || row.pollutant;
      const targetKey = normalizeTargetKey(rawTarget);
      const targetDefinition = getTargetDefinition(targetKey);
      const outputModelKey = normalizeModelKey(row.model || modelKey);
      const resultType = normalizeToken(row.result_type || 'future_forecast');
      const scenarioVariant = row.scenario_variant || '';
      const integrationStatus = row.integration_status || 'metrics_pending_verification';
      const displayMode = row.display_mode || integrationStatus;
      const outputScale = row.output_scale || '';
      const displayTarget = row.display_target || targetDefinition.label;
      const displayLabel = row.display_label || displayTarget;

      if (!date || !Number.isFinite(forecast) || outputModelKey !== modelKey || !targetKey) {
        return null;
      }

      const normalizedRow = {
        date,
        month: formatMonth(date),
        country: row.country || 'Malaysia',
        countryKey: normalizeCountryKey(row.country || 'Malaysia'),
        target: row.target || row.pollutant || targetKey,
        targetKey,
        targetLabel: targetDefinition.label,
        displayTarget,
        displayLabel,
        notebookTarget: row.notebook_target || row.target || targetKey,
        officialTarget: row.official_target || row.target || targetKey,
        pollutant: row.pollutant || '',
        pollutantKey: row.pollutant ? normalizeTargetKey(row.pollutant) : '',
        model: row.model || labelFor(modelOptions, modelKey),
        modelKey: outputModelKey,
        forecast,
        actualValue,
        lowerBound: toNumberOrNull(row.lower_bound),
        upperBound: toNumberOrNull(row.upper_bound),
        scenarioId: row.scenario_id || '',
        scenarioVariant,
        scenarioVariantLabel: row.scenario_variant_label || getScenarioVariantLabel(scenarioVariant),
        predictors: parsePredictorList(row.predictors),
        engineeredFeatures: parseMetadataList(row.engineered_features),
        unit: row.unit || targetDefinition.unit || '',
        resultType,
        resultTypeLabel: row.result_type_label || resultTypeLabels[resultType] || row.result_type || 'Model output',
        sourceNotebook: row.source_notebook || '',
        evaluationStart: row.evaluation_start || '',
        evaluationEnd: row.evaluation_end || '',
        frequency: row.frequency || '',
        integrationStatus,
        displayMode,
        outputScale,
        statusMessage: row.status_message || '',
        caveat: row.caveat || '',
        legacySource: Boolean(row.pollutant && !row.target),
        type: resultTypeLabels[resultType] || 'Model output',
      };

      const validationIssue = getForecastValidationIssue(normalizedRow, artifactRows);

      return {
        ...normalizedRow,
        connectedOutput: !validationIssue,
        displayableOutput: !validationIssue,
        validationIssue,
        statusMessage: normalizedRow.statusMessage || validationIssue,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const loadForecastFile = async (modelKey, artifactRows = []) => {
  const fileName = forecastFileNames[modelKey];
  const csvText = await fetchOptionalText(`${MODEL_OUTPUT_BASE_PATH}/${fileName}`);
  if (!csvText) {
    return { connected: false, rows: [], auditRows: [] };
  }

  const parsedRows = parseForecastRows(csvText, modelKey, artifactRows);
  const rows = parsedRows.filter((row) => row.connectedOutput);

  return {
    connected: rows.length > 0,
    rows,
    auditRows: parsedRows.filter((row) => !row.connectedOutput),
  };
};

const parseMetrics = (text) => {
  if (!text.trim().startsWith('{')) {
    return [];
  }

  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed.metrics) ? parsed.metrics : [];

  return rows
    .map((metric) => {
      const modelKey = normalizeModelKey(metric.model);
      const modelLabel = labelFor(modelOptions, modelKey);
      const targetKey = normalizeTargetKey(metric.target || metric.pollutant);
      const targetDefinition = getTargetDefinition(targetKey);
      const mae = toNumberOrNull(metric.mae);
      const mse = toNumberOrNull(metric.mse);
      const rmse = toNumberOrNull(metric.rmse);
      const mape = toNumberOrNull(metric.mape);
      const r2 = toNumberOrNull(metric.r2);
      const integrationStatus = metric.integration_status || 'metrics_pending_verification';
      const hasAnyMetric =
        Number.isFinite(mse) ||
        Number.isFinite(mae) ||
        Number.isFinite(rmse) ||
        Number.isFinite(mape) ||
        Number.isFinite(r2);

      if (!modelKey || !modelLabel || !targetKey || !hasAnyMetric) {
        return null;
      }

      const predictors = parsePredictorList(metric.predictors);
      const scenarioVariant = metric.scenario_variant || '';

      return {
        model: modelLabel,
        modelKey,
        country: metric.country || 'Malaysia',
        countryKey: normalizeCountryKey(metric.country || 'Malaysia'),
        target: targetDefinition.label,
        targetKey,
        displayTarget: metric.display_target || targetDefinition.label,
        displayLabel: metric.display_label || metric.display_target || targetDefinition.label,
        scenarioId: metric.scenario_id || '',
        scenarioLabel: metric.scenario_id ? getScenarioDefinition(metric.scenario_id).label : '',
        scenarioVariant,
        scenarioVariantLabel: metric.scenario_variant_label || getScenarioVariantLabel(scenarioVariant),
        predictors,
        predictorLabels: predictors.map((key) => getPredictorDefinition(key).label),
        engineeredFeatures: Array.isArray(metric.engineered_features)
          ? metric.engineered_features
          : parseMetadataList(metric.engineered_features),
        mse,
        mae,
        rmse,
        mape,
        r2,
        aic: toNumberOrNull(metric.aic),
        bic: toNumberOrNull(metric.bic),
        lagOrder: toNumberOrNull(metric.lag_order),
        resultType: normalizeToken(metric.result_type || ''),
        resultTypeLabel:
          metric.result_type_label || resultTypeLabels[normalizeToken(metric.result_type || '')] || metric.result_type || '',
        evaluationStart: metric.evaluation_start || '',
        evaluationEnd: metric.evaluation_end || '',
        frequency: metric.frequency || '',
        unit: metric.unit || targetDefinition.unit || '',
        integrationStatus,
        displayMode: metric.display_mode || integrationStatus,
        outputScale: metric.output_scale || '',
        notebookTarget: metric.notebook_target || metric.target || '',
        plotAvailable: Boolean(metric.plot_available),
        artifactAvailable: Boolean(metric.artifact_available),
        rowLevelOutputAvailable: Boolean(metric.row_level_output_available),
        frontendConnected: rowOutputStatuses.has(integrationStatus) && Boolean(metric.row_level_output_available),
        sourceNotebook: metric.source_notebook || '',
        sourceFiles: parseSourceFileList(metric.source_files),
        sourceColumn: metric.source_column || '',
        caveat: metric.caveat || '',
        metricNote: metric.metric_note || '',
        legacySource: Boolean(metric.pollutant && !metric.target),
      };
    })
    .filter(Boolean);
};

const loadMetricsFile = async () => {
  const text = await fetchOptionalText(`${MODEL_OUTPUT_BASE_PATH}/model_metrics.json`);
  if (!text) {
    return { connected: false, rows: [] };
  }

  try {
    const rows = parseMetrics(text);
    return {
      connected: rows.length > 0,
      rows,
    };
  } catch {
    return { connected: false, rows: [] };
  }
};

export const loadModelOutputs = async () => {
  const loadErrors = [];
  let artifacts = { connected: false, rows: [], officialScope: null };

  try {
    artifacts = await loadArtifactRegistry();
  } catch (error) {
    loadErrors.push(`Model readiness registry: ${error.message}`);
  }

  const forecastEntries = await Promise.all(
    modelOptions.map(async (model) => {
      try {
        return [model.key, await loadForecastFile(model.key, artifacts.rows)];
      } catch (error) {
        loadErrors.push(`${model.label} forecast: ${error.message}`);
        return [model.key, { connected: false, rows: [], auditRows: [] }];
      }
    }),
  );

  let metrics = { connected: false, rows: [] };
  try {
    metrics = await loadMetricsFile();
  } catch (error) {
    loadErrors.push(`Model metrics: ${error.message}`);
  }

  return {
    forecasts: Object.fromEntries(forecastEntries),
    metrics,
    artifacts,
    loadErrors,
  };
};

const matchesScenario = (rowScenarioId, selectedScenario) =>
  !rowScenarioId || !selectedScenario || selectedScenario === 'custom' || rowScenarioId === selectedScenario;

export const getModelIntegrationStatuses = ({
  modelOutputs = defaultModelOutputs,
  selectedTarget,
  selectedScenario,
  selectedCountry,
  allowedModelKeys = officialModelKeys,
} = {}) => {
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  return modelOptions
    .filter((model) => allowedModelKeys.includes(model.key))
    .map((model) => {
      const matchingRows = (modelOutputs.forecasts?.[model.key]?.rows ?? []).filter(
        (row) =>
          row.modelKey === model.key &&
          (!selectedTarget || row.targetKey === selectedTarget) &&
          matchesScenario(row.scenarioId, selectedScenario) &&
          row.countryKey === countryKey,
      );
      const firstRow = matchingRows[0];
      const matchingAuditRows = (modelOutputs.forecasts?.[model.key]?.auditRows ?? []).filter(
        (row) =>
          row.modelKey === model.key &&
          (!selectedTarget || row.targetKey === selectedTarget) &&
          matchesScenario(row.scenarioId, selectedScenario) &&
          row.countryKey === countryKey,
      );
      const firstAuditRow = matchingAuditRows[0];
      const matchingMetrics = (modelOutputs.metrics?.rows ?? []).filter(
        (row) =>
          row.modelKey === model.key &&
          (!selectedTarget || row.targetKey === selectedTarget) &&
          matchesScenario(row.scenarioId, selectedScenario) &&
          row.countryKey === countryKey,
      );
      const firstMetric = matchingMetrics[0];
      const hasMetricsOnly = matchingMetrics.some((row) => metricsOnlyStatuses.has(row.integrationStatus));
      const hasVerificationIssue =
        matchingAuditRows.length > 0 ||
        matchingMetrics.some((row) =>
          ['stale_or_mismatched', 'metrics_pending_verification'].includes(row.integrationStatus),
        );
      const statusSource = firstRow || firstAuditRow || firstMetric;

      return {
        ...model,
        connected: matchingRows.length > 0,
        metricsOnly: !matchingRows.length && hasMetricsOnly,
        verificationRequired: !matchingRows.length && hasVerificationIssue,
        targetLabel:
          statusSource?.displayTarget ??
          statusSource?.targetLabel ??
          firstMetric?.target ??
          (selectedTarget ? getTargetDefinition(selectedTarget).label : 'Selected target'),
        scenarioLabel:
          statusSource?.scenarioId && getScenarioById(statusSource.scenarioId)
            ? getScenarioDefinition(statusSource.scenarioId).label
            : firstMetric?.scenarioLabel ||
              (selectedScenario ? getScenarioDefinition(selectedScenario).label : 'Any scenario'),
        scenarioVariantLabel: statusSource?.scenarioVariantLabel || firstMetric?.scenarioVariantLabel || '',
        resultTypeLabel: statusSource?.resultTypeLabel || firstMetric?.resultTypeLabel || '',
        integrationStatus: firstRow
          ? firstRow.integrationStatus
          : hasVerificationIssue
            ? 'stale_or_mismatched'
            : hasMetricsOnly
              ? firstMetric.integrationStatus
              : 'pending',
        sourceNotebook: statusSource?.sourceNotebook || firstMetric?.sourceNotebook || '',
        unit: statusSource?.unit || firstMetric?.unit || '',
        evaluationStart: statusSource?.evaluationStart || firstMetric?.evaluationStart || '',
        evaluationEnd: statusSource?.evaluationEnd || firstMetric?.evaluationEnd || '',
        statusMessage: statusSource?.statusMessage || firstMetric?.caveat || '',
        legacySource: Boolean(statusSource?.legacySource || firstMetric?.legacySource),
      };
    });
};

export const getMatchingMetricsOnlyRows = ({
  modelOutputs = defaultModelOutputs,
  selectedCountry,
} = {}) => {
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  return (modelOutputs.metrics?.rows ?? []).filter(
    (row) => row.countryKey === countryKey && !rowOutputStatuses.has(row.integrationStatus),
  );
};

export const getConnectedComparableMetricRows = (metrics) =>
  metrics.filter(
    (metric) =>
      metric.integrationStatus === 'official_scale_row_output' &&
      metric.rowLevelOutputAvailable &&
      Number.isFinite(metric.rmse),
  );

export const getMatchingForecastRows = ({
  modelOutputs = defaultModelOutputs,
  selectedModel,
  selectedCountry,
  selectedTarget,
  selectedScenario,
  horizonMonths,
}) => {
  const rows = modelOutputs.forecasts?.[selectedModel]?.rows ?? [];
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  const matchingRows = rows.filter(
    (row) =>
      row.modelKey === selectedModel &&
      row.targetKey === selectedTarget &&
      matchesScenario(row.scenarioId, selectedScenario) &&
      row.countryKey === countryKey,
  );

  if (matchingRows.some((row) => row.resultType === 'test_prediction')) {
    return matchingRows;
  }

  return matchingRows.slice(0, Number(horizonMonths));
};

export const getMatchingMetricRows = ({
  modelOutputs = defaultModelOutputs,
  selectedTarget,
  selectedScenario,
  selectedCountry,
} = {}) => {
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  return (modelOutputs.metrics?.rows ?? []).filter(
    (row) =>
      (!selectedTarget || row.targetKey === selectedTarget) &&
      matchesScenario(row.scenarioId, selectedScenario) &&
      row.countryKey === countryKey,
  );
};
