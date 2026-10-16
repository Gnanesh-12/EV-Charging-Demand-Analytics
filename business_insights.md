# Business insights (generated from Issues #13–#15 outputs)

## Forecast quality
- The champion **GradientBoosting** forecasts next-day sessions with WAPE 9% in W1, 26% in W2, 25% in W3 (MAE 7.3, 6.6, 4.2 sessions/day).
- It beats the best adaptive baseline in 1 of 3 main windows, by +0.2 WAPE points on average. The gain over a simple same-weekday-average rule is small: that rule is a strong, transparent fallback, and the model adds a modest improvement.
- Most important predictors in the latest window (W3): same_dow_mean_4w, is_major_holiday, lag_14. Recent demand history dominates: the forecast is mainly the recent level, adjusted for calendar and regime.
- 1 of the 12 largest errors fall on major holidays (MAE on holidays 5.9 vs 5.6 on other days). Holiday errors are not much larger than on other days.

## Demand and pricing
- Mean daily sessions by regime: R1 66.6, R2 77.6, R3 29.5, R4 8.0. Paid charging (R3) is associated with -62% sessions/day vs the free 14 kWh-default period (R2); this is an association over time, not a controlled price experiment.
- Weekend demand averages 20.3 sessions/day vs 48.1 on weekdays in normal operation: weekday capacity and staffing drive the planning problem.

## Planning
- To cover 90% of days, plan for forecast + 7 (W1), 12 (W2), 9 (W3) sessions; at the 80% level + 3, 6, 7.
- After an unseen change, forecasts are unreliable: in S1 the original model's WAPE was 37% and after adding 7 days of new data 13%; in S2 241% vs 373%. **Retrain within a week of any pricing or access change.** After 7 days of new data, in S1 the recalibrated model beat the adaptive baseline (13% vs 34%); in S2 the recalibrated model did not beat the adaptive baseline (373% vs 142%). Until a retrained model is checked, the same-weekday baseline is the safe fallback.

## Limitations
- One site; daily totals only. The 106-day recording gap in 2020 and the very low COVID volumes limit what the model learns about the recovery.
- COVID_START (2020-03-16) and the holiday list are assumptions documented in Issues #10 and #12.
