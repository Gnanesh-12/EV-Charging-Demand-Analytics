"""Feature engineering for the cleaned ACN charging-session data (Issue #12).

Run from the repository root:
    python feature_engineering.py

Outputs (repository root)
    feature_engineered_sessions.csv  one row per session (descriptive / analytics features)
    feature_engineered_daily.csv     one row per calendar day (modelling dataset)
    feature_dictionary.csv           every daily column with its role
    feature_validation_summary.csv   validation checks (all must pass)

Design rules
    * The daily table is built on a complete calendar, so lag_k is always the value k calendar days
      earlier, never "k rows earlier". Days with no sessions inside normal operation or the COVID period
      are real zeros; runs of GAP_MIN_DAYS or more zero days are recording gaps whose target is unknown (NaN),
      so no lag or rolling feature can be computed from them.
    * Columns carry a role. Only role == "predictor" may be a model input; every predictor is known
      before the forecast day starts.
    * Same-day aggregates (average kWh, long-stay share, ...) describe the day being predicted. They are
      kept with a "same_day_" prefix for analysis and are never predictors.
    * Station statistics in the session table use the full dataset. They are descriptive only; using
      them in a model would leak information from the test period.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from pandas.tseries.holiday import USFederalHolidayCalendar

ROOT = Path(__file__).resolve().parent
INPUT_FILE = ROOT / "acn_clean_sessions.csv"
SESSION_OUTPUT = ROOT / "feature_engineered_sessions.csv"
DAILY_OUTPUT = ROOT / "feature_engineered_daily.csv"
DICTIONARY_OUTPUT = ROOT / "feature_dictionary.csv"
VALIDATION_OUTPUT = ROOT / "feature_validation_summary.csv"

LOCAL_TZ = "America/Los_Angeles"
LONG_STAY_H = 6.0
GAP_MIN_DAYS = 7  # a run of at least this many zero-session days is a recording gap, not real demand

# Regime boundaries (Lee, Li & Low, ACN-Data, e-Energy 2019). COVID_START is an assumption checked in Issue #10.
R2_START = pd.Timestamp("2018-09-01")    # free charging, 14 kWh default for unclaimed sessions
PAID_START = pd.Timestamp("2018-11-01")  # paid charging ($0.12/kWh), unclaimed sessions stopped after 30 min
COVID_START = pd.Timestamp("2020-03-16")  # campus moves to remote operation
REGIMES = ("R1 free", "R2 free, 14 kWh default", "R3 paid", "R4 COVID period")

# Campus closures, taken from the data (Issue #16, section 1.6): holidays whose demand is below 60% of the same weekday in
# the surrounding weeks (median across years). Juneteenth, Columbus Day and Veterans Day are normal days at this site.
MAJOR_HOLIDAYS = frozenset({"New Year's Day", "Birthday of Martin Luther King, Jr.", "Washington's Birthday", "Memorial Day",
                            "Independence Day", "Labor Day", "Thanksgiving Day", "Christmas Day"})
WINTER_BREAK = True  # 24-31 December is also treated as a closure (median ratio 0.40 in Issue #16)
WINTER_BREAK_NAME = "Winter break (24-31 Dec)"

SESSION_COLUMNS = ("_id", "sessionID", "userID", "stationID", "spaceID", "connectionTime", "disconnectTime",
                   "doneChargingTime", "kWhDelivered", "connected_h", "charging_h", "avg_power_kW", "hour", "dayofweek",
                   "date", "has_user_input", "has_user_id", "ui_milesRequested", "ui_WhPerMile", "ui_minutesAvailable",
                   "ui_paymentRequired", "ui_kWhRequested", "ui_departure_est", "done_time_missing",
                   "done_time_inconsistent", "power_implausible", "overlaps_prev_session")

PREDICTORS = ["dayofweek", "is_weekend", "dow_1", "dow_2", "dow_3", "dow_4", "dow_5", "dow_6",
              "is_major_holiday", "is_r2_policy", "is_paid", "is_covid",
              "lag_1", "lag_7", "lag_14", "rolling_7_mean", "rolling_14_mean", "rolling_7_std", "same_dow_mean_4w"]


def regime_of(dates) -> np.ndarray:
    """Regime label for naive local dates/timestamps."""
    d = dates if isinstance(dates, pd.Series) else pd.DatetimeIndex(dates)
    return np.select([d < R2_START, d < PAID_START, d < COVID_START], list(REGIMES[:3]), default=REGIMES[3])


def _time_block(hour: pd.Series) -> pd.Series:
    return pd.cut(hour, bins=[-1, 5, 9, 13, 17, 21, 23],
                  labels=["overnight", "morning", "midday", "afternoon", "evening", "late_evening"]).astype("string")


def build_session_features(source: pd.DataFrame) -> pd.DataFrame:
    """Create one analytics row per cleaned charging session (descriptive features)."""
    df = source.copy()
    for column in ("connectionTime", "disconnectTime", "doneChargingTime"):
        df[column] = pd.to_datetime(df[column], utc=True, errors="coerce")
    local_connection = df["connectionTime"].dt.tz_convert(LOCAL_TZ)
    local_disconnect = df["disconnectTime"].dt.tz_convert(LOCAL_TZ)

    df["arrival_hour"] = local_connection.dt.hour
    df["arrival_minute"] = local_connection.dt.minute
    df["arrival_dayofweek"] = local_connection.dt.dayofweek
    df["is_weekend"] = df["arrival_dayofweek"].ge(5)
    df["arrival_date"] = local_connection.dt.date.astype("string")
    df["arrival_month"] = local_connection.dt.month
    df["arrival_week"] = local_connection.dt.isocalendar().week.astype("int64")
    df["time_block"] = _time_block(df["arrival_hour"])
    df["regime"] = regime_of(local_connection.dt.tz_localize(None))
    df["is_business_hours"] = df["arrival_hour"].between(7, 18)
    df["is_morning_arrival"] = df["arrival_hour"].between(6, 10)
    df["is_overnight_arrival"] = (df["arrival_hour"] < 6) | (df["arrival_hour"] >= 22)

    df["idle_h"] = (df["connected_h"] - df["charging_h"]).clip(lower=0)
    df["charging_ratio"] = pd.Series(np.where(df["connected_h"].gt(0), df["charging_h"] / df["connected_h"], np.nan),
                                     index=df.index).clip(0, 1)
    df["is_long_stay"] = df["connected_h"].ge(LONG_STAY_H)
    df["is_overnight_stay"] = local_disconnect.dt.date.ne(local_connection.dt.date)

    df["charging_time_available_h"] = df["ui_minutesAvailable"] / 60.0 if "ui_minutesAvailable" in df else np.nan
    if "ui_departure_est" in df:
        df["departure_slack_h"] = (pd.to_datetime(df["ui_departure_est"], utc=True, errors="coerce")
                                   - df["connectionTime"]).dt.total_seconds() / 3600.0
    else:
        df["departure_slack_h"] = np.nan

    df["energy_per_connected_h"] = np.where(df["connected_h"].gt(0), df["kWhDelivered"] / df["connected_h"], np.nan)
    df["energy_per_charging_h"] = np.where(df["charging_h"].gt(0), df["kWhDelivered"] / df["charging_h"], np.nan)
    if "ui_kWhRequested" in df:
        df["requested_energy_gap_kWh"] = df["ui_kWhRequested"] - df["kWhDelivered"]
        df["requested_energy_fill_ratio"] = np.where(df["ui_kWhRequested"].gt(0),
                                                     df["kWhDelivered"] / df["ui_kWhRequested"], np.nan)
    else:
        df["requested_energy_gap_kWh"] = df["requested_energy_fill_ratio"] = np.nan

    df["energy_band"] = pd.cut(df["kWhDelivered"], bins=[-np.inf, 2, 7, 13, 14, 21, 35, np.inf], right=False,
                               labels=["very_low", "low", "medium_low", "default_spike_13_14", "medium", "high",
                                       "very_high"]).astype("string")
    df["is_default_energy_spike"] = df["kWhDelivered"].between(13, 14, inclusive="left")
    df["is_high_energy"] = df["kWhDelivered"].ge(df["kWhDelivered"].quantile(0.9))

    station_stats = df.groupby("stationID", dropna=False).agg(
        station_session_count=("_id", "size"), station_mean_kWh=("kWhDelivered", "mean"),
        station_median_kWh=("kWhDelivered", "median"), station_total_kWh=("kWhDelivered", "sum"))
    station_stats["station_share_of_sessions"] = station_stats["station_session_count"] / len(df)
    station_stats["station_rank_by_sessions"] = station_stats["station_session_count"].rank(
        method="dense", ascending=False).astype("int64")
    df = df.join(station_stats, on="stationID")
    df["station_is_top_quartile"] = df["station_rank_by_sessions"].le(max(1, int(station_stats.shape[0] * 0.25)))

    keep = [c for c in SESSION_COLUMNS if c in df.columns] + [
        "arrival_hour", "arrival_minute", "arrival_dayofweek", "is_weekend", "arrival_date", "arrival_month",
        "arrival_week", "time_block", "regime", "is_business_hours", "is_morning_arrival", "is_overnight_arrival",
        "idle_h", "charging_ratio", "is_long_stay", "is_overnight_stay", "charging_time_available_h",
        "departure_slack_h", "energy_per_connected_h", "energy_per_charging_h", "requested_energy_gap_kWh",
        "requested_energy_fill_ratio", "energy_band", "is_default_energy_spike", "is_high_energy",
        "station_session_count", "station_mean_kWh", "station_median_kWh", "station_total_kWh",
        "station_share_of_sessions", "station_rank_by_sessions", "station_is_top_quartile"]
    return df[keep].copy()


def holiday_flags(dates: pd.DatetimeIndex) -> pd.DataFrame:
    """Federal holidays (reference); closures = major holidays, the day after Thanksgiving and the winter break (predictor)."""
    hol = USFederalHolidayCalendar().holidays(start=dates.min(), end=dates.max(), return_name=True)
    major = hol[hol.isin(MAJOR_HOLIDAYS)].index
    bridge = hol[hol == "Thanksgiving Day"].index + pd.Timedelta(days=1)
    out = pd.DataFrame(index=dates)
    out["is_federal_holiday"] = dates.isin(hol.index).astype(int)
    out["is_holiday_bridge"] = dates.isin(bridge).astype(int)
    winter = (dates.month == 12) & (dates.day >= 24) if WINTER_BREAK else np.zeros(len(dates), dtype=bool)
    out["is_winter_break"] = winter.astype(int)
    out["is_major_holiday"] = (dates.isin(major) | dates.isin(bridge) | winter).astype(int)
    out["holiday_name"] = pd.Series(hol.values, index=hol.index).reindex(dates).fillna("").values
    out.loc[out["is_holiday_bridge"] == 1, "holiday_name"] = "Day after Thanksgiving"
    out.loc[(out["is_winter_break"] == 1) & (out["holiday_name"] == ""), "holiday_name"] = WINTER_BREAK_NAME
    return out


def build_daily_features(session_features: pd.DataFrame) -> pd.DataFrame:
    """Aggregate to one row per calendar day with leakage-safe predictors."""
    data = session_features.copy()
    data["date"] = pd.to_datetime(data["arrival_date"])
    agg = data.groupby("date").agg(
        session_count=("_id", "size"), total_kWh=("kWhDelivered", "sum"),
        same_day_avg_kWh=("kWhDelivered", "mean"), same_day_median_kWh=("kWhDelivered", "median"),
        same_day_avg_connected_h=("connected_h", "mean"), same_day_avg_charging_h=("charging_h", "mean"),
        same_day_avg_idle_h=("idle_h", "mean"), same_day_avg_power_kW=("avg_power_kW", "mean"),
        same_day_n_stations=("stationID", "nunique"), same_day_n_unique_users=("userID", "nunique"),
        same_day_claimed_share=("has_user_id", "mean"), same_day_long_stay_share=("is_long_stay", "mean"),
        same_day_morning_arrival_share=("is_morning_arrival", "mean"),
        same_day_default_spike_share=("is_default_energy_spike", "mean"))

    calendar = pd.date_range(agg.index.min(), agg.index.max(), freq="D", name="date")
    daily = agg.reindex(calendar)
    daily["session_count"] = daily["session_count"].fillna(0)
    daily["total_kWh"] = daily["total_kWh"].fillna(0)

    # Recording gaps: runs of >= GAP_MIN_DAYS consecutive zero days -> target unknown.
    zero = daily["session_count"].eq(0)
    run_id = zero.ne(zero.shift()).cumsum()
    in_gap = zero & zero.groupby(run_id).transform("sum").ge(GAP_MIN_DAYS)
    daily["in_collection_gap"] = in_gap.astype(int)
    daily.loc[in_gap, ["session_count", "total_kWh"]] = np.nan

    idx = daily.index
    daily["dayofweek"] = idx.dayofweek
    daily["is_weekend"] = (idx.dayofweek >= 5).astype(int)
    for d in range(1, 7):
        daily[f"dow_{d}"] = (idx.dayofweek == d).astype(int)
    daily = daily.join(holiday_flags(idx))
    daily["regime"] = regime_of(idx)
    daily["is_r2_policy"] = (idx >= R2_START).astype(int)
    daily["is_paid"] = (idx >= PAID_START).astype(int)
    daily["is_covid"] = (idx >= COVID_START).astype(int)
    daily["month"] = idx.month
    daily["day_of_month"] = idx.day
    daily["week_of_year"] = idx.isocalendar().week.astype("int64").values

    y = daily["session_count"]
    daily["lag_1"] = y.shift(1)
    daily["lag_7"] = y.shift(7)
    daily["lag_14"] = y.shift(14)
    past = y.shift(1)
    daily["rolling_7_mean"] = past.rolling(7, min_periods=5).mean()
    daily["rolling_14_mean"] = past.rolling(14, min_periods=10).mean()
    daily["rolling_7_std"] = past.rolling(7, min_periods=5).std()
    same_dow = pd.concat([y.shift(7 * k) for k in range(1, 5)], axis=1)
    daily["same_dow_mean_4w"] = same_dow.mean(axis=1, skipna=True).where(same_dow.notna().sum(axis=1) >= 2)
    return daily.reset_index()


def feature_dictionary(daily: pd.DataFrame) -> pd.DataFrame:
    known = {
        "date": ("meta", "Calendar day (local time)"),
        "session_count": ("target", "Sessions starting on the day (primary target); NaN on recording-gap days"),
        "total_kWh": ("target", "Energy delivered by sessions starting on the day (secondary target)"),
        "in_collection_gap": ("meta", "1 if the day lies in a recording gap (target unknown)"),
        "regime": ("meta", "R1 free / R2 free with 14 kWh default / R3 paid / R4 COVID period"),
        "holiday_name": ("meta", "Name of the federal holiday or bridge day, empty otherwise"),
        "month": ("calendar_info", "Month - not a predictor: seasonality cannot be separated from regime changes"),
        "day_of_month": ("calendar_info", "Day of month - not a predictor"),
        "week_of_year": ("calendar_info", "ISO week - not a predictor"),
        "is_federal_holiday": ("calendar_info", "1 on any US federal holiday (reference only; several do not close campuses)"),
        "is_holiday_bridge": ("calendar_info", "1 on the day after Thanksgiving (included in is_major_holiday)"),
        "is_winter_break": ("calendar_info", "1 on 24-31 December (included in is_major_holiday)"),
        "dayofweek": ("predictor", "Day of week, 0 = Monday"),
        "is_weekend": ("predictor", "1 on Saturday/Sunday"),
        "is_major_holiday": ("predictor", "1 on a campus closure found in the data (New Year, MLK Day, Presidents' Day, "
                                          "Memorial Day, 4 July, Labor Day, Thanksgiving + next day, 24-31 Dec)"),
        "is_r2_policy": ("predictor", "1 from 1 Sep 2018 (14 kWh default for unclaimed sessions)"),
        "is_paid": ("predictor", "1 from 1 Nov 2018 (paid charging)"),
        "is_covid": ("predictor", "1 from the COVID start (campus in remote operation, then recovery)"),
    }
    lag_desc = dict(zip(("lag_1", "lag_7", "lag_14", "rolling_7_mean", "rolling_14_mean", "rolling_7_std", "same_dow_mean_4w"), [
        ("predictor", "Sessions on the previous calendar day"),
        ("predictor", "Sessions 7 calendar days earlier (same weekday)"),
        ("predictor", "Sessions 14 calendar days earlier"),
        ("predictor", "Mean sessions over the previous 7 days (needs >= 5 days with data)"),
        ("predictor", "Mean sessions over the previous 14 days (needs >= 10 days with data)"),
        ("predictor", "Std of sessions over the previous 7 days"),
        ("predictor", "Mean sessions on the same weekday in the previous 4 weeks (needs >= 2)")]))
    known.update(lag_desc)
    rows = []
    for c in daily.columns:
        if c.startswith("dow_"):
            role, desc = "predictor", "1 if weekday = " + c[-1] + " (Monday is the reference)"
        elif c.startswith("same_day_"):
            role, desc = "same_day_outcome", "Aggregate of the day being predicted - analysis only, never a predictor"
        else:
            role, desc = known.get(c, ("other", ""))
        rows.append((c, role, desc))
    return pd.DataFrame(rows, columns=["column", "role", "description"])


def validate(source: pd.DataFrame, session_features: pd.DataFrame, daily: pd.DataFrame) -> pd.DataFrame:
    d = daily.set_index("date")
    y = d["session_count"]
    gaps = d["in_collection_gap"].eq(1)
    dic = feature_dictionary(daily)
    predictors_ok = set(PREDICTORS) <= set(dic.loc[dic.role == "predictor", "column"])

    def lag_matches(k):
        expected = y.shift(k)
        both = d[f"lag_{k}"].notna() & expected.notna()
        return bool((d.loc[both, f"lag_{k}"] == expected[both]).all()) and bool(both.any())

    r7 = y.shift(1).rolling(7, min_periods=5).mean()
    both = r7.notna() & d["rolling_7_mean"].notna()
    after_gap = gaps.shift(1, fill_value=False) & ~gaps
    checks = [
        ("session_row_count_matches_input", len(session_features) == len(source)),
        ("session_ids_unique", session_features["sessionID"].is_unique),
        ("daily_calendar_contiguous", bool((d.index.to_series().diff().dropna() == pd.Timedelta(days=1)).all())),
        ("daily_dates_unique", d.index.is_unique),
        ("daily_counts_sum_to_sessions", int(y.sum()) == len(session_features)),
        ("lag_1_is_previous_calendar_day", lag_matches(1)),
        ("lag_7_is_seven_calendar_days_earlier", lag_matches(7)),
        ("rolling_7_mean_uses_previous_7_days_only", bool(np.allclose(d.loc[both, "rolling_7_mean"], r7[both]))),
        ("no_target_on_recording_gap_days", bool(y[gaps].isna().all())),
        ("no_lag_taken_from_a_gap_day", bool(d.loc[after_gap, "lag_1"].isna().all())),
        ("predictors_are_all_known_before_the_day", predictors_ok and not any(p.startswith("same_day_") for p in PREDICTORS)),
        ("regime_flags_match_dates", bool((d["is_covid"] == (d.index >= COVID_START)).all()
                                          and (d["is_paid"] == (d.index >= PAID_START)).all())),
        ("no_negative_idle_duration", bool((session_features["idle_h"].dropna() >= 0).all())),
        ("charging_ratio_between_zero_and_one", bool(session_features["charging_ratio"].dropna().between(0, 1).all())),
    ]
    return pd.DataFrame(checks, columns=["check", "passed"])


def main() -> None:
    source = pd.read_csv(INPUT_FILE)
    session_features = build_session_features(source)
    daily = build_daily_features(session_features)
    validation = validate(source, session_features, daily)
    if not validation["passed"].all():
        failed = validation.loc[~validation["passed"], "check"].tolist()
        raise ValueError("Feature validation failed: " + ", ".join(failed))
    session_features.to_csv(SESSION_OUTPUT, index=False)
    daily.to_csv(DAILY_OUTPUT, index=False)
    feature_dictionary(daily).to_csv(DICTIONARY_OUTPUT, index=False)
    validation.to_csv(VALIDATION_OUTPUT, index=False)
    for name, frame in [(SESSION_OUTPUT.name, session_features), (DAILY_OUTPUT.name, daily)]:
        print(f"Created {name}: {frame.shape[0]:,} rows x {frame.shape[1]} columns")
    print(f"Validated {len(validation)} checks")


if __name__ == "__main__":
    main()
