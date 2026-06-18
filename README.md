# Regional Time-Series Forecasting Dashboard

Regional Time-Series Forecasting Dashboard is a COS40007 project for exploring saved air-pollution forecasting results from the team's notebooks. The app helps users upload a regional CSV, check which forecasting scenarios the dataset supports, view available model results, and inspect the source evidence behind each model.

Production URL:

```text
https://regional-air-pollution-forecasting.vercel.app/
```

## What This Project Does

The dashboard focuses on Malaysian air-pollution forecasting using OpenDOSM-based monthly time-series data. It brings together air quality, electricity, industrial production, and vehicle activity variables, then displays the model outputs produced by the project team.

The app is designed for four main tasks:

1. Upload a cleaned regional CSV.
2. Validate required columns and detect compatible forecasting scenarios.
3. View saved forecast results, charts, metrics, and caveats.
4. Review model evidence, source notebooks, output status, and limitations.

Uploaded CSV files are used for validation and compatibility checking only. The deployed website does not run real-time model inference from uploaded files. Forecast Results shows saved notebook outputs and metrics already produced by the team.

## Main Features

- Dataset upload and validation
  - Checks for required columns such as `date`, `country`, air-quality targets, electricity, IPI, and vehicle activity.
  - Detects compatible univariate and multivariate forecast paths.
  - Supports `vehicle_registrations` as an alias for `car_registration`.

- Forecast Results
  - Shows row-level charts and tables when dated model outputs exist.
  - Shows metrics-only cards when notebooks produced metrics but no dated row export.
  - Keeps transformed VAR outputs clearly labelled as change forecasts.
  - Prevents fake forecast rows for metrics-only models.

- Model Evidence
  - Lists official model groups, targets, scenarios, output type, source notebooks, metrics, row-output status, and caveats.
  - Separates XGBoost Univariate from XGBoost Multivariate.
  - Keeps stale or mismatched outputs out of the main result flow.

- Advanced / Evidence pages
  - Model Comparison
  - Data Explorer
  - Regional Comparison
  - Policy Insight

## Navigation

The main user flow is:

1. Overview
2. Upload Regional Dataset
3. Forecast Results
4. Model Evidence
5. Advanced / Evidence

## Official Model Scope

Univariate models:

- SARIMA
- LSTM
- XGBoost

Multivariate models:

- XGBoost
- VAR

XGBoost Univariate and XGBoost Multivariate are treated as separate result groups because they come from different notebooks and use different input assumptions.

Prophet, VECM, baselines, and other experimental models are not part of the main dashboard scope.

## Available Model Results

| Model | Analysis type | Dashboard output | Notes |
| --- | --- | --- | --- |
| SARIMA | Univariate | Row-output chart and table | Five 2022 held-out test outputs with actual, predicted, confidence interval, and metrics. |
| LSTM | Univariate | Metrics and plot summary | Five notebooks report metrics and saved artifacts; no dated row export is shown. |
| XGBoost Univariate | Univariate | Metrics and plot summary | Five target-history notebooks report metrics and artifacts; no dated row export is shown. |
| XGBoost Multivariate | Multivariate | Metrics and plot summary | Three scenario notebooks report metrics, artifacts, and feature evidence; no dated row export is shown. |
| VAR | Multivariate | Row-output chart and table | VAR1 and VAR2 are differenced change forecasts; VAR3 is PM2.5-scale forecast output. |

## Forecast Scenarios

### Vehicle activity + local electricity -> NO2

- Target: `air_no2`
- Predictors: `car_registration`, `electricity_local`
- Used by: XGBoost Multivariate and VAR

### IPI + electricity -> SO2

- Target: `air_so2`
- Predictors: `ipi_abs_index` or `ipi_abs_index_sa`, `electricity_local`
- Used by: XGBoost Multivariate and VAR

### NO2 -> PM2.5

- Target: `air_pm_25`
- Predictor: `air_no2`
- Used by: XGBoost Multivariate and VAR

## VAR Output Notes

