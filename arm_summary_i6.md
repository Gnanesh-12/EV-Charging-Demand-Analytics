# Issue #6: Association rule mining (generated)

## Method and parameters
- **Approach:** frequent itemsets with built-in Apriori, then rules with a single-item consequent; 31,387 transactions (charging sessions), 36 items from Issue #5.
- **Mining floor:** support >= 1%, itemsets up to 4 items -> 9,725 frequent itemsets, 35,149 candidate rules.
- **Thresholds:** support >= 2% (about 628 sessions), confidence >= 60%, lift >= 1.2; a longer rule must improve confidence by >= 0.05 over every shorter version. Sensitivity: `arm_threshold_sensitivity.csv`.
- **Removed:** 20,025 weak, 11,584 negative associations, 524 true by construction (request <-> user), 517 with a regime as consequent, 595 near-arithmetic (stay/energy/charging share/power, overnight from arrival + stay), 258 request rules weak among app users, 1351 redundant, 0 mirrored pairs.
- **Final set:** **165 driver-behaviour rules** (charger use: 63, stay & idle time: 46, energy & power: 37, timing: 19) and 130 policy-driven rules, in `arm_rules_final.csv`.

## Headline rules (support >= 3%, stable across regimes or regime-specific; `arm_rules_headline.csv`)
- Sessions that arrive in the evening (18-24) and take 2-7 kWh: 71% stay under 2 h (2.64x the overall rate of 27%).
- Sessions that take 2-7 kWh, at the weekend: 69% stay under 2 h (2.56x the overall rate of 27%).
- Sessions that arrive in the evening (18-24) and are charging most of the stay (>= 80%): 64% stay under 2 h (2.38x the overall rate of 27%).
- Sessions that get < 90% of the energy requested and use one of the busiest chargers and stay 6-10 h: 71% are mostly idle (charging < 40% of the stay) (2.38x the overall rate of 30%).
- Sessions that take under 2 kWh, under paid charging (R3): 88% charge below 3 kW (2.14x the overall rate of 41%).
- Sessions that arrive in the morning (06-10) and take under 2 kWh: 86% charge below 3 kW (2.08x the overall rate of 41%).
- Sessions that arrive at midday (10-14) and take under 2 kWh: 86% charge below 3 kW (2.07x the overall rate of 41%).
- Sessions that stay under 2 h, in the COVID/recovery period (R4): 92% use one of the busiest chargers (2.04x the overall rate of 45%).
- Sessions that take 2-7 kWh and use one of the busiest chargers and stay 6-10 h: 81% arrive in the morning (06-10) (1.95x the overall rate of 41%).
- Sessions that take under 2 kWh: 79% charge below 3 kW (1.92x the overall rate of 41%).
- Sessions that use one of the busiest chargers and stay 6-10 h, under paid charging (R3): 79% arrive in the morning (06-10) (1.92x the overall rate of 41%).
- Sessions that stay 6-10 h, under free charging with the 14 kWh default (R2): 78% arrive in the morning (06-10) (1.89x the overall rate of 41%).
- Sessions in the COVID/recovery period (R4): 85% use one of the busiest chargers (1.89x the overall rate of 45%).
- Sessions that take 2-7 kWh and stay 6-10 h: 75% arrive in the morning (06-10) (1.81x the overall rate of 41%).
- Sessions that stay under 2 h, at the weekend: 71% use one of the busiest chargers (1.57x the overall rate of 45%).
- Sessions that arrive in the evening (18-24), under paid charging (R3): 70% use one of the busiest chargers (1.55x the overall rate of 45%).

## Stability across regimes
- 79 of 98 regime-free rules keep lift >= 1.1 in every regime with >= 100 matching sessions (`stability` table in the notebook).
- Mined per regime (support >= 5% of that regime): R1 free 71 rules (53 not in the pooled set), R2 free, 14 kWh default 80 rules (57 not in the pooled set), R3 paid 77 rules (52 not in the pooled set), R4 COVID period 44 rules (40 not in the pooled set).
- Strongest driver-behaviour pattern found only in R4 COVID period: {request=met} -> {energy=over_21kWh} (confidence 60%, lift 3.13).
- Strongest driver-behaviour pattern found only in R3 paid: {energy=over_21kWh} -> {power=high} (confidence 73%, lift 2.95).
- Strongest driver-behaviour pattern found only in R1 free: {charging_share=mostly_charging + day_type=weekday + power=high} -> {arrival=evening} (confidence 61%, lift 2.93).
- Strongest driver-behaviour pattern found only in R2 free, 14 kWh default: {arrival=morning + day_type=weekday + energy=2-7kWh} -> {charging_share=mostly_idle} (confidence 61%, lift 2.34).
- Policy-driven pattern in R4 COVID period: {energy=under_2kWh + power=low} -> {user=unclaimed} (confidence 62%, lift 7.46).
- Policy-driven pattern in R3 paid: {charging_share=mostly_charging + energy=under_2kWh + power=low} -> {user=unclaimed} (confidence 92%, lift 5.77).
- Policy-driven pattern in R2 free, 14 kWh default: {stay=over_10h + user=unclaimed} -> {charging_share=mostly_idle} (confidence 63%, lift 2.39).

## Notes for interpretation
- Rules describe co-occurrence, not cause: "morning arrivals stay 6-10 h" does not mean arriving early makes people stay longer.
- Policy-driven rules (the 14 kWh default and the 30-minute stop for unclaimed sessions, claim rates by regime) reflect operator rules and are kept apart from driver behaviour.
- Strongest negative associations (items that avoid each other): {stay=under_2h} and {charging_share=mostly_idle} lift 0.15; {charging_share=mostly_idle} and {stay=under_2h} lift 0.15; {overnight=no + stay=under_2h} and {charging_share=mostly_idle} lift 0.15.
