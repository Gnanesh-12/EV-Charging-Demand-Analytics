# EDA key findings (numbers computed from the data)

- **Scope.** 31,387 sessions at 55 stations, 2018-04-25 to 2021-09-13 (1238 calendar days, 1132 with data), one site (open to the public; mostly campus users, so a hybrid of workplace and public charging). Findings below describe **normal operation** (2018-04-25 to 2020-03-15, 27,898 sessions on 691 days) unless they name another regime; the COVID period from 2020-03-16 is reported separately (data-detected break: week of 2020-03-16). The paid regime has 16 complete months before COVID, a full year, but a single year cannot separate seasonality from trend.

- **Data gaps.** 2020-08-04 to 2020-11-17 (106 days with no sessions). Gap days are excluded from daily statistics, per-day rates, the plugged-in profile and trend tests.

- **Frequency.** 40.4 sessions per day on average (median 38); weekdays 48.3 vs weekends 20.5 per day. Dispersion index (1 = random arrivals): 10.2 on weekdays, 13.5 on weekends (the all-days value, 14.6, is inflated by mixing weekdays and weekends).

- **Day of week.** Busiest Tue (50.8 sessions/day), quietest Sun (19.8).

- **Energy.** Median 6.7 kWh per session (mean 8.9, skew 2.3). The largest 10% of sessions deliver 30% of all energy. Weekday-vs-weekend energy per session: negligible effect.

- **Time of day.** Morning 06–10 is the busiest block per hour (43% of sessions, 45% of energy, 4.4 arrivals per hour per day on days with data). Weekday plugged-in vehicles peak at 28.1 around 13:00 (peak-to-average 2.28); the largest simultaneous count was 51 of 54 chargers (94%); 1% of weekdays reach ≥90% occupancy at least once (> 72 h sessions included for occupancy).

- **Duration.** Median 5.2 h plugged in; 46% of sessions last 6 h or more (split at the density valley between the short- and long-stay modes, ≈5.9 h). Idle time is 48% of plugged-in hours (sessions with a trusted done-time).

- **Stations.** Usage Gini 0.34; busiest 10 stations carry 35% of sessions (an even split would be 19%). Per observed day, 0 stations are under-used and 1 over-used by the Tukey rule.

- **Anomalous days (normal operation).** 63 days deviate strongly from their same-weekday baseline; 16 fall on US federal holidays and 1 in the two weeks after a regime change, where the baseline still mixes regimes. The remaining 47 are unexplained by the calendar.

- **13–14 kWh spike.** 2,480 sessions in that 1-kWh bin, 2.8x the average of the four neighbouring bins; its monthly share ranges 2%–21% and the per-station share 4%–22%. Cause not established on this evidence alone; see the regime finding.

- **Regimes.** Weekday sessions per day: 74.0 (R1), 88.5 (R2), 36.8 (R3, paid, before COVID), 8.7 (R4, COVID period). Paid charging changed weekday volume by -58% relative to R2, measured over 501 paid days before COVID (large effect). Share of sessions with a `userID`: 1% (R1), 14% (R2), 84% (R3), 92% (R4). For the 13–14 kWh spike, spike share is 21% of unclaimed vs 6% of claimed sessions in R2, and 3% of all sessions in R3 (vs 19% in R2); this is consistent with the 14 kWh default allowance for unclaimed sessions documented by the dataset authors.

- **COVID period (R4).** From 2020-03-16 volume fell to 2% of the paid pre-COVID level (29.5 sessions per day) in 2020-05; 8 months stayed below 25% of that level. No sessions were recorded from 2020-08-04 to 2020-11-17 (106 days). By 2021-08 demand was back to 65% of the paid pre-COVID level. R4 is a different regime and must not be pooled with normal operation.

- **Default allowance, evidence detail.** In R3 the spike share among unclaimed sessions is 0% and their median energy 0.89 kWh, consistent with unclaimed sessions being stopped after 30 minutes. Before 1 Sep, unclaimed sessions show a ratio of 0.8x at 20–21 kWh and 2.3x at 41–42 kWh (20 sessions) versus neighbouring bins, and the station-level spike share spread is 0.06 (R1) vs 0.07 (R2), so the charger-specific 21/42 kWh defaults described for that period are not clearly visible in this data; that part of the documented policy is not confirmed here.

- **Trend (normal operation).** Sessions per active station per day with data rose from 1.12 (2018-05) to a peak of 1.48 (2018-08), then fell to 0.63 (2020-02); a straight-line trend statistic hides this rise-then-fall shape. Active stations went from 51 to 46, so rollout does not explain the change. The window spans R1 free, R2 free, 14 kWh default, R3 paid, so the overall Spearman rho (-0.78) mixes rule changes with trend. Within the paid regime alone (16 complete months, 2018-11 to 2020-02) the per-station rate went from 0.82 to 0.63 (Spearman rho -0.53, p=0.04): a statistically detectable trend; cause not established.
