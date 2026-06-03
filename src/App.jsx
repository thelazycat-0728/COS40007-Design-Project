import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import DataExplorer from './pages/DataExplorer';
import ForecastSimulator from './pages/ForecastSimulator';
import ModelComparison from './pages/ModelComparison';
import Overview from './pages/Overview';
import PolicyInsight from './pages/PolicyInsight';
import RegionalComparison from './pages/RegionalComparison';
import { loadMalaysiaData } from './utils/data';

const sectionTitles = {
  overview: 'Overview',
  'data-explorer': 'Data Explorer',
  'forecast-simulator': 'Forecast Simulator',
  'model-comparison': 'Model Comparison',
  'regional-comparison': 'Regional Comparison',
  'policy-insight': 'Policy Insight',
};

export default function App() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState('malaysia');
  const [selectedPollutant, setSelectedPollutant] = useState('air_pm_25');
  const [selectedPredictor, setSelectedPredictor] = useState('electricity_total');
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [selectedHorizon, setSelectedHorizon] = useState(6);

  useEffect(() => {
    loadMalaysiaData()
      .then((data) => {
        setRows(data);
        setError('');
      })
      .catch((loadError) => {
        setError(loadError.message || 'Unable to load the cleaned dataset.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sharedProps = useMemo(
    () => ({
      rows,
      selectedCountry,
      setSelectedCountry,
      selectedPollutant,
      setSelectedPollutant,
      selectedPredictor,
      setSelectedPredictor,
      selectedModel,
      setSelectedModel,
      selectedHorizon,
      setSelectedHorizon,
    }),
    [rows, selectedCountry, selectedPollutant, selectedPredictor, selectedModel, selectedHorizon],
  );

  const renderSection = () => {
    if (isLoading) {
      return <div className="loading-panel">Loading cleaned Malaysia time-series data...</div>;
    }

    if (error) {
      return <div className="error-panel">Dataset error: {error}</div>;
    }

    switch (activeSection) {
      case 'data-explorer':
        return <DataExplorer {...sharedProps} />;
      case 'forecast-simulator':
        return <ForecastSimulator {...sharedProps} />;
      case 'model-comparison':
        return <ModelComparison />;
      case 'regional-comparison':
        return <RegionalComparison />;
      case 'policy-insight':
        return <PolicyInsight {...sharedProps} />;
      case 'overview':
      default:
        return <Overview {...sharedProps} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="main-content">
        <header className="topbar">
          <div>
            <span>Regional forecasting prototype</span>
            <strong>{sectionTitles[activeSection]}</strong>
          </div>
          <div className="dataset-pill">OpenDOSM Malaysia cleaned dataset</div>
        </header>
        {renderSection()}
      </main>
    </div>
  );
}
