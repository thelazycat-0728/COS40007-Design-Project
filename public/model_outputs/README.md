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
date,country,target,model,forecast_value,lower_bound,upper_bound,scenario_id,predictors,unit
```

Required fields are `date`, `target`, `model`, and numeric `forecast_value`. `country` defaults to
Malaysia when blank. `lower_bound`, `upper_bound`, `scenario_id`, `predictors`, and `unit` are
optional. Use semicolon-separated predictor keys in `predictors`.

Meeting-demo scenario examples:

```text
2023-01-01,Malaysia,air_so2,XGBoost,7.4,7.1,7.7,ipi_electricity_to_so2,ipi_abs_index_sa;electricity_local,µg/m³
2023-01-01,Malaysia,air_pm_25,SARIMA,12.8,12.1,13.4,no2_to_pm25,air_no2,µg/m³
```

Legacy compatibility: older files using a `pollutant` column are still accepted and mapped to the
generic target system. New files should use `target`.

## Metrics File

Use `model_metrics.json` only for final evaluation metrics:

```json
{
  "metrics": [
    {
      "model": "XGBoost",
      "country": "Malaysia",
      "target": "air_so2",
      "scenario_id": "ipi_electricity_to_so2",
      "predictors": ["ipi_abs_index_sa", "electricity_local"],
      "mae": 1.82,
      "rmse": 2.41,
      "mape": 8.6
    }
  ]
}
```

The dashboard filters metrics by country, target, and scenario before comparing models. Do not mix
NO2, SO2, and PM2.5 metrics in one comparison row set unless the selected target and scenario match.

Legacy compatibility: metrics using `pollutant` instead of `target` are accepted and labeled as
legacy data after parsing. New metrics should use `target`.

The sample files in this folder are schema templates only. Do not rename sample files to production
file names until the values are final trained model outputs.
