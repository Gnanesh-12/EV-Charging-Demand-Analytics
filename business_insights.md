# Business insights (generated from Issues #13–#15 outputs)

## Forecast quality
- The champion **HistGB** forecasts next-day sessions with WAPE 8% in W1, 21% in W2, 33% in W3 (MAE 5.9, 5.4, 5.5 sessions/day).
- It beats the best adaptive baseline in 2 of 3 main windows, by -0.3 WAPE points on average. **The model does not reliably beat the simple rules**: a same-weekday rule (recent average for that weekday) is as accurate for next-day planning and easier to explain. The model's value is in showing which factors drive demand, not in extra accuracy.
- Most important predictors in the latest window (W3): dayofweek, lag_1, rolling_7_mean. Recent demand history dominates: the forecast is mainly the recent level, adjusted for calendar and regime.
- 0 of the 12 largest errors fall on major holidays (MAE on holidays 4.5 vs 5.6 on other days). Holiday errors are not much larger than on other days.

## Demand and pricing
- Mean daily sessions by regime: R1 66.6, R2 77.6, R3 29.5, R4 8.0. Paid charging (R3) is associated with -62% sessions/day vs the free 14 kWh-default period (R2); this is an association over time, not a controlled price experiment.
- Weekend demand averages 20.3 sessions/day vs 48.1 on weekdays in normal operation: weekday capacity and staffing drive the planning problem.

## Planning
- To cover 90% of days, plan for forecast + 11 (W1), 10 (W2), 12 (W3) sessions; at the 80% level + 8, 5, 9.
- After an unseen change, forecasts are unreliable: in S1 the original model's WAPE was 41% and after adding 7 days of new data 38%; in S2 1579% vs 1352%. **Retrain within a week of any pricing or access change.** After 7 days of new data, in S1 the recalibrated model did not beat the adaptive baseline (38% vs 34%); in S2 the recalibrated model did not beat the adaptive baseline (1352% vs 142%). Until a retrained model is checked, the same-weekday baseline is the safe fallback.

## Limitations
- One site; daily totals only. The 106-day recording gap in 2020 and the very low COVID volumes limit what the model learns about the recovery.
- COVID_START (2020-03-16) and the holiday list are assumptions documented in Issues #10 and #12.
