export const placeholderModelMetrics = [
  { model: 'XGBoost', mae: 1.82, rmse: 2.41, mape: 8.7 },
  { model: 'SARIMA', mae: 2.16, rmse: 2.94, mape: 10.4 },
  { model: 'VAR', mae: 2.34, rmse: 3.18, mape: 11.2 },
  { model: 'Prophet', mae: 2.08, rmse: 2.76, mape: 9.8 },
];

export const modelMetrics = placeholderModelMetrics;

export const getBestModelByRmse = (metrics) =>
  metrics.reduce((best, current) => (current.rmse < best.rmse ? current : best));

export const bestModelByRmse = getBestModelByRmse(placeholderModelMetrics);
