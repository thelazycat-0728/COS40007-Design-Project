import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readText = (path) => readFileSync(path, 'utf8');

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseCsv = (path) => {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isValidDate = (value) => {
  const date = new Date(value);
  return Boolean(value) && !Number.isNaN(date.getTime());
};

const isNumeric = (value) => Number.isFinite(Number(value));

const hashRows = (rows, columns) => {
  const hash = createHash('sha256');

  rows.forEach((row) => {
    hash.update(columns.map((column) => row[column] ?? '').join('\x1f'));
    hash.update('\n');
  });

  return hash.digest('hex');
};

const artifactsJson = readJson('public/model_outputs/model_artifacts.json');
const artifacts = artifactsJson.artifacts;
const var1Warning =
  'This VAR output is shown in differenced NO2 scale. It represents change in NO2, not official-scale NO2 concentration.';
const var2Warning =
  'This VAR output is shown in differenced SO2 scale. It represents change in SO2, not official-scale SO2 concentration.';
const var3Note =
  'VAR3 forecasts PM2.5 in official target scale while using differenced NO2 as a transformed predictor.';
assert(Array.isArray(artifacts), 'model_artifacts.json must contain an artifacts array.');
assert(artifacts.length === 21, `Expected 21 official model entries, found ${artifacts.length}.`);
assert(
  artifactsJson.official_scope?.univariate?.includes('XGBoost') &&
    artifactsJson.official_scope?.multivariate?.includes('XGBoost'),
  'Official scope must include XGBoost in both univariate and multivariate groups.',
);

const countByStatus = artifacts.reduce((acc, artifact) => {
  acc[artifact.integration_status] = (acc[artifact.integration_status] ?? 0) + 1;
  return acc;
}, {});

assert(countByStatus.official_scale_row_output === 6, 'Expected 6 official-scale row-output entries.');
assert(countByStatus.transformed_scale_row_output === 2, 'Expected 2 transformed VAR row-output entries.');
assert(countByStatus.metrics_and_plot_only === 13, 'Expected 13 metrics-and-plot-only entries.');
assert(!countByStatus.branch_only, 'SARIMA must no longer be branch_only after merge.');
assert(!countByStatus.notebook_only, 'VAR must no longer be notebook_only after VarOnly output inspection.');

assert(
  artifacts.filter((artifact) => artifact.model === 'SARIMA').every(
    (artifact) =>
      artifact.integration_status === 'official_scale_row_output' &&
      artifact.row_level_output_available &&
      artifact.output_scale === 'official_scale',
  ),
  'Every SARIMA entry must be official-scale row output.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'LSTM').every(
    (artifact) =>
      artifact.integration_status === 'metrics_and_plot_only' &&
      artifact.metrics_available &&
      !artifact.row_level_output_available,
  ),
  'Every LSTM entry must be metrics-and-plot-only with no row export.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'XGBoost Multivariate').every(
    (artifact) =>
      artifact.analysis_type === 'multivariate' &&
      artifact.integration_status === 'metrics_and_plot_only' &&
      artifact.metrics_available &&
      !artifact.row_level_output_available,
  ),
  'Every XGBoost Multivariate entry must be metrics-and-plot-only.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'XGBoost Univariate').length === 5 &&
    artifacts.filter((artifact) => artifact.model === 'XGBoost Univariate').every(
      (artifact) =>
        artifact.analysis_type === 'univariate' &&
        artifact.integration_status === 'metrics_and_plot_only' &&
        artifact.metrics_available &&
        artifact.artifact_available &&
        !artifact.row_level_output_available &&
        artifact.source_files.some((source) => source.startsWith('XGBoost/')) &&
        artifact.source_files.some((source) => source.endsWith('.pkl')),
    ),
  'Every XGBoost Univariate entry must be metrics-and-plot-only with JSON/PKL artifacts and no row export.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'VAR' && artifact.notebook_target !== 'air_pm_25').every(
    (artifact) =>
      artifact.integration_status === 'transformed_scale_row_output' &&
      artifact.output_scale === 'transformed_differenced' &&
      ((artifact.scenario_id === 'vehicle_electricity_to_no2' &&
        artifact.display_target === 'ΔNO2' &&
        artifact.display_label === 'Forecasted change in NO2' &&
        artifact.caveat === var1Warning) ||
        (artifact.scenario_id === 'ipi_electricity_to_so2' &&
          artifact.display_target === 'ΔSO2' &&
          artifact.display_label === 'Forecasted change in SO2' &&
          artifact.caveat === var2Warning)),
  ),
  'VAR1 and VAR2 must be transformed-scale outputs with exact change labels and caveats.',
);
assert(
  artifacts.some(
    (artifact) =>
      artifact.model === 'VAR' &&
      artifact.target === 'air_pm_25' &&
      artifact.integration_status === 'official_scale_row_output' &&
      artifact.display_target === 'PM2.5' &&
      artifact.display_label === 'Forecasted PM2.5' &&
      artifact.unit === 'µg/m³' &&
      artifact.caveat === var3Note,
  ),
  'VAR3 PM2.5 must be present as an official-scale row output with canonical unit and note.',
);

