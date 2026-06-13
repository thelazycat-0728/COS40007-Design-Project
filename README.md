# Regional Time-Series Forecasting Dashboard

Frontend GUI/dashboard prototype for the COS40007 Artificial Intelligence for Engineering Design
Project.

## Current GUI Goal

The dashboard is now a user-facing forecasting-results flow. Normal users start at Overview, upload or
select a dataset, confirm which official scenario is compatible, then open Forecast Results. The browser
does not run real-time model inference from uploaded CSVs; uploads are used for validation and
compatibility checking only.

The Model Evidence page keeps the research handoff available. It presents results produced by the team
notebooks and output folders without requiring all models to use the same variables, transformations,
metrics, or export format. It labels what each official model actually produced:

- official-scale row outputs
- transformed-scale row outputs
- metrics-and-plot-only notebook results
- native artifacts without row exports
- stale or mismatched audit outputs

No model retraining was done for this GUI update.

## Official Scope

- Univariate: SARIMA and LSTM
- Multivariate: XGBoost and VAR

Prophet, VECM, baselines, and univariate XGBoost are not counted in the official final GUI scope.

## Repository State Used

- Latest `origin/main` was fetched and pulled before implementation.
- `origin/daryl-sarima` was merged into `main`.
- Official notebooks and output folders were inspected before GUI changes.
- The GUI now uses notebook-confirmed outputs and metrics under `public/model_outputs/`.

## Current Model Result Truth

| Model | Analysis | Current display mode | Notes |
| --- | --- | --- | --- |
| SARIMA | Univariate | official-scale row output | Five 2022 held-out test CSVs with actual, predicted, confidence interval, and metrics. |
| LSTM | Univariate | metrics and plot only | Five notebooks report original-scale metrics and saved artifacts; no dated row export is present. |
| XGBoost | Multivariate | metrics and plot only | Three official multivariate scenarios report metrics/artifacts/SHAP evidence; no dated row export is present. |
| VAR | Multivariate | row output with caveats | VAR1/VAR2 are differenced target outputs; VAR3 is PM2.5-scale future forecast. |

VAR caveats:

- VAR1 shows `d_air_no2` as `ΔNO2` with display label `Forecasted change in NO2`.
  Warning: `This VAR output is shown in differenced NO2 scale. It represents change in NO2, not official-scale NO2 concentration.`
- VAR2 shows `d_air_so2` as `ΔSO2` with display label `Forecasted change in SO2`.
  Warning: `This VAR output is shown in differenced SO2 scale. It represents change in SO2, not official-scale SO2 concentration.`
- VAR3 shows `air_pm_25` as `PM2.5` with display label `Forecasted PM2.5` and unit `µg/m³`.
  Note: `VAR3 forecasts PM2.5 in official target scale while using differenced NO2 as a transformed predictor.`

The old `public/model_outputs/xgboost_forecast.csv` SO2 rows remain as audit data only and are marked
`stale_or_mismatched`.

## Forecast Scenarios

1. Vehicle activity + local electricity -> NO2
   - Target: `air_no2`
   - Predictors: `car_registration`, `electricity_local`

2. IPI + electricity -> SO2
   - Target: `air_so2`
   - Predictors used by official notebooks: `ipi_abs_index` or `ipi_abs_index_sa`, `electricity_local`

3. NO2 -> PM2.5
   - Target: `air_pm_25`
   - Predictor: `air_no2`

## Output Files

Frontend model-result files live in:

```text
public/model_outputs/
```

Current normalized files:

- `model_artifacts.json`: official 16-entry model-result registry.
- `model_metrics.json`: notebook-reported metrics for all 16 official model results.
- `sarima_forecast.csv`: 60 official-scale SARIMA held-out test rows.
- `var_forecast.csv`: 72 VAR future forecast rows, including transformed VAR1/VAR2 outputs.
- `xgboost_forecast.csv`: stale/mismatched audit rows only.

Native JSON, PKL, H5, and weight files are not treated as browser forecast rows by themselves.

## Display Modes

- `official_scale_row_output`: dated forecast/prediction rows in the notebook target scale.
- `transformed_scale_row_output`: dated rows exist, but the target is differenced/transformed.
- `metrics_and_plot_only`: metrics and plot/artifact evidence exist, but no dated row export exists.
- `summary_metrics_only`: metrics exist without row output or reusable plot evidence.
- `artifact_only`: native model file exists without result display.
- `branch_or_pending`: not merged or not inspectable yet.
- `stale_or_mismatched`: retained audit data conflicts with source evidence and is hidden from results.

## Model Comparison Rules

The dashboard shows notebook-reported metrics, but it does not rank models unless outputs share:

- same target or scenario
- same dataset and period
- same frequency
- same unit
- same output scale
- same metric definition
- same result type
- compatible predictor setup for multivariate models

Mixed official-scale, transformed-scale, and metrics-only results are shown side by side without winner
labels or RMSE ranking bars.

## Chart Rules

Where row-level outputs exist:

- historical/actual series uses a solid line
- predicted/forecast series uses a dashed line
- a legend labels "Historical / Actual" and "Predicted / Forecast"
- the forecast/test start is marked with a vertical boundary
- transformed outputs include a scale warning
- small ppm values use enough decimals to avoid showing `0.00`
- PM2.5/PM10 units use the canonical `µg/m³` spelling; NO2/SO2 use `ppm` where the
  source notebooks report ppm.

Metrics-only results never synthesize fake forecast lines.

## Dataset Placement

The browser loads the cleaned Malaysia dataset from:

```text
public/data/combined_air_electricity_ipi_cleaned.csv
```

The canonical frontend vehicle column is:

```text
car_registration
```

The upload parser still accepts `vehicle_registrations` as a legacy alias and normalizes it to
`car_registration`.

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

`validate:model-readiness` checks the 16 official model results, SARIMA/VAR row exports, transformed
VAR caveats, stale XGBoost exclusion, vehicle-data sync, chart clarity hooks, unit consistency, and
sample-file exclusion.

## Presentation Flow

Recommended navigation order:

1. Overview
2. Upload Regional Dataset
3. Forecast Results
4. Model Evidence

Advanced / Evidence pages remain available from the sidebar for report support:

- Model Comparison
- Data Explorer
- Regional Comparison
- Policy Insight

Use Overview to explain the app, Upload Regional Dataset to validate columns and detect compatible
scenarios, Forecast Results to show notebook-confirmed charts/tables/metrics, and Model Evidence only
when a presenter needs source notebooks, caveats, output scale, or row-output status. Model ranking stays
disabled unless outputs are directly comparable.
