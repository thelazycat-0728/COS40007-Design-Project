import { compactNumber } from '../utils/data';

export default function KpiCard({ label, value, unit }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{compactNumber(value)}</strong>
      {value !== null && value !== undefined ? <small>{unit}</small> : null}
    </article>
  );
}
