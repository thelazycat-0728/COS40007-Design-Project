import { formatPredictorList, getScenarioDefinition, getTargetDefinition } from './constants';

export const prototypeFallbackNotice =
  "Prototype fallback uses the target variable's recent historical trend. The selected predictors describe the intended model scenario but are not used by the frontend fallback algorithm.";

const addMonths = (dateValue, months) => {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

const formatMonth = (dateValue) =>
  new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(dateValue));

const safeRound = (value) => {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(Math.abs(value) < 1 ? 4 : 2));
};

const dampenForecastStep = ({ trendStep, fallbackStep, lastActual, horizonMonths }) => {
  const rawStep = Number.isFinite(trendStep) && trendStep !== 0 ? trendStep : fallbackStep;
  const dampedStep = rawStep * 0.35;
  const maxTotalChange = Math.max(Math.abs(lastActual) * 0.18, 0.002);
  const maxMonthlyStep = maxTotalChange / Math.max(horizonMonths, 1);

  return Math.min(Math.max(dampedStep, -maxMonthlyStep), maxMonthlyStep);
};

export const generatePrototypeForecast = (rows, targetKey, horizonMonths) => {
  const actualRows = rows
    .filter((row) => Number.isFinite(row[targetKey]))
    .map((row) => ({
      date: row.date,
      month: row.month,
      actual: row[targetKey],
      forecast: null,
      type: 'Historical',
    }));

  if (!actualRows.length) {
    return {
      chartRows: [],
      forecastRows: [],
      trendDirection: 'stable',
      lastActual: null,
      lastForecast: null,
    };
  }

  const recentRows = actualRows.slice(-6);
  const firstRecent = recentRows[0]?.actual ?? actualRows[0].actual;
  const lastActualRow = actualRows[actualRows.length - 1];
  const lastActual = lastActualRow.actual;
  const recentSteps = Math.max(recentRows.length - 1, 1);
  const trendStep = (lastActual - firstRecent) / recentSteps;
  const fallbackStep = lastActual * 0.01;
  const monthlyStep = dampenForecastStep({
    trendStep,
    fallbackStep,
    lastActual,
    horizonMonths,
  });

  const forecastRows = Array.from({ length: horizonMonths }, (_, index) => {
    const date = addMonths(lastActualRow.date, index + 1);
    const forecast = Math.max(0, lastActual + monthlyStep * (index + 1));

    return {
      date,
      month: formatMonth(date),
      actual: null,
      forecast: safeRound(forecast),
      type: 'Prototype forecast',
    };
  });

  const lastForecast = forecastRows[forecastRows.length - 1]?.forecast ?? lastActual;
  const directionThreshold = Math.max(Math.abs(lastActual) * 0.02, 0.001);
  const change = lastForecast - lastActual;
  const trendDirection =
    Math.abs(change) <= directionThreshold ? 'stable' : change > 0 ? 'increasing' : 'decreasing';

  const bridgeRow = {
    ...lastActualRow,
    forecast: lastActual,
  };

  return {
    chartRows: [...actualRows.slice(0, -1), bridgeRow, ...forecastRows],
    forecastRows,
    trendDirection,
    lastActual: safeRound(lastActual),
    lastForecast: safeRound(lastForecast),
  };
};

export const generateModelOutputForecast = (rows, targetKey, forecastRows) => {
  const actualRows = rows
    .filter((row) => Number.isFinite(row[targetKey]))
    .map((row) => ({
      date: row.date,
      month: row.month,
      actual: row[targetKey],
      forecast: null,
      type: 'Historical',
    }));

  if (!actualRows.length || !forecastRows.length) {
    return null;
  }

  const lastActualRow = actualRows[actualRows.length - 1];
  const lastActual = lastActualRow.actual;
  const modelForecastRows = forecastRows.map((row) => ({
    date: row.date,
    month: row.month,
    actual: null,
    forecast: safeRound(row.forecast),
    lowerBound: safeRound(row.lowerBound),
    upperBound: safeRound(row.upperBound),
    unit: row.unit,
    type: 'Final model output',
  }));
  const lastForecast = modelForecastRows[modelForecastRows.length - 1]?.forecast ?? lastActual;
  const directionThreshold = Math.max(Math.abs(lastActual) * 0.02, 0.001);
  const change = lastForecast - lastActual;
  const trendDirection =
    Math.abs(change) <= directionThreshold ? 'stable' : change > 0 ? 'increasing' : 'decreasing';
  const bridgeRow = {
    ...lastActualRow,
    forecast: lastActual,
  };

  return {
    chartRows: [...actualRows.slice(0, -1), bridgeRow, ...modelForecastRows],
    forecastRows: modelForecastRows,
    trendDirection,
    lastActual: safeRound(lastActual),
    lastForecast: safeRound(lastForecast),
  };
};

const directionPhrase = (trendDirection, targetLabel) => {
  if (trendDirection === 'stable') {
    return `a broadly stable ${targetLabel} trend`;
  }

  const article = trendDirection === 'increasing' ? 'an' : 'a';
  return `${article} ${trendDirection} ${targetLabel} trend`;
};

const categoryContext = (targetDefinition, scenarioId, predictorKeys) => {
  if (scenarioId === 'electricity_so2_to_ipi') {
    return 'Electricity consumption and SO2 are the intended predictors for the final trained model.';
  }

  if (scenarioId === 'vehicle_to_pm25') {
    return 'Vehicle and transport indicators are the intended predictors for the final trained model.';
  }

  if (targetDefinition.category === 'industrial') {
    return 'The selected predictors describe the intended industrial forecasting scenario.';
  }

  if (targetDefinition.category === 'pollution') {
    return 'The selected predictors describe the intended environmental forecasting scenario.';
  }

  if (predictorKeys.length) {
    return `The intended predictor set is ${formatPredictorList(predictorKeys)}.`;
  }

  return 'The selected predictors describe the intended final model scenario.';
};

export const createForecastInterpretation = ({
  targetKey,
  targetDefinition = getTargetDefinition(targetKey),
  modelLabel,
  horizonLabel,
  trendDirection,
  isFinalOutput = false,
  scenarioId = 'custom',
  predictorKeys = [],
}) => {
  const targetLabel = targetDefinition.label;
  const scenario = getScenarioDefinition(scenarioId);
  const trendText = directionPhrase(trendDirection, targetLabel);

  if (isFinalOutput) {
    return `The ${modelLabel} output indicates ${trendText} over the next ${horizonLabel} for the ${scenario.label} scenario. These values are loaded from final model output files connected to the dashboard.`;
  }

  if (scenarioId === 'electricity_so2_to_ipi') {
    return `This prototype displays an IPI trend forecast based on recent IPI history. ${categoryContext(
      targetDefinition,
      scenarioId,
      predictorKeys,
    )} ${prototypeFallbackNotice}`;
  }

  return `The forecast indicates ${trendText} over the selected horizon for the ${scenario.label} scenario. ${categoryContext(
    targetDefinition,
    scenarioId,
    predictorKeys,
  )} ${prototypeFallbackNotice}`;
};
