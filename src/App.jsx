import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import DataExplorer from './pages/DataExplorer';
import ForecastSimulator from './pages/ForecastSimulator';
import ModelComparison from './pages/ModelComparison';
import ModelReadiness from './pages/ModelReadiness';
import Overview from './pages/Overview';
import PolicyInsight from './pages/PolicyInsight';
import RegionalComparison from './pages/RegionalComparison';
import UploadRegionalDataset from './pages/UploadRegionalDataset';
import {
  defaultAnalysisType,
  defaultPredictorKeys,
  defaultScenarioId,
  defaultTargetKey,
  getDefaultModelForAnalysis,
  getScenarioDefinition,
  isOfficialModelForAnalysis,
  univariateTargetsUnderConsideration,
} from './utils/constants';
import { loadMalaysiaData } from './utils/data';
import { defaultModelOutputs, loadModelOutputs } from './utils/modelOutputs';

const sectionTitles = {
  overview: 'Overview',
  'upload-regional-dataset': 'Upload Regional Dataset',
  'forecast-simulator': 'Forecast Results',
  'model-readiness': 'Model Evidence',
  'model-comparison': 'Model Comparison',
  'data-explorer': 'Data Explorer',
  'regional-comparison': 'Regional Comparison',
  'policy-insight': 'Policy Insight',
};

const scenarioDefaults = {
  vehicle_electricity_to_no2: {
    target: 'air_no2',
    predictors: [],
  },
  ipi_electricity_to_so2: {
    target: defaultTargetKey,
    predictors: defaultPredictorKeys,
  },
  no2_to_pm25: {
    target: 'air_pm_25',
    predictors: ['air_no2'],
  },
};

const defaultUnivariateTargetKey = univariateTargetsUnderConsideration[0].key;
const univariateTargetKeys = univariateTargetsUnderConsideration.map((target) => target.key);

export default function App() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelOutputs, setModelOutputs] = useState(defaultModelOutputs);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState('malaysia');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState(defaultAnalysisType);
  const [selectedScenario, setSelectedScenario] = useState(defaultScenarioId);
  const [selectedTarget, setSelectedTarget] = useState(defaultTargetKey);
  const [selectedPredictors, setSelectedPredictors] = useState(defaultPredictorKeys);
  const [selectedModel, setSelectedModel] = useState(getDefaultModelForAnalysis(defaultAnalysisType));
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
    setSelectedAnalysisType('multivariate');
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

  const handleAnalysisTypeChange = (analysisType) => {
    setSelectedAnalysisType(analysisType);

    if (!isOfficialModelForAnalysis(selectedModel, analysisType)) {
      setSelectedModel(getDefaultModelForAnalysis(analysisType));
    }

    if (analysisType === 'univariate') {
      setSelectedScenario('custom');
      setSelectedPredictors([]);
      setSelectedTarget((currentTarget) =>
        univariateTargetKeys.includes(currentTarget) ? currentTarget : defaultUnivariateTargetKey,
      );
      return;
    }

    setSelectedScenario(defaultScenarioId);
    setSelectedTarget(defaultTargetKey);
    setSelectedPredictors(defaultPredictorKeys);
  };

  const sharedProps = useMemo(
    () => ({
      rows,
      selectedCountry,
      setSelectedCountry,
      selectedAnalysisType,
      setSelectedAnalysisType: handleAnalysisTypeChange,
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
      selectedAnalysisType,
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
      case 'model-readiness':
        return <ModelReadiness {...sharedProps} />;
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
