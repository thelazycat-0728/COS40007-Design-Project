# Regional Air Pollution Forecasting Dashboard

Frontend GUI/dashboard prototype for the COS40007 Artificial Intelligence for Engineering Design
Project.

## Project Purpose

This project investigates whether electricity consumption and Industrial Production Index (IPI)
indicators can help forecast air pollution trends in Malaysia and selected regional countries where
compatible datasets are available. The current prototype focuses only on time-series forecasting and
uses the cleaned Malaysia combined dataset.

## Tech Stack

- React + Vite
- Recharts for chart rendering
- PapaParse for CSV loading
- Plain CSS for dashboard layout and responsive styling
- No backend

## Installation

```bash
npm install
```

## Local Run

```bash
npm run dev
```

Open the local Vite URL printed in the terminal.

## Build

```bash
npm run build
```

## Dataset Placement

The browser loads the cleaned Malaysia dataset from:

```text
public/data/combined_air_electricity_ipi_cleaned.csv
```

If a newer cleaned combined CSV is produced, place it in `public/data/` and update the `DATA_PATH`
constant in `src/utils/constants.js` if the file name changes. Expected fields include monthly date,
air pollutant columns, electricity consumption columns, and IPI indicator columns.

## Prototype Notes

Forecast values in the Forecast Simulator are prototype/demo values generated from simple recent
trend logic until final trained model outputs are integrated.

Model comparison metric values are placeholders until final model evaluation result files are
integrated.

## Final Model Output Integration

The dashboard can automatically switch from prototype outputs to final model outputs when files are
added under:

```text
public/model_outputs/
```

Supported optional forecast files:

- `xgboost_forecast.csv`
- `sarima_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Forecast CSV format:

```text
date,country,pollutant,model,forecast_value,lower_bound,upper_bound
```

`lower_bound` and `upper_bound` are optional. If they are present and numeric, the Forecast Simulator
shows them in the forecast table. If a selected model output file is missing or invalid, the dashboard
keeps using the prototype forecast fallback.

Supported optional metrics file:

```text
public/model_outputs/model_metrics.json
```

Expected structure:

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

If `model_metrics.json` is missing or invalid, the dashboard keeps using placeholder evaluation
metrics. Template files are provided in `public/model_outputs/` for the modelling team.
