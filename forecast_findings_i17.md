# Issue #17: Forecast evaluation and business findings (generated)

## Forecast evaluation
- **Paid charging, pre-COVID** (SARIMAX + closures): held-out MAE 5.7 sessions/day, WAPE 19%, bias -4.0; 80% interval covered 86% of days (95%: 96%). Backtest skill vs best baseline +35%; error in week 4 of the horizon is 1.0× week 1. Verdict: **usable with care** (3/4 checks).
- **Post-COVID recovery** (SARIMAX + closures + drift): held-out MAE 3.9 sessions/day, WAPE 19%, bias -1.1; 80% interval covered 61% of days (95%: 79%). Backtest skill vs best baseline +17%; error in week 4 of the horizon is 1.5× week 1. Verdict: **usable with care** (3/4 checks).
- **Where the errors are.** Paid charging, pre-COVID MAE 4.0 on closure days vs 4.5 on other days; Post-COVID recovery MAE 5.3 on closure days vs 3.1 on other days. Largest held-out misses: Fri 10 Sep 2021 (under-forecast, error -20); Thu 16 Jan 2020 (under-forecast, error -19); Mon 13 Jan 2020 (under-forecast, error -14). Relative error is highest on Sat (paid charging, pre-COVID), Sun (post-COVID recovery).
- **Error pattern.** Paid charging, pre-COVID: lag-1 autocorrelation of held-out errors 0.34 → misses come in runs, a sign of level shifts the model adapts to slowly. Post-COVID recovery: lag-1 autocorrelation of held-out errors 0.16 → errors are close to random from day to day, so no pattern is left for the model to use.
- Paid charging, pre-COVID: held-out bias is 14% of mean demand.
- Post-COVID recovery: the 80% interval covered 65% of backtest days, so it is too narrow.

## Forecast analysis
- Over 14 Sep – 08 Nov 2021 the model expects **24.7 sessions/day** (28.3 on typical weekdays, 15.9 at weekends), about 300 kWh/day.
- Weekly volume changes by **+7%** from the first to the last forecast week (the drift term continues the recovery trend).
- The forecast weekday level is +23% against the last 8 observed weeks and **73% of the pre-COVID paid-charging level** (39 sessions per typical weekday).
- The weekly shape matches the post-COVID recovery history (largest day-of-week index difference 0.12); weekends carry 56% of a weekday's demand.
- Busiest forecast day: **Fri 05 Nov** (32 sessions, 80% upper bound 37); highest weekday on average: Fri. Quietest: Sun 26 Sep (15).
- No campus closure falls in the horizon.
- Within the day, vehicles plugged in stay near their maximum during **10:00–16:00** on weekdays; demand is low before 08:00 and after 21:00.

## Business interpretation
1. **Capacity planning.** With a 90%-of-days buffer the busiest weekday needs about **26 chargers** at the peak, 72% of the 36 in recent use; weekends need about 15. No new chargers are needed for the forecast period. If demand returns to the pre-COVID paid level, busy weekdays need about 37 chargers at the peak (95th percentile), more than the 36 in recent use but within the 55 installed. Plan with the forecast plus 6 sessions/day (the 90th percentile of past under-forecasts), not with the point forecast.
2. **Peak-period management.** Vehicles stay plugged in 3.4 h on average and **61% of plugged-in time is spent not charging**. Peak occupancy (10:00–16:00 on weekdays) is driven mostly by parked cars, not by power demand, so idle fees or move-your-car reminders during that window free chargers more cheaply than new hardware.
3. **Charger allocation.** 36 of 55 chargers were used in the last 8 weeks and the busiest 7 carry 63% of sessions. Keep about 26 chargers available on weekdays and 15 at weekends; rotate sessions away from the busiest chargers to spread wear; schedule maintenance at weekends, on closure days and in the quiet hours (before 08:00 and after 21:00).
4. **Use of the forecast.** Use it for the next 1–4 weeks, refit it weekly as new data arrive, and treat it as usable with care for the current regime. Any change in pricing or access starts a new regime: switch to the 8-week weekday mean until the model has been refitted on a few weeks of new data.

## Limitations and uncertainty
- The backtest tested horizons up to 4 weeks (error in week 4 = 1.5× week 1); weeks 5–8 of the future forecast go beyond what was tested and are indicative only.
- Held-out periods are short (56 days paid charging, pre-COVID, 28 days post-COVID recovery); the backtest gives the more reliable averages.
- Peak plugged-in vehicles are derived from forecast sessions through a fitted relation, not forecast directly; charger counts inherit that uncertainty.
- One site and one charging network; a closure list derived from this site's data. Results do not transfer to other workplaces without re-fitting.
- Issue #15 covers the next-day ML model; the two forecasts are complementary (day-ahead vs weeks-ahead) and use different test periods, so their errors are not directly comparable.
