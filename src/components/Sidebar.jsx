import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Factory,
  Gauge,
  Globe2,
  LineChart,
  UploadCloud,
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'model-readiness', label: 'Model Results', icon: ClipboardCheck },
  { id: 'forecast-simulator', label: 'Forecast Simulator', icon: BarChart3 },
  { id: 'model-comparison', label: 'Model Comparison', icon: Factory },
  { id: 'upload-regional-dataset', label: 'Upload Regional Dataset', icon: UploadCloud },
  { id: 'data-explorer', label: 'Data Explorer', icon: LineChart },
  { id: 'regional-comparison', label: 'Regional Comparison', icon: Globe2 },
  { id: 'policy-insight', label: 'Policy Insight', icon: Building2 },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">TS</span>
        <div>
          <strong>COS40007</strong>
          <small>Forecasting Dashboard</small>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Dashboard sections">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={activeSection === id ? 'active' : ''}
            onClick={() => onSectionChange(id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <span>Built-in dataset</span>
        <strong>Malaysia monthly time series</strong>
      </div>
    </aside>
  );
}
