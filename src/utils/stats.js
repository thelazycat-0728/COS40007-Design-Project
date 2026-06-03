const validNumbers = (rows, key) =>
  rows
    .map((row) => row[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

export const calculateKpis = (rows, key) => {
  const values = validNumbers(rows, key);

  if (!values.length) {
    return {
      latest: null,
      average: null,
      highest: null,
      lowest: null,
    };
  }

  return {
    latest: [...rows].reverse().find((row) => typeof row[key] === 'number')?.[key] ?? null,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    highest: Math.max(...values),
    lowest: Math.min(...values),
  };
};

export const calculateCorrelation = (rows, firstKey, secondKey) => {
  const pairs = rows
    .map((row) => [row[firstKey], row[secondKey]])
    .filter(([first, second]) => Number.isFinite(first) && Number.isFinite(second));

  if (pairs.length < 2) {
    return null;
  }

  const firstMean = pairs.reduce((sum, [first]) => sum + first, 0) / pairs.length;
  const secondMean = pairs.reduce((sum, [, second]) => sum + second, 0) / pairs.length;

  const numerator = pairs.reduce(
    (sum, [first, second]) => sum + (first - firstMean) * (second - secondMean),
    0,
  );
  const firstVariance = pairs.reduce((sum, [first]) => sum + (first - firstMean) ** 2, 0);
  const secondVariance = pairs.reduce((sum, [, second]) => sum + (second - secondMean) ** 2, 0);

  if (!firstVariance || !secondVariance) {
    return null;
  }

  return numerator / Math.sqrt(firstVariance * secondVariance);
};

export const describeCorrelation = (value) => {
  if (value === null || value === undefined) {
    return 'Insufficient paired values';
  }

  const strength = Math.abs(value);
  if (strength >= 0.7) return 'Strong relationship';
  if (strength >= 0.4) return 'Moderate relationship';
  if (strength >= 0.2) return 'Weak relationship';
  return 'Very weak relationship';
};
