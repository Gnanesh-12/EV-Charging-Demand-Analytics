# Issue #14 summary (generated from the data)

- **Candidates:** Ridge, Lasso, ElasticNet, Poisson, RandomForest, GradientBoosting, HistGB; tuned with 5-fold TimeSeriesSplit inside each window's training data.
- **Champion:** **GradientBoosting** (mean CV WAPE 26.4% over W1, W2, W3); runner-up ElasticNet (36.8%).
- **Test results (each scored once):**
- **W1** (Oct 2018, free (R2)): GradientBoosting WAPE 9.4% (MAE 7.3, bias +3.2) vs best adaptive baseline `seasonal_naive_lag7` 8.1% → -1.2 points.
- **W2** (Dec 2019 - Feb 2020, paid (R3)): GradientBoosting WAPE 25.9% (MAE 6.6, bias -0.5) vs best adaptive baseline `same_dow_mean_4w` 31.1% → +5.1 points.
- **W3** (Jun 2021 - end, recovery (R4)): GradientBoosting WAPE 24.8% (MAE 4.2, bias -2.5) vs best adaptive baseline `same_dow_mean_4w` 21.4% → -3.4 points.
- **S1** (Nov 2018, first paid month): GradientBoosting WAPE 41.7% (MAE 18.2, bias +18.1) vs best adaptive baseline `seasonal_naive_lag7` 42.4% → +0.6 points.
- **S2** (16 Mar - 30 Apr 2020, first COVID weeks): GradientBoosting WAPE 342.7% (MAE 4.1, bias +2.8) vs best adaptive baseline `seasonal_naive_lag7` 301.8% → -40.9 points.
- The champion beats the best adaptive baseline in **1 of 3** main windows.
- Lowest mean test WAPE over the main windows: **Lasso** — differs from the CV choice; the CV choice is kept because test sets are not used for selection.
- Stress windows (S1, S2) are not used for selection; Issue #15 analyses them.
