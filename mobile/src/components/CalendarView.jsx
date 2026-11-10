import { useState, useMemo, useEffect, useRef } from "react";
import CalendarCell from "./CalendarCell";
import {
  getAdMonthGrid,
  getBsMonthGrid,
  NEPALI_MONTHS,
  BS_YEARS,
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
  onVisibleYearChange
}) {
  // Calendar mode: "AD" (Gregorian) or "BS" (Bikram Sambat)
  const [calendarMode, setCalendarMode] = useState("AD");

  const [adView, setAdView] = useState(() => {
    const s = selectedDate || todayStr || "2026-11-06";
    const [y, m] = s.split("-").map(Number);
    return { year: y || 2026, month: m || 11 };
  });
  
  // Track the month being viewed in BS: { year, month }
  const [bsView, setBsView] = useState({ year: 2083, month: 7 }); // Kartik 2083 BS

  // State for the "Jump to Date" expandable section
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [jumpMode, setJumpMode] = useState("AD"); // "AD" or "BS"
  const [jumpAdDate, setJumpAdDate] = useState(selectedDate || todayStr);
  const [jumpBsYear, setJumpBsYear] = useState(2083);
  const [jumpBsMonth, setJumpBsMonth] = useState(7);
  const [jumpBsDay, setJumpBsDay] = useState(19);

  // Synchronize BS view on initial mount
  useEffect(() => {
    const s = selectedDate || todayStr;
    if (s) {
      const [y, m, d] = s.split("-").map(Number);
      adToBs(y, m, d).then(bs => {
        setBsView({ year: bs.year, month: bs.month });
      }).catch(() => {});
    }
  }, []);

  // Synchronize viewing month whenever selectedDate changes externally
  // (e.g. clicking an upcoming event, a base event card, or executing jump)
  const prevSelectedDateRef = useRef(selectedDate);
  useEffect(() => {
    if (!selectedDate) return;
    if (prevSelectedDateRef.current === selectedDate) {
      return;
    }
    prevSelectedDateRef.current = selectedDate;

    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return;

    let cancelled = false;
    async function syncViewWithSelectedDate() {
      try {
        const bs = await adToBs(y, m, d);
        if (cancelled) return;
        setAdView(prev => (prev.year === y && prev.month === m ? prev : { year: y, month: m }));
        setBsView(prev => (prev.year === bs.year && prev.month === bs.month ? prev : { year: bs.year, month: bs.month }));
      } catch (err) {
        setAdView(prev => (prev.year === y && prev.month === m ? prev : { year: y, month: m }));
      }
    }
    syncViewWithSelectedDate();
    return () => { cancelled = true; };
  }, [selectedDate]);

  // Keep jump inputs fresh when date picker is opened
  useEffect(() => {
    if (showDatePicker && selectedDate) {
      setJumpAdDate(selectedDate);
      const [y, m, d] = selectedDate.split("-").map(Number);
      adToBs(y, m, d).then(bs => {
        setJumpBsYear(bs.year);
        setJumpBsMonth(bs.month);
        setJumpBsDay(bs.day);
      }).catch(() => {});
    }
  }, [showDatePicker, selectedDate]);

  // When switching calendar mode, synchronize the viewing month
  const handleToggleMode = async (newMode) => {
    if (newMode === calendarMode) return;
    setCalendarMode(newMode);

    if (newMode === "BS") {
      // Convert current AD view mid-month to BS
      const [y, m] = [adView.year, adView.month];
      try {
        const bs = await adToBs(y, m, 15);
        setBsView({ year: bs.year, month: bs.month });
      } catch { /* keep current bs view */ }
    } else {
      // Convert current BS view mid-month to AD
      try {
        const ad = await bsToAd(bsView.year, bsView.month, 15);
        const adObj = parseYMD(ad.adDate);
        setAdView({ year: adObj.getUTCFullYear(), month: adObj.getUTCMonth() + 1 });
      } catch { /* keep current ad view */ }
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
  const handleGoToToday = async () => {
    onSelectDate(todayStr);
    const todayObj = parseYMD(todayStr);
    setAdView({ year: todayObj.getUTCFullYear(), month: todayObj.getUTCMonth() + 1 });
    try {
      const [y, m, d] = todayStr.split("-").map(Number);
      const todayBs = await adToBs(y, m, d);
      setBsView({ year: todayBs.year, month: todayBs.month });
    } catch { /* keep current bs view */ }
  };

  // Handle jump submission
  const handleExecuteJump = async (e) => {
    e.preventDefault();
    if (jumpMode === "AD") {
      if (!jumpAdDate) return;
      onSelectDate(jumpAdDate);
      const d = parseYMD(jumpAdDate);
      setAdView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
      try {
        const [y, m, day] = jumpAdDate.split("-").map(Number);
        const bs = await adToBs(y, m, day);
        setBsView({ year: bs.year, month: bs.month });
      } catch { /* keep current bs view */ }
    } else {
      try {
        const result = await bsToAd(Number(jumpBsYear), Number(jumpBsMonth), Number(jumpBsDay));
        const adStr = result.adDate;
        onSelectDate(adStr);
        const d = parseYMD(adStr);
        setAdView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
        setBsView({ year: Number(jumpBsYear), month: Number(jumpBsMonth) });
      } catch { /* ignore */ }
    }
    setShowDatePicker(false);
  };

  // Compute grid cells — async because getMonthAd/getBsMonthGrid delegate to native plugin
  const [cells, setCells] = useState([]);
  // Display month title — computed in the same effect as cell loading to avoid a
  // second redundant adToBs/bsToAd call (Fix #5).
  const [monthTitle, setMonthTitle] = useState({ primary: "", secondary: "" });

  useEffect(() => {
    let cancelled = false;
    async function loadCellsAndTitle() {
      try {
        let result;
        if (calendarMode === "AD") {
          // Single batch call returns all days including BS equivalents
          result = await getAdMonthGrid(adView.year, adView.month);
          if (cancelled) return;
          setCells(result);

          // Derive month title from already-fetched grid data — no extra plugin call
          const d = new Date(Date.UTC(adView.year, adView.month - 1, 1));
          const adMonthName = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
          // Use mid-month cell's BS info (already in the grid) instead of calling adToBs again
          const midCell = result[Math.floor(result.length / 2)];
          const bsMonthName = midCell ? (NEPALI_MONTHS[midCell.bsMonth - 1]?.name ?? "") : "";
          const bsYear      = midCell?.bsYear ?? "";
          if (!cancelled) setMonthTitle({
            primary:   `${adMonthName} ${adView.year}`,
            secondary: `${bsMonthName} ${bsYear} BS`
          });
          if (onVisibleYearChange) onVisibleYearChange(adView.year);
        } else {
          result = await getBsMonthGrid(bsView.year, bsView.month);
          if (cancelled) return;
          setCells(result);

          const bsMonthName  = NEPALI_MONTHS[bsView.month - 1]?.name  ?? "";
          const bsNepaliName = NEPALI_MONTHS[bsView.month - 1]?.np    ?? "";
          // Use first real cell's AD info instead of calling bsToAd again
          const firstReal = result.find(c => !c.isOtherMonth);
          const adMonthName = firstReal
            ? new Date(Date.UTC(firstReal.adYear, firstReal.adMonth - 1, 1))
                .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
            : "";
          const adYear = firstReal?.adYear ?? "";
          if (!cancelled) setMonthTitle({
            primary:   `${bsMonthName} ${bsView.year} BS`,
            secondary: `${bsNepaliName} · ${adMonthName} ${adYear} AD`
          });
          if (onVisibleYearChange && adYear) onVisibleYearChange(adYear);
        }
      } catch (err) {
        console.error("Failed to load calendar grid:", err);
      }
    }
    loadCellsAndTitle();
    return () => { cancelled = true; };
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
                    {BS_YEARS.map((y) => (
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

      {/* Weekday Names Row */}
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
    </section>
  );
}
