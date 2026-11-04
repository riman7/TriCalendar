import { useState } from "react";
import {
  NEPALI_MONTHS,
  adToBs,
  bsToAd,
  getTithiInfo
} from "../utils/calendarUtils";

export default function AddEventModal({ initialDateAd, onClose, onSave }) {
  // Input calendar mode for date entry: "AD" or "BS"
  const [dateMode, setDateMode] = useState("AD");

  // Date in AD
  const [adDate, setAdDate] = useState(initialDateAd || "2026-11-04");

  // Date in BS
  const initialBs = adToBs(initialDateAd || "2026-11-04");
  const [bsYear, setBsYear] = useState(initialBs.year);
  const [bsMonth, setBsMonth] = useState(initialBs.month);
  const [bsDay, setBsDay] = useState(initialBs.day);

  // Title and Description
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Event Type: "BIRTHDAY", "ANNIVERSARY", "OTHER"
  const [eventType, setEventType] = useState("BIRTHDAY");

  // Frequency if "OTHER" is selected: "ONCE", "DAILY", "WEEKLY", "YEARLY"
  const [recurrence, setRecurrence] = useState("ONCE");

  // Recurrence calendar type for yearly (multiple selection allowed): "AD", "BS", "TITHI"
  const [yearlyCalendars, setYearlyCalendars] = useState(["BS"]);

  // When AD date changes, synchronize BS state
  const handleAdDateChange = (val) => {
    setAdDate(val);
    try {
      const bs = adToBs(val);
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
    } catch {
      // ignore parsing error
    }
  };

  // When BS date changes, synchronize AD state
  const handleBsDateChange = (y, m, d) => {
    setBsYear(y);
    setBsMonth(m);
    setBsDay(d);
    try {
      const convertedAd = bsToAd(Number(y), Number(m), Number(d));
      setAdDate(convertedAd);
    } catch {
      // ignore conversion error
    }
  };

  // Toggle calendar for yearly reminders
  const toggleYearlyCalendar = (cal) => {
    if (yearlyCalendars.includes(cal)) {
      if (yearlyCalendars.length > 1) {
        setYearlyCalendars(yearlyCalendars.filter((c) => c !== cal));
      }
    } else {
      setYearlyCalendars([...yearlyCalendars, cal]);
    }
  };

  // Live conversion summary
  const summaryTithi = getTithiInfo(adDate);
  const summaryBsMonthName = NEPALI_MONTHS[bsMonth - 1]?.name || "";

  // Effective recurrence: Birthday and Anniversary are yearly
  const isYearly = eventType === "BIRTHDAY" || eventType === "ANNIVERSARY" || (eventType === "OTHER" && recurrence === "YEARLY");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter an event title");
      return;
    }

    // Determine final recurrence and reminderCalendars
    let finalRecurrence;
    let finalReminderCalendars;

    if (eventType === "BIRTHDAY" || eventType === "ANNIVERSARY") {
      finalRecurrence = "YEARLY";
      finalReminderCalendars = yearlyCalendars.length > 0 ? yearlyCalendars : ["BS"];
    } else {
      finalRecurrence = recurrence;
      if (recurrence === "YEARLY") {
        finalReminderCalendars = yearlyCalendars.length > 0 ? yearlyCalendars : ["AD"];
      } else {
        // For non-yearly (once, daily, weekly), remind based on the calendar used to select
        finalReminderCalendars = [dateMode === "BS" ? "BS" : "AD"];
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      dateType: dateMode,
      adDate,
      bsDate: {
        year: Number(bsYear),
        month: Number(bsMonth),
        day: Number(bsDay)
      },
      eventType,
      recurrence: finalRecurrence,
      reminderCalendars: finalReminderCalendars
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card add-event-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Event</h2>
          <button type="button" className="close-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-event-form">
          {/* 1. Title Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="event-title">
              Event Title <span className="req">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              className="form-input"
              placeholder="e.g., Mom's Birthday, Project Review..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* 2. Description Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="event-desc">
              Description (Optional)
            </label>
            <textarea
              id="event-desc"
              className="form-textarea"
              placeholder="Add reminder notes, gifts to buy, or meeting agenda..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 3. Date Selection in AD or BS */}
          <div className="form-group date-selection-group">
            <label className="form-label">Select Date in:</label>
            <div className="segmented-control" role="group">
              <button
                type="button"
                className={`segment-btn ${dateMode === "AD" ? "active" : ""}`}
                onClick={() => setDateMode("AD")}
              >
                Gregorian (AD)
              </button>
              <button
                type="button"
                className={`segment-btn ${dateMode === "BS" ? "active" : ""}`}
                onClick={() => setDateMode("BS")}
              >
                Bikram Sambat (BS)
              </button>
            </div>

            {dateMode === "AD" ? (
              <div className="date-input-container">
                <input
                  type="date"
                  className="form-input"
                  value={adDate}
                  onChange={(e) => handleAdDateChange(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="bs-date-triplet">
                <select
                  className="form-select"
                  value={bsYear}
                  onChange={(e) => handleBsDateChange(Number(e.target.value), bsMonth, bsDay)}
                >
                  {[2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2084, 2085].map(
                    (y) => (
                      <option key={y} value={y}>
                        {y} BS
                      </option>
                    )
                  )}
                </select>

                <select
                  className="form-select"
                  value={bsMonth}
                  onChange={(e) => handleBsDateChange(bsYear, Number(e.target.value), bsDay)}
                >
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.np})
                    </option>
                  ))}
                </select>

                <select
                  className="form-select"
                  value={bsDay}
                  onChange={(e) => handleBsDateChange(bsYear, bsMonth, Number(e.target.value))}
                >
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Synchronized Equivalents */}
            <div className="date-conversion-preview">
              <span>
                <strong>AD:</strong> {adDate}
              </span>
              <span>
                <strong>BS:</strong> {bsDay} {summaryBsMonthName} {bsYear}
              </span>
              <span>
                <strong>Tithi:</strong> {summaryTithi.tithiName}
              </span>
            </div>
          </div>

          {/* 4. Event Type: Birthday, Anniversary, Others */}
          <div className="form-group">
            <label className="form-label">Event Type:</label>
            <div className="radio-tile-group">
              <label className={`radio-tile ${eventType === "BIRTHDAY" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="eventType"
                  value="BIRTHDAY"
                  checked={eventType === "BIRTHDAY"}
                  onChange={() => setEventType("BIRTHDAY")}
                />
                <span className="tile-icon">🎂</span>
                <span className="tile-title">Birthday</span>
              </label>

              <label className={`radio-tile ${eventType === "ANNIVERSARY" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="eventType"
                  value="ANNIVERSARY"
                  checked={eventType === "ANNIVERSARY"}
                  onChange={() => setEventType("ANNIVERSARY")}
                />
                <span className="tile-icon">💍</span>
                <span className="tile-title">Anniversary</span>
              </label>

              <label className={`radio-tile ${eventType === "OTHER" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="eventType"
                  value="OTHER"
                  checked={eventType === "OTHER"}
                  onChange={() => setEventType("OTHER")}
                />
                <span className="tile-icon">📌</span>
                <span className="tile-title">Others</span>
              </label>
            </div>
          </div>

          {/* 5. If "Others" is selected: Reminding Frequency (Once, Daily, Weekly, Yearly) */}
          {eventType === "OTHER" && (
            <div className="form-group">
              <label className="form-label" htmlFor="frequency-select">
                Reminding Frequency:
              </label>
              <div className="frequency-pills">
                {[
                  { id: "ONCE", label: "Once" },
                  { id: "DAILY", label: "Daily" },
                  { id: "WEEKLY", label: "Weekly" },
                  { id: "YEARLY", label: "Yearly" }
                ].map((freq) => (
                  <button
                    key={freq.id}
                    type="button"
                    className={`freq-pill ${recurrence === freq.id ? "active" : ""}`}
                    onClick={() => setRecurrence(freq.id)}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6. If Yearly: Recurrence Calendar Type: AD or BS or Lunar (multiple selection allowed) */}
          {isYearly && (
            <div className="form-group yearly-cal-section">
              <label className="form-label">
                Recurrence Calendar Type:
                <span className="help-text"> (Select one or more calendars to remind on)</span>
              </label>

              <div className="cal-multiselect-group">
                <button
                  type="button"
                  className={`cal-check-btn ${yearlyCalendars.includes("AD") ? "selected" : ""}`}
                  onClick={() => toggleYearlyCalendar("AD")}
                >
                  <span className="check-box">{yearlyCalendars.includes("AD") ? "✓" : ""}</span>
                  <div className="cal-check-text">
                    <strong>AD Calendar</strong>
                    <span>Repeats every year on Gregorian date</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`cal-check-btn ${yearlyCalendars.includes("BS") ? "selected" : ""}`}
                  onClick={() => toggleYearlyCalendar("BS")}
                >
                  <span className="check-box">{yearlyCalendars.includes("BS") ? "✓" : ""}</span>
                  <div className="cal-check-text">
                    <strong>BS Calendar</strong>
                    <span>Repeats every year on Bikram Sambat date</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`cal-check-btn ${yearlyCalendars.includes("TITHI") ? "selected" : ""}`}
                  onClick={() => toggleYearlyCalendar("TITHI")}
                >
                  <span className="check-box">{yearlyCalendars.includes("TITHI") ? "✓" : ""}</span>
                  <div className="cal-check-text">
                    <strong>Lunar / Tithi</strong>
                    <span>Repeats on lunar tithi (e.g. Ekadashi, Purnima)</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn submit-btn">
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
