# Model Output Integration Files

Drop final trained model outputs into this folder only after the model owner provides verified,
normalized exports. The dashboard falls back to readiness or prototype states when matching files
are missing, stale, or invalid.

## Official Scope

- Univariate: SARIMA and LSTM
- Multivariate: XGBoost and VAR

Prophet, univariate XGBoost, VECM, and baselines are secondary/experimental unless the team
explicitly promotes them later.

## Readiness Registry

`model_artifacts.json` is the curated source of truth for official model readiness. It records:

- implementation location
- branch
- native artifact availability
- metrics availability
- row-level output availability
- GUI connection state
- required next handoff

Native JSON, PKL, H5, and weight files are not frontend-ready predictions.

## Forecast Files

Supported optional production forecast file names:

- `sarima_forecast.csv`
- `lstm_forecast.csv`
- `xgboost_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Required CSV columns for a connected output:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency,integration_status,status_message
```

Rules:

- `integration_status` must be `connected_output`.
- `date`, `target`, `model`, numeric `forecast_value`, `unit`, `result_type`, and `source_notebook`
  are required.
- `actual_value` should be included for held-out test predictions.
- `scenario_id`, `predictors`, and `engineered_features` must match the official scenario.
- Predictor and engineered-feature lists should be semicolon-separated.
- Legacy `pollutant` columns are accepted, but new files should use `target`.
- Sample/template files are ignored.

## Metrics File

Use `model_metrics.json` only for verified evaluation metrics. Metrics do not count as connected
unless their integration status is `connected_output` and row-level output is also verified.

Example metric entry:

```json
{
  "model": "XGBoost",
  "country": "Malaysia",
  "target": "air_so2",
  "scenario_id": "ipi_electricity_to_so2",
  "predictors": ["ipi_abs_index", "electricity_local"],
  "rmse": 0.000082,
  "r2": -1.784987,
  "result_type": "test_prediction",
  "evaluation_start": "2022-01-01",
  "evaluation_end": "2022-12-01",
  "frequency": "monthly",
  "unit": "ppm",
  "integration_status": "connected_output",
  "row_level_output_available": true,
  "source_notebook": "XGBoost_Multivariate/xgboost_multivariate_models.ipynb"
}
```

## Current Paused XGBoost Output

`xgboost_forecast.csv` is retained for audit only. It is marked:

```text
stale_or_mismatched
```

Reason:

```text
Integration paused - source verification required
```

The exported SO2 rows reference `XGBoost/xgboost_car_forecast.ipynb`, but the current notebook target
is vehicle registrations. The dashboard excludes these rows from charts, connected counts, and
rankings until the XGBoost owner provides a verified current multivariate export.

## Required Handoffs

LSTM owner:

- `lstm_forecast.csv`
- five univariate targets
- dates, actual values, predicted values, units, test period, metrics
- preprocessing/scaler description

SARIMA owner:

- merged or approved `origin/daryl-sarima` outputs
- `sarima_forecast.csv`
- metrics JSON entries
- confirmed source notebook and test period

XGBoost owner:

- `xgboost_forecast.csv`
- three official multivariate scenarios
- exact target, predictors, engineered features
- actual/predicted rows, original-scale metrics, source notebook

VAR owner:

- completed forecast code
- row-level prediction or forecast CSV
- metrics and scenario mapping
- corrected interpretation of significance tests
- optional saved model or reproducible export script
