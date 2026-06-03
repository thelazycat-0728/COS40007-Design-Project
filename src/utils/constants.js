export const DATA_PATH = '/data/combined_air_electricity_ipi_cleaned.csv';

export const pollutantOptions = [
  { key: 'air_co', label: 'CO', unit: 'ppm' },
  { key: 'air_no2', label: 'NO2', unit: 'ppm' },
  { key: 'air_o3', label: 'O3', unit: 'ppm' },
  { key: 'air_pm_10', label: 'PM10', unit: 'ug/m3' },
  { key: 'air_pm_25', label: 'PM2.5', unit: 'ug/m3' },
  { key: 'air_so2', label: 'SO2', unit: 'ppm' },
];

export const predictorOptions = [
  { key: 'electricity_total', label: 'Total electricity consumption' },
  { key: 'electricity_local', label: 'Local electricity consumption' },
  { key: 'electricity_local_commercial', label: 'Commercial electricity consumption' },
  { key: 'electricity_local_domestic', label: 'Domestic electricity consumption' },
  { key: 'ipi_abs_index', label: 'Industrial Production Index' },
  { key: 'ipi_growth_yoy_index', label: 'IPI year-on-year growth' },
];

export const modelOptions = [
  { key: 'xgboost', label: 'XGBoost' },
  { key: 'sarima', label: 'SARIMA' },
  { key: 'var', label: 'VAR' },
  { key: 'prophet', label: 'Prophet' },
];

export const countryOptions = [
  { key: 'malaysia', label: 'Malaysia', status: 'Active dataset', disabled: false },
  { key: 'singapore', label: 'Singapore', status: 'Future compatible dataset', disabled: true },
  { key: 'brunei', label: 'Brunei', status: 'Future compatible dataset', disabled: true },
];

export const horizonOptions = [
  { key: 1, label: '1 month' },
  { key: 3, label: '3 months' },
  { key: 6, label: '6 months' },
  { key: 12, label: '12 months' },
];

export const labelFor = (options, key) => options.find((option) => option.key === key)?.label ?? key;

export const unitForPollutant = (key) => pollutantOptions.find((option) => option.key === key)?.unit ?? '';
