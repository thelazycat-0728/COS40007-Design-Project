import { useState } from 'react';
import {
  getScenario2PredictorResolution,
  getScenarioDefinition,
  getUnivariateTargetOptions,
  vehiclePredictorKeys,
} from '../utils/constants';
import { compactNumber } from '../utils/data';
import {
  getUploadedColumnLabel,
  parseUploadedCsvFile,
  uploadedExampleDatasets,
  uploadedTemplatePath,
  validateAndNormalizeUploadedDataset,
} from '../utils/uploadedDataset';

const getInitialScenario = (scenarioCompatibility) => {
  if (scenarioCompatibility?.vehicle_electricity_to_no2) return 'vehicle_electricity_to_no2';
  if (scenarioCompatibility?.ipi_electricity_to_so2) return 'ipi_electricity_to_so2';
  if (scenarioCompatibility?.no2_to_pm25) return 'no2_to_pm25';
  return 'custom';
};

const getRecommendedPredictors = (dataset, scenarioId) => {
  if (scenarioId === 'vehicle_electricity_to_no2') {
    const detectedVehicle = vehiclePredictorKeys.find((key) => dataset.detectedPredictors.includes(key));
    return ['electricity_local', detectedVehicle || 'car_registration'].filter(Boolean);
  }

  if (scenarioId === 'ipi_electricity_to_so2') {
    return getScenario2PredictorResolution(dataset.rows).keys;
  }

  if (scenarioId === 'no2_to_pm25') {
    return ['air_no2'];
  }

  return [];
};

const getDetectedUnivariateTargets = (dataset) => {
  const univariateTargets = getUnivariateTargetOptions();
  const detected = new Set(dataset?.detectedTargets ?? []);
  return univariateTargets.filter((target) => detected.has(target.key));
};

const ScenarioCompatibilityCard = ({ label, compatible, children }) => (
  <article className={`summary-card ${compatible ? 'compatible' : 'incompatible'}`}>
    <span>{compatible ? 'Compatible' : 'Not compatible'}</span>
    <strong>{label}</strong>
    <small>{children}</small>
  </article>
);

const uploadTypes = [
  {
    title: 'Full regional dataset',
    body: 'Air quality, electricity, IPI, and vehicle columns in one monthly CSV.',
  },
  {
    title: 'Univariate target history',
    body: 'Date, country, and one supported target such as SO2, NO2, electricity, IPI, or vehicles.',
  },
  {
    title: 'Scenario-specific CSV',
    body: 'Only the target and predictors needed for one forecast scenario.',
  },
];

const requiredColumnGroups = [
  {
    title: 'Univariate target history',
    columns: ['date', 'country', 'one supported target column'],
    note: 'Compatible models: SARIMA, LSTM, and XGBoost Univariate. Uploads validate compatibility only.',
  },
  {
    title: 'Vehicle + electricity -> NO2',
    columns: ['date', 'country', 'air_no2', 'electricity_local', 'car_registration'],
    note: 'Compatible models: XGBoost Multivariate and VAR. vehicle_registrations is accepted as a legacy alias.',
  },
  {
    title: 'IPI + electricity -> SO2',
    columns: ['date', 'country', 'air_so2', 'ipi_abs_index_sa', 'electricity_local'],
    note: 'Compatible models: XGBoost Multivariate and VAR. ipi_abs_index and electricity_total are accepted fallbacks.',
  },
  {
    title: 'NO2 -> PM2.5',
    columns: ['date', 'country', 'air_pm_25', 'air_no2'],
    note: 'Compatible models: XGBoost Multivariate and VAR. Use monthly chronological rows with numeric values.',
  },
];

