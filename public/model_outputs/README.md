# Model Output Integration Files

This folder contains the frontend-facing model-result registry and normalized row outputs for the
official COS40007 model families.

The current GUI goal is to present notebook-confirmed results honestly. A result does not have to be a
fully normalized official-scale forecast to appear, but transformed-scale and metrics-only outputs must
be labelled clearly.

## Official Scope

- Univariate: SARIMA and LSTM
- Multivariate: XGBoost and VAR

Excluded from the final GUI scope:

- Prophet
- VECM
- baselines
- univariate XGBoost

## Current Files

- `model_artifacts.json`
  - 16 official model-result entries.
  - Source of truth for display mode, source notebook, scale, metrics availability, row availability,
    plot availability, artifacts, and caveats.

- `model_metrics.json`
  - Notebook-reported metrics for all 16 official results.
  - Includes official-scale SARIMA metrics, LSTM original-scale notebook metrics, XGBoost notebook
    metrics, and VAR equation metrics.

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
  - Example: LSTM and official multivariate XGBoost.

- `summary_metrics_only`
  - Metrics exist, but no row output or reusable plot is available.

- `artifact_only`
  - Native model artifact exists but no displayable result exists.

- `branch_or_pending`
  - Result is not merged or not inspectable.

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

## Current Model Notes

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

XGBoost:

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

- all 16 official result entries exist
- SARIMA rows are official-scale test predictions
- VAR1/VAR2 remain transformed-scale row outputs
- VAR3 is PM2.5-scale row output
- LSTM and XGBoost remain metrics-and-plot-only
- stale XGBoost audit rows stay hidden
- NO2/SO2 units are ppm
- chart code includes legend, forecast boundary, and no fake metrics-only forecast line