const metrics = readJson('public/model_outputs/model_metrics.json').metrics;
assert(metrics.length === 21, `Expected 21 official metric entries, found ${metrics.length}.`);
assert(
  metrics.filter((metric) => metric.model === 'XGBoost Multivariate').every(
    (metric) => metric.source_notebook === 'XGBoost_Multivariate/xgboost_multivariate_models.ipynb',
  ),
  'XGBoost Multivariate metrics must come from the multivariate notebook.',
);
assert(
  metrics.filter((metric) => metric.model === 'XGBoost Univariate').length === 5 &&
    metrics.filter((metric) => metric.model === 'XGBoost Univariate').every(
      (metric) =>
        metric.analysis_type === 'univariate' &&
        metric.integration_status === 'metrics_and_plot_only' &&
        metric.source_notebook.startsWith('XGBoost/') &&
        metric.source_files.some((source) => source.endsWith('.json')) &&
        metric.source_files.some((source) => source.endsWith('.pkl')) &&
        !metric.row_level_output_available,
    ),
  'XGBoost Univariate metrics must come from the XGBoost Univariate notebooks and remain non-row-output.',
);
assert(
  metrics.filter((metric) => metric.model === 'VAR').every(
    (metric) => metric.source_notebook === 'var/varOnly(Brandon).ipynb',
  ),
  'Official VAR metrics must come from varOnly(Brandon).ipynb.',
);

const sarimaRows = parseCsv('public/model_outputs/sarima_forecast.csv');
assert(sarimaRows.length === 60, 'Expected 60 normalized SARIMA forecast rows.');
assert(
  sarimaRows.every(
    (row) =>
      row.integration_status === 'official_scale_row_output' &&
      row.output_scale === 'official_scale' &&
      isValidDate(row.date) &&
      isNumeric(row.forecast_value) &&
      isNumeric(row.actual_value) &&
      isNumeric(row.lower_bound) &&
      isNumeric(row.upper_bound) &&
      row.result_type === 'test_prediction',
  ),
  'Every SARIMA row must be official-scale test prediction output with actuals and intervals.',
);
assert(
  sarimaRows.filter((row) => row.target === 'air_so2').every((row) => row.unit === 'ppm') &&
    sarimaRows.filter((row) => row.target === 'air_no2').every((row) => row.unit === 'ppm'),
  'SARIMA NO2/SO2 rows must use ppm units.',
);

const varRows = parseCsv('public/model_outputs/var_forecast.csv');
assert(varRows.length === 72, 'Expected 72 normalized VAR forecast rows.');
assert(
  varRows.filter((row) => row.notebook_target === 'd_air_no2').every(
    (row) =>
      row.integration_status === 'transformed_scale_row_output' &&
      row.unit === 'ppm change' &&
      row.actual_value === '' &&
      row.display_target === 'ΔNO2' &&
      row.display_label === 'Forecasted change in NO2' &&
      row.caveat === var1Warning,
  ),
  'VAR1 rows must remain differenced NO2 change output, not official NO2 concentration.',
);
assert(
  varRows.filter((row) => row.notebook_target === 'd_air_so2').every(
    (row) =>
      row.integration_status === 'transformed_scale_row_output' &&
      row.unit === 'ppm change' &&
      row.actual_value === '' &&
      row.display_target === 'ΔSO2' &&
      row.display_label === 'Forecasted change in SO2' &&
      row.caveat === var2Warning,
  ),
  'VAR2 rows must remain differenced SO2 change output, not official SO2 concentration.',
);
assert(
  varRows.filter((row) => row.notebook_target === 'air_pm_25').every(
    (row) =>
      row.integration_status === 'official_scale_row_output' &&
      row.unit === 'µg/m³' &&
      row.result_type === 'future_forecast' &&
      row.display_target === 'PM2.5' &&
      row.display_label === 'Forecasted PM2.5' &&
      row.caveat === var3Note,
  ),
  'VAR3 rows must be PM2.5 future forecast rows with canonical PM unit.',
);

const xgboostRows = parseCsv('public/model_outputs/xgboost_forecast.csv');
assert(xgboostRows.length === 12, 'Expected 12 retained XGBoost audit rows.');
assert(
  xgboostRows.every((row) => row.integration_status === 'stale_or_mismatched'),
  'Retained old XGBoost rows must remain stale_or_mismatched.',
);

const canonicalRows = parseCsv('COS40007DataCleaning/combined_air_electricity_ipi_cleaned.csv');
const publicRows = parseCsv('public/data/combined_air_electricity_ipi_cleaned.csv');
const canonicalColumns = Object.keys(canonicalRows[0]);
const publicColumns = Object.keys(publicRows[0]);
const sharedColumns = publicColumns.filter((column) => canonicalColumns.includes(column));
assert(publicRows.length === 60, 'Public frontend dataset must contain 60 rows.');
assert(publicColumns.includes('car_registration'), 'Public frontend dataset must include car_registration.');
assert(
  hashRows(canonicalRows, sharedColumns) === hashRows(publicRows, sharedColumns),
  'Canonical and public datasets must match on shared columns.',
);