export default function UploadRegionalDataset({
  uploadedDataset,
  setUploadedDataset,
  setSelectedCountry,
  setSelectedAnalysisType,
  setSelectedScenario,
  setSelectedTarget,
  setSelectedPredictors,
  setSelectedModel,
  setForecastHorizon,
  setActiveSection,
}) {
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const recommendedScenarioId = uploadedDataset
    ? getInitialScenario(uploadedDataset.scenarioCompatibility)
    : 'custom';
  const hasOfficialRecommendation = recommendedScenarioId !== 'custom';
  const recommendedScenario = hasOfficialRecommendation ? getScenarioDefinition(recommendedScenarioId) : null;
  const recommendedPredictors =
    uploadedDataset && hasOfficialRecommendation
      ? getRecommendedPredictors(uploadedDataset, recommendedScenarioId)
      : [];
  const detectedUnivariateTargets = uploadedDataset ? getDetectedUnivariateTargets(uploadedDataset) : [];
  const missingValueCount = uploadedDataset
    ? uploadedDataset.missingSummary.reduce((total, item) => total + item.missing, 0)
    : 0;
  const compatiblePathCards = uploadedDataset
    ? [
        {
          id: 'univariate',
          label: 'Univariate target history',
          compatible: detectedUnivariateTargets.length > 0,
          body: detectedUnivariateTargets.length
            ? `Detected ${detectedUnivariateTargets.map((target) => target.label).join(', ')}. Compatible models: SARIMA, LSTM, and XGBoost Univariate.`
            : 'Requires one supported target column.',
        },
        {
          id: 'vehicle_electricity_to_no2',
          label: 'Vehicle activity + local electricity → NO2',
          compatible: uploadedDataset.scenarioCompatibility.vehicle_electricity_to_no2,
          body: 'Requires NO2, local electricity, and a vehicle indicator.',
        },
        {
          id: 'ipi_electricity_to_so2',
          label: 'IPI + electricity → SO2',
          compatible: uploadedDataset.scenarioCompatibility.ipi_electricity_to_so2,
          body: 'Requires SO2, an IPI predictor, and an electricity predictor.',
        },
        {
          id: 'no2_to_pm25',
          label: 'NO2 → PM2.5',
          compatible: uploadedDataset.scenarioCompatibility.no2_to_pm25,
          body: 'Requires PM2.5 and NO2.',
        },
      ]
    : [];

  const handleViewRecommendedResult = () => {
    if (!uploadedDataset || !recommendedScenario) return;

    setSelectedAnalysisType('multivariate');
    setSelectedCountry('malaysia');
    setSelectedScenario(recommendedScenario.id);
    setSelectedTarget(recommendedScenario.target);
    setSelectedPredictors(recommendedPredictors);
    setSelectedModel('var');
    setForecastHorizon(6);
    setActiveSection('forecast-simulator');
  };

  const handleViewUnivariateResult = (targetKey) => {
    if (!targetKey) return;

    setSelectedAnalysisType('univariate');
    setSelectedCountry('malaysia');
    setSelectedScenario('custom');
    setSelectedTarget(targetKey);
    setSelectedPredictors([]);
    setSelectedModel('xgboost');
    setForecastHorizon(6);
    setActiveSection('forecast-simulator');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setValidationMessage('');
    setValidationErrors([]);

    try {
      const result = await parseUploadedCsvFile(file);
      const validation = validateAndNormalizeUploadedDataset(result);

      if (!validation.ok) {
        setUploadedDataset(null);
        setValidationErrors(validation.errors);
        setValidationMessage('Upload validation failed. Check the required-column guide above.');
        return;
      }

      setUploadedDataset({
        ...validation.dataset,
        fileName: file.name,
      });
      setSelectedCountry('malaysia');
      setValidationMessage(
        `Upload validation passed. Detected country: ${validation.dataset.countryName}. Dataset is available for this browser session.`,
      );
      setValidationErrors([]);
    } catch (error) {
      setUploadedDataset(null);
      setValidationMessage('Upload parsing failed.');
      setValidationErrors([error.message || 'Unable to parse uploaded CSV.']);
    } finally {
      setIsParsing(false);
      event.target.value = '';
    }
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <h1>Upload Regional Dataset</h1>
          <p>
            Upload a cleaned CSV to check which saved forecast result your data can be matched with.
          </p>
        </div>
      </div>

      <div className="upload-panel primary-upload-panel">
        <div>
          <h2>Choose a CSV</h2>
          <p>
            CSV must include date, country, and the columns for one supported scenario.
          </p>
          <p>
            Uploaded CSVs are used for validation and compatibility checking only. The dashboard
            does not run real-time model inference from uploaded files.
          </p>
        </div>
        <div className="upload-actions">
          <a className="template-button" href={uploadedTemplatePath} download>
            Download CSV Template
          </a>
          <label className="file-upload">
            <span>{isParsing ? 'Validating CSV...' : 'Choose CSV file'}</span>
            <input accept=".csv,text/csv" type="file" onChange={handleUpload} disabled={isParsing} />
          </label>
        </div>
      </div>

      <div className="sample-dataset-panel">
        <div>
          <span>Need test data?</span>
          <strong>Download a sample country CSV, then upload it here.</strong>
        </div>
        <div className="inline-actions sample-dataset-actions">
          {uploadedExampleDatasets.map((sample) => (
            <a className="template-button subtle-template-button" href={sample.href} download key={sample.href}>
              {sample.label}
            </a>
          ))}
        </div>
      </div>

      <div className="table-panel upload-type-panel">
        <div className="panel-heading">
          <h2>What can I upload?</h2>
          <span>Three useful CSV shapes</span>
        </div>
        <div className="path-grid upload-path-grid">
          {uploadTypes.map((item) => (
            <article key={item.title}>
              <span>{item.title}</span>
              <strong>{item.body}</strong>
            </article>
          ))}
        </div>
        <details className="inline-details">
          <summary>View column requirements</summary>
          <div className="requirement-grid">
            {requiredColumnGroups.map((group) => (
              <article key={group.title}>
                <h3>{group.title}</h3>
                <p>{group.columns.join(', ')}</p>
                <small>{group.note}</small>
              </article>
            ))}
          </div>
        </details>
      </div>

      {validationMessage ? (
        <div className={`upload-message ${validationErrors.length ? 'error' : 'success'}`}>
          <strong>{validationMessage}</strong>
          {validationErrors.length ? (
            <p className="validation-guidance">
              Compare your CSV headers with the column requirements above. Scenario testing is
              disabled until the required target and predictor columns are detected.
            </p>
          ) : null}
          {validationErrors.length ? (
            <ul>
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!uploadedDataset ? (
        <div className="text-panel quiet-empty-panel">
          <h2>No CSV uploaded yet</h2>
          <p>
            Upload a regional CSV to see compatible scenarios and open the matching saved result.
            The file is not saved permanently.
          </p>
        </div>
      ) : (
        <>
          <div className="recommendation-panel">
            <span>Recommended result</span>
            {hasOfficialRecommendation ? (
              <>
                <h2>This dataset is compatible with the {recommendedScenario.label} scenario.</h2>
                <p>
                  Your uploaded dataset matches this scenario. Opening the saved notebook result
                  for that scenario.
                </p>
                <div className="inline-actions">
                  <button className="template-button" type="button" onClick={handleViewRecommendedResult}>
                    View forecast result
                  </button>
                </div>
              </>
            ) : (
              detectedUnivariateTargets.length ? (
              <>
                <h2>
                  This dataset has target history compatible with univariate forecasting.
                </h2>
                <p>
                  Detected targets: {detectedUnivariateTargets.map((target) => target.label).join(', ')}.
                  Compatible models are SARIMA, LSTM, and XGBoost Univariate.
                </p>
                <div className="inline-actions">
                  <button
                    className="template-button"
                    type="button"
                    onClick={() => handleViewUnivariateResult(detectedUnivariateTargets[0]?.key)}
                  >
                    View univariate XGBoost result
                  </button>
                </div>
              </>
              ) : (
              <>
                <h2>No official scenario was detected from these columns.</h2>
                <p>
                  Add one of the required-column groups above, then upload again.
                </p>
              </>
              )
            )}
          </div>

          <div className="summary-grid upload-summary-grid">
            <article className="summary-card">
              <span>Upload passed</span>
              <strong>{uploadedDataset.countryName}</strong>
              <small>
                {uploadedDataset.rowCount} rows · {uploadedDataset.dateRange}
                {uploadedDataset.hasMixedCountries
                  ? ` · Multiple countries detected: ${uploadedDataset.detectedCountries.join(', ')}`
                  : ' · Country auto-detected'}
              </small>
            </article>
            <article className="summary-card">
              <span>Upload use</span>
              <strong>Compatibility check only</strong>
              <small>Open the matching saved notebook result after validation passes.</small>
            </article>
            <article className="summary-card">
              <span>Data quality</span>
              <strong>{missingValueCount ? `${missingValueCount} missing` : 'No missing values'}</strong>
              <small>
                {missingValueCount
                  ? 'Open the details below for the full field summary.'
                  : `No missing values detected across ${uploadedDataset.rowCount} rows.`}
              </small>
            </article>
          </div>

          <div className="table-panel">
            <div className="panel-heading">
              <h2>Other compatible paths</h2>
              <span>Based on detected columns</span>
            </div>
            <div className="summary-grid compatibility-grid">
              {compatiblePathCards.map((card) => (
                <ScenarioCompatibilityCard label={card.label} compatible={card.compatible} key={card.id}>
                  {card.body}
                </ScenarioCompatibilityCard>
              ))}
            </div>
          </div>

          <div className="split-grid">
            <div className="text-panel chip-panel">
              <h2>Detected targets</h2>
              <div className="chip-row">
                {uploadedDataset.detectedTargets.map((key) => (
                  <span className="data-chip" key={key}>{getUploadedColumnLabel(key)}</span>
                ))}
              </div>
            </div>
            <div className="text-panel chip-panel">
              <h2>Detected predictors</h2>
              <div className="chip-row">
                {uploadedDataset.detectedPredictors.map((key) => (
                  <span className="data-chip" key={key}>{getUploadedColumnLabel(key)}</span>
                ))}
              </div>
            </div>
          </div>

          {uploadedDataset.aliasesMapped?.length ? (
            <div className="scope-note">
              <strong>Some columns were mapped to supported aliases:</strong>{' '}
              {uploadedDataset.aliasesMapped.map((item) => item.label).join(', ')}.
            </div>
          ) : null}

          <div className="table-panel">
            <details className="inline-details">
              <summary>View data quality details</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Missing values</th>
                      <th>Total rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedDataset.missingSummary.map((item) => (
                      <tr key={item.column}>
                        <td>{item.label}</td>
                        <td>{item.missing}</td>
                        <td>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <details className="inline-details">
              <summary>View dataset preview</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {uploadedDataset.previewColumns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedDataset.rows.slice(0, 6).map((row) => (
                      <tr key={`${row.date}-${row.country}`}>
                        {uploadedDataset.previewColumns.map((column) => (
                          <td key={column}>
                            {column === 'date' || column === 'country' ? row[column] : compactNumber(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
