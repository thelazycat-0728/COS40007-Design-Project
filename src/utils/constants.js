export const DATA_PATH = '/data/combined_air_electricity_ipi_cleaned.csv';

export const targetOptions = [
  { key: 'air_pm_25', label: 'PM2.5', shortLabel: 'PM2.5', category: 'pollution', unit: 'µg/m³' },
  { key: 'air_pm_10', label: 'PM10', shortLabel: 'PM10', category: 'pollution', unit: 'µg/m³' },
  { key: 'air_no2', label: 'NO2', shortLabel: 'NO2', category: 'pollution', unit: 'ppm' },
  { key: 'air_o3', label: 'O3', shortLabel: 'O3', category: 'pollution', unit: 'ppm' },
  { key: 'air_co', label: 'CO', shortLabel: 'CO', category: 'pollution', unit: 'ppm' },
  { key: 'air_so2', label: 'SO2', shortLabel: 'SO2', category: 'pollution', unit: 'ppm' },
  {
    key: 'ipi_abs_index',
    label: 'Industrial Production Index',
    shortLabel: 'IPI',
    category: 'industrial',
    unit: 'index points',
  },
  {
    key: 'ipi_growth_yoy_index',
    label: 'IPI year-on-year growth',
    shortLabel: 'IPI YoY growth',
    category: 'industrial',
    unit: '%',
  },
  {
    key: 'industrial_index',
    label: 'Industrial activity index',
    shortLabel: 'Industrial index',
    category: 'industrial',
    unit: 'index points',
  },
];

export const pollutantOptions = targetOptions.filter((option) => option.category === 'pollution');

export const predictorOptions = [
  {
    key: 'vehicle_registrations',
    label: 'Vehicle registrations',
    category: 'vehicle',
    unit: 'registrations',
  },
  { key: 'car_sales', label: 'Car sales', category: 'vehicle', unit: 'vehicles' },
  { key: 'traffic_volume', label: 'Traffic volume', category: 'vehicle', unit: 'vehicles' },
  { key: 'vehicle_production', label: 'Vehicle production', category: 'vehicle', unit: 'vehicles' },
  { key: 'transport_index', label: 'Transport activity index', category: 'vehicle', unit: 'index points' },
  {
    key: 'electricity_total',
    label: 'Total electricity consumption',
    category: 'electricity',
    unit: 'GWh',
  },
  {
    key: 'electricity_local',
    label: 'Local electricity consumption',
    category: 'electricity',
    unit: 'GWh',
  },
  {
    key: 'electricity_local_commercial',
    label: 'Commercial electricity consumption',
    category: 'electricity',
    unit: 'GWh',
  },
  {
    key: 'electricity_local_domestic',
    label: 'Domestic electricity consumption',
    category: 'electricity',
    unit: 'GWh',
  },
  { key: 'air_so2', label: 'SO2', category: 'pollution', unit: 'ppm' },
  {
    key: 'ipi_abs_index',
    label: 'Industrial Production Index',
    category: 'industrial',
    unit: 'index points',
  },
  {
    key: 'ipi_growth_yoy_index',
    label: 'IPI year-on-year growth',
    category: 'industrial',
    unit: '%',
  },
  {
    key: 'industrial_index',
    label: 'Industrial activity index',
    category: 'industrial',
    unit: 'index points',
  },
];

export const vehiclePredictorKeys = [
  'vehicle_registrations',
  'car_sales',
  'traffic_volume',
  'vehicle_production',
  'transport_index',
];

export const scenarioOptions = [
  {
    id: 'vehicle_to_pm25',
    key: 'vehicle_to_pm25',
    label: 'Vehicle activity → PM2.5',
    target: 'air_pm_25',
    acceptedPredictors: vehiclePredictorKeys,
    requiredPredictors: [],
    description: 'Forecast PM2.5 using compatible vehicle or transport activity indicators.',
  },
  {
    id: 'electricity_so2_to_ipi',
    key: 'electricity_so2_to_ipi',
    label: 'Electricity + SO2 → IPI',
    target: 'ipi_abs_index',
    acceptedPredictors: ['electricity_total', 'air_so2'],
    requiredPredictors: ['electricity_total', 'air_so2'],
    description: 'Forecast Industrial Production Index using electricity consumption and SO2 indicators.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Custom target and predictors',
    target: null,
    acceptedPredictors: [],
    requiredPredictors: [],
    description: 'Select a numeric target and one or more numeric predictors from the active dataset.',
  },
];

