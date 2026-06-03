import Selector from '../components/Selector';
import { labelFor, pollutantOptions } from '../utils/constants';

const policyPoints = [
  'early warning for high-pollution months',
  'industrial activity monitoring',
  'electricity demand and environmental planning',
  'data-driven air quality reporting',
  'public-sector environmental decision-making',
];

const riskText = {
  air_co:
    'CO changes can indicate combustion-related air quality pressure and should be monitored alongside transport, power, and industrial activity patterns.',
  air_no2:
    'NO2 risk interpretation supports monitoring of fuel combustion, urban emissions, and periods of intensified industrial demand.',
  air_o3:
    'O3 risk interpretation can support planning for photochemical pollution episodes during months with elevated precursor activity.',
  air_pm_10:
    'PM10 risk interpretation supports early warning for coarse particulate exposure and broader environmental planning actions.',
  air_pm_25:
    'PM2.5 risk interpretation is important for public health planning because fine particulate matter can create high exposure risk during worsening trend periods.',
  air_so2:
    'SO2 risk interpretation supports monitoring of fuel quality, industrial emissions, and possible regional haze-related pressure.',
};

export default function PolicyInsight({ selectedPollutant, setSelectedPollutant }) {
  const pollutantLabel = labelFor(pollutantOptions, selectedPollutant);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Policy Insight</p>
          <h1>Forecasting support for environmental decisions</h1>
          <p>
            Time-series forecasting can translate monthly pollutant trends into planning signals for
            academic, technical, and public-sector reporting.
          </p>
        </div>
      </div>

      <div className="control-grid single-control">
        <Selector
          id="policy-pollutant"
          label="Selected pollutant"
          value={selectedPollutant}
          options={pollutantOptions}
          onChange={setSelectedPollutant}
        />
      </div>

      <div className="policy-grid">
        {policyPoints.map((point) => (
          <article className="policy-card" key={point}>
            <span>{point}</span>
            <p>
              Forecast outputs can support earlier review of environmental conditions before
              monthly pollutant levels become operational concerns.
            </p>
          </article>
        ))}
      </div>

      <article className="risk-card">
        <span>Selected pollutant risk interpretation</span>
        <h2>{pollutantLabel}</h2>
        <p>{riskText[selectedPollutant]}</p>
      </article>
    </section>
  );
}
