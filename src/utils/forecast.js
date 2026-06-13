import { formatPredictorList, getScenarioDefinition, getTargetDefinition } from './constants';
import { precisionForValue } from './data';

export const prototypeFallbackNotice =
  'Prototype fallback uses the target variable’s recent historical trend. The selected predictors represent the intended final model inputs and are not used by the frontend fallback algorithm.';

const addMonths = (dateValue, months) => {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

const formatMonth = (dateValue) =>
  new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(dateValue));

const safeRound = (value) => {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(precisionForValue(value)));
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
  const hasActualOutputRows = forecastRows.some((row) => Number.isFinite(row.actualValue));
  const firstOutputRow = forecastRows[0];
  const outputScale = firstOutputRow?.outputScale ?? '';
  const isTransformedScale = outputScale.includes('transformed');
  const mapOutputRow = (row) => ({
    date: row.date,
    month: row.month,
    actual: Number.isFinite(row.actualValue) ? safeRound(row.actualValue) : null,
    forecast: safeRound(row.forecast),
    lowerBound: safeRound(row.lowerBound),
    upperBound: safeRound(row.upperBound),
    unit: row.unit,
    type: row.type,
    resultType: row.resultType,
    resultTypeLabel: row.resultTypeLabel,
    sourceNotebook: row.sourceNotebook,
    scenarioVariant: row.scenarioVariant,
    scenarioVariantLabel: row.scenarioVariantLabel,
    predictors: row.predictors,
    engineeredFeatures: row.engineeredFeatures,
    evaluationStart: row.evaluationStart,
    evaluationEnd: row.evaluationEnd,
    frequency: row.frequency,
    displayTarget: row.displayTarget,
    displayLabel: row.displayLabel,
    notebookTarget: row.notebookTarget,
    officialTarget: row.officialTarget,
    outputScale: row.outputScale,
    displayMode: row.displayMode,
    caveat: row.caveat,
    integrationStatus: row.integrationStatus,
    phase: row.resultType === 'test_prediction' ? 'Held-out test' : 'Forecast',
  });

  if (hasActualOutputRows) {
    const modelForecastRows = forecastRows.map(mapOutputRow);
    const firstActual = modelForecastRows.find((row) => Number.isFinite(row.actual))?.actual ?? null;
    const lastForecast = modelForecastRows[modelForecastRows.length - 1]?.forecast ?? null;
    const change =
      Number.isFinite(firstActual) && Number.isFinite(lastForecast) ? lastForecast - firstActual : 0;
    const directionThreshold = Number.isFinite(firstActual) ? Math.max(Math.abs(firstActual) * 0.02, 0.000001) : 0;
    const trendDirection =
      Math.abs(change) <= directionThreshold ? 'stable' : change > 0 ? 'increasing' : 'decreasing';

    return {
      chartRows: modelForecastRows,
      forecastRows: modelForecastRows,
      trendDirection,
      lastActual: modelForecastRows[modelForecastRows.length - 1]?.actual ?? null,
      lastForecast: safeRound(lastForecast),
      resultType: modelForecastRows[0]?.resultType ?? '',
      resultTypeLabel: modelForecastRows[0]?.resultTypeLabel ?? '',
      sourceNotebook: modelForecastRows[0]?.sourceNotebook ?? '',
      scenarioVariant: modelForecastRows[0]?.scenarioVariant ?? '',
      scenarioVariantLabel: modelForecastRows[0]?.scenarioVariantLabel ?? '',
      predictors: modelForecastRows[0]?.predictors ?? [],
      engineeredFeatures: modelForecastRows[0]?.engineeredFeatures ?? [],
      evaluationStart: modelForecastRows[0]?.evaluationStart ?? '',
      evaluationEnd: modelForecastRows[0]?.evaluationEnd ?? '',
      frequency: modelForecastRows[0]?.frequency ?? '',
      unit: modelForecastRows[0]?.unit ?? '',
      displayTarget: modelForecastRows[0]?.displayTarget ?? '',
      displayLabel: modelForecastRows[0]?.displayLabel ?? '',
      notebookTarget: modelForecastRows[0]?.notebookTarget ?? '',
      officialTarget: modelForecastRows[0]?.officialTarget ?? '',
      outputScale: modelForecastRows[0]?.outputScale ?? '',
      displayMode: modelForecastRows[0]?.displayMode ?? '',
      caveat: modelForecastRows[0]?.caveat ?? '',
      integrationStatus: modelForecastRows[0]?.integrationStatus ?? '',
    };
  }

  if (isTransformedScale) {
    const modelForecastRows = forecastRows.map(mapOutputRow);
    const firstForecast = modelForecastRows[0]?.forecast ?? null;
    const lastForecast = modelForecastRows[modelForecastRows.length - 1]?.forecast ?? null;
    const change =
      Number.isFinite(firstForecast) && Number.isFinite(lastForecast) ? lastForecast - firstForecast : 0;
    const directionThreshold = Number.isFinite(firstForecast)
      ? Math.max(Math.abs(firstForecast) * 0.02, 0.000001)
      : 0;
    const trendDirection =
      Math.abs(change) <= directionThreshold ? 'stable' : change > 0 ? 'increasing' : 'decreasing';

    return {
      chartRows: modelForecastRows,
      forecastRows: modelForecastRows,
      trendDirection,
      lastActual: null,
      lastForecast: safeRound(lastForecast),
      resultType: modelForecastRows[0]?.resultType ?? '',
      resultTypeLabel: modelForecastRows[0]?.resultTypeLabel ?? '',
      sourceNotebook: modelForecastRows[0]?.sourceNotebook ?? '',
      scenarioVariant: modelForecastRows[0]?.scenarioVariant ?? '',
      scenarioVariantLabel: modelForecastRows[0]?.scenarioVariantLabel ?? '',
      predictors: modelForecastRows[0]?.predictors ?? [],
      engineeredFeatures: modelForecastRows[0]?.engineeredFeatures ?? [],
      evaluationStart: modelForecastRows[0]?.evaluationStart ?? '',
      evaluationEnd: modelForecastRows[0]?.evaluationEnd ?? '',
      frequency: modelForecastRows[0]?.frequency ?? '',
      unit: modelForecastRows[0]?.unit ?? '',
      displayTarget: modelForecastRows[0]?.displayTarget ?? '',
      displayLabel: modelForecastRows[0]?.displayLabel ?? '',
      notebookTarget: modelForecastRows[0]?.notebookTarget ?? '',
      officialTarget: modelForecastRows[0]?.officialTarget ?? '',
      outputScale: modelForecastRows[0]?.outputScale ?? '',
      displayMode: modelForecastRows[0]?.displayMode ?? '',
      caveat: modelForecastRows[0]?.caveat ?? '',
      integrationStatus: modelForecastRows[0]?.integrationStatus ?? '',
    };
  }

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
    resultType: row.resultType,
    resultTypeLabel: row.resultTypeLabel,
    sourceNotebook: row.sourceNotebook,
    scenarioVariant: row.scenarioVariant,
    scenarioVariantLabel: row.scenarioVariantLabel,
    predictors: row.predictors,
    engineeredFeatures: row.engineeredFeatures,
    evaluationStart: row.evaluationStart,
    evaluationEnd: row.evaluationEnd,
    frequency: row.frequency,
    displayTarget: row.displayTarget,
    displayLabel: row.displayLabel,
    notebookTarget: row.notebookTarget,
    officialTarget: row.officialTarget,
    outputScale: row.outputScale,
    displayMode: row.displayMode,
    caveat: row.caveat,
    integrationStatus: row.integrationStatus,
    phase: 'Forecast',
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
    resultType: modelForecastRows[0]?.resultType ?? '',
    resultTypeLabel: modelForecastRows[0]?.resultTypeLabel ?? '',
    sourceNotebook: modelForecastRows[0]?.sourceNotebook ?? '',
    scenarioVariant: modelForecastRows[0]?.scenarioVariant ?? '',
    scenarioVariantLabel: modelForecastRows[0]?.scenarioVariantLabel ?? '',
    predictors: modelForecastRows[0]?.predictors ?? [],
    engineeredFeatures: modelForecastRows[0]?.engineeredFeatures ?? [],
    evaluationStart: modelForecastRows[0]?.evaluationStart ?? '',
    evaluationEnd: modelForecastRows[0]?.evaluationEnd ?? '',
    frequency: modelForecastRows[0]?.frequency ?? '',
    unit: modelForecastRows[0]?.unit ?? '',
    displayTarget: modelForecastRows[0]?.displayTarget ?? '',
    displayLabel: modelForecastRows[0]?.displayLabel ?? '',
    notebookTarget: modelForecastRows[0]?.notebookTarget ?? '',
    officialTarget: modelForecastRows[0]?.officialTarget ?? '',
    outputScale: modelForecastRows[0]?.outputScale ?? '',
    displayMode: modelForecastRows[0]?.displayMode ?? '',
    caveat: modelForecastRows[0]?.caveat ?? '',
    integrationStatus: modelForecastRows[0]?.integrationStatus ?? '',
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
  if (scenarioId === 'vehicle_electricity_to_no2') {
    return 'Local electricity consumption and vehicle activity indicators are the intended predictors for the final trained model.';
  }

  if (scenarioId === 'ipi_electricity_to_so2') {
    return 'An IPI indicator and electricity consumption are the intended predictors for the final trained model.';
  }

  if (scenarioId === 'no2_to_pm25') {
    return 'NO2 is the intended predictor for this optional extension workflow.';
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
    if (trendDirection === 'transformed') {
      return `The ${modelLabel} output is shown in the notebook's transformed target scale. It should not be interpreted as official concentration values.`;
    }

    if (scenarioId === 'ipi_electricity_to_so2') {
      return `The ${modelLabel} row output reproduces ${targetLabel} values over the held-out test period. It is not a projection beyond the fixed evaluation period.`;
    }

    return `The ${modelLabel} output indicates ${trendText} over the next ${horizonLabel} for the ${scenario.label} scenario. These values are loaded from notebook-confirmed row output files.`;
  }

  if (scenarioId === 'ipi_electricity_to_so2') {
    return `This prototype displays an SO2 trend forecast based on recent SO2 history. ${categoryContext(
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
