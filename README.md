# Regional Time-Series Forecasting Dashboard

Frontend GUI/dashboard prototype for the COS40007 Artificial Intelligence for Engineering Design
Project.

## Project Purpose

This project is scoped to time-series forecasting. The dashboard separates target variables,
predictor variables, forecast scenarios, model families, horizon, output source, and integration
status so prototype values are not mistaken for trained model outputs.

Official model scope:

- Univariate: SARIMA and LSTM
- Multivariate: XGBoost and VAR

Secondary or experimental work such as Prophet, univariate XGBoost, VECM, and baselines can remain
in the repository, but it is not counted in the official final model total.

## Current Repository Truth

The current GUI has zero fully trustworthy connected official model outputs.

- LSTM: five univariate notebooks, architecture/weight files, and metrics exist. Normalized row-level
  exports are still pending.
- SARIMA: five univariate row-level CSVs and metrics exist only on `origin/daryl-sarima`. They are
  not merged into `main`.
- XGBoost: three official multivariate model scenarios, artifacts, and original-scale metrics exist.
  Normalized row-level exports are still pending.
- VAR: notebook/code and diagnostics exist, but no saved model object, row-level forecast export, or
  frontend-ready metrics file is verified.

The previous `public/model_outputs/xgboost_forecast.csv` SO2 display is retained for audit only and
marked `stale_or_mismatched`. It is not shown as connected because its exported rows reference a
notebook whose current target no longer matches the output.

## Forecast Scenarios

1. Vehicle activity + local electricity -> NO2
   - Target: `air_no2`
   - Predictors: `car_registration`, `electricity_local`
   - Current GUI status: built-in Malaysia data contains the canonical `car_registration` column, but
     official model row-level exports are pending.

2. IPI + electricity -> SO2
   - Target: `air_so2`
   - Preferred predictors: `ipi_abs_index_sa`, `electricity_local`
   - Fallback predictors: `ipi_abs_index`, `electricity_total`
   - Current GUI status: built-in Malaysia data supports prototype fallback. Official connected
     outputs are pending.

3. NO2 -> PM2.5
   - Target: `air_pm_25`
   - Predictor: `air_no2`
   - Current GUI status: built-in Malaysia data supports prototype fallback. Official connected
     outputs are pending.

## Tech Stack

- React + Vite
- Recharts for chart rendering
- PapaParse for CSV loading
- Plain CSS for dashboard layout and responsive styling
- No backend

## Local Run

```bash
npm install
npm run dev
```

## Build And Validation

```bash
npm run build
npm run validate:model-readiness
```

`validate:model-readiness` checks the official registry, stale XGBoost exclusion, vehicle-data sync,
sample-file exclusion, and model-output metadata rules.

## Dataset Placement

The browser loads the cleaned Malaysia dataset from:

```text
public/data/combined_air_electricity_ipi_cleaned.csv
```

The canonical tracked frontend vehicle column is:

```text
car_registration
```

The upload parser still accepts `vehicle_registrations` as a legacy alias and normalizes it to
`car_registration`.

## Model Readiness Registry

The official model inventory is stored in:

```text
public/model_outputs/model_artifacts.json
```

Allowed readiness statuses:

- `connected_output`
- `ready_for_export`
- `metrics_only`
- `artifact_found`
- `notebook_only`
- `branch_only`
- `stale_or_mismatched`
- `missing`
- `metrics_pending_verification`

Native JSON, PKL, H5, and weight files are not browser prediction outputs. They can support
`artifact_available`, but they do not make a GUI connection.

## Final Model Output Integration

Supported production forecast files under `public/model_outputs/`:

- `sarima_forecast.csv`
- `lstm_forecast.csv`
- `xgboost_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Required production CSV columns for a connected output:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency,integration_status,status_message
```

For an output to count as connected:

- `integration_status` must be `connected_output`.
- Dates must be valid and `forecast_value` must be numeric.
- `unit`, `result_type`, and `source_notebook` must be present.
- Scenario metadata must match the target and predictors.
- The source must be verified through `model_artifacts.json`.
- Sample/template files are ignored.

If validation fails, the output is excluded from charts, connected counts, and rankings. It can still
be retained as audit metadata.

## Model Comparison Rules

Univariate comparison is SARIMA vs LSTM only. Multivariate comparison is XGBoost vs VAR only.

The dashboard does not rank models unless connected outputs share:

- target or scenario
- dataset
- test period
- frequency
- unit
- metric definition
- result type
- predictor setup for multivariate models

Until comparable connected outputs exist, the Model Comparison page shows readiness and individual
verified metrics only.

## Teammate Handoff Matrix

LSTM owner must provide:

- `lstm_forecast.csv`
- five targets
- dates, actual values, predicted values, and units
- test period and metrics
- preprocessing/scaler description

SARIMA owner must provide:

- merged or approved branch outputs
- `sarima_forecast.csv`
- metrics JSON entries
- confirmed source notebook
- test-period metadata

XGBoost owner must provide:

- `xgboost_forecast.csv`
- three official multivariate scenarios
- exact target and predictors
- engineered features
- actual/predicted rows
- original-scale metrics
- source notebook

VAR owner must provide:

- completed forecast code
- row-level prediction or forecast CSV
- metrics
- scenario mapping
- corrected interpretation of significance tests
- optional saved model or reproducible export script

## How To Use The Dashboard

Recommended navigation order:

1. Overview
2. Model Readiness
3. Forecast Simulator
4. Model Comparison
5. Upload Regional Dataset
6. Data Explorer
7. Regional Comparison
8. Policy Insight

1. Choose analysis type: univariate or multivariate.
2. Choose a target or scenario.
3. Choose only an allowed official model: SARIMA/LSTM for univariate, XGBoost/VAR for multivariate.
4. Read the integration status before interpreting a chart.
5. Expect the Forecast Simulator to show a pending state when no verified connected output exists.
6. Treat prototype fallback as frontend trend logic only.
7. Upload datasets only when required columns are present for the selected scenario.
8. Do not treat correlations or significance tests as causal proof.

Upload scenarios require:

- Vehicle + electricity -> NO2: `date`, `country`, `air_no2`, `electricity_local`, and
  `car_registration` or another supported vehicle indicator.
- IPI + electricity -> SO2: `date`, `country`, `air_so2`, an IPI column, and an electricity column.
- NO2 -> PM2.5: `date`, `country`, `air_pm_25`, and `air_no2`.
