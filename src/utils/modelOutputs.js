import Papa from 'papaparse';
import {
  getPredictorDefinition,
  getScenarioDefinition,
  getScenarioVariantLabel,
  getTargetDefinition,
  labelFor,
  modelOptions,
  targetAliases,
} from './constants';

export const MODEL_OUTPUT_BASE_PATH = '/model_outputs';

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

export const resultTypeLabels = {
  test_prediction: 'Held-out test predictions',
  validation_prediction: 'Validation predictions',
  future_forecast: 'Future forecast',
};

const parseForecastRows = (csvText, modelKey) => {
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

      if (!date || !Number.isFinite(forecast) || outputModelKey !== modelKey || !targetKey) {
        return null;
      }

      return {
        date,
        month: formatMonth(date),
        country: row.country || 'Malaysia',
        countryKey: normalizeCountryKey(row.country || 'Malaysia'),
        target: row.target || row.pollutant || targetKey,
        targetKey,
        targetLabel: targetDefinition.label,
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
        legacySource: Boolean(row.pollutant && !row.target),
        type: resultTypeLabels[resultType] || 'Model output',
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const loadForecastFile = async (modelKey) => {
  const fileName = forecastFileNames[modelKey];
  const csvText = await fetchOptionalText(`${MODEL_OUTPUT_BASE_PATH}/${fileName}`);
  if (!csvText) {
    return { connected: false, rows: [] };
  }

  const rows = parseForecastRows(csvText, modelKey);
  return {
    connected: rows.length > 0,
    rows,
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
      const rmse = toNumberOrNull(metric.rmse);
      const mape = toNumberOrNull(metric.mape);
      const r2 = toNumberOrNull(metric.r2);
      const integrationStatus = metric.integration_status || 'connected_metric';
      const hasAnyMetric =
        Number.isFinite(mae) || Number.isFinite(rmse) || Number.isFinite(mape) || Number.isFinite(r2);

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
        scenarioId: metric.scenario_id || '',
        scenarioLabel: metric.scenario_id ? getScenarioDefinition(metric.scenario_id).label : '',
        scenarioVariant,
        scenarioVariantLabel: metric.scenario_variant_label || getScenarioVariantLabel(scenarioVariant),
        predictors,
        predictorLabels: predictors.map((key) => getPredictorDefinition(key).label),
        engineeredFeatures: Array.isArray(metric.engineered_features)
          ? metric.engineered_features
          : parseMetadataList(metric.engineered_features),
        mae,
        rmse,
        mape,
        r2,
        resultType: normalizeToken(metric.result_type || ''),
        resultTypeLabel:
          metric.result_type_label || resultTypeLabels[normalizeToken(metric.result_type || '')] || metric.result_type || '',
        evaluationStart: metric.evaluation_start || '',
        evaluationEnd: metric.evaluation_end || '',
        frequency: metric.frequency || '',
        unit: metric.unit || targetDefinition.unit || '',
        integrationStatus,
        rowLevelOutputAvailable: Boolean(metric.row_level_output_available),
        sourceNotebook: metric.source_notebook || '',
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
  const forecastEntries = await Promise.all(
    modelOptions.map(async (model) => {
      try {
        return [model.key, await loadForecastFile(model.key)];
      } catch (error) {
        loadErrors.push(`${model.label} forecast: ${error.message}`);
        return [model.key, { connected: false, rows: [] }];
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
} = {}) => {
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  return modelOptions.map((model) => {
    const matchingRows = (modelOutputs.forecasts?.[model.key]?.rows ?? []).filter(
      (row) =>
        row.modelKey === model.key &&
        (!selectedTarget || row.targetKey === selectedTarget) &&
        matchesScenario(row.scenarioId, selectedScenario) &&
        row.countryKey === countryKey,
    );
    const firstRow = matchingRows[0];
    const matchingMetrics = (modelOutputs.metrics?.rows ?? []).filter(
      (row) =>
        row.modelKey === model.key &&
        (!selectedTarget || row.targetKey === selectedTarget) &&
        matchesScenario(row.scenarioId, selectedScenario) &&
        row.countryKey === countryKey,
    );
    const firstMetric = matchingMetrics[0];
    const hasMetricsOnly = matchingMetrics.some((row) => row.integrationStatus === 'metrics_only');

    return {
      ...model,
      connected: matchingRows.length > 0,
      metricsOnly: !matchingRows.length && hasMetricsOnly,
      targetLabel:
        firstRow?.targetLabel ??
        firstMetric?.target ??
        (selectedTarget ? getTargetDefinition(selectedTarget).label : 'Selected target'),
      scenarioLabel: firstRow?.scenarioId
        ? getScenarioDefinition(firstRow.scenarioId).label
        : firstMetric?.scenarioLabel ||
          (selectedScenario
            ? getScenarioDefinition(selectedScenario).label
            : 'Any scenario'),
      scenarioVariantLabel: firstRow?.scenarioVariantLabel || firstMetric?.scenarioVariantLabel || '',
      resultTypeLabel: firstRow?.resultTypeLabel || firstMetric?.resultTypeLabel || '',
      integrationStatus: firstRow
        ? 'connected_forecast'
        : hasMetricsOnly
          ? 'metrics_only'
          : 'pending',
      sourceNotebook: firstRow?.sourceNotebook || firstMetric?.sourceNotebook || '',
      unit: firstRow?.unit || firstMetric?.unit || '',
      evaluationStart: firstRow?.evaluationStart || firstMetric?.evaluationStart || '',
      evaluationEnd: firstRow?.evaluationEnd || firstMetric?.evaluationEnd || '',
      legacySource: Boolean(firstRow?.legacySource || firstMetric?.legacySource),
    };
  });
};

export const getMatchingMetricsOnlyRows = ({
  modelOutputs = defaultModelOutputs,
  selectedCountry,
} = {}) => {
  const countryKey = normalizeCountryKey(selectedCountry || 'Malaysia');

  return (modelOutputs.metrics?.rows ?? []).filter(
    (row) => row.countryKey === countryKey && row.integrationStatus === 'metrics_only',
  );
};

export const getConnectedComparableMetricRows = (metrics) =>
  metrics.filter(
    (metric) =>
      metric.integrationStatus !== 'metrics_only' &&
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