export const modelOptions = [
  { key: 'xgboost', label: 'XGBoost' },
  { key: 'sarima', label: 'SARIMA' },
  { key: 'var', label: 'VAR' },
  { key: 'prophet', label: 'Prophet' },
];

export const countryOptions = [
  { key: 'malaysia', label: 'Malaysia', status: 'Active built-in dataset', disabled: false },
  { key: 'singapore', label: 'Singapore', status: 'Future compatible dataset', disabled: true },
  { key: 'brunei', label: 'Brunei', status: 'Future compatible dataset', disabled: true },
];

export const horizonOptions = [
  { key: 1, label: '1 month' },
  { key: 3, label: '3 months' },
  { key: 6, label: '6 months' },
  { key: 12, label: '12 months' },
];

export const defaultScenarioId = 'electricity_so2_to_ipi';
export const defaultTargetKey = 'ipi_abs_index';
export const defaultPredictorKeys = ['electricity_total', 'air_so2'];

export const labelFor = (options, key) =>
  options.find((option) => option.key === key || option.id === key)?.label ?? key;

export const getTargetDefinition = (key) =>
  targetOptions.find((option) => option.key === key) ?? {
    key,
    label: key,
    shortLabel: key,
    category: 'custom',
    unit: '',
  };

export const getPredictorDefinition = (key) =>
  predictorOptions.find((option) => option.key === key) ?? {
    key,
    label: key,
    category: 'custom',
    unit: '',
  };

export const getScenarioDefinition = (id) =>
  scenarioOptions.find((scenario) => scenario.id === id) ?? scenarioOptions[0];

export const unitForTarget = (key) => getTargetDefinition(key).unit ?? '';
export const unitForPollutant = unitForTarget;

export const getTargetLabel = (key) => getTargetDefinition(key).label;
export const getTargetShortLabel = (key) => getTargetDefinition(key).shortLabel ?? getTargetLabel(key);
export const getPredictorLabel = (key) => getPredictorDefinition(key).label;

export const getAvailableOptions = (rows, options) =>
  options.filter((option) => rows.some((row) => Number.isFinite(row[option.key])));

export const getAvailableTargetOptions = (rows) => getAvailableOptions(rows, targetOptions);
export const getAvailablePredictorOptions = (rows) => getAvailableOptions(rows, predictorOptions);

export const hasNumericColumn = (rows, key) => rows.some((row) => Number.isFinite(row[key]));

export const getScenarioPredictorKeys = (scenarioId, rows) => {
  const scenario = getScenarioDefinition(scenarioId);

  if (scenario.id === 'custom') {
    return getAvailablePredictorOptions(rows).map((option) => option.key);
  }

  return scenario.acceptedPredictors.filter((key) => hasNumericColumn(rows, key));
};

export const isScenarioCompatible = (scenarioId, rows) => {
  const scenario = getScenarioDefinition(scenarioId);

  if (scenario.id === 'custom') {
    return getAvailableTargetOptions(rows).length > 0 && getAvailablePredictorOptions(rows).length > 0;
  }

  const hasTarget = hasNumericColumn(rows, scenario.target);
  const availablePredictors = scenario.acceptedPredictors.filter((key) => hasNumericColumn(rows, key));
  const hasRequiredPredictors = scenario.requiredPredictors.every((key) => hasNumericColumn(rows, key));
  const hasAcceptedPredictor = availablePredictors.length > 0;

  return hasTarget && (scenario.requiredPredictors.length ? hasRequiredPredictors : hasAcceptedPredictor);
};

export const formatPredictorList = (keys) => keys.map((key) => getPredictorLabel(key)).join(', ');

export const targetAliases = {
  air_co: 'air_co',
  co: 'air_co',
  air_no2: 'air_no2',
  no2: 'air_no2',
  air_o3: 'air_o3',
  o3: 'air_o3',
  air_pm_10: 'air_pm_10',
  pm10: 'air_pm_10',
  pm_10: 'air_pm_10',
  'pm 10': 'air_pm_10',
  air_pm_25: 'air_pm_25',
  pm25: 'air_pm_25',
  pm2_5: 'air_pm_25',
  'pm2.5': 'air_pm_25',
  'pm 2.5': 'air_pm_25',
  air_so2: 'air_so2',
  so2: 'air_so2',
  ipi: 'ipi_abs_index',
  ipi_abs_index: 'ipi_abs_index',
  industrial_production_index: 'ipi_abs_index',
  'industrial production index': 'ipi_abs_index',
  industrial_index: 'industrial_index',
  ipi_growth_yoy_index: 'ipi_growth_yoy_index',
};
