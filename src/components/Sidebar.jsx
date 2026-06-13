import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Factory,
  Gauge,
  Globe2,
  LineChart,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const mainNavItems = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'upload-regional-dataset', label: 'Upload Regional Dataset', icon: UploadCloud },
  { id: 'forecast-simulator', label: 'Forecast Results', icon: BarChart3 },
  { id: 'model-readiness', label: 'Model Evidence', icon: ClipboardCheck },
];

const advancedNavItems = [
  { id: 'model-comparison', label: 'Model Comparison', icon: Factory },
  { id: 'data-explorer', label: 'Data Explorer', icon: LineChart },
  { id: 'regional-comparison', label: 'Regional Comparison', icon: Globe2 },
  { id: 'policy-insight', label: 'Policy Insight', icon: Building2 },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  const isAdvancedActive = advancedNavItems.some((item) => item.id === activeSection);
  const [advancedOpen, setAdvancedOpen] = useState(isAdvancedActive);

  useEffect(() => {
    if (isAdvancedActive) {
      setAdvancedOpen(true);
    }
  }, [isAdvancedActive]);

  const renderNavButton = ({ id, label, icon: Icon }) => (
    <button
      key={id}
      type="button"
      className={activeSection === id ? 'active' : ''}
      onClick={() => onSectionChange(id)}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

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
        <div className="sidebar-nav-group">
          <span className="sidebar-nav-label">Main flow</span>
          {mainNavItems.map(renderNavButton)}
        </div>
        <div className="sidebar-nav-group">
          <button
            type="button"
            className={`advanced-toggle ${advancedOpen || isAdvancedActive ? 'active' : ''}`}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <ChevronDown size={18} aria-hidden="true" className={advancedOpen ? 'expanded' : ''} />
            <span>Advanced / Evidence</span>
          </button>
          {advancedOpen ? <div className="advanced-nav-items">{advancedNavItems.map(renderNavButton)}</div> : null}
        </div>
      </nav>
      <div className="sidebar-note">
        <span>Built-in dataset</span>
        <strong>Malaysia monthly time series</strong>
      </div>
    </aside>
  );
}