VAR outputs require careful interpretation:

- VAR1 shows `d_air_no2` as `ΔNO2` with the label `Forecasted change in NO2`.
  - This is a differenced target output, not official-scale NO2 concentration.
  - Unit shown: `ppm change`.

- VAR2 shows `d_air_so2` as `ΔSO2` with the label `Forecasted change in SO2`.
  - This is a differenced target output, not official-scale SO2 concentration.
  - Unit shown: `ppm change`.

- VAR3 shows `air_pm_25` as `PM2.5` with the label `Forecasted PM2.5`.
  - This is shown in PM2.5 scale.
  - Unit shown: `µg/m³`.

## Upload Data

A valid upload should include:

- `date`
- `country`
- at least one supported target column
- required predictor columns for multivariate scenarios, when applicable

Useful project CSVs:

- `data/test-fixtures/all_models_complete_test.csv`
  - Full-coverage test file with all supported target and predictor columns.

- Singapore regional example CSV
  - Example non-Malaysia regional CSV for compatibility checking.
  - The app detects compatible scenarios from this file, but the result chart still opens the saved notebook output for the matching scenario.

- `data/test-fixtures/univariate_targets_test.csv`
  - Tests univariate target-history compatibility.

- `data/test-fixtures/multivariate_vehicle_alias_test.csv`
  - Tests the `vehicle_registrations` alias.

- `data/raw/`
  - Source CSVs that require preprocessing before direct upload.

## Model Output Files

Frontend model result files live in:

```text
public/model_outputs/
```

Important files:

- `model_artifacts.json`
  - Registry for official model results, output type, source notebooks, row-output status, metrics status, and caveats.

- `model_metrics.json`
  - Notebook-reported metrics for the official model results.

- `sarima_forecast.csv`
  - SARIMA held-out test prediction rows.

- `var_forecast.csv`
  - VAR future forecast rows, including transformed VAR1 and VAR2 outputs.

- `xgboost_forecast.csv`
  - Retained for audit only. It is marked stale or mismatched and is not used in the main result charts.

Native model files such as JSON, PKL, H5, and weight files are not treated as browser-ready forecast rows by themselves.

## Display Modes

The dashboard uses these result modes:

- `official_scale_row_output`
  - Dated forecast or prediction rows exist in the shown target scale.

- `transformed_scale_row_output`
  - Dated rows exist, but the target is differenced or otherwise transformed.

- `metrics_and_plot_only`
  - Metrics and plot or artifact evidence exist, but no dated row export exists.

- `summary_metrics_only`
  - Metrics exist without row output or reusable plot evidence.

- `artifact_only`
  - Native model artifact exists without a displayable result.

- `branch_or_pending`
  - Reserved for incomplete or not-inspectable handoffs.

- `stale_or_mismatched`
  - Retained audit output conflicts with source evidence and is hidden from result displays.

## Chart And Comparison Rules

Where row-level outputs exist:

- actual or historical series use a solid line
- predicted or forecast series use a dashed line
- charts show a legend and forecast/test boundary
- transformed outputs show a scale warning
- small ppm values use enough precision to avoid rounding to `0.00`

Metrics-only results do not synthesize forecast lines, tables, or row-level predictions.

Model rankings are disabled unless outputs share the same target or scenario, dataset, period, frequency, unit, output scale, metric definition, result type, and compatible predictor setup.

## Local Development

Install dependencies:

```bash
npm install
```

Run the local app:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Validate model-result metadata:

```bash
npm run validate:model-readiness
```

## Important Limitations

- Uploaded CSVs do not trigger live model inference on the deployed website.
- The dashboard displays saved outputs and metrics from team notebooks.
- LSTM and XGBoost results are metrics-and-plot-only in the GUI unless dated row exports are added later.
- VAR1 and VAR2 are transformed change forecasts, not official-scale pollutant concentrations.
- Stale XGBoost SO2 audit rows remain disconnected from the main result flow.
- Forecasts are academic project outputs, not official environmental or policy predictions.
