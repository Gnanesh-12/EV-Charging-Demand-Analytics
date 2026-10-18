# EV Workplace Charging Demand Analytics

> **Interactive Business Analytics Dashboard & Predictive Intelligence Platform**  
> Caltech Adaptive Charging Network (ACN) Workplace EV Charging Optimization  
> **Live Dashboard**: [https://m-chandana.github.io/EV-Charging-Demand-Analytics/](https://m-chandana.github.io/EV-Charging-Demand-Analytics/)

---

## 🌟 Executive Summary

This project delivers an end-to-end analytics and machine learning solution for workplace Electric Vehicle (EV) charging optimization based on **31,387 real-world charging sessions** across 55 charging stations at Caltech (April 2018 – September 2021).

The platform addresses core operational challenges:
- **Peak Demand Surges**: 81.3% of charging sessions initiate during the 07:00–10:00 morning rush.
- **Station Idle Congestion**: EVs remain parked **1.71× longer than their active charging time** (mean connect duration 8.65h vs charging duration 5.06h).
- **Tariff & Policy Shifts**: Analyzed behavioral transitions across 4 pricing regimes (Free, 14 kWh Cap, Paid $0.12/kWh, and COVID workplace telework).
- **Predictive Demand Intelligence**: Machine learning session energy prediction ($R^2 = 0.642$) and time-series SARIMAX forecasting ($R^2 = 0.702$, MAPE 26.2%).
- **Behavioral Pattern Mining**: Association rule mining identifying morning commuter clusters, idle lingerers, and high-energy top-up profiles.

---

## 🚀 Key Dashboard Features

The interactive web dashboard is built with modern, accessible, light-themed responsive design and zero heavy framework dependencies (Vanilla HTML5, CSS3, Chart.js, JetBrains Mono & Inter typography):

1. **Executive Overview**:
   - 4 core KPI summary cards (Total Sessions, Total Energy Delivered, Average Energy/Session, Mean Connect Duration).
   - Global interactive filters by **Pricing Regime** (R1 Free, R2 Free Cap, R3 Paid, R4 COVID) and **Day Type** (Weekday vs. Weekend).
   - 41-month longitudinal daily demand timeline with 7-day rolling moving average and pricing regime color bands.
   - Pricing policy impact matrix comparing session velocity, energy deliverability, and idle duration across regimes.

2. **Charging Demand Patterns**:
   - Intraday arrival hour distributions highlighting morning commute spikes (peak 08:00–09:00 with 4.4 sessions/hr).
   - Day-of-week demand variance (Weekday average 38.6 sessions/day vs. Weekend 8.4 sessions/day).
   - Session duration breakdown by duration bucket (<2h, 2–4h, 4–8h, >8h).

3. **Energy Consumption Patterns**:
   - Energy delivery histogram across 5 kWh bins showing 10–15 kWh median sweet spot.
   - Active charging duration vs. total plugged-in connection duration (quantifying idle bay blocking).
   - Monthly cumulative and average energy throughput trends over time.

4. **Time-Series Forecast (SARIMAX / Prophet)**:
   - 30-day out-of-sample forward forecast with 80% and 95% confidence intervals.
   - 42-day holdout backtesting evaluation comparing actual vs predicted daily charging demand.
   - Model accuracy metrics: **MAE: 4.82 sessions**, **RMSE: 6.43 sessions**, **MAPE: 26.2%**, **$R^2$: 0.702**.

5. **Machine Learning Model Results**:
   - Multi-model benchmark comparison table (Linear Regression, Ridge, Lasso, Random Forest, XGBoost Champion, LightGBM, Gradient Boosting).
   - Champion XGBoost Regressor performance: **MAE: 4.87 kWh**, **RMSE: 7.21 kWh**, **$R^2$: 0.642**.
   - Feature importance rankings (connection duration, arrival hour, station history, rolling average demand).
   - Residual diagnostic and error analysis breakdown by day of week.

6. **Association Rule Analysis**:
   - Interactive transaction basket rule viewer (support, confidence, lift, conviction).
   - Key behavioral associations:
     - *Morning Commute Arrival + Long Stay $\rightarrow$ High Idle Duration* (Confidence: 84.6%, Lift: 2.14).
     - *Afternoon Arrival + Short Connect $\rightarrow$ Low Energy Delivered* (Confidence: 78.2%, Lift: 1.88).
     - *Paid Regime $\rightarrow$ Reduced Idle Linger Time* (Confidence: 71.3%, Lift: 1.62).
   - Behavioral persona profiles (Full-Day Commuter, Quick Top-Up, Overstay Idle, Weekend Charger).

7. **Station & Site Utilisation**:
   - Charger utilization heatmaps and ranking across all 55 Level 2 dual-port stations.
   - Station workload disparity analysis (top 20% of chargers handle over 46% of total load).
   - Actionable infrastructure and fleet maintenance recommendations.

---

## 📂 Repository Structure

```
EV-Charging-Demand-Analytics/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml          # GitHub Pages automated deployment workflow
├── dashboard/                        # Production Interactive Web Dashboard
│   ├── index.html                    # Main responsive dashboard interface
│   ├── style.css                     # Modern light-theme design system & styles
│   ├── app.js                        # Data rendering, filter logic & Chart.js instances
│   └── data/                         # Sanitized JSON analytics datasets
│       ├── time_series_daily.json    # Daily session counts & energy aggregate history
│       ├── forecast_daily.json       # Forward SARIMAX 30-day projection with CI
│       ├── forecast_holdout.json     # 42-day holdout validation data
│       ├── model_comparison.json     # ML model benchmark metrics & champion stats
│       ├── association_rules.json    # Extracted association rules with metrics
│       └── association_profiles.json # Behavioral profile segmentation
├── acn_clean_sessions.csv            # Cleaned session records (31,387 records)
├── eda_key_findings.md               # Comprehensive exploratory data analysis insights
├── business_insights.md              # Executive recommendations & business strategy
├── forecast_findings_i17.md          # Time-series modeling documentation
├── model_summary_i14.md              # Machine learning modeling documentation
├── association_findings_i7.md        # Association rule mining documentation
├── champion.json                     # Serialized XGBoost champion model parameters
├── index.html                        # Root redirect to dashboard for GitHub Pages
└── README.md                         # Project documentation
```

---

## 💻 Running the Dashboard Locally

To view and test the dashboard locally on your machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/M-Chandana/EV-Charging-Demand-Analytics.git
   cd EV-Charging-Demand-Analytics
   ```

2. **Launch a local HTTP server**:
   Using Python 3:
   ```bash
   python -m http.server 8080 --directory dashboard
   ```
   Or using Node.js:
   ```bash
   npx serve dashboard
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8080/`

---

## 🌐 Deploying to GitHub Pages

The repository is configured to deploy directly to GitHub Pages via GitHub Actions:
1. Navigate to your repository on GitHub: **Settings $\rightarrow$ Pages**.
2. Under **Build and deployment $\rightarrow$ Source**, select **GitHub Actions**.
3. Every push to `main` automatically builds and deploys the dashboard!
4. Alternatively, if selecting **Deploy from a branch**, choose branch `main` and root `/` (which redirects automatically to the dashboard).

---

## 📊 Analytical Methodology

| Stage | Techniques & Tools | Key Artifacts |
|---|---|---|
| **Data Cleaning & Structuring** | Pandas, NumPy, Outlier Flagging, Session Imputation | `acn_clean_sessions.csv`, `feature_dictionary.csv` |
| **Exploratory Data Analysis** | Matplotlib, Seaborn, Parametric & Non-parametric Stats | `eda_key_findings.md`, `eda_visual_insights.md` |
| **Time-Series Forecasting** | SARIMAX, Prophet, Rolling Window Backtesting (6 folds) | `forecast_findings_i17.md`, `time_series_daily.csv` |
| **Predictive Modeling** | XGBoost, LightGBM, Random Forest, Ridge, Scikit-Learn | `model_summary_i14.md`, `champion.json` |
| **Association Rule Mining** | Apriori, FP-Growth, Support-Confidence-Lift Optimization | `association_findings_i7.md`, `arm_rules_final.csv` |
| **Interactive Dashboard** | HTML5, Vanilla CSS3, Chart.js 4.4, JetBrains Mono/Inter | `dashboard/index.html`, `dashboard/app.js` |

---

## 📜 License & Citation

Data provided by the Caltech Adaptive Charging Network (ACN) Research Project under workplace EV charging telemetry research. Developed as part of the Business Analytics Capstone Project.
