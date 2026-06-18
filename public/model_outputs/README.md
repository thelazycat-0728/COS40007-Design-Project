# Model Output Integration Files

This folder contains the frontend-facing model-result registry, metrics, and normalized row outputs used by the COS40007 Regional Time-Series Forecasting Dashboard.

The dashboard presents saved notebook outputs honestly. Some results have dated row-level forecasts or predictions. Other results have metrics and plot evidence only. Transformed-scale outputs are labelled so users do not interpret them as official pollutant concentrations.

Uploaded CSV files are used for column validation and scenario compatibility checking only. The deployed dashboard does not run real-time model inference from uploaded files.

## Official Model Scope

Univariate models:

- SARIMA
- LSTM
- XGBoost

Multivariate models:

- XGBoost
- VAR

XGBoost Univariate and XGBoost Multivariate are separate result groups. They share the same model family name but come from different notebooks and should not be mixed in selectors, charts, or evidence tables.

Excluded from the main dashboard scope:

- Prophet
- VECM
- baselines

## Files In This Folder

- `model_artifacts.json`
  - Registry for all 21 official model-result entries.
  - Stores display mode, source notebook, scale, metrics availability, row availability, plot availability, artifacts, and caveats.

- `model_metrics.json`
  - Notebook-reported metrics for all 21 official results.
  - Includes SARIMA, LSTM, XGBoost Univariate, XGBoost Multivariate, and VAR metrics.

- `sarima_forecast.csv`
  - 60 rows.
  - Five univariate targets.
  - 2022 held-out test predictions.
  - Includes actual values, predicted values, confidence intervals, units, and source notebook.

- `var_forecast.csv`
  - 72 rows.
  - Three VAR scenarios.
  - 2023-2024 future forecast rows.
  - VAR1 and VAR2 are transformed differenced outputs.
  - VAR3 is PM2.5-scale output with unit `µg/m³`.

- `xgboost_forecast.csv`
  - Retained audit file only.
  - Marked `stale_or_mismatched`.
  - Not used for charts, connected counts, or rankings.

## Upload Test Data

Use these organized project CSVs when checking upload behavior:

- `data/test-fixtures/all_models_complete_test.csv`
  - Full-coverage test file with all supported target and predictor columns.

- Singapore regional example CSV
  - Example non-Malaysia regional CSV for compatibility checking.

- `data/test-fixtures/univariate_targets_test.csv`
  - Tests univariate target-history compatibility.

- `data/test-fixtures/multivariate_vehicle_alias_test.csv`
  - Tests vehicle alias handling.

- `data/raw/`
  - Source files only; not direct GUI upload fixtures.

## Display Modes

Use these status/display values:

- `official_scale_row_output`
  - Dated forecast or prediction rows exist in the shown target scale.
  - Example: SARIMA test predictions and VAR3 PM2.5 forecast.

- `transformed_scale_row_output`
  - Dated rows exist but the target is transformed.
  - Example: VAR1 `d_air_no2`, VAR2 `d_air_so2`.

- `metrics_and_plot_only`
  - Notebook reports metrics and has plot or artifact evidence, but no dated row export.
  - Example: LSTM, XGBoost Univariate, and XGBoost Multivariate.

- `summary_metrics_only`
  - Metrics exist, but no row output or reusable plot is available.

- `artifact_only`
  - Native model artifact exists but no displayable result exists.

- `branch_or_pending`
  - Reserved for incomplete or not-inspectable handoffs.

- `stale_or_mismatched`
  - Retained audit output conflicts with source evidence and must stay hidden from result displays.

## Forecast CSV Contract

Normalized row-output CSVs use:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency,integration_status,status_message,display_target,notebook_target,official_target,output_scale,display_mode,caveat,display_label
```

Rules:

- `forecast_value` must come from an actual notebook or output file.
- `actual_value` is required for held-out test prediction rows when available.
- `actual_value` can be blank for future forecasts.
- `unit` must match the notebook or source scale.
- PM2.5 and PM10 units must use `µg/m³`.
- NO2 and SO2 notebook outputs use `ppm` or `ppm change` for differenced VAR rows.
- VAR1 and VAR2 must stay as `ppm change` until a model owner provides official-scale inverse transformation.
- Do not invent confidence intervals, actual values, dates, metrics, or inverse-transformed values.

## Model Notes

### SARIMA

- Source: `sarima/univariate/sarima_univariate.ipynb`
- Rows: `sarima/univariate/forecasts/*.csv`
- Display: official-scale held-out test prediction rows
- Caveat: some R2 values are negative; show results as notebook-produced and interpret carefully

### LSTM

- Source: five notebooks under `lstm/`
- Artifacts: JSON, H5, and weights files
- Display: metrics and plot only
- Caveat: no normalized dated row export exists

### XGBoost Univariate

- Source: five notebooks under `XGBoost/`
- Targets: `electricity_local`, `air_so2`, `air_no2`, `ipi_abs_index_sa`, and `car_registration`
- Artifacts: XGBoost native JSON and joblib PKL files
- Display: metrics and plot only
- Caveat: notebooks report original-scale metrics and inline plots, but no normalized dated row export exists

### XGBoost Multivariate

- Source: `XGBoost_Multivariate/xgboost_multivariate_models.ipynb`
- Display: metrics and plot only
- Caveat: original-scale MSE, RMSE, and R2 are printed; original-scale MAE is not printed in the notebook

### VAR

- Source: `var/varOnly(Brandon).ipynb`
- Result folder: `var/VarOnlyFileResults/`
- Do not use `var/varAndVCEM(Brandon).ipynb` or `VarAndVCEMFileResults/` for official VAR display
- VAR1 displays `d_air_no2` as `ΔNO2` with label `Forecasted change in NO2`
- VAR2 displays `d_air_so2` as `ΔSO2` with label `Forecasted change in SO2`
- VAR3 displays `air_pm_25` as `PM2.5` with label `Forecasted PM2.5` and unit `µg/m³`

## Comparison Policy

Model Comparison may show notebook-reported metrics from incompatible outputs, but it must not rank models unless target or scenario, period, unit, output scale, frequency, result type, metric definition, and predictor setup are compatible.

## Validation

Run:

```bash
npm run validate:model-readiness
```

The validation script checks:

- all 21 official result entries exist
- SARIMA rows are official-scale test predictions
- VAR1 and VAR2 remain transformed-scale row outputs
- VAR3 is PM2.5-scale row output
- LSTM and XGBoost outputs remain metrics-and-plot-only unless dated row exports are added
- stale XGBoost audit rows stay hidden
- NO2 and SO2 units are ppm
- chart code includes legend, forecast boundary, and no fake metrics-only forecast line
