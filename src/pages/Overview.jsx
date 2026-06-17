const quickActions = [
  {
    number: '1',
    title: 'Upload dataset',
    body: 'Upload a regional CSV to check which forecast scenario it matches.',
    action: 'Upload CSV',
    section: 'upload-regional-dataset',
    primary: true,
  },
  {
    number: '2',
    title: 'View Forecast Results',
    body: 'Open a saved result as a chart, table, or metrics summary.',
    action: 'Open results',
    section: 'forecast-simulator',
  },
  {
    number: '3',
    title: 'Check model evidence',
    body: 'Review source notebooks and output status when you need proof.',
    action: 'View evidence',
    section: 'model-readiness',
  },
];

const infoPills = [
  'Saved notebook results',
  'Upload checks compatibility',
  'No real-time model inference',
  'Ranking only when comparable',
];

const forecastPaths = [
  { label: 'Air quality', value: 'SO2, NO2, PM2.5' },
  { label: 'Energy and industry', value: 'Electricity, IPI' },
  { label: 'Transport', value: 'Vehicle registrations' },
  { label: 'Univariate', value: 'SARIMA, LSTM, XGBoost' },
  { label: 'Multivariate', value: 'XGBoost, VAR' },
];

export default function Overview({ setActiveSection }) {
  return (
    <section className="page-section overview-page">
      <div className="section-heading compact-hero">
        <div>
          <h1>Regional Forecasting Dashboard</h1>
          <p>
            Upload a regional dataset, check compatible scenarios, and view saved forecasting
            results from the COS40007 project.
          </p>
        </div>
      </div>

      <div className="quick-start-grid">
        {quickActions.map((item) => (
          <article className={`action-card ${item.primary ? 'primary-action-card' : ''}`} key={item.title}>
            <span>{item.number}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <button className="template-button" type="button" onClick={() => setActiveSection(item.section)}>
              {item.action}
            </button>
          </article>
        ))}
      </div>

      <div className="info-pill-row" aria-label="Dashboard truthfulness notes">
        {infoPills.map((pill) => (
          <span key={pill}>{pill}</span>
        ))}
      </div>

      <div className="table-panel compact-paths-panel">
        <div className="panel-heading">
          <h2>Available forecast paths</h2>
          <span>Official scope only</span>
        </div>
        <div className="path-grid">
          {forecastPaths.map((path) => (
            <article key={path.label}>
              <span>{path.label}</span>
              <strong>{path.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
