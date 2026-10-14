## Issue #3: Structured Dataset

- **Rows / columns:** 31,424 sessions × 13 fields, chronological order.
- **Columns** reordered into identifiers, location, timestamps, energy and user information: _id, sessionID, userID, stationID, spaceID, siteID, clusterID, connectionTime, disconnectTime, doneChargingTime, kWhDelivered, timezone, userInputs.
- **Identifiers kept as text** (`siteID`, `clusterID`, `userID`) so leading zeros and IDs are not changed to numbers.
- **Uniqueness:** `_id` and `sessionID` verified unique. Stations: 55; sites: 2; clusters: 2; sessions with a `userID`: 16,388 (52.2%); missing `doneChargingTime`: 2,055.
- **Output:** `acn_structured_sessions.csv` (input to Issue #9 preprocessing).
