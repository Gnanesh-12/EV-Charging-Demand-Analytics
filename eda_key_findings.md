# EDA key findings (numbers computed from the data)

- **Scope.** 14,279 sessions at 54 stations, 2018-04-25 to 2018-11-28 (218 calendar days, of which 218 have data), one site (open to the public; mostly campus users, so a hybrid of workplace and public charging). No annual seasonality can be assessed.

- **Data gaps.** none of 7+ consecutive zero-session days. Gap days are excluded from daily statistics, per-day rates, the plugged-in profile and trend tests.

- **Frequency.** 65.5 sessions per day on average (median 69); weekdays 74.9 vs weekends 41.9 per day. Dispersion index (1 = random arrivals): 4.0 on weekdays, 4.1 on weekends (the all-days value, 7.4, is inflated by mixing weekdays and weekends).

- **Day of week.** Busiest Tue (77.5 sessions/day), quietest Sun (41.5).

- **Energy.** Median 7.5 kWh per session (mean 9.0, skew 2.1). The largest 10% of sessions deliver 26% of all energy. Weekday-vs-weekend energy per session: negligible effect.

- **Time of day.** Morning 06–10 is the busiest block per hour (42% of sessions, 43% of energy, 6.9 arrivals per hour per day on days with data). Weekday plugged-in vehicles peak at 38.5 around 11:00 (peak-to-average 2.03); the largest simultaneous count was 51 of 54 chargers (94%); 3% of weekdays reach ≥90% occupancy at least once (> 72 h sessions included for occupancy).

- **Duration.** Median 4.7 h plugged in; 43% of sessions last 6 h or more (split at the density valley between the short- and long-stay modes, ≈6.1 h). Idle time is 44% of plugged-in hours (sessions with a trusted done-time).

- **Stations.** Usage Gini 0.31; busiest 10 stations carry 34% of sessions (an even split would be 19%). Per observed day, 0 stations are under-used and 1 over-used by the Tukey rule.

- **Anomalous days.** 25 days deviate strongly from their same-weekday baseline; 4 fall on US federal holidays, and 9 fall on or after 1 Nov 2018, where the ±2-week baseline still includes free-charging weeks. Those reflect the policy change (and Thanksgiving) rather than unusual demand.

- **13–14 kWh spike.** 2,037 sessions in that 1-kWh bin, 4.5x the average of the four neighbouring bins; its monthly share ranges 4%–21% and the per-station share 7%–25%. Cause not established on this evidence alone; see the regime finding.

- **Policy regimes.** Weekday sessions per day: 74.0 (R1), 88.5 (R2), 49.9 (R3, paid); share of sessions with a `userID`: 1%, 14%, 77%. Paid vs free (R2) weekday volume: large effect. For the 13–14 kWh spike, spike share is 21% of unclaimed vs 6% of claimed sessions in R2, and 4% of all sessions in R3 (vs 19% in R2); this is consistent with the 14 kWh default allowance for unclaimed sessions documented by the dataset authors. R3 covers only 28 days with data, so paid-period figures are indicative.

- **Default allowance, evidence detail.** After 1 Nov the spike share among unclaimed sessions is 0% and their median energy 0.89 kWh, consistent with unclaimed sessions being stopped after 30 minutes. Before 1 Sep, unclaimed sessions show a ratio of 0.8x at 20–21 kWh and 2.3x at 41–42 kWh (20 sessions) versus neighbouring bins, and the station-level spike share spread is 0.06 (R1) vs 0.07 (R2), so the charger-specific 21/42 kWh defaults described for that period are not clearly visible in this data; that part of the documented policy is not confirmed here.

- **Trend.** Sessions per active station per day with data rose from 1.12 (2018-05) to a peak of 1.48 (2018-08), then fell to 1.45 (2018-10); a straight-line trend statistic hides this rise-then-fall shape. Active stations changed only from 51 to 54, so rollout does not explain it. Spearman rho 0.83 (p=0.04) over 6 months, all in the free-charging period: not a firm conclusion. Cause not established.
