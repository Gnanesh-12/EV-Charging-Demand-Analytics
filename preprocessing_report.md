## Issue #9: Preprocessing Summary

**Input.** 31,424 charging sessions, 13 fields, from the ACN-Data Caltech API. This is the complete set of 31,424 sessions reported by the API, covering 2018-04-25 to 2021-09-13 (1238 days). The source has a gap: no sessions between 2020-08-03 and 2020-11-18 (106 empty days). Both sides are kept; downstream notebooks exclude the gap days.

**Result.** 31,387 sessions retained (99.88%) in `acn_clean_sessions.csv` (32 columns); 37 removed and listed with reasons in `acn_flagged_sessions.csv`. Rows removed by ACTIVE rules: 37; by guards: 0.

| Step | Kind | Rows affected |
|---|---|---|
| outside contiguous coverage | ACTIVE | 0 |
| duplicate _id | guard | 0 |
| duplicate sessionID | guard | 0 |
| duplicate station+connectionTime | guard | 0 |
| unparseable connect/disconnect time | guard | 0 |
| disconnect not after connect | guard | 0 |
| doneChargingTime outside plug-in window -> NaT (rows kept) | fix | 28 |
| kWhDelivered missing/non-numeric | guard | 0 |
| kWhDelivered < 0.1 | guard | 0 |
| kWhDelivered > 100.0 | guard | 0 |
| connected < 1.0 min | guard | 0 |
| connected > 72.0 h | ACTIVE | 37 |

**Interpretation.** Guard rules found nothing; the issues found were impossible `doneChargingTime` values (28 sessions, value blanked, session kept), extreme connection times (37 sessions removed, over 72 h; 99th percentile 21.7 h). A further 2055 sessions never had a `doneChargingTime` (kept, flagged `done_time_missing`). No overlapping sessions on the same station.

**Long sessions and occupancy.** The 37 sessions over 72 h are excluded from per-session energy and duration statistics only. They did occupy a charger, so occupancy and utilisation analysis should add them back from `acn_flagged_sessions.csv` (`drop_reason` = `connected > 72.0 h`).

**Transformations.** Timestamps converted UTC → America/Los_Angeles; `userInputs` flattened (latest entry; 2325 sessions had more than one entry) into `ui_*` columns; user timestamps parsed with an explicit format (`ui_requestedDeparture` 16372 raw values, 16372 parsed; `ui_modifiedAt` 16372 raw values, 16372 parsed); `ui_departure_est` = `ui_modifiedAt` + `ui_minutesAvailable`; flags `has_user_id`, `has_user_input`, `done_time_missing`, `done_time_inconsistent`, `power_implausible`, `overlaps_prev_session`; derived fields `connected_h`, `charging_h`, `avg_power_kW`, `hour`, `dayofweek`, `date`. Columns dropped: `ui_userID` (exact duplicate of userID); `siteID` (constant (2)); `clusterID` (constant (39)). User fields exist for 16,372 sessions (52.2%).

**Average power check.** 99th percentile 6.8 kW; maximum before treatment 1,033 kW (likely `doneChargingTime` falling very shortly after connection; not individually verified). 102 sessions exceeded 7 kW, of which 63 are between 7 kW and the 10 kW limit and were kept; values above 10 kW were nulled and flagged `power_implausible` (39 sessions, all kept). The limit should be confirmed against the chargers' rated power. 2 sessions had a non-positive charging duration. In total 2124 sessions have no usable `avg_power_kW`.

**Observations carried to analysis (recomputed on cleaned data).**
- 2,579 sessions (8.2%) deliver 13–14 kWh, a sharp spike. Most common arrival hours: 8:00, 9:00, 10:00. 24.4% carry a `userID` (vs 52.2% overall); median stay 6.6 h (vs 4.7 h overall). Normalised by each station's own session count, spike share by station ranges 3.5%–21.5% (chi-square homogeneity test across stations with ≥50 sessions: p = 2.62e-58; spike share differs between stations). Cause not established.
- Connection time is bimodal: 57.5% of sessions are under 6 h (median 5.9 kWh) and 42.5% are 6 h or longer (median 9.1 kWh). The split is set at the density valley between the two modes (≈5.9 h). A single demand model is likely to fit these groups poorly; segmentation should be considered.

**Limitations.** (1) The 106-day recording gap must be excluded, not read as zero demand. Very low-volume months (2020-04, 2020-05, 2020-06, 2020-07, 2020-08, 2020-11) are real but form a separate regime and should not be pooled with normal operation. (2) User-level analysis is limited to the 52% of sessions with a `userID`. (3) `avg_power_kW` is unreliable wherever `doneChargingTime` is unreliable.
