# Issue #7: Charging-behaviour association findings (generated)

**Basis:** 295 final rules from Issue #6 (165 driver behaviour, 130 policy-driven), 31,387 sessions over 155 weeks with data. One rule per pattern, ranked by leverage (extra sessions explained). Full table: `association_selected_rules_i7.csv`.

## Strongest meaningful relationships
1. Sessions that stay 6-10 h: 70% arrive in the morning (06-10) (1.69x the overall rate of 41%). Support: 22.3% of sessions, about 45 a week; confidence: 7.0 in 10 matching sessions; lift: 1.7x as likely as in a random session (41% -> 70%). Holds (lift > 1.1) in 4/4 regimes.
2. Sessions that stay under 2 h: 67% are charging most of the stay (>= 80%) (1.63x the overall rate of 41%). Support: 18.1% of sessions, about 37 a week; confidence: 6.7 in 10 matching sessions; lift: 1.6x as likely as in a random session (41% -> 67%). Holds (lift > 1.1) in 4/4 regimes.
3. Sessions that take under 2 kWh: 79% charge below 3 kW (1.92x the overall rate of 41%). Support: 12.4% of sessions, about 25 a week; confidence: 7.9 in 10 matching sessions; lift: 1.9x as likely as in a random session (41% -> 79%). Holds (lift > 1.1) in 4/4 regimes.
4. Sessions that arrive in the morning (06-10) and are mostly idle (charging < 40% of the stay): 68% stay 6-10 h (2.12x the overall rate of 32%). Support: 11.1% of sessions, about 23 a week; confidence: 6.8 in 10 matching sessions; lift: 2.1x as likely as in a random session (32% -> 68%). Holds (lift > 1.1) in 4/4 regimes.
5. Sessions that get < 90% of the energy requested and stay 6-10 h: 65% are mostly idle (charging < 40% of the stay) (2.15x the overall rate of 30%). Support: 10.2% of sessions, about 21 a week; confidence: 6.5 in 10 matching sessions; lift: 2.2x as likely as in a random session (30% -> 65%). Holds (lift > 1.1) in 3/3 regimes.
6. Sessions that stay under 2 h: 62% use one of the busiest chargers (1.37x the overall rate of 45%). Support: 16.6% of sessions, about 34 a week; confidence: 6.2 in 10 matching sessions; lift: 1.4x as likely as in a random session (45% -> 62%). Holds (lift > 1.1) in 3/4 regimes.
7. Sessions that arrive at midday (10-14), on a weekday: 73% use a less busy charger (1.33x the overall rate of 55%). Support: 15.0% of sessions, about 30 a week; confidence: 7.3 in 10 matching sessions; lift: 1.3x as likely as in a random session (55% -> 73%). Holds (lift > 1.1) in 4/4 regimes.
8. Sessions that arrive in the evening (18-24) and are charging most of the stay (>= 80%): 64% stay under 2 h (2.38x the overall rate of 27%). Support: 5.4% of sessions, about 11 a week; confidence: 6.4 in 10 matching sessions; lift: 2.4x as likely as in a random session (27% -> 64%). Holds (lift > 1.1) in 4/4 regimes.

## Recurring behaviour profiles
- **Workday commuters** (arrive 06-10, stay >= 6 h): 28% of sessions but **45% of charger-hours** and 50% of idle charger-hours; idle for 54% of their own plug-in time.
- **Quick top-ups** (stay < 2 h): 27% of sessions, 5% of charger-hours, idle for 13% of their time; 27% of them at weekends.
- **Short visits** (2-6 h): 31% of sessions, 21% of charger-hours. **Other long stays** (>= 6 h, not a morning arrival): 15% of sessions, 29% of charger-hours.
- The largest share of idle charger-hours comes from **workday commuters**; the most energy per charger-hour from **quick top-ups** (5.94 kWh per hour plugged in vs 1.13 for workday commuters).
- Commuter share of sessions by regime: R1 27%, R2 29%, R3 32%, R4 9%.

## Implications for workplace charging
1. **Capacity is set by long stays, not by session counts.** Workday commuters hold 45% of charger-hours and 50% of idle hours. Freeing chargers once charging is done (idle fees after a grace period, move-your-car notifications, or valet swapping at midday) adds capacity without new hardware.
2. **Protect quick top-ups.** Short sessions deliver 5.94 kWh per charger-hour vs 1.13 for commuters. They are over-represented at weekends (27% of top-ups vs 15% of all sessions) and in the evening (28% vs 15%); a few short-stay bays at those times serve many drivers.
3. **Plan the morning peak.** Commuters arrive together in 06-10 and stay all day, so the chargers they occupy are blocked until afternoon; peak occupancy (Issue #16/#17) follows from this pattern.
4. **Watch charger concentration.** The busiest 25% of chargers take 85% of sessions in R4 vs 38% in R2. Rotating assignments or signage spreads wear and keeps the other chargers in service.
5. **Pricing and access rules shape behaviour.** 130 of the 295 final rules are policy-driven (strongest lift 6.09 vs 2.91 for driver behaviour): the default allowance and the 30-minute stop for unclaimed sessions show up directly in energy, power and claim patterns. Any change in pricing or access rules should be expected to change these patterns, and the rules should be re-mined after it.

## Limitations
- **High confidence is not enough.** {day_type=weekday} -> {overnight=no} has confidence 95% but lift 1.01: overnight=no is in 94% of all sessions anyway. Such rules were removed as weak.
- **Pooling regimes:** every selected rule keeps lift >= 1.0 inside each regime with enough sessions, so none is an artefact of pooling regimes.
- **Operator rules look like behaviour.** {regime=R3_paid} -> {user=claimed} (lift 1.61) reflects claim rates set by the pricing rules (1% of sessions claimed under free charging, most under paid charging, when unclaimed sessions are stopped after 30 minutes), not driver choice; such rules are kept apart.
- **Association is not causation.** A rule says two things occur together, e.g. morning arrival and a long stay; it does not say that one causes the other.
- **Categories depend on boundaries.** Stay, energy and power are binned (Issue #5); rules near a boundary (e.g. 6 h) can change with a different cut.
- **Some items are missing.** Charging-share items are missing for 7% of sessions (unreliable done-time), so idle-time rules describe the other 93%.
- **Some pairs are true by definition and were removed:** request outcome only exists for app users; overnight follows from arrival time + stay; energy, power, charging share and stay are linked arithmetically.
- **One site.** Caltech is a campus with some public use; the profile mix can differ at other workplaces.
