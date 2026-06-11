import Papa from 'papaparse';
import {
  getPredictorDefinition,
  getTargetDefinition,
  labelFor,
  predictorOptions,
  scenario2FallbackPredictorKeys,
  scenario2PreferredPredictorKeys,
  scenarioOptions,
  targetOptions,
  vehiclePredictorKeys,
} from './constants';

export const uploadedTargetOptions = targetOptions;
export const uploadedPredictorOptions = predictorOptions;
export const uploadedTemplatePath = '/templates/regional_dataset_template.csv';

const targetKeys = uploadedTargetOptions.map((option) => option.key);
const predictorKeys = uploadedPredictorOptions.map((option) => option.key);
const numericKeys = [...new Set([...targetKeys, ...predictorKeys])];

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateValue = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMonth = (value) => {
  const date = parseDateValue(value);
  if (!date) return value || 'Unknown';

  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};

const formatDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return value || 'Unknown';

  return date.toISOString().slice(0, 10);
};

const getDetectedColumns = (fields, allowedKeys) => allowedKeys.filter((key) => fields.includes(key));

const buildMissingSummary = (rows, columns) =>
  columns.map((column) => ({
    column,
    label: getUploadedColumnLabel(column),
    missing: rows.filter((row) => row[column] === null || row[column] === undefined || row[column] === '').length,
    total: rows.length,
  }));

const getInvalidNumericEntries = (rawRows, columns) =>
  rawRows.reduce((count, row) => {
    const invalidValues = columns.filter((column) => {
      const value = row[column];
      return value !== null && value !== undefined && String(value).trim() !== '' && !Number.isFinite(Number(value));
    });

    return count + invalidValues.length;
  }, 0);

const getScenarioCompatibility = (detectedTargets, detectedPredictors) => ({
  vehicle_electricity_to_no2:
    detectedTargets.includes('air_no2') &&
    detectedPredictors.includes('electricity_local') &&
    vehiclePredictorKeys.some((key) => detectedPredictors.includes(key)),
  ipi_electricity_to_so2:
    detectedTargets.includes('air_so2') &&
    [...scenario2PreferredPredictorKeys, ...scenario2FallbackPredictorKeys].some(
      (key) => key.startsWith('ipi_') && detectedPredictors.includes(key),
    ) &&
    ['electricity_local', 'electricity_total'].some((key) => detectedPredictors.includes(key)),
  no2_to_pm25: detectedTargets.includes('air_pm_25') && detectedPredictors.includes('air_no2'),
  custom: detectedTargets.length > 0 && detectedPredictors.length > 0,
});

export const parseUploadedCsvFile = (file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0].message));
          return;
        }

        resolve(result);
      },
      error: (error) => reject(error),
    });
  });

export const validateAndNormalizeUploadedDataset = (parseResult) => {
  const fields = (parseResult.meta?.fields ?? []).map((field) => field.trim()).filter(Boolean);
  const rawRows = parseResult.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim()));
  const detectedTargets = getDetectedColumns(fields, targetKeys);
  const detectedPredictors = getDetectedColumns(fields, predictorKeys);
  const errors = [];

  if (!fields.includes('date')) errors.push('CSV must include a date column.');
  if (!fields.includes('country')) errors.push('CSV must include a country column.');
  if (!detectedTargets.length) {
    errors.push('CSV must include at least one supported forecast target column.');
  }
  if (!detectedPredictors.length) {
    errors.push('CSV must include at least one supported predictor column.');
  }

  const invalidNumericEntries = getInvalidNumericEntries(rawRows, [
    ...detectedTargets,
    ...detectedPredictors,
  ]);

  if (invalidNumericEntries > 0) {
    errors.push(`CSV contains ${invalidNumericEntries} non-numeric value(s) in target or predictor columns.`);
  }

  const normalizedRows = rawRows
    .map((row) => {
      const normalized = {
        ...row,
        date: row.date,
        country: row.country,
        month: formatMonth(row.date),
      };

      numericKeys.forEach((key) => {
        if (fields.includes(key)) {
          normalized[key] = toNumberOrNull(row[key]);
        }
      });

      return normalized;
    })
    .filter((row) => row.date && parseDateValue(row.date))
    .sort((a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime());

  const validTimeRows = normalizedRows.filter((row) =>
    detectedTargets.some((target) => Number.isFinite(row[target])),
  );

  if (validTimeRows.length < 6) {
    errors.push('CSV must include at least 6 valid chronological rows with numeric target values.');
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
    };
  }

  const countryName = normalizedRows.find((row) => String(row.country ?? '').trim())?.country ?? 'Uploaded region';
  const dateValues = normalizedRows.map((row) => parseDateValue(row.date)).filter(Boolean);
  const firstDate = dateValues[0];
  const lastDate = dateValues[dateValues.length - 1];
  const summaryColumns = ['date', 'country', ...detectedTargets, ...detectedPredictors];
  const scenarioCompatibility = getScenarioCompatibility(detectedTargets, detectedPredictors);

  return {
    ok: true,
    dataset: {
      countryName,
      rowCount: normalizedRows.length,
      dateRange: `${formatDate(firstDate)} to ${formatDate(lastDate)}`,
      detectedTargets,
      detectedPollutants: detectedTargets.filter((key) => getTargetDefinition(key).category === 'pollution'),
      detectedPredictors,
      rows: normalizedRows,
      previewColumns: summaryColumns,
      missingSummary: buildMissingSummary(normalizedRows, summaryColumns),
      scenarioCompatibility,
    },
  };
};

export const getUploadedColumnLabel = (key) => {
  const target = targetOptions.find((option) => option.key === key);
  if (target) return target.label;

  const predictor = predictorOptions.find((option) => option.key === key);
  if (predictor) return predictor.label;

  return key;
};

export const getUploadedScenarioLabel = (scenarioId) => labelFor(scenarioOptions, scenarioId);

export const getUploadedTargetDefinition = getTargetDefinition;
export const getUploadedPredictorDefinition = getPredictorDefinition;
