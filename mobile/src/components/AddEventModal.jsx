import { useState, useEffect } from "react";
import {
  NEPALI_MONTHS,
  BS_YEARS,
  adToBs,
  bsToAd,
  getTithiInfo
} from "../utils/calendarUtils";
import { REMINDER_PRESETS, normalizeReminderTimings } from "../services/notificationService";

import {
  BirthdayIcon,
  AnniversaryIcon,
  OtherIcon,
  CloseIcon,
  CheckIcon
} from "./Icons";

export default function AddEventModal({ initialDateAd, eventToEdit = null, onClose, onSave }) {
  const isEditing = Boolean(eventToEdit);

  // Input calendar mode for date entry: "AD" or "BS"
  const [dateMode, setDateMode] = useState(eventToEdit?.dateType || "AD");

  // Date in AD
  const [adDate, setAdDate] = useState(eventToEdit?.anchorAdDate || initialDateAd || "2026-11-04");

  // Date in BS
  const [bsYear, setBsYear] = useState(eventToEdit?.anchorBsDate?.year || 2083);
  const [bsMonth, setBsMonth] = useState(eventToEdit?.anchorBsDate?.month || 7);
  const [bsDay, setBsDay] = useState(eventToEdit?.anchorBsDate?.day || 1);

  // Tithi for the live preview
  const [summaryTithi, setSummaryTithi] = useState(
    eventToEdit?.anchorLunarDate || { tithiName: "…", fullText: "…" }
  );

  // Title and Description
  const [title, setTitle] = useState(eventToEdit?.title || "");
  const [description, setDescription] = useState(eventToEdit?.description || "");

  // Event Type: "BIRTHDAY", "ANNIVERSARY", "OTHER"
  const [eventType, setEventType] = useState(eventToEdit?.eventType || "BIRTHDAY");

  // Frequency if "OTHER" is selected: "ONCE", "DAILY", "WEEKLY", "YEARLY"
  const [recurrence, setRecurrence] = useState(eventToEdit?.recurrence || "ONCE");

  // Recurrence calendar type for yearly (multiple selection allowed): "AD", "BS", "TITHI"
  const [yearlyCalendars, setYearlyCalendars] = useState(
    eventToEdit?.reminderCalendars || ["BS"]
  );

  // Notification / Reminder timing configuration — array of reminder configs
  const [reminderTimings, setReminderTimings] = useState(
    normalizeReminderTimings(eventToEdit?.reminderTiming)
  );

  // On mount: convert the initial AD date to BS and fetch tithi if not prefilled
  useEffect(() => {
    if (eventToEdit?.anchorBsDate && eventToEdit?.anchorLunarDate) {
      return;
    }
    const initDate = eventToEdit?.anchorAdDate || initialDateAd || "2026-11-04";
    const [y, m, d] = initDate.split("-").map(Number);
    adToBs(y, m, d).then((bs) => {
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
    }).catch(() => {});
    getTithiInfo(initDate).then(setSummaryTithi).catch(() => {});
  }, [initialDateAd, eventToEdit]);

  // When AD date changes, synchronize BS state and tithi
  const handleAdDateChange = async (val) => {
    setAdDate(val);
    try {
      const [y, m, d] = val.split("-").map(Number);
      const bs = await adToBs(y, m, d);
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
      const tithi = await getTithiInfo(val);
      setSummaryTithi(tithi);
    } catch {
      // ignore parsing error
    }
  };

  // When BS date changes, synchronize AD state
  const handleBsDateChange = async (y, m, d) => {
    setBsYear(y);
    setBsMonth(m);
    setBsDay(d);
    try {
      const result = await bsToAd(Number(y), Number(m), Number(d));
      const newAdDate = result.adDate;
      setAdDate(newAdDate);
      const tithi = await getTithiInfo(newAdDate);
      setSummaryTithi(tithi);
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

  // Toggle a reminder preset on/off; always keep at least one selected
  const toggleReminderPreset = (presetId) => {
    const preset = REMINDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setReminderTimings((prev) => {
      const exists = prev.find((r) => r.type === presetId);
      if (exists) {
        // Deselect — but keep at least one
        return prev.length > 1 ? prev.filter((r) => r.type !== presetId) : prev;
      } else {
        return [
          ...prev,
          { type: presetId, time: preset.defaultTime || "09:00", daysBefore: preset.daysBefore ?? 1 }
        ];
      }
    });
  };

  // Update a sub-field (time / daysBefore) of a specific reminder entry
  const updateReminderField = (presetId, field, value) => {
    setReminderTimings((prev) =>
      prev.map((r) => (r.type === presetId ? { ...r, [field]: value } : r))
    );
  };

  // Live conversion summary
  const summaryBsMonthName = NEPALI_MONTHS[bsMonth - 1]?.name || "";

  // Effective recurrence: Birthday and Anniversary are yearly
  const isYearly = eventType === "BIRTHDAY" || eventType === "ANNIVERSARY" || (eventType === "OTHER" && recurrence === "YEARLY");

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
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
        finalReminderCalendars = [dateMode === "BS" ? "BS" : "AD"];
      }
    }

    const eventPayload = {
      ...(eventToEdit ? { id: eventToEdit.id } : {}),
      title: title.trim(),
      description: description.trim(),
      dateType: dateMode,
      anchorAdDate: adDate,
      adDate,
      anchorBsDate: {
        year: Number(bsYear),
        month: Number(bsMonth),
        day: Number(bsDay)
      },
      bsDate: {
        year: Number(bsYear),
        month: Number(bsMonth),
        day: Number(bsDay)
      },
      anchorLunarDate: summaryTithi,
      lunarDate: summaryTithi,
      eventType,
      recurrence: finalRecurrence,
      reminderCalendars: finalReminderCalendars,
      reminderTiming: reminderTimings
    };

    try {
      setIsSaving(true);
      await onSave(eventPayload);
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card add-event-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-row">
            <h2>{isEditing ? "Edit Event" : "Add New Event"}</h2>
          </div>
          <button type="button" className="close-icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
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
              placeholder="e.g., Mom's Birthday, Our Wedding Anniversary..."
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
              placeholder="Add reminder notes, gifts to buy or meeting agenda..."
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
                  {BS_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} BS
                    </option>
                  ))}
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
                <strong>Tithi:</strong> {summaryTithi.tithiName || summaryTithi.fullText || "—"}
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
                <span className="tile-icon"><BirthdayIcon size={20} /></span>
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
                <span className="tile-icon"><AnniversaryIcon size={20} /></span>
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
                <span className="tile-icon"><OtherIcon size={20} /></span>
                <span className="tile-title">Others</span>
              </label>
            </div>
          </div>

          {/* 5. If "Others" is selected: Reminding Frequency (Once, Daily, Weekly, Yearly) */}
          {eventType === "OTHER" && (
            <div className="form-group">
              <label className="form-label">
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
                  <span className="check-box">
                    {yearlyCalendars.includes("AD") ? <CheckIcon size={12} /> : null}
                  </span>
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
                  <span className="check-box">
                    {yearlyCalendars.includes("BS") ? <CheckIcon size={12} /> : null}
                  </span>
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
                  <span className="check-box">
                    {yearlyCalendars.includes("TITHI") ? <CheckIcon size={12} /> : null}
                  </span>
                  <div className="cal-check-text">
                    <strong>Lunar / Tithi</strong>
                    <span>Repeats on lunar tithi (e.g. Ekadashi, Purnima)</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 7. Notification / Reminder Timing — multi-select */}
          <div className="form-group reminder-timing-section">
            <label className="form-label">🔔 Set Notification Reminders:</label>
            <div className="reminder-presets-list">
              {REMINDER_PRESETS.map((preset) => {
                const active = reminderTimings.find((r) => r.type === preset.id);
                return (
                  <div key={preset.id} className={`reminder-preset-item${active ? " reminder-preset-active" : ""}`}>
                    <button
                      type="button"
                      className="reminder-preset-toggle"
                      onClick={() => toggleReminderPreset(preset.id)}
                      aria-pressed={Boolean(active)}
                    >
                      <span className={`reminder-check-box${active ? " checked" : ""}`}>
                        {active && <CheckIcon size={10} />}
                      </span>
                      <span className="reminder-preset-label">{preset.label}</span>
                    </button>

                    {/* Sub-fields shown only when this preset is active and needs a time */}
                    {active && (preset.id === "DAY_OF_EVENT" || preset.id === "WEEK_BEFORE" || preset.id === "MONTH_BEFORE") && (
                      <div className="timing-time-row">
                        <label className="timing-sublabel">At time:</label>
                        <input
                          type="time"
                          className="form-input time-input"
                          value={active.time || "09:00"}
                          onChange={(e) => updateReminderField(preset.id, "time", e.target.value)}
                        />
                      </div>
                    )}

                    {/* Custom: days before + specific time */}
                    {active && preset.id === "CUSTOM" && (
                      <div className="timing-custom-row">
                        <div className="timing-input-field">
                          <label className="timing-sublabel">Days before:</label>
                          <input
                            type="number"
                            min="0"
                            max="365"
                            className="form-input number-input"
                            value={active.daysBefore ?? 1}
                            onChange={(e) =>
                              updateReminderField(preset.id, "daysBefore", Math.max(0, Number(e.target.value)))
                            }
                          />
                        </div>
                        <div className="timing-input-field">
                          <label className="timing-sublabel">At time:</label>
                          <input
                            type="time"
                            className="form-input time-input"
                            value={active.time || "09:00"}
                            onChange={(e) => updateReminderField(preset.id, "time", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="reminder-timing-hint">
              TriCalendar will trigger a device notification for each calendar occurrence (AD, BS, Tithi) based on this schedule.
            </p>
          </div>

          {/* Dialog Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn submit-btn" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
