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
    key: 'ipi_abs_index_sa',
    label: 'Seasonally adjusted IPI absolute index',
    shortLabel: 'SA IPI',
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
    key: 'ipi_growth_yoy_index_sa',
    label: 'Seasonally adjusted IPI year-on-year growth',
    shortLabel: 'IPI YoY growth SA',
    category: 'industrial',
    unit: '%',
  },
  {
    key: 'electricity_local',
    label: 'Local electricity consumption',
    shortLabel: 'Local electricity',
    category: 'electricity',
    unit: 'GWh',
  },
  {
    key: 'car_registration',
    label: 'Vehicle registrations',
    shortLabel: 'Vehicle registrations',
    category: 'vehicle',
    unit: 'registrations',
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
    key: 'car_registration',
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
  { key: 'air_no2', label: 'NO2', category: 'pollution', unit: 'ppm' },
  { key: 'air_so2', label: 'SO2', category: 'pollution', unit: 'ppm' },
  {
    key: 'ipi_abs_index',
    label: 'Industrial Production Index',
    category: 'industrial',
    unit: 'index points',
  },
  {
    key: 'ipi_abs_index_sa',
    label: 'Seasonally adjusted IPI absolute index',
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
    key: 'ipi_growth_yoy_index_sa',
    label: 'Seasonally adjusted IPI year-on-year growth',
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
  'car_registration',
  'car_sales',
  'traffic_volume',
  'vehicle_production',
  'transport_index',
];

export const scenario2PreferredPredictorKeys = ['ipi_abs_index_sa', 'electricity_local'];
export const scenario2FallbackPredictorKeys = ['ipi_abs_index', 'electricity_total'];

export const scenarioOptions = [
  {
    id: 'vehicle_electricity_to_no2',
    key: 'vehicle_electricity_to_no2',
    label: 'Vehicle activity + local electricity → NO2',
    target: 'air_no2',
    acceptedPredictors: ['electricity_local', ...vehiclePredictorKeys],
    requiredPredictors: ['electricity_local'],
    status: 'Requires uploaded vehicle data',
    description: 'Forecast NO2 using local electricity consumption and compatible vehicle or transport activity indicators.',
  },
  {
    id: 'ipi_electricity_to_so2',
    key: 'ipi_electricity_to_so2',
    label: 'IPI + electricity → SO2',
    target: 'air_so2',
    acceptedPredictors: [...scenario2PreferredPredictorKeys, ...scenario2FallbackPredictorKeys],
    requiredPredictors: [],
    preferredPredictors: scenario2PreferredPredictorKeys,
    fallbackPredictors: scenario2FallbackPredictorKeys,
    status: 'Supported by current Malaysia dataset',
    description: 'Forecast SO2 using an IPI indicator and electricity consumption.',
  },
  {
    id: 'no2_to_pm25',
    key: 'no2_to_pm25',
    label: 'NO2 → PM2.5',
    target: 'air_pm_25',
    acceptedPredictors: ['air_no2'],
    requiredPredictors: ['air_no2'],
    status: 'Optional extension',
    description: 'Forecast PM2.5 using NO2 as an optional extension discussed by the team.',
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

export const scenarioVariantLabels = {
  ipi_growth_yoy_sa_electricity_local_so2_lags:
    'IPI YoY growth SA + local electricity + historical SO2 features → SO2',
};

export const modelOptions = [
  { key: 'sarima', label: 'SARIMA' },
  { key: 'lstm', label: 'LSTM' },
  { key: 'xgboost', label: 'XGBoost' },
  { key: 'var', label: 'VAR' },
  { key: 'prophet', label: 'Prophet' },
];

export const analysisTypeOptions = [
  { key: 'multivariate', label: 'Multivariate' },
  { key: 'univariate', label: 'Univariate' },
];

export const defaultAnalysisType = 'multivariate';

export const officialModelKeys = ['sarima', 'lstm', 'xgboost', 'var'];

export const officialModelKeysByAnalysis = {
  univariate: ['sarima', 'lstm'],
  multivariate: ['xgboost', 'var'],
};

export const getOfficialModelOptions = (analysisType) => {
  const keys = officialModelKeysByAnalysis[analysisType] ?? officialModelKeys;
  return modelOptions.filter((model) => keys.includes(model.key));
};

export const getDefaultModelForAnalysis = (analysisType) =>
  getOfficialModelOptions(analysisType)[0]?.key ?? modelOptions[0].key;

export const isOfficialModelForAnalysis = (modelKey, analysisType) =>
  getOfficialModelOptions(analysisType).some((model) => model.key === modelKey);

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

export const defaultScenarioId = 'ipi_electricity_to_so2';
export const defaultTargetKey = 'air_so2';
export const defaultPredictorKeys = scenario2PreferredPredictorKeys;

export const univariateTargetsUnderConsideration = [
  {
    key: 'electricity_local',
    label: 'Local electricity consumption',
    availability: 'Available',
    availableInBuiltIn: true,
  },
  { key: 'air_so2', label: 'SO2', availability: 'Available', availableInBuiltIn: true },
  { key: 'air_no2', label: 'NO2', availability: 'Available', availableInBuiltIn: true },
  {
    key: 'ipi_abs_index_sa',
    label: 'Seasonally adjusted IPI absolute index',
    availability: 'Available',
    availableInBuiltIn: true,
  },
  {
    key: 'car_registration',
    label: 'Vehicle registrations',
    availability: 'Available after verified frontend data sync',
    availableInBuiltIn: true,
  },
];

export const getUnivariateTargetOptions = () =>
  univariateTargetsUnderConsideration.map((target) => ({
    key: target.key,
    label: target.label,
  }));

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

export const getScenario2PredictorResolution = (rows) => {
  const hasPreferredIpi = hasNumericColumn(rows, 'ipi_abs_index_sa');
  const hasPreferredElectricity = hasNumericColumn(rows, 'electricity_local');
  const ipiKey = hasPreferredIpi ? 'ipi_abs_index_sa' : hasNumericColumn(rows, 'ipi_abs_index') ? 'ipi_abs_index' : '';
  const electricityKey = hasPreferredElectricity
    ? 'electricity_local'
    : hasNumericColumn(rows, 'electricity_total')
      ? 'electricity_total'
      : '';
  const keys = [ipiKey, electricityKey].filter(Boolean);
  const usesPreferredPair = ipiKey === 'ipi_abs_index_sa' && electricityKey === 'electricity_local';

  return {
    keys,
    ready: keys.length === 2,
    label: usesPreferredPair ? 'Configured predictors' : 'Fallback predictors',
    usesFallback: !usesPreferredPair,
  };
};

export const getScenarioPredictorKeys = (scenarioId, rows) => {
  const scenario = getScenarioDefinition(scenarioId);

  if (scenario.id === 'custom') {
    return getAvailablePredictorOptions(rows).map((option) => option.key);
  }

  if (scenario.id === 'vehicle_electricity_to_no2') {
    const vehicleKeys = vehiclePredictorKeys.filter((key) => hasNumericColumn(rows, key));
    return hasNumericColumn(rows, 'electricity_local') ? ['electricity_local', ...vehicleKeys] : vehicleKeys;
  }

  if (scenario.id === 'ipi_electricity_to_so2') {
    return getScenario2PredictorResolution(rows).keys;
  }

  return scenario.acceptedPredictors.filter((key) => hasNumericColumn(rows, key));
};

export const isScenarioCompatible = (scenarioId, rows) => {
  const scenario = getScenarioDefinition(scenarioId);

  if (scenario.id === 'custom') {
    return getAvailableTargetOptions(rows).length > 0 && getAvailablePredictorOptions(rows).length > 0;
  }

  const hasTarget = hasNumericColumn(rows, scenario.target);

  if (scenario.id === 'vehicle_electricity_to_no2') {
    return (
      hasTarget &&
      hasNumericColumn(rows, 'electricity_local') &&
      vehiclePredictorKeys.some((key) => hasNumericColumn(rows, key))
    );
  }

  if (scenario.id === 'ipi_electricity_to_so2') {
    return hasTarget && getScenario2PredictorResolution(rows).ready;
  }

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
  ipi_abs_index_sa: 'ipi_abs_index_sa',
  seasonally_adjusted_ipi_absolute_index: 'ipi_abs_index_sa',
  sa_ipi: 'ipi_abs_index_sa',
  electricity_local: 'electricity_local',
  local_electricity: 'electricity_local',
  car_registration: 'car_registration',
  car_registrations: 'car_registration',
  vehicle_registration: 'car_registration',
  vehicle_registrations: 'car_registration',
  industrial_index: 'industrial_index',
  ipi_growth_yoy_index: 'ipi_growth_yoy_index',
  ipi_growth_yoy_index_sa: 'ipi_growth_yoy_index_sa',
  ipi_yoy_growth_sa: 'ipi_growth_yoy_index_sa',
  seasonally_adjusted_ipi_year_on_year_growth: 'ipi_growth_yoy_index_sa',
};

export const getScenarioVariantLabel = (key) => scenarioVariantLabels[key] ?? key;
