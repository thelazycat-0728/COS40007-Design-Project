# Regional Time-Series Forecasting Dashboard

Frontend GUI/dashboard prototype for the COS40007 Artificial Intelligence for Engineering Design
Project.

## Project Purpose

This project focuses only on time-series forecasting. The dashboard separates target variables,
predictor variables, forecast scenarios, model display options, horizon, and output source so the
team can review the current meeting-demo directions without implying that browser prototype values
are trained model results.

Meeting-demo scenarios under confirmation:

1. **Vehicle activity + local electricity → NO2**
   - Target: `air_no2`
   - Intended predictors: `electricity_local` plus at least one supported vehicle indicator
   - Current status: requires uploaded vehicle data. The built-in Malaysia dataset has no verified
     vehicle-related predictor, so the GUI must not generate fake vehicle values or a built-in
     prototype forecast for this scenario.

2. **IPI + electricity → SO2**
   - Target: `air_so2`
   - Preferred predictors: `ipi_abs_index_sa`, `electricity_local`
   - Fallback predictors: `ipi_abs_index`, `electricity_total`
   - Current status: supported by the current cleaned Malaysia dataset. The GUI clearly labels
     whether it is using configured predictors or fallback predictors.
   - Verified XGBoost variant connected for review: `ipi_growth_yoy_index_sa`,
     `electricity_local`, and historical SO2 lag/rolling features → SO2.

3. **NO2 → PM2.5**
   - Target: `air_pm_25`
   - Predictor: `air_no2`
   - Current status: optional extension supported by the current cleaned Malaysia dataset.

Scenario definitions remain subject to confirmation by the modelling team.

## Univariate Targets Under Consideration

These are informational for meeting discussion only. No trained model is implied.

- `electricity_local`: Local electricity consumption, available
- `air_so2`: SO2, available
- `air_no2`: NO2, available
- `ipi_abs_index_sa`: Seasonally adjusted IPI absolute index, available
- `vehicle_registrations`: Car registrations, requires uploaded dataset

## Tech Stack

- React + Vite
- Recharts for chart rendering
- PapaParse for CSV loading
- Plain CSS for dashboard layout and responsive styling
- No backend

## Local Run

```bash
npm install
npm run dev
```

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
does not contain a verified supported vehicle-related predictor, so Scenario 1 must remain
unavailable until a compatible uploaded dataset is provided.

Target-specific meeting-demo units:

- `air_no2`: NO2, `µg/m³`
- `air_so2`: SO2, `µg/m³`
- Connected XGBoost SO2 held-out test output: `ppm`, because the source notebook reports ppm-scale
  values and no verified conversion is applied.
- `air_pm_25`: PM2.5, `µg/m³`
- `electricity_local`: Local electricity consumption, `GWh`
- `ipi_abs_index_sa`: Seasonally adjusted IPI absolute index, `index points`

## Prototype Forecasting

Frontend prototype forecasts are fallback/demo values generated from the selected target variable’s
recent historical trend. The selected predictors represent the intended final model inputs and are
not used by the frontend fallback algorithm.

The browser does not train XGBoost, SARIMA, VAR, Prophet, or LSTM models.

## Final Model Output Integration

The dashboard can switch from prototype fallback outputs to final model outputs when production
files are added under:

```text
public/model_outputs/
```

Supported optional forecast files:

- `sarima_forecast.csv`
- `lstm_forecast.csv`
- `xgboost_forecast.csv`
- `var_forecast.csv`
- `prophet_forecast.csv`

Preferred forecast CSV format:

```text
date,country,target,model,forecast_value,actual_value,lower_bound,upper_bound,scenario_id,scenario_variant,predictors,engineered_features,unit,result_type,source_notebook,evaluation_start,evaluation_end,frequency
```

Example:

```text
2022-01-01,Malaysia,air_so2,XGBoost,0.001182,0.0012,,,ipi_electricity_to_so2,ipi_growth_yoy_sa_electricity_local_so2_lags,ipi_growth_yoy_index_sa;electricity_local,SO2_lag1;IPI_lag1;elec_lag1,ppm,test_prediction,XGBoost/xgboost_car_forecast.ipynb,2022-01-01,2022-12-01,monthly
```

`actual_value` is used for held-out test predictions. `lower_bound`, `upper_bound`, `scenario_id`,
`scenario_variant`, `predictors`, `engineered_features`, `unit`, `result_type`, `source_notebook`,
`evaluation_start`, `evaluation_end`, and `frequency` are optional. Legacy forecast files using
`pollutant` instead of `target` are still accepted and mapped to the generic target system. New
files should use `target`.

Use `public/model_outputs/model_metrics.json` only when final evaluation metrics are available.
Model Comparison shows **Pending team results** and hides metric bars until real matching metrics
are loaded.

### Current XGBoost GUI Integration

The dashboard currently connects one verified XGBoost row-level output:

- Source: `XGBoost/xgboost_car_forecast.ipynb`
- Target: `air_so2`
- Scenario: `ipi_electricity_to_so2`
- Variant: `IPI YoY growth SA + local electricity + historical SO2 features → SO2`
- Result type: held-out test predictions
- Evaluation period: January-December 2022
- Frequency: monthly
- Unit: `ppm`
- External predictors: `ipi_growth_yoy_index_sa`, `electricity_local`
- Engineered inputs: `SO2_lag1`, `IPI_lag1`, `elec_lag1`, `SO2_lag2`, `IPI_lag2`,
  `elec_lag2`, `SO2_lag3`, `IPI_lag3`, `elec_lag3`, `SO2_roll_mean3`, `SO2_roll_std3`,
  `month`

The GUI does not call these rows a configurable horizon result. It displays them as actual versus
predicted values for the held-out 2022 test period.

Other XGBoost notebooks are listed as metrics-only where notebook metrics were visible but no
row-level output was exported. Metrics-only entries do not count as connected forecast outputs and
do not qualify for model ranking. The notebook named `XGBoost/xgboost_forecast_air_so2.ipynb` is
recorded as `vehicle_registrations` metrics-only because the verified notebook content forecasts
vehicle registrations despite its filename.

No XGBoost `.json` or `.pkl` artifact is loaded by the browser integration. Prophet remains pending
and is not inspected in this XGBoost-only task.

## Upload Regional Dataset

The **Upload Regional Dataset** page parses CSV files in the current browser session only. Uploaded
files are not saved permanently.

Required base columns:

- `date`
- `country`

Supported meeting-demo targets include:

- `air_no2`
- `air_so2`
- `air_pm_25`
- `electricity_local`
- `ipi_abs_index_sa`
- `vehicle_registrations`

Supported predictors include:

- `vehicle_registrations`
- `car_sales`
- `traffic_volume`
- `vehicle_production`
- `transport_index`
- `electricity_local`
- `electricity_total`
- `ipi_abs_index`
- `ipi_abs_index_sa`
- `air_no2`

Scenario compatibility:

- Scenario 1 requires `air_no2`, `electricity_local`, and at least one supported vehicle predictor.
- Scenario 2 requires `air_so2`, either `ipi_abs_index_sa` or `ipi_abs_index`, and either
  `electricity_local` or `electricity_total`.
- Scenario 3 requires `air_pm_25` and `air_no2`.

Validation also requires at least one supported target, at least one supported predictor, at least
6 valid chronological rows with numeric target values, and no non-empty non-numeric values in
detected numeric fields.

Template file:

```text
public/templates/regional_dataset_template.csv
```

The template contains demonstration values only and should be replaced with real regional
observations for analysis.
