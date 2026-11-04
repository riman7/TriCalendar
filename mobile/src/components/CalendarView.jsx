import { useState, useMemo } from "react";
import CalendarCell from "./CalendarCell";
import {
  getAdMonthGrid,
  getBsMonthGrid,
  NEPALI_MONTHS,
  adToBs,
  bsToAd,
  parseYMD
} from "../utils/calendarUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({
  selectedDate,
  onSelectDate,
  occurrencesByDateMap,
  todayStr,
  activeFilter,
  onChangeFilter
}) {
  // Calendar mode: "AD" (Gregorian) or "BS" (Bikram Sambat)
  const [calendarMode, setCalendarMode] = useState("AD");

  const [adView, setAdView] = useState({ year: 2026, month: 11 }); // November 2026 (matches mock data)
  
  // Track the month being viewed in BS: { year, month }
  const [bsView, setBsView] = useState({ year: 2083, month: 7 }); // Kartik 2083 BS

  // State for the "Jump to Date" expandable section
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [jumpMode, setJumpMode] = useState("AD"); // "AD" or "BS"
  const [jumpAdDate, setJumpAdDate] = useState(selectedDate || todayStr);
  const [jumpBsYear, setJumpBsYear] = useState(2083);
  const [jumpBsMonth, setJumpBsMonth] = useState(7);
  const [jumpBsDay, setJumpBsDay] = useState(19);

  // When switching calendar mode, synchronize the viewing month
  const handleToggleMode = (newMode) => {
    if (newMode === calendarMode) return;
    setCalendarMode(newMode);

    if (newMode === "BS") {
      // Convert current AD view to BS
      const firstAdOfMonth = `${adView.year}-${String(adView.month).padStart(2, "0")}-15`;
      const bs = adToBs(firstAdOfMonth);
      setBsView({ year: bs.year, month: bs.month });
    } else {
      // Convert current BS view to AD
      const ad = bsToAd(bsView.year, bsView.month, 15);
      const adObj = parseYMD(ad);
      setAdView({ year: adObj.getUTCFullYear(), month: adObj.getUTCMonth() + 1 });
    }
  };

  // Navigate months
  const handlePrevMonth = () => {
    if (calendarMode === "AD") {
      let nextMonth = adView.month - 1;
      let nextYear = adView.year;
      if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }
      setAdView({ year: nextYear, month: nextMonth });
    } else {
      let nextMonth = bsView.month - 1;
      let nextYear = bsView.year;
      if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }
      setBsView({ year: nextYear, month: nextMonth });
    }
  };

  const handleNextMonth = () => {
    if (calendarMode === "AD") {
      let nextMonth = adView.month + 1;
      let nextYear = adView.year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      setAdView({ year: nextYear, month: nextMonth });
    } else {
      let nextMonth = bsView.month + 1;
      let nextYear = bsView.year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      setBsView({ year: nextYear, month: nextMonth });
    }
  };

  // Jump to today
  const handleGoToToday = () => {
    onSelectDate(todayStr);
    const todayObj = parseYMD(todayStr);
    setAdView({ year: todayObj.getUTCFullYear(), month: todayObj.getUTCMonth() + 1 });
    const todayBs = adToBs(todayStr);
    setBsView({ year: todayBs.year, month: todayBs.month });
  };

  // Handle jump submission
  const handleExecuteJump = (e) => {
    e.preventDefault();
    if (jumpMode === "AD") {
      if (!jumpAdDate) return;
      onSelectDate(jumpAdDate);
      const d = parseYMD(jumpAdDate);
      setAdView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
      const bs = adToBs(jumpAdDate);
      setBsView({ year: bs.year, month: bs.month });
    } else {
      const adStr = bsToAd(Number(jumpBsYear), Number(jumpBsMonth), Number(jumpBsDay));
      onSelectDate(adStr);
      const d = parseYMD(adStr);
      setAdView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
      setBsView({ year: Number(jumpBsYear), month: Number(jumpBsMonth) });
    }
    setShowDatePicker(false);
  };

  // Compute grid cells
  const cells = useMemo(() => {
    if (calendarMode === "AD") {
      return getAdMonthGrid(adView.year, adView.month);
    } else {
      return getBsMonthGrid(bsView.year, bsView.month);
    }
  }, [calendarMode, adView, bsView]);

  // Display month title
  const monthTitle = useMemo(() => {
    if (calendarMode === "AD") {
      const d = new Date(Date.UTC(adView.year, adView.month - 1, 1));
      const adMonthName = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
      const midAd = `${adView.year}-${String(adView.month).padStart(2, "0")}-15`;
      const bs = adToBs(midAd);
      const bsMonthName = NEPALI_MONTHS[bs.month - 1]?.name;
      return {
        primary: `${adMonthName} ${adView.year}`,
        secondary: `${bsMonthName} ${bs.year} BS`
      };
    } else {
      const bsMonthName = NEPALI_MONTHS[bsView.month - 1]?.name;
      const bsNepaliName = NEPALI_MONTHS[bsView.month - 1]?.np;
      const midAdStr = bsToAd(bsView.year, bsView.month, 15);
      const midAdObj = parseYMD(midAdStr);
      const adMonthName = midAdObj.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      return {
        primary: `${bsMonthName} ${bsView.year} BS`,
        secondary: `${bsNepaliName} · ${adMonthName} ${midAdObj.getUTCFullYear()} AD`
      };
    }
  }, [calendarMode, adView, bsView]);

  return (
    <section className="calendar-card" aria-label="Calendar Interface">
      {/* 1. Mode Switcher (AD vs BS) & Quick Jump Toggle */}
      <div className="calendar-top-bar">
        <div className="calendar-switch" role="group" aria-label="Select Calendar System">
          <button
            type="button"
            className={`switch-btn ${calendarMode === "AD" ? "active" : ""}`}
            onClick={() => handleToggleMode("AD")}
          >
            AD Calendar
          </button>
          <button
            type="button"
            className={`switch-btn ${calendarMode === "BS" ? "active" : ""}`}
            onClick={() => handleToggleMode("BS")}
          >
            BS Calendar
          </button>
        </div>

        <button
          type="button"
          className={`jump-toggle-btn ${showDatePicker ? "active" : ""}`}
          onClick={() => setShowDatePicker(!showDatePicker)}
          title="Select Date (AD / BS)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Pick Date</span>
        </button>
      </div>

      {/* 2. Expandable "Select Date" Section (in both AD & BS) */}
      {showDatePicker && (
        <div className="date-picker-drawer">
          <div className="picker-tabs">
            <button
              type="button"
              className={`picker-tab ${jumpMode === "AD" ? "active" : ""}`}
              onClick={() => setJumpMode("AD")}
            >
              Select in AD
            </button>
            <button
              type="button"
              className={`picker-tab ${jumpMode === "BS" ? "active" : ""}`}
              onClick={() => setJumpMode("BS")}
            >
              Select in BS
            </button>
          </div>

          <form onSubmit={handleExecuteJump} className="picker-form">
            {jumpMode === "AD" ? (
              <div className="picker-inputs">
                <label className="input-label">
                  Gregorian Date:
                  <input
                    type="date"
                    className="picker-input"
                    value={jumpAdDate}
                    onChange={(e) => setJumpAdDate(e.target.value)}
                    required
                  />
                </label>
              </div>
            ) : (
              <div className="picker-inputs bs-grid">
                <label className="input-label">
                  Year:
                  <select
                    className="picker-select"
                    value={jumpBsYear}
                    onChange={(e) => setJumpBsYear(Number(e.target.value))}
                  >
                    {[2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2084, 2085].map((y) => (
                      <option key={y} value={y}>
                        {y} BS
                      </option>
                    ))}
                  </select>
                </label>

                <label className="input-label">
                  Month:
                  <select
                    className="picker-select"
                    value={jumpBsMonth}
                    onChange={(e) => setJumpBsMonth(Number(e.target.value))}
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}. {m.name} ({m.np})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="input-label">
                  Day:
                  <select
                    className="picker-select"
                    value={jumpBsDay}
                    onChange={(e) => setJumpBsDay(Number(e.target.value))}
                  >
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="picker-actions">
              <button type="submit" className="picker-submit-btn">
                Jump to Date
              </button>
              <button
                type="button"
                className="picker-cancel-btn"
                onClick={() => setShowDatePicker(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Month Navigation Header */}
      <div className="month-header">
        <div className="month-title-wrapper">
          <h2 className="month-primary">{monthTitle.primary}</h2>
          <span className="month-secondary">{monthTitle.secondary}</span>
        </div>

        <div className="month-nav-controls">
          <button
            type="button"
            className="today-pill-btn"
            onClick={handleGoToToday}
            title="Jump to current date"
          >
            Today
          </button>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
          >
            ‹
          </button>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={handleNextMonth}
            aria-label="Next Month"
          >
            ›
          </button>
        </div>
      </div>

      {/* 4. Calendar Reminder Filters: ALL, AD, BS, TITHI */}
      <div className="calendar-filter-row" role="radiogroup" aria-label="Reminder Calendar Filter">
        <span className="filter-title">Filter:</span>
        {["ALL", "AD", "BS", "TITHI"].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${activeFilter === f ? "active" : ""} chip-${f.toLowerCase()}`}
            onClick={() => onChangeFilter(f)}
          >
            {f === "ALL" ? "All Calendars" : `${f} Reminders`}
          </button>
        ))}
      </div>

      {/* 5. Weekday Names Row */}
      <div className="weekday-header-row">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday-label">
            {day}
          </div>
        ))}
      </div>

      {/* 6. Calendar Cells Grid (each cell has 3 values: center big number, corner small number, bottom tithi) */}
      <div className="calendar-days-grid">
        {cells.map((cell, idx) => {
          const isSelected = cell.adDate === selectedDate;
          const isToday = cell.adDate === todayStr;
          const occs = cell.adDate ? occurrencesByDateMap[cell.adDate] || [] : [];

          return (
            <CalendarCell
              key={cell.id || `cell-${idx}`}
              cell={cell}
              calendarMode={calendarMode}
              isSelected={isSelected}
              isToday={isToday}
              occurrences={occs}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>

      {/* Helper Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-sample center-num">4</span>
          <span>{calendarMode === "AD" ? "AD Date" : "BS Date"}</span>
        </div>
        <div className="legend-item">
          <span className="legend-sample corner-num">19</span>
          <span>{calendarMode === "AD" ? "BS Date" : "AD Date"}</span>
        </div>
        <div className="legend-item">
          <span className="legend-sample tithi-text">Ekadashi</span>
          <span>Tithi</span>
        </div>
      </div>
    </section>
  );
}
