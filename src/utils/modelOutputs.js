import Papa from 'papaparse';
import {
  getPredictorDefinition,
  getScenarioDefinition,
  getTargetDefinition,
  labelFor,
  modelOptions,
  targetAliases,
} from './constants';

export const MODEL_OUTPUT_BASE_PATH = '/model_outputs';

export const forecastFileNames = {
  xgboost: 'xgboost_forecast.csv',
  sarima: 'sarima_forecast.csv',
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
      const date = row.date;
      const rawTarget = row.target || row.pollutant;
      const targetKey = normalizeTargetKey(rawTarget);
      const targetDefinition = getTargetDefinition(targetKey);
      const outputModelKey = normalizeModelKey(row.model || modelKey);

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
        lowerBound: toNumberOrNull(row.lower_bound),
        upperBound: toNumberOrNull(row.upper_bound),
        scenarioId: row.scenario_id || '',
        predictors: parsePredictorList(row.predictors),
        unit: row.unit || targetDefinition.unit || '',
        legacySource: Boolean(row.pollutant && !row.target),
        type: 'Final model output',
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

      if (!modelKey || !modelLabel || !targetKey || !Number.isFinite(mae) || !Number.isFinite(rmse)) {
        return null;
      }

      const predictors = parsePredictorList(metric.predictors);

      return {
        model: modelLabel,
        modelKey,
        country: metric.country || 'Malaysia',
        countryKey: normalizeCountryKey(metric.country || 'Malaysia'),
        target: targetDefinition.label,
        targetKey,
        scenarioId: metric.scenario_id || '',
        scenarioLabel: metric.scenario_id ? getScenarioDefinition(metric.scenario_id).label : '',
        predictors,
        predictorLabels: predictors.map((key) => getPredictorDefinition(key).label),
        mae,
        rmse,
        mape,
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

    return {
      ...model,
      connected: matchingRows.length > 0,
      targetLabel: firstRow?.targetLabel ?? (selectedTarget ? getTargetDefinition(selectedTarget).label : 'Selected target'),
      scenarioLabel: firstRow?.scenarioId
        ? getScenarioDefinition(firstRow.scenarioId).label
        : selectedScenario
          ? getScenarioDefinition(selectedScenario).label
          : 'Any scenario',
      legacySource: Boolean(firstRow?.legacySource),
    };
  });
};

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

  return rows
    .filter(
      (row) =>
        row.modelKey === selectedModel &&
        row.targetKey === selectedTarget &&
        matchesScenario(row.scenarioId, selectedScenario) &&
        row.countryKey === countryKey,
    )
    .slice(0, Number(horizonMonths));
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
