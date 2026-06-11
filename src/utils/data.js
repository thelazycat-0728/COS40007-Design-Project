import Papa from 'papaparse';
import { DATA_PATH } from './constants';

const numericColumns = new Set([
  'air_co',
  'air_no2',
  'air_o3',
  'air_pm_10',
  'air_pm_25',
  'air_so2',
  'electricity_exports',
  'electricity_local',
  'electricity_local_commercial',
  'electricity_local_domestic',
  'electricity_losses',
  'electricity_total',
  'ipi_abs_index',
  'ipi_growth_mom_index',
  'ipi_growth_yoy_index',
  'ipi_abs_index_sa',
  'ipi_growth_mom_index_sa',
  'ipi_growth_yoy_index_sa',
  'industrial_index',
  'vehicle_registrations',
  'car_sales',
  'traffic_volume',
  'vehicle_production',
  'transport_index',
]);

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMonth = (dateValue) => {
  if (!dateValue) {
    return 'Unknown';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};

export const normalizeRows = (rows) =>
  rows
    .filter((row) => row.date)
    .map((row) => {
      const normalized = { ...row, month: formatMonth(row.date) };

      numericColumns.forEach((column) => {
        normalized[column] = toNumberOrNull(row[column]);
      });

      return normalized;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export const loadMalaysiaData = () =>
  new Promise((resolve, reject) => {
    Papa.parse(DATA_PATH, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0].message));
          return;
        }

        resolve(normalizeRows(result.data));
      },
      error: (error) => reject(error),
    });
  });

export const compactNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'No data';
  }

  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat('en', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.abs(value) < 1 ? Math.min(digits, 3) : 0,
  }).format(value);
};

export const tableColumns = [
  'date',
  'air_co',
  'air_no2',
  'air_o3',
  'air_pm_10',
  'air_pm_25',
  'air_so2',
  'electricity_total',
  'electricity_local',
  'electricity_local_commercial',
  'electricity_local_domestic',
  'ipi_abs_index',
  'ipi_growth_yoy_index',
  'ipi_abs_index_sa',
];
