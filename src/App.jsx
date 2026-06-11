import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import DataExplorer from './pages/DataExplorer';
import ForecastSimulator from './pages/ForecastSimulator';
import ModelComparison from './pages/ModelComparison';
import Overview from './pages/Overview';
import PolicyInsight from './pages/PolicyInsight';
import RegionalComparison from './pages/RegionalComparison';
import UploadRegionalDataset from './pages/UploadRegionalDataset';
import {
  defaultPredictorKeys,
  defaultScenarioId,
  defaultTargetKey,
  getScenarioDefinition,
} from './utils/constants';
import { loadMalaysiaData } from './utils/data';
import { defaultModelOutputs, loadModelOutputs } from './utils/modelOutputs';

const sectionTitles = {
  overview: 'Overview',
  'data-explorer': 'Data Explorer',
  'forecast-simulator': 'Forecast Simulator',
  'model-comparison': 'Model Comparison',
  'regional-comparison': 'Regional Comparison',
  'upload-regional-dataset': 'Upload Regional Dataset',
  'policy-insight': 'Policy Insight',
};

const scenarioDefaults = {
  vehicle_to_pm25: {
    target: 'air_pm_25',
    predictors: [],
  },
  electricity_so2_to_ipi: {
    target: defaultTargetKey,
    predictors: defaultPredictorKeys,
  },
};

export default function App() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelOutputs, setModelOutputs] = useState(defaultModelOutputs);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState('malaysia');
  const [selectedScenario, setSelectedScenario] = useState(defaultScenarioId);
  const [selectedTarget, setSelectedTarget] = useState(defaultTargetKey);
  const [selectedPredictors, setSelectedPredictors] = useState(defaultPredictorKeys);
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [forecastHorizon, setForecastHorizon] = useState(6);
  const [uploadedDataset, setUploadedDataset] = useState(null);

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

  useEffect(() => {
    loadModelOutputs()
      .then((outputs) => setModelOutputs(outputs))
      .catch(() => setModelOutputs(defaultModelOutputs));
  }, []);

  const handleScenarioChange = (scenarioId) => {
    setSelectedScenario(scenarioId);

    const scenario = getScenarioDefinition(scenarioId);
    if (scenario.id === 'custom') {
      return;
    }

    const defaults = scenarioDefaults[scenarioId] ?? {
      target: scenario.target,
      predictors: scenario.requiredPredictors,
    };

    setSelectedTarget(defaults.target);
    setSelectedPredictors(defaults.predictors);
  };

  const sharedProps = useMemo(
    () => ({
      rows,
      selectedCountry,
      setSelectedCountry,
      selectedScenario,
      setSelectedScenario: handleScenarioChange,
      selectedTarget,
      setSelectedTarget,
      selectedPredictors,
      setSelectedPredictors,
      selectedModel,
      setSelectedModel,
      forecastHorizon,
      setForecastHorizon,
      modelOutputs,
      uploadedDataset,
      setUploadedDataset,
      setActiveSection,
    }),
    [
      rows,
      selectedCountry,
      selectedScenario,
      selectedTarget,
      selectedPredictors,
      selectedModel,
      forecastHorizon,
      modelOutputs,
      uploadedDataset,
    ],
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
        return <ModelComparison {...sharedProps} />;
      case 'regional-comparison':
        return <RegionalComparison {...sharedProps} />;
      case 'upload-regional-dataset':
        return <UploadRegionalDataset {...sharedProps} />;
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
            <span>Regional time-series forecasting prototype</span>
            <strong>{sectionTitles[activeSection]}</strong>
          </div>
          <div className="dataset-pill">OpenDOSM Malaysia monthly dataset</div>
        </header>
        {renderSection()}
      </main>
    </div>
  );
}
