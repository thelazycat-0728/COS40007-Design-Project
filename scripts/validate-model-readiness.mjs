import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const parseCsv = (path) => {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const values = line.split(',');
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

const isConnectedForecastRow = (row, connectedArtifactKeys) => {
  const key = [row.model.toLowerCase(), row.target, row.scenario_id, row.source_notebook].join('|');

  return (
    row.integration_status === 'connected_output' &&
    isValidDate(row.date) &&
    Number.isFinite(Number(row.forecast_value)) &&
    Boolean(row.unit) &&
    Boolean(row.result_type) &&
    Boolean(row.source_notebook) &&
    connectedArtifactKeys.has(key)
  );
};

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
assert(Array.isArray(artifacts), 'model_artifacts.json must contain an artifacts array.');
assert(artifacts.length === 16, `Expected 16 official model entries, found ${artifacts.length}.`);

const countByStatus = artifacts.reduce((acc, artifact) => {
  acc[artifact.integration_status] = (acc[artifact.integration_status] ?? 0) + 1;
  return acc;
}, {});

assert(countByStatus.ready_for_export === 8, 'Expected 8 ready_for_export entries.');
assert(countByStatus.branch_only === 5, 'Expected 5 SARIMA branch_only entries.');
assert(countByStatus.notebook_only === 3, 'Expected 3 VAR notebook_only entries.');
assert(
  artifacts.filter((artifact) => artifact.model === 'LSTM').every((artifact) => artifact.integration_status === 'ready_for_export'),
  'Every LSTM entry must be ready_for_export.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'SARIMA').every((artifact) => artifact.integration_status === 'branch_only'),
  'Every SARIMA entry must be branch_only.',
);
assert(
  artifacts
    .filter((artifact) => artifact.model === 'XGBoost' && artifact.analysis_type === 'multivariate')
    .every((artifact) => artifact.integration_status === 'ready_for_export'),
  'Every official multivariate XGBoost entry must be ready_for_export.',
);
assert(
  artifacts.filter((artifact) => artifact.model === 'VAR').every((artifact) => artifact.integration_status === 'notebook_only'),
  'Every VAR entry must be notebook_only.',
);

const connectedArtifactKeys = new Set(
  artifacts
    .filter((artifact) => artifact.integration_status === 'connected_output' && artifact.gui_connected)
    .flatMap((artifact) =>
      (artifact.source_files ?? []).map((sourceFile) =>
        [artifact.model.toLowerCase(), artifact.target, artifact.scenario_id, sourceFile].join('|'),
      ),
    ),
);

const xgboostRows = parseCsv('public/model_outputs/xgboost_forecast.csv');
assert(xgboostRows.length === 12, 'Expected 12 retained XGBoost audit rows.');
assert(
  xgboostRows.every((row) => row.integration_status === 'stale_or_mismatched'),
  'Every retained XGBoost row must be marked stale_or_mismatched.',
);
assert(
  xgboostRows.every((row) => !isConnectedForecastRow(row, connectedArtifactKeys)),
  'Stale XGBoost rows must not validate as connected forecast rows.',
);

const invalidOutputRow = {
  date: '2022-01-01',
  target: 'air_so2',
  model: 'XGBoost',
  forecast_value: '0.001',
  unit: 'ppm',
  result_type: 'test_prediction',
  source_notebook: 'XGBoost/xgboost_car_forecast.ipynb',
  scenario_id: 'ipi_electricity_to_so2',
  integration_status: 'stale_or_mismatched',
};
assert(
  !isConnectedForecastRow(invalidOutputRow, connectedArtifactKeys),
  'Invalid or stale metadata must not validate as a connected output.',
);

const metrics = readJson('public/model_outputs/model_metrics.json').metrics;
assert(
  metrics.filter((metric) => metric.integration_status === 'connected_output').length === 0,
  'No metric entry should currently be connected_output.',
);
assert(
  metrics.some(
    (metric) =>
      metric.model === 'XGBoost' &&
      metric.target === 'air_so2' &&
      metric.integration_status === 'stale_or_mismatched',
  ),
  'The stale XGBoost SO2 metric must be marked stale_or_mismatched.',
);
assert(
  metrics.some(
    (metric) =>
      metric.target === 'car_registration' &&
      metric.source_notebook === 'XGBoost/xgboost_car_forecast.ipynb',
  ),
  'Vehicle-registration metric must point to XGBoost/xgboost_car_forecast.ipynb.',
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

const productionForecastFiles = [
  'sarima_forecast.csv',
  'lstm_forecast.csv',
  'xgboost_forecast.csv',
  'var_forecast.csv',
  'prophet_forecast.csv',
];
assert(
  productionForecastFiles.every((fileName) => !fileName.startsWith('sample_')),
  'Sample or template files must not be treated as production forecast files.',
);

console.log('Model readiness validation passed.');
