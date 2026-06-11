# Model Output Integration Files

Drop final trained model outputs into this folder when they are ready. The dashboard checks these
files at runtime and falls back to prototype target-trend forecasts or pending metric states when the
files are missing or invalid.

## Forecast Files

Supported forecast file names:

- `xgboost_forecast.csv`
- `sarima_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Preferred CSV columns:

```text
date,country,target,model,forecast_value,lower_bound,upper_bound,scenario_id,predictors,unit
```

Required fields are `date`, `target`, `model`, and numeric `forecast_value`. `country` defaults to
Malaysia when blank. `lower_bound`, `upper_bound`, `scenario_id`, `predictors`, and `unit` are
optional. Use semicolon-separated predictor keys in `predictors`.

Example:

```text
2023-01-01,Malaysia,ipi_abs_index,XGBoost,118.4,116.1,120.6,electricity_so2_to_ipi,electricity_total;air_so2,index points
```

Supported target examples include `air_pm_25` for PM2.5 and `ipi_abs_index` for Industrial
Production Index. The loader also accepts recognized labels such as `PM2.5` and `Industrial
Production Index`.

Legacy compatibility: older files using a `pollutant` column are still accepted and mapped to the
generic target system. New files should use `target`.

## Metrics File

Use `model_metrics.json` for final evaluation metrics:

```json
{
  "metrics": [
    {
      "model": "XGBoost",
      "country": "Malaysia",
      "target": "ipi_abs_index",
      "scenario_id": "electricity_so2_to_ipi",
      "predictors": ["electricity_total", "air_so2"],
      "mae": 1.82,
      "rmse": 2.41,
      "mape": 8.6
    }
  ]
}
```

The dashboard filters metrics by country, target, and scenario before comparing models. Do not mix
PM2.5 and IPI metrics in one comparison row set unless the selected target and scenario match.

Legacy compatibility: metrics using `pollutant` instead of `target` are accepted and labeled as
legacy data after parsing. New metrics should use `target`.

Use the sample files in this folder as schema templates. Do not rename sample files to production
file names until the values are final trained model outputs.
