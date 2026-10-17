# Issue #14 summary (generated from the data)

- **Candidates:** Ridge, Lasso, ElasticNet, Poisson, RandomForest, GradientBoosting, HistGB; tuned with 5-fold TimeSeriesSplit inside each window's training data.
- **Champion:** **HistGB** (mean CV WAPE 35.6% over W1, W2, W3); runner-up RandomForest (37.9%).
- **Test results (each scored once):**
- **W1** (Oct 2018, free (R2)): HistGB WAPE 7.6% (MAE 5.9, bias -1.2) vs best adaptive baseline `seasonal_naive_lag7` 8.1% → +0.5 points.
- **W2** (Dec 2019 - Feb 2020, paid (R3)): HistGB WAPE 21.2% (MAE 5.4, bias -0.9) vs best adaptive baseline `same_dow_mean_4w` 31.1% → +9.9 points.
- **W3** (Jun 2021 - end, recovery (R4)): HistGB WAPE 32.6% (MAE 5.5, bias -4.6) vs best adaptive baseline `same_dow_mean_4w` 21.4% → -11.2 points.
- **S1** (Nov 2018, first paid month): HistGB WAPE 43.1% (MAE 18.8, bias +18.7) vs best adaptive baseline `seasonal_naive_lag7` 42.4% → -0.7 points.
- **S2** (16 Mar - 30 Apr 2020, first COVID weeks): HistGB WAPE 1213.8% (MAE 14.5, bias +14.5) vs best adaptive baseline `seasonal_naive_lag7` 301.8% → -912.0 points.
- The champion beats the best adaptive baseline in **2 of 3** main windows.
- Lowest mean test WAPE over the main windows: **ElasticNet** — differs from the CV choice; the CV choice is kept because test sets are not used for selection.
- Stress windows (S1, S2) are not used for selection; Issue #15 analyses them.