const constantsSource = readText('src/utils/constants.js');
assert(constantsSource.includes("key: 'air_no2', label: 'NO2', shortLabel: 'NO2', category: 'pollution', unit: 'ppm'"), 'NO2 unit must be ppm.');
assert(constantsSource.includes("key: 'air_so2', label: 'SO2', shortLabel: 'SO2', category: 'pollution', unit: 'ppm'"), 'SO2 unit must be ppm.');

const forecastSimulatorSource = readText('src/pages/ForecastSimulator.jsx');
assert(
  forecastSimulatorSource.includes('Forecast Results') &&
    forecastSimulatorSource.includes('Choose saved result') &&
    forecastSimulatorSource.includes('Advanced filters') &&
  forecastSimulatorSource.includes('Metrics and plot only') &&
    forecastSimulatorSource.includes('No forecast line is drawn.') &&
    forecastSimulatorSource.includes('XGBoost Univariate'),
  'Forecast Results must use a saved-result selector and show metrics-only state without fake forecast lines.',
);
assert(
  forecastSimulatorSource.includes('<Legend') &&
    forecastSimulatorSource.includes('<ReferenceLine') &&
    forecastSimulatorSource.includes('Historical / Actual') &&
    forecastSimulatorSource.includes('Predicted / Forecast'),
  'Forecast charts must include legend, boundary, and distinct actual/predicted labels.',
);
assert(
  forecastSimulatorSource.includes('transformed-scale output') &&
    forecastSimulatorSource.includes('not official-scale'),
  'Forecast Results must label transformed-scale VAR output.',
);
assert(
  !forecastSimulatorSource.includes(['Connected XGBoost', 'held-out test predictions'].join(' ')),
  'Forecast Results must not present stale XGBoost rows as connected output.',
);

const overviewSource = readText('src/pages/Overview.jsx');
assert(
  overviewSource.includes('Regional Forecasting Dashboard') &&
    overviewSource.includes('Forecast Results') &&
    overviewSource.includes('Upload dataset') &&
    overviewSource.includes('Check model evidence') &&
    overviewSource.includes('Saved notebook results') &&
    overviewSource.includes('Upload checks compatibility') &&
    overviewSource.includes('No real-time model inference') &&
    overviewSource.includes('Ranking only when comparable') &&
    overviewSource.includes('Available forecast paths') &&
    overviewSource.includes('SARIMA, LSTM, XGBoost') &&
    overviewSource.includes('XGBoost, VAR'),
  'Overview must stay focused on the simplified user-facing forecasting-results flow.',
);

const readinessSource = readText('src/pages/ModelReadiness.jsx');
assert(
  readinessSource.includes('Model Evidence') &&
    readinessSource.includes('Chart-ready outputs') &&
    readinessSource.includes('Transformed outputs') &&
    readinessSource.includes('Metrics-only results') &&
    readinessSource.includes('XGBoost Univariate') &&
    readinessSource.includes('XGBoost Multivariate') &&
    readinessSource.includes('Audit note'),
  'Model Evidence page must expose display modes.',
);

const comparisonSource = readText('src/pages/ModelComparison.jsx');
assert(
  comparisonSource.includes('Notebook-reported metric summary') &&
    comparisonSource.includes('not forced rankings'),
  'Model Comparison must be result-summary-first, not ranking-first.',
);

const uploadSource = readText('src/pages/UploadRegionalDataset.jsx');
assert(
  uploadSource.includes('Vehicle + electricity -> NO2') &&
    uploadSource.includes('Univariate target history') &&
    uploadSource.includes('XGBoost Univariate') &&
    uploadSource.includes('XGBoost Multivariate') &&
    uploadSource.includes('IPI + electricity -> SO2') &&
    uploadSource.includes('NO2 -> PM2.5') &&
    uploadSource.includes('No real-time model inference is run from the uploaded CSV') &&
    uploadSource.includes('View forecast result'),
  'Upload page must show scenario-specific requirements, validation-only wording, and result routing.',
);

const searchedSources = [
  readText('src/pages/Overview.jsx'),
  readText('src/pages/ForecastSimulator.jsx'),
  readText('src/pages/ModelComparison.jsx'),
  readText('src/pages/ModelReadiness.jsx'),
  readText('README.md'),
  readText('public/model_outputs/README.md'),
].join('\n');
const unrelatedModelTerm = ['clu', 'ster'].join('');
assert(
  !new RegExp(`${unrelatedModelTerm}|${unrelatedModelTerm}ing`, 'i').test(searchedSources),
  'Dashboard/docs must not include unrelated model-family wording.',
);

console.log('Model results validation passed.');
