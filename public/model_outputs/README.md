# Finalized Model Output Integration Files

This folder contains the finalized frontend-facing model-result registry and normalized row outputs for
the official COS40007 model families.

The finalized GUI presents notebook-confirmed results honestly. A result does not have to be a fully
normalized official-scale forecast to appear, but transformed-scale and metrics-only outputs must be
labelled clearly.

The main user flow is Overview -> Upload Regional Dataset -> Forecast Results -> Model Evidence.
Uploaded CSV files are used for column validation and scenario compatibility checking only. The
deployed dashboard does not run real-time model inference from uploaded files. Forecast Results
presents saved notebook-confirmed row outputs, metrics, and caveats.

## Official Scope

- Univariate: SARIMA, LSTM, and XGBoost
- Multivariate: XGBoost and VAR

XGBoost Univariate and XGBoost Multivariate are separate result groups. They share the same model
family name but come from different notebooks and should not be mixed in selectors or evidence tables.

Excluded from the final GUI scope:

- Prophet
- VECM
- baselines

## Finalized Files

- `model_artifacts.json`
  - 21 official model-result entries.
  - Source of truth for display mode, source notebook, scale, metrics availability, row availability,
    plot availability, artifacts, and caveats.

- `model_metrics.json`
  - Notebook-reported metrics for all 21 official results.
  - Includes official-scale SARIMA metrics, LSTM original-scale notebook metrics, XGBoost Univariate
    target-history metrics, XGBoost Multivariate scenario metrics, and VAR equation metrics.

- `sarima_forecast.csv`
  - 60 rows.
  - Five univariate targets.
  - 2022 held-out test predictions.
  - Includes actual values, predicted values, confidence intervals, units, and source notebook.

- `var_forecast.csv`
  - 72 rows.
  - Three VAR scenarios.
  - 2023-2024 future forecast rows.
  - VAR1/VAR2 are transformed differenced outputs.
  - VAR3 is PM2.5-scale output with unit `µg/m³`.

- `xgboost_forecast.csv`
  - Retained audit file only.
  - Marked `stale_or_mismatched`.
  - Not used for charts, connected counts, or rankings.

## Upload Test Data

Use these finalized organized project CSVs when checking upload behavior:

- `data/demo/singapore_combined_2023_2024_demo.csv`
  - Final external-country demo upload.
  - Demonstrates scenario compatibility detection.
- `data/test-fixtures/all_models_complete_test.csv`
  - Final controlled full-coverage regression upload.
- `data/test-fixtures/multivariate_vehicle_alias_test.csv`
  - Tests vehicle alias handling.
- `data/test-fixtures/univariate_targets_test.csv`
  - Tests univariate target-history compatibility.
- `data/raw/`
  - Source files only; not direct GUI upload fixtures.

Final demo rule: use `all_models_complete_test.csv` for Malaysia full model access testing and
`singapore_combined_2023_2024_demo.csv` for external-country compatibility demonstration.

## Display Modes

Use these status/display values:

- `official_scale_row_output`
  - Dated forecast or prediction rows exist in the shown target scale.
  - Example: SARIMA test predictions and VAR3 PM2.5 forecast.

- `transformed_scale_row_output`
  - Dated rows exist but the target is transformed.
  - Example: VAR1 `d_air_no2`, VAR2 `d_air_so2`.

- `metrics_and_plot_only`
  - Notebook reports metrics and has plot/artifact evidence, but no dated row export.
  - Example: LSTM, XGBoost Univariate, and XGBoost Multivariate.

- `summary_metrics_only`
  - Metrics exist, but no row output or reusable plot is available.

- `artifact_only`
  - Native model artifact exists but no displayable result exists.

- `branch_or_pending`
  - Reserved for future incomplete or not-inspectable handoffs.

- `stale_or_mismatched`
  - Retained audit output conflicts with source evidence and must stay hidden from result displays.

## Forecast CSV Contract

Normalized row-output CSVs use:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency,integration_status,status_message,display_target,notebook_target,official_target,output_scale,display_mode,caveat,display_label
```

Rules:

- `forecast_value` must come from an actual notebook/output file.
- `actual_value` is required for held-out test prediction rows when available.
- `actual_value` can be blank for future forecasts.
- `unit` must match the notebook/source scale.
- PM2.5/PM10 units must use `µg/m³`; NO2/SO2 notebook outputs use `ppm` or
  `ppm change` for differenced VAR rows.
- VAR1/VAR2 must stay as `ppm change` until the model owner provides official-scale inverse
  transformation.
- Do not invent confidence intervals, actual values, dates, metrics, or inverse-transformed values.

## Finalized Model Notes

SARIMA:

- Source: `sarima/univariate/sarima_univariate.ipynb`.
- Rows: `sarima/univariate/forecasts/*.csv`.
- Display: official-scale held-out test prediction rows.
- Caveat: some R2 values are negative; show results as notebook-produced and interpret carefully.

LSTM:

- Source: five notebooks under `lstm/`.
- Artifacts: JSON/H5/weights files.
- Display: metrics and plot only.
- Caveat: no normalized dated row export exists.

XGBoost Univariate:

- Source: five notebooks under `XGBoost/`.
- Targets: `electricity_local`, `air_so2`, `air_no2`, `ipi_abs_index_sa`, and `car_registration`.
- Artifacts: XGBoost native JSON and joblib PKL files.
- Display: metrics and plot only.
- Caveat: notebooks report original-scale metrics and inline plots, but no normalized dated row export
  exists. Do not synthesize forecast rows from the artifacts.

XGBoost Multivariate:

- Source: `XGBoost_Multivariate/xgboost_multivariate_models.ipynb`.
- Artifacts: XGBoost JSON/H5 files.
- Display: metrics and plot only.
- Caveat: original-scale MSE/RMSE/R2 are printed; original-scale MAE is not printed in the notebook.

VAR:

- Source: `var/varOnly(Brandon).ipynb`.
- Result folder: `var/VarOnlyFileResults/`.
- Do not use `var/varAndVCEM(Brandon).ipynb` or `VarAndVCEMFileResults/` for official VAR display.
- VAR1 displays `d_air_no2` as `ΔNO2` with label `Forecasted change in NO2`.
  Warning: `This VAR output is shown in differenced NO2 scale. It represents change in NO2, not official-scale NO2 concentration.`
- VAR2 displays `d_air_so2` as `ΔSO2` with label `Forecasted change in SO2`.
  Warning: `This VAR output is shown in differenced SO2 scale. It represents change in SO2, not official-scale SO2 concentration.`
- VAR3 displays `air_pm_25` as `PM2.5` with label `Forecasted PM2.5` and unit `µg/m³`.
  Note: `VAR3 forecasts PM2.5 in official target scale while using differenced NO2 as a transformed predictor.`

## Comparison Policy

Model Comparison may show notebook-reported metrics from incompatible outputs, but it must not rank
models unless target/scenario, period, unit, output scale, frequency, result type, metric definition, and
predictor setup are compatible.

## Validation

Run:

```bash
npm run validate:model-readiness
```

The validation script checks:

- all 21 official result entries exist
- SARIMA rows are official-scale test predictions
- VAR1/VAR2 remain transformed-scale row outputs
- VAR3 is PM2.5-scale row output
- LSTM and XGBoost Multivariate remain metrics-and-plot-only in the saved frontend outputs
- XGBoost Univariate remains metrics-and-plot-only in the deployed GUI until a production backend is
  explicitly connected and verified
- stale XGBoost audit rows stay hidden
- NO2/SO2 units are ppm
- chart code includes legend, forecast boundary, and no fake metrics-only forecast line
