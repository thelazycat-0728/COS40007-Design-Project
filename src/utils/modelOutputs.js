import Papa from 'papaparse';
import { labelFor, modelOptions, pollutantOptions } from './constants';

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

const pollutantAliases = {
  air_co: 'air_co',
  co: 'air_co',
  air_no2: 'air_no2',
  no2: 'air_no2',
  air_o3: 'air_o3',
  o3: 'air_o3',
  air_pm_10: 'air_pm_10',
  pm10: 'air_pm_10',
  'pm 10': 'air_pm_10',
  air_pm_25: 'air_pm_25',
  pm25: 'air_pm_25',
  pm2_5: 'air_pm_25',
  'pm2.5': 'air_pm_25',
  'pm 2.5': 'air_pm_25',
  air_so2: 'air_so2',
  so2: 'air_so2',
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

export const normalizePollutantKey = (value) => {
  const direct = normalizeToken(value);
  const compact = direct.replace(/[_.\s]/g, '');
  return pollutantAliases[direct] ?? pollutantAliases[compact] ?? direct;
};

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

const parseForecastRows = (csvText, modelKey) => {
  if (!csvText.split(/\r?\n/, 1)[0]?.includes('forecast_value')) {
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
      const pollutantKey = normalizePollutantKey(row.pollutant);
      const outputModelKey = normalizeModelKey(row.model || modelKey);

      if (!date || !Number.isFinite(forecast) || outputModelKey !== modelKey) {
        return null;
      }

      return {
        date,
        month: formatMonth(date),
        country: row.country || 'Malaysia',
        countryKey: normalizeCountryKey(row.country || 'Malaysia'),
        pollutant: row.pollutant || pollutantKey,
        pollutantKey,
        model: row.model || labelFor(modelOptions, modelKey),
        modelKey: outputModelKey,
        forecast,
        lowerBound: toNumberOrNull(row.lower_bound),
        upperBound: toNumberOrNull(row.upper_bound),
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
      const pollutantKey = normalizePollutantKey(metric.pollutant);
      const pollutantLabel = labelFor(pollutantOptions, pollutantKey);
      const mae = toNumberOrNull(metric.mae);
      const rmse = toNumberOrNull(metric.rmse);
      const mape = toNumberOrNull(metric.mape);

      if (!modelKey || !modelLabel || !Number.isFinite(mae) || !Number.isFinite(rmse)) {
        return null;
      }

      return {
        model: modelLabel,
        modelKey,
        pollutant: pollutantLabel,
        pollutantKey,
        mae,
        rmse,
        mape,
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

export const getModelIntegrationStatuses = (modelOutputs = defaultModelOutputs) =>
  modelOptions.map((model) => ({
    ...model,
    connected: Boolean(modelOutputs.forecasts?.[model.key]?.connected),
  }));

export const getMatchingForecastRows = ({
  modelOutputs = defaultModelOutputs,
  selectedModel,
  selectedCountry,
  selectedPollutant,
  horizonMonths,
}) => {
  const rows = modelOutputs.forecasts?.[selectedModel]?.rows ?? [];
  const countryKey = normalizeCountryKey(selectedCountry);

  return rows
    .filter(
      (row) =>
        row.modelKey === selectedModel &&
        row.pollutantKey === selectedPollutant &&
        row.countryKey === countryKey,
    )
    .slice(0, Number(horizonMonths));
};
