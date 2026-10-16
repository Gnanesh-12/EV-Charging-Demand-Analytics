# Issue #13 summary (generated from the data)

- **Target:** daily `session_count`, next-day horizon, all chargers pooled. Metrics: WAPE (comparable across regimes), MAE, RMSE, bias.
- **Data:** 1104 usable days of 1238 calendar days (106 recording-gap days and 28 lag warm-up days excluded).
- **Design:** one model for the whole period with regime flags, evaluated in time-ordered backtest windows (main W1–W3, stress S1–S2).
- **Windows and baselines:**
- **W1** (Oct 2018, free (R2)): 31 test days, mean 78.1 sessions/day, 145 training days. Best adaptive baseline `seasonal_naive_lag7`: WAPE 8.1% (MAE 6.4); training-mean weekday baseline: WAPE 11.9%. Excluded because constant in training: is_paid, is_covid.
- **W2** (Dec 2019 - Feb 2020, paid (R3)): 91 test days, mean 25.5 sessions/day, 571 training days. Best adaptive baseline `same_dow_mean_4w`: WAPE 31.1% (MAE 7.9); training-mean weekday baseline: WAPE 68.8%. Excluded because constant in training: is_covid.
- **W3** (Jun 2021 - end, recovery (R4)): 105 test days, mean 16.9 sessions/day, 999 training days. Best adaptive baseline `same_dow_mean_4w`: WAPE 21.4% (MAE 3.6); training-mean weekday baseline: WAPE 71.9%.
- **S1** (Nov 2018, first paid month): 30 test days, mean 43.5 sessions/day, 176 training days. Best adaptive baseline `seasonal_naive_lag7`: WAPE 42.4% (MAE 18.4); training-mean weekday baseline: WAPE 63.4%. Excluded because constant in training: is_paid, is_covid.
- **S2** (16 Mar - 30 Apr 2020, first COVID weeks): 46 test days, mean 1.2 sessions/day, 677 training days. Best adaptive baseline `seasonal_naive_lag7`: WAPE 301.8% (MAE 3.6); training-mean weekday baseline: WAPE 3323.2%. Excluded because constant in training: is_covid.
- **Reading the baselines:** the training-mean weekday baseline fails whenever the level has shifted since training (paid charging, COVID), so it is not a fair bar. Models in Issue #14 must beat the best *adaptive* baseline in each main window.
