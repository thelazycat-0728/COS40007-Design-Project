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

export const generatePrototypeForecast = (rows, pollutantKey, horizonMonths) => {
  const actualRows = rows
    .filter((row) => Number.isFinite(row[pollutantKey]))
    .map((row) => ({
      date: row.date,
      month: row.month,
      actual: row[pollutantKey],
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

export const createForecastInterpretation = ({
  pollutantLabel,
  modelLabel,
  horizonLabel,
  trendDirection,
}) => {
  const directionText =
    trendDirection === 'stable'
      ? `${pollutantLabel} may remain broadly stable`
      : `${pollutantLabel} may ${trendDirection === 'increasing' ? 'increase' : 'decrease'}`;

  const implication =
    trendDirection === 'increasing'
      ? 'This suggests a potential worsening air quality trend if current electricity consumption and industrial activity patterns continue.'
      : trendDirection === 'decreasing'
        ? 'This suggests a potential easing of pollutant concentration under the current observed trend pattern.'
        : 'This suggests no major short-term shift in the selected pollutant under the current observed trend pattern.';

  return `The prototype forecast displayed under the ${modelLabel} option suggests that ${directionText} over the next ${horizonLabel}. ${implication} This interpretation is generated from dampened prototype forecast values and should be replaced with final trained model outputs after model integration.`;
};
