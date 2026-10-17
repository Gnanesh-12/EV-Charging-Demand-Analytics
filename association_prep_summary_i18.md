# Issue #18: Association-analysis data preparation (generated)

- **Transactions:** 31,387 charging sessions (2018-04-25 to 2021-09-13), one transaction each.
- **Items:** 36 categories from 11 behaviour attributes (arrival time, day type, stay length, energy, charging share, power, user, request outcome, overnight, station, regime). Definitions and meanings: `association_category_definitions.csv`.
- **Transaction size:** 8-11 items (median 10); at most one item per attribute, so categories are mutually exclusive.
- **Missing values produce no item, never an "unknown" category:** `charging_share` has an item for 93% of sessions (done-time missing or inconsistent); `power` has an item for 93% of sessions (done-time unreliable or power implausible); `request` has an item for 52% of sessions (no app request (unclaimed or no kWh requested)).
- **Removed categories (empty or > 95% of sessions):** none.
- **Rare categories (< 1%):** none.
- **Verification:** all 8 checks passed (no empty transactions, one-hot matrix binary, the three formats agree, one item per attribute).
- **Association signal:** 297 item pairs from different attributes reach 5% support; 25 have lift > 1.5. Strongest: {stay=under_2h, regime=R4_covid} lift 2.09 (support 6%); {user=unclaimed, regime=R1_free} lift 2.07 (support 26%); {stay=over_10h, charging_share=mostly_idle} lift 2.02 (support 6%).
- **Files:** `association_transactions_long.csv` (long format), `association_baskets.csv` (one row per session, with date and regime), `association_onehot.csv` (36 item columns, for Apriori / FP-Growth).
- **Notes for mining:** the `regime` item makes it possible to mine all sessions together or each regime separately; pricing changed behaviour strongly, so rules that hold only in one regime should be reported with that regime. The `energy=13-14kWh_default` and `user=unclaimed` items are linked by design in R2 (default allowance), and `energy=under_2kWh` with `user=unclaimed` in R3 (30-minute stop); such rules reflect operator policy, not driver choice.
