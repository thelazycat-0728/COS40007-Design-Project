# Regional Time-Series Forecasting Dashboard

Frontend GUI/dashboard prototype for the COS40007 Artificial Intelligence for Engineering Design
Project.

## Project Purpose

This project focuses only on time-series forecasting. The dashboard supports generic forecast
targets and predictors instead of treating every forecast target as a pollutant.

Primary forecasting scenarios:

1. **Vehicle activity → PM2.5**
   - Target: `air_pm_25`
   - Intended predictors: `vehicle_registrations`, `car_sales`, `traffic_volume`,
     `vehicle_production`, `transport_index`
   - Current status: unavailable for the built-in Malaysia dataset because tracked data does not
     contain vehicle or transport activity variables. Upload a compatible regional dataset to test
     this scenario.

2. **Electricity + SO2 → IPI**
   - Target: `ipi_abs_index`
   - Required predictors: `electricity_total`, `air_so2`
   - Current status: supported by the current cleaned Malaysia dataset. Final trained model outputs
     are still pending unless production model-output files are added.

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

The built-in dataset contains monthly air pollution, electricity consumption, and IPI columns. It
does not contain vehicle-related indicators, so Scenario A must remain unavailable for the built-in
Malaysia dataset.

Target-specific units:

- `air_pm_25`: PM2.5, `µg/m³`
- `ipi_abs_index`: Industrial Production Index, `index points`

## Prototype Forecasting

Frontend prototype forecasts are fallback/demo values generated from the selected target variable's
recent historical trend. The selected predictors describe the intended modelling scenario but are not
used mathematically by the frontend fallback algorithm.

The browser does not train XGBoost, SARIMA, VAR, or Prophet models.

## Final Model Output Integration

The dashboard can automatically switch from prototype fallback outputs to final model outputs when
production files are added under:

```text
public/model_outputs/
```

Supported optional forecast files:

- `xgboost_forecast.csv`
- `sarima_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Preferred forecast CSV format:

```text
date,country,target,model,forecast_value,lower_bound,upper_bound,scenario_id,predictors,unit
```

Example:

```text
2023-01-01,Malaysia,ipi_abs_index,XGBoost,118.4,116.1,120.6,electricity_so2_to_ipi,electricity_total;air_so2,index points
```

`lower_bound`, `upper_bound`, `scenario_id`, `predictors`, and `unit` are optional. Legacy forecast
files using `pollutant` instead of `target` are still accepted and mapped to the generic target
system. New files should use `target`.

Supported optional metrics file:

```text
public/model_outputs/model_metrics.json
```

Preferred metrics structure:

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

Metrics are filtered by country, target, and scenario before model comparison. Legacy metrics using
`pollutant` instead of `target` are accepted and labeled as legacy after parsing.

## Upload Regional Dataset

The dashboard includes an **Upload Regional Dataset** page for browser-only CSV testing. Uploaded
files are parsed in the current browser session with PapaParse and are not saved permanently.

Required base columns:

- `date`
- `country`

Supported forecast targets include:

- `air_pm_25`
- `air_pm_10`
- `air_no2`
- `air_o3`
- `air_co`
- `air_so2`
- `ipi_abs_index`
- `ipi_growth_yoy_index`
- `industrial_index`

Supported predictors include:

- `electricity_total`
- `electricity_local`
- `electricity_local_commercial`
- `electricity_local_domestic`
- `air_so2`
- `vehicle_registrations`
- `car_sales`
- `traffic_volume`
- `vehicle_production`
- `transport_index`
- `ipi_abs_index`
- `ipi_growth_yoy_index`
- `industrial_index`

Validation requires at least one supported target, at least one supported predictor, and at least 6
valid chronological rows with numeric target values. Non-empty non-numeric target or predictor values
are rejected.

Template file:

```text
public/templates/regional_dataset_template.csv
```

The template contains demo values only and should be replaced with real regional observations for
analysis.
