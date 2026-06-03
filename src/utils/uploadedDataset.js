import Papa from 'papaparse';
import { labelFor, pollutantOptions } from './constants';

export const uploadedPredictorOptions = [
  { key: 'electricity_total', label: 'Total electricity consumption' },
  { key: 'electricity_local', label: 'Local electricity consumption' },
  { key: 'electricity_local_commercial', label: 'Commercial electricity consumption' },
  { key: 'electricity_local_domestic', label: 'Domestic electricity consumption' },
  { key: 'industrial_index', label: 'Industrial activity index' },
  { key: 'ipi_abs_index', label: 'Industrial Production Index' },
  { key: 'ipi_growth_yoy_index', label: 'IPI year-on-year growth' },
];

export const uploadedTemplatePath = '/templates/regional_dataset_template.csv';

const pollutantKeys = pollutantOptions.map((option) => option.key);
const predictorKeys = uploadedPredictorOptions.map((option) => option.key);
const numericKeys = [...pollutantKeys, ...predictorKeys];

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
    label: labelFor([...pollutantOptions, ...uploadedPredictorOptions], column),
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
  const detectedPollutants = getDetectedColumns(fields, pollutantKeys);
  const detectedPredictors = getDetectedColumns(fields, predictorKeys);
  const errors = [];

  if (!fields.includes('date')) errors.push('CSV must include a date column.');
  if (!fields.includes('country')) errors.push('CSV must include a country column.');
  if (!detectedPollutants.length) {
    errors.push('CSV must include at least one supported pollutant column.');
  }
  if (!detectedPredictors.length) {
    errors.push('CSV must include at least one supported predictor column.');
  }

  const invalidNumericEntries = getInvalidNumericEntries(rawRows, [
    ...detectedPollutants,
    ...detectedPredictors,
  ]);

  if (invalidNumericEntries > 0) {
    errors.push(`CSV contains ${invalidNumericEntries} non-numeric value(s) in pollutant or predictor columns.`);
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
    detectedPollutants.some((pollutant) => Number.isFinite(row[pollutant])),
  );

  if (validTimeRows.length < 6) {
    errors.push('CSV must include at least 6 valid time rows with numeric pollutant values.');
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
  const summaryColumns = ['date', 'country', ...detectedPollutants, ...detectedPredictors];

  return {
    ok: true,
    dataset: {
      countryName,
      rowCount: normalizedRows.length,
      dateRange: `${formatDate(firstDate)} to ${formatDate(lastDate)}`,
      detectedPollutants,
      detectedPredictors,
      rows: normalizedRows,
      previewColumns: summaryColumns,
      missingSummary: buildMissingSummary(normalizedRows, summaryColumns),
    },
  };
};

export const getUploadedColumnLabel = (key) =>
  labelFor([...pollutantOptions, ...uploadedPredictorOptions], key);
