export const getBestModelByRmse = (metrics) => {
  if (!metrics.length) {
    return null;
  }

  return metrics.reduce((best, current) => (current.rmse < best.rmse ? current : best));
};
