const quickActions = [
  {
    number: '1',
    title: 'Upload dataset',
    body: 'Upload a regional CSV to check which forecast scenario it matches.',
    action: 'Upload CSV',
    section: 'upload-regional-dataset',
  },
  {
    number: '2',
    title: 'View Forecast Results',
    body: 'See charts when row outputs exist, or metrics when notebooks only exported scores.',
    action: 'Open results',
    section: 'forecast-simulator',
  },
  {
    number: '3',
    title: 'Check model evidence',
    body: 'Review source notebooks, output status, and model caveats when needed.',
    action: 'View evidence',
    section: 'model-readiness',
  },
];

export default function Overview({ setActiveSection }) {
  return (
    <section className="page-section overview-page">
      <div className="section-heading compact-hero">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Regional Time-Series Forecasting Dashboard</h1>
          <p>
            Upload a dataset, check compatible scenarios, and view the team&apos;s saved forecasting
            results for the COS40007 project.
          </p>
        </div>
      </div>

      <div className="quick-start-grid">
        {quickActions.map((item) => (
          <article className="action-card" key={item.title}>
            <span>{item.number}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <button className="template-button" type="button" onClick={() => setActiveSection(item.section)}>
              {item.action}
            </button>
          </article>
        ))}
      </div>

      <div className="scope-note">
        <strong>Available model results:</strong> Univariate SARIMA, LSTM, and XGBoost; multivariate XGBoost and VAR.
        Uploaded CSVs are used for validation and compatibility checking only, not real-time model inference.
        Model ranking stays off unless results are directly comparable.
      </div>
    </section>
  );
}
