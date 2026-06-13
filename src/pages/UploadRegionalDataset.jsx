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

      setUploadedDataset(validation.dataset);
      setValidationMessage('Upload validation passed. Dataset is available for this browser session.');
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
          <p className="eyebrow">Upload Regional Dataset</p>
          <h1>Upload Regional Dataset</h1>
          <p>
            Upload a cleaned CSV to check which saved forecast result your data can be matched with.
          </p>
        </div>
      </div>

      <div className="table-panel requirement-panel">
        <div className="panel-heading">
          <h2>Required columns</h2>
          <span>Match one path</span>
        </div>
        <div className="requirement-grid">
          {requiredColumnGroups.map((group) => (
            <article key={group.title}>
              <h3>{group.title}</h3>
              <p>{group.columns.join(', ')}</p>
              <small>{group.note}</small>
            </article>
          ))}
        </div>
      </div>

      <div className="upload-panel">
        <div>
          <h2>Choose a CSV</h2>
          <p>
            CSV must include date, country, and the columns for one supported scenario.
          </p>
          <p>
            Uploaded CSVs are used for validation and compatibility checking only. The dashboard does
            not run real-time model inference from uploaded files.
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

      {validationMessage ? (
        <div className={`upload-message ${validationErrors.length ? 'error' : 'success'}`}>
          <strong>{validationMessage}</strong>
          {validationErrors.length ? (
            <p className="validation-guidance">
              Compare your CSV headers with the required-column guide above. Scenario testing is
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
        <div className="text-panel">
          <h2>No CSV uploaded yet</h2>
          <p>
            Upload a regional CSV to see compatible scenarios and open the matching saved result.
            The file is not saved permanently.
          </p>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Detected country</span>
              <strong>{uploadedDataset.countryName}</strong>
            </article>
            <article className="summary-card">
              <span>Rows</span>
              <strong>{uploadedDataset.rowCount}</strong>
            </article>
            <article className="summary-card">
              <span>Date range</span>
              <strong>{uploadedDataset.dateRange}</strong>
            </article>
            <article className="summary-card">
              <span>Upload use</span>
              <strong>Validation only</strong>
              <small>No real-time model inference is run from the uploaded CSV.</small>
            </article>
          </div>

          <div className="recommendation-panel">
            <span>Compatible result</span>
            {hasOfficialRecommendation ? (
              <>
                <h2>This dataset is compatible with the {recommendedScenario.label} scenario.</h2>
                <p>
                  Required columns were found. Open the saved XGBoost Multivariate and VAR result
                  states for this scenario.
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

          <div className="summary-grid">
            <ScenarioCompatibilityCard
              label="Univariate target history"
              compatible={detectedUnivariateTargets.length > 0}
            >
              {detectedUnivariateTargets.length
                ? `Detected ${detectedUnivariateTargets.map((target) => target.label).join(', ')}. Compatible models: SARIMA, LSTM, and XGBoost Univariate.`
                : 'Requires any supported target column such as air_so2, air_no2, electricity_local, ipi_abs_index_sa, or car_registration.'}
            </ScenarioCompatibilityCard>
            <ScenarioCompatibilityCard
              label="Vehicle activity + local electricity → NO2"
              compatible={uploadedDataset.scenarioCompatibility.vehicle_electricity_to_no2}
            >
              Requires `air_no2`, `electricity_local`, and at least one vehicle or transport predictor.
            </ScenarioCompatibilityCard>
            <ScenarioCompatibilityCard
              label="IPI + electricity → SO2"
              compatible={uploadedDataset.scenarioCompatibility.ipi_electricity_to_so2}
            >
              Requires `air_so2`, an IPI predictor, and an electricity predictor.
            </ScenarioCompatibilityCard>
            <ScenarioCompatibilityCard
              label="NO2 → PM2.5"
              compatible={uploadedDataset.scenarioCompatibility.no2_to_pm25}
            >
              Requires `air_pm_25` and `air_no2`.
            </ScenarioCompatibilityCard>
          </div>

          <div className="split-grid">
            <div className="text-panel">
              <h2>Detected targets</h2>
              <p>{uploadedDataset.detectedTargets.map((key) => getUploadedColumnLabel(key)).join(', ')}</p>
            </div>
            <div className="text-panel">
              <h2>Detected predictors</h2>
              <p>{uploadedDataset.detectedPredictors.map((key) => getUploadedColumnLabel(key)).join(', ')}</p>
            </div>
          </div>

          <div className="table-panel">
            <div className="panel-heading">
              <h2>Missing values summary</h2>
              <span>Detected fields</span>
            </div>
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
          </div>

          <div className="table-panel">
            <div className="panel-heading">
              <h2>Uploaded dataset preview</h2>
              <span>First 10 rows</span>
            </div>
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
                  {uploadedDataset.rows.slice(0, 10).map((row) => (
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
          </div>
        </>
      )}
    </section>
  );
}
