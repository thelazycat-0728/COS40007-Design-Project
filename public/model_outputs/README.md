# Model Output Integration Files

Drop final trained model outputs into this folder when teammates provide them. The dashboard checks
these files at runtime and falls back to prototype target-trend forecasts or pending metric states
when matching files are missing or invalid.

## Forecast Files

Supported optional forecast file names:

- `sarima_forecast.csv`
- `lstm_forecast.csv`
- `xgboost_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Preferred CSV columns:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency
```

Required fields are `date`, `target`, `model`, and numeric `forecast_value`. `country` defaults to
Malaysia when blank. `actual_value` should be included for held-out test predictions. `lower_bound`,
`upper_bound`, `scenario_id`, `scenario_variant`, `predictors`, `engineered_features`, `unit`,
`result_type`, `source_notebook`, `evaluation_start`, `evaluation_end`, and `frequency` are optional.
Use semicolon-separated predictor keys in `predictors` and semicolon-separated exact engineered
feature names in `engineered_features`.

Meeting-demo scenario examples:

```text
2022-01-01,Malaysia,air_so2,XGBoost,0.001182,0.0012,,,ipi_electricity_to_so2,ipi_growth_yoy_sa_electricity_local_so2_lags,ipi_growth_yoy_index_sa;electricity_local,SO2_lag1;IPI_lag1;elec_lag1,ppm,test_prediction,XGBoost/xgboost_car_forecast.ipynb,2022-01-01,2022-12-01,monthly
2023-01-01,Malaysia,air_pm_25,SARIMA,12.8,,12.1,13.4,no2_to_pm25,,air_no2,,µg/m³,future_forecast,,,
```

Legacy compatibility: older files using a `pollutant` column are still accepted and mapped to the
generic target system. New files should use `target`.

## Metrics File

Use `model_metrics.json` only for verified evaluation metrics:

```json
{
  "metrics": [
    {
      "model": "XGBoost",
      "country": "Malaysia",
      "target": "air_so2",
      "scenario_id": "ipi_electricity_to_so2",
      "scenario_variant": "ipi_growth_yoy_sa_electricity_local_so2_lags",
      "predictors": ["ipi_growth_yoy_index_sa", "electricity_local"],
      "engineered_features": ["SO2_lag1", "SO2_roll_mean3"],
      "mae": 0.000016333333333333315,
      "rmse": 0.00002398263260500532,
      "r2": 0.76336,
      "result_type": "test_prediction",
      "evaluation_start": "2022-01-01",
      "evaluation_end": "2022-12-01",
      "frequency": "monthly",
      "unit": "ppm",
      "integration_status": "connected_forecast",
      "row_level_output_available": true
    }
  ]
}
```

The dashboard filters metrics by country, target, and scenario before comparing models. Do not mix
NO2, SO2, and PM2.5 metrics in one comparison row set unless the selected target and scenario match.

Legacy compatibility: metrics using `pollutant` instead of `target` are accepted and labeled as
legacy data after parsing. New metrics should use `target`.

## Current Verified XGBoost Integration

`xgboost_forecast.csv` currently contains one verified connected output from
`XGBoost/xgboost_car_forecast.ipynb`: SO2 held-out test predictions for January-December 2022.
The connected variant is `IPI YoY growth SA + local electricity + historical SO2 features → SO2`.
The source notebook labels the SO2 values as `ppm`, so the dashboard uses `ppm` for this connected
result and does not convert to `µg/m³`.

The XGBoost JSON and PKL artifacts were not loaded for this GUI integration. The connected rows are
normalized from visible notebook outputs. Other XGBoost notebooks are documented as `metrics_only`
when metrics were visible but row-level outputs were not exported. Metrics-only entries do not count
as connected forecast outputs and do not create model rankings.

`XGBoost/xgboost_forecast_air_so2.ipynb` is recorded with canonical target
`vehicle_registrations` because the notebook content forecasts vehicle registrations despite the
filename. It is not classified as an SO2 model.

The sample files in this folder are schema templates only. Do not rename sample files to production
file names until the values are final trained model outputs.
