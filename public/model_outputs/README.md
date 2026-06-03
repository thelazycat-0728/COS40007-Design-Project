# Model Output Integration Files

Drop final trained model outputs into this folder when they are ready. The dashboard checks these
files at runtime and falls back to prototype forecasts or placeholder metrics when the files are
missing or invalid.

## Forecast Files

Supported forecast file names:

- `xgboost_forecast.csv`
- `sarima_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Required CSV columns:

```text
date,country,pollutant,model,forecast_value,lower_bound,upper_bound
```

`lower_bound` and `upper_bound` are optional. If they contain values, the Forecast Simulator table
shows them. If they are blank or missing, the bound columns stay hidden.

Accepted pollutant examples include `PM2.5`, `PM10`, `NO2`, `O3`, `CO`, `SO2`, or the dataset column
names such as `air_pm_25`.

## Metrics File

Use `model_metrics.json` for final evaluation metrics:

```json
{
  "metrics": [
    {
      "model": "XGBoost",
      "pollutant": "PM2.5",
      "mae": 1.82,
      "rmse": 2.41,
      "mape": 8.6
    }
  ]
}
```

Use the sample files in this folder as templates. Do not rename the sample files to the production
file names until the values are final model outputs.
