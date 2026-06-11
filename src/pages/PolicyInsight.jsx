import Selector from '../components/Selector';
import {
  getAvailableTargetOptions,
  getTargetDefinition,
  scenarioOptions,
  targetOptions,
} from '../utils/constants';

const targetInsight = {
  air_pm_25: {
    heading: 'PM2.5 planning interpretation',
    points: [
      'transport activity monitoring',
      'air-quality monitoring',
      'public-health planning',
      'early review of fine particulate exposure trends',
    ],
    body:
      'PM2.5 forecasts can help teams monitor whether transport or activity indicators align with fine particulate matter trends. This supports air-quality and public-health planning when real vehicle predictors and trained models are available.',
  },
  air_no2: {
    heading: 'NO2 planning interpretation',
    points: [
      'transport activity monitoring',
      'local electricity review',
      'air-quality monitoring',
      'meeting scenario validation',
    ],
    body:
      'NO2 is the target for the vehicle activity and local electricity scenario under discussion. Built-in data can show NO2 history, but vehicle-related model inputs require a compatible uploaded dataset.',
  },
  air_so2: {
    heading: 'SO2 planning interpretation',
    points: [
      'SO2 trend monitoring',
      'electricity demand analysis',
      'environmental-economic planning',
      'IPI relationship review',
    ],
    body:
      'SO2 is the target for the IPI and electricity scenario under discussion. The built-in dataset supports the prototype fallback view, while final trained outputs remain pending until teammates provide model files and metrics.',
  },
};

const fallbackInsight = {
  heading: 'Target-specific planning interpretation',
  points: ['time-series monitoring', 'indicator review', 'scenario planning', 'trend reporting'],
  body:
    'Forecast outputs should be interpreted according to the selected target category and the final model predictors used for that task.',
};

export default function PolicyInsight({ rows, selectedTarget, setSelectedTarget }) {
  const targetDefinition = getTargetDefinition(selectedTarget);
  const availableTargets = getAvailableTargetOptions(rows);
  const insight = targetInsight[selectedTarget] ?? fallbackInsight;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Policy Insight</p>
          <h1>Forecasting support for target-specific decisions</h1>
          <p>
            Time-series forecasts should be interpreted according to the selected target. Pollution
            targets, industrial targets, and custom indicators have different planning uses.
          </p>
        </div>
      </div>

      <div className="control-grid single-control">
        <Selector
          id="policy-target"
          label="Selected target"
          value={selectedTarget}
          options={availableTargets.length ? availableTargets : targetOptions}
          onChange={setSelectedTarget}
        />
      </div>

      <div className="policy-grid">
        {insight.points.map((point) => (
          <article className="policy-card" key={point}>
            <span>{point}</span>
            <p>
              Forecast outputs can support earlier review of {targetDefinition.label} trends before
              they become reporting or planning concerns.
            </p>
          </article>
        ))}
      </div>

      <article className="risk-card">
        <span>{targetDefinition.category} target interpretation</span>
        <h2>{insight.heading}</h2>
        <p>{insight.body}</p>
      </article>

      <div className="text-panel">
        <h2>Configured scenarios</h2>
        <p>{scenarioOptions.map((scenario) => scenario.label).join(', ')}.</p>
      </div>
    </section>
  );
}
