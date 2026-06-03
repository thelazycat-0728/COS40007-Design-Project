const countries = [
  {
    name: 'Malaysia',
    status: 'Active real dataset',
    detail: 'OpenDOSM pollution, electricity, and industrial activity indicators are connected.',
    active: true,
  },
  {
    name: 'Singapore',
    status: 'Future comparison option',
    detail: 'Disabled until compatible pollution, electricity, and industrial activity datasets are added.',
    active: false,
  },
  {
    name: 'Brunei',
    status: 'Future comparison option',
    detail: 'Disabled until compatible pollution, electricity, and industrial activity datasets are added.',
    active: false,
  },
];

const regionalSupportNote =
  'Regional comparison is supported where compatible pollution, electricity, and industrial activity datasets are available.';

export default function RegionalComparison() {
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
