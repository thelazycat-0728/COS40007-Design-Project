import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Selector from '../components/Selector';
import { horizonOptions, labelFor, pollutantOptions, unitForPollutant } from '../utils/constants';
import { compactNumber } from '../utils/data';
import { generatePrototypeForecast } from '../utils/forecast';
import { calculateCorrelation, describeCorrelation } from '../utils/stats';
import {
  getUploadedColumnLabel,
  parseUploadedCsvFile,
  uploadedPredictorOptions,
  uploadedTemplatePath,
  validateAndNormalizeUploadedDataset,
} from '../utils/uploadedDataset';

const forecastDisclaimer =
  'This uploaded dataset forecast uses prototype trend logic only. It is not a trained XGBoost, SARIMA, VAR, or Prophet model output.';

const describeTrend = (pollutantLabel, horizonLabel, trendDirection) => {
  const directionText =
    trendDirection === 'stable'
      ? `${pollutantLabel} may remain broadly stable`
      : `${pollutantLabel} may ${trendDirection === 'increasing' ? 'increase' : 'decrease'}`;
  const implication =
    trendDirection === 'increasing'
      ? 'This may indicate a possible worsening trend in the uploaded regional time series.'
      : trendDirection === 'decreasing'
        ? 'This may indicate a possible easing trend in the uploaded regional time series.'
        : 'This may indicate no major short-term movement in the uploaded regional time series.';

  return `The uploaded dataset prototype forecast suggests that ${directionText} over the next ${horizonLabel}. ${implication} ${forecastDisclaimer}`;
};

export default function UploadRegionalDataset({ uploadedDataset, setUploadedDataset }) {
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedPollutant, setSelectedPollutant] = useState('air_pm_25');
  const [selectedPredictor, setSelectedPredictor] = useState('electricity_total');
  const [selectedHorizon, setSelectedHorizon] = useState(6);

  useEffect(() => {
    if (!uploadedDataset) return;

    setSelectedPollutant(uploadedDataset.detectedPollutants[0]);
    setSelectedPredictor(uploadedDataset.detectedPredictors[0]);
  }, [uploadedDataset]);

  const pollutantSelectorOptions = useMemo(
    () =>
      (uploadedDataset?.detectedPollutants ?? []).map((key) => ({
        key,
        label: labelFor(pollutantOptions, key),
      })),
    [uploadedDataset],
  );

  const predictorSelectorOptions = useMemo(
    () =>
      (uploadedDataset?.detectedPredictors ?? []).map((key) => ({
        key,
        label: getUploadedColumnLabel(key),
      })),
    [uploadedDataset],
  );

  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);
  const predictorLabel = getUploadedColumnLabel(selectedPredictor);
  const horizonLabel = labelFor(horizonOptions, Number(selectedHorizon));
  const unit = unitForPollutant(selectedPollutant);
  const rows = uploadedDataset?.rows ?? [];
  const forecast = generatePrototypeForecast(rows, selectedPollutant, Number(selectedHorizon));
  const correlation = uploadedDataset
    ? calculateCorrelation(rows, selectedPollutant, selectedPredictor)
    : null;
  const interpretation = describeTrend(pollutantLabel, horizonLabel, forecast.trendDirection);

  const trendRows = rows.map((row) => ({
    month: row.month,
    pollutant: row[selectedPollutant],
    predictor: row[selectedPredictor],
  }));

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
        setValidationMessage('Upload validation failed.');
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
          <h1>Browser-only regional CSV prototype forecasting</h1>
          <p>
            Upload a compatible cleaned CSV to preview regional pollution data and generate a
            prototype trend forecast for the current browser session.
          </p>
        </div>
      </div>

      <div className="upload-panel">
        <div>
          <h2>Upload instructions</h2>
          <p>
            CSV must include date and country, at least one supported pollutant column, and at least
            one electricity or industrial activity predictor column. Forecasts from uploaded data use
            prototype trend forecasting only.
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
          <h2>No uploaded dataset loaded</h2>
          <p>
            Upload a cleaned regional CSV to view validation results, dataset summary, exploratory
            charts, correlation, and prototype forecast output. The file is not saved permanently.
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
              <span>Forecast source</span>
              <strong>Prototype trend logic</strong>
            </article>
          </div>

          <div className="split-grid">
            <div className="text-panel">
              <h2>Detected pollutants</h2>
              <p>{uploadedDataset.detectedPollutants.map((key) => labelFor(pollutantOptions, key)).join(', ')}</p>
            </div>
            <div className="text-panel">
              <h2>Detected predictors</h2>
              <p>{uploadedDataset.detectedPredictors.map((key) => getUploadedColumnLabel(key)).join(', ')}</p>
            </div>
          </div>

          <div className="control-grid">
            <Selector
              id="upload-pollutant"
              label="Pollutant"
              value={selectedPollutant}
              options={pollutantSelectorOptions}
              onChange={setSelectedPollutant}
            />
            <Selector
              id="upload-predictor"
              label="Predictor"
              value={selectedPredictor}
              options={predictorSelectorOptions}
              onChange={setSelectedPredictor}
            />
            <Selector
              id="upload-horizon"
              label="Forecast horizon"
              value={Number(selectedHorizon)}
              options={horizonOptions}
              onChange={(value) => setSelectedHorizon(Number(value))}
            />
          </div>

          <div className="insight-row">
            <article className="insight-card">
              <span>Correlation</span>
              <strong>{correlation === null ? 'No data' : correlation.toFixed(3)}</strong>
              <small>{describeCorrelation(correlation)}. This may indicate association, not causation.</small>
            </article>
            <div className="text-panel">
              <h2>Relationship note</h2>
              <p>
                The selected pollutant and predictor are compared to identify whether the uploaded
                dataset may contain useful forecasting signals. This exploratory correlation does not
                prove that the predictor causes pollutant changes.
              </p>
            </div>
          </div>

          <div className="split-grid">
            <div className="chart-panel">
              <div className="panel-heading">
                <h2>{pollutantLabel} trend</h2>
                <span>Uploaded dataset</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                  <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                  <YAxis stroke="#5c7080" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="pollutant"
                    name={pollutantLabel}
                    stroke="#0891b2"
                    strokeWidth={3}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-panel">
              <div className="panel-heading">
                <h2>{predictorLabel} trend</h2>
                <span>Uploaded dataset</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                  <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                  <YAxis stroke="#5c7080" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="predictor"
                    name={predictorLabel}
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-panel">
            <div className="panel-heading">
              <h2>Actual and prototype forecasted {pollutantLabel}</h2>
              <span>Uploaded dataset prototype forecast</span>
            </div>
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={forecast.chartRows} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3edf0" />
                <XAxis dataKey="month" minTickGap={24} stroke="#5c7080" />
                <YAxis stroke="#5c7080" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name={`Actual ${pollutantLabel}`}
                  stroke="#0891b2"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name={`Prototype forecast ${pollutantLabel}`}
                  stroke="#16a34a"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="split-grid">
            <div className="table-panel forecast-table">
              <div className="panel-heading">
                <h2>Forecast table</h2>
                <span>Prototype values by month</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Forecasted value</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecastRows.map((row) => (
                      <tr key={row.date}>
                        <td>{row.month}</td>
                        <td>{compactNumber(row.forecast)}</td>
                        <td>{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <article className="interpretation-panel">
              <span>Uploaded forecast interpretation</span>
              <h2>Trend direction: {forecast.trendDirection}</h2>
              <p>{interpretation}</p>
            </article>
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
                  {rows.slice(0, 10).map((row) => (
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
