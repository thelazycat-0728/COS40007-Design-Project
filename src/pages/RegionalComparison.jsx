const countries = [
  {
    name: 'Malaysia',
    status: 'Active real dataset',
    detail: 'OpenDOSM pollution, electricity, and industrial activity indicators are connected for Scenario B.',
    active: true,
  },
  {
    name: 'Singapore',
    status: 'Future comparison option',
    detail: 'Disabled until compatible target and predictor datasets are added.',
    active: false,
  },
  {
    name: 'Brunei',
    status: 'Future comparison option',
    detail: 'Disabled until compatible target and predictor datasets are added.',
    active: false,
  },
];

const regionalSupportNote =
  'Regional comparison is supported where compatible target and predictor time-series datasets are available.';

export default function RegionalComparison({ uploadedDataset }) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Regional Comparison</p>
          <h1>Country dataset readiness</h1>
          <p>{regionalSupportNote}</p>
        </div>
      </div>

      <div className="country-grid">
        {countries.map((country) => (
          <article className={`country-card ${country.active ? 'active' : 'disabled'}`} key={country.name}>
            <span>{country.status}</span>
            <h2>{country.name}</h2>
            <p>{country.detail}</p>
          </article>
        ))}
        {uploadedDataset ? (
          <article className="country-card active uploaded-region-card">
            <span>Uploaded regional dataset available</span>
            <h2>{uploadedDataset.countryName}</h2>
            <p>
              This uploaded regional dataset is available for the current browser session. Any
              uploaded regional forecasts are prototype target-trend forecasts, not final trained
              model results.
            </p>
          </article>
        ) : null}
      </div>

      <div className="text-panel">
        <h2>Comparison policy</h2>
        <p>
          Malaysia is the active case study. Singapore and Brunei are shown as future options only,
          and no placeholder country values are treated as real observations.
        </p>
      </div>
    </section>
  );
}
