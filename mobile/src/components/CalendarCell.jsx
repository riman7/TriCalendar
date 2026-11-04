import { memo } from "react";

function RealisticBirthdayHat() {
  return (
    <svg
      className="number-birthday-hat"
      viewBox="0 0 32 32"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Hat Cone */}
      <path
        d="M16 6 L7 27 Q16 29 25 27 Z"
        fill="url(#coneGrad)"
        stroke="#b45309"
        strokeWidth="0.75"
      />
      {/* Diagonal festive stripes */}
      <path
        d="M13 14 L20 16 M10 20 L22 22 M8 25 L24 26.5"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Base ruffled trim */}
      <path
        d="M6 27 Q16 30 26 27"
        fill="none"
        stroke="#fde047"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Top Pom-Pom with shadow and highlight */}
      <circle cx="16.5" cy="5.5" r="2.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
      <circle cx="15.5" cy="4.5" r="0.9" fill="#ffffff" />
    </svg>
  );
}

function DrawnCalendarHeart() {
  return (
    <svg
      className="number-drawn-heart"
      viewBox="0 0 46 42"
      aria-hidden="true"
    >
      {/* Soft translucent marker fill */}
      <path
        d="M23,12 C20.5,4.5 11,3.5 6,8.5 C1,13.5 1.5,21 7,27 C12,32.5 18.5,36.5 23,39.5 C27.5,36.5 34,32.5 39,27 C44.5,21 45,13.5 40,8.5 C35,3.5 25.5,4.5 23,12 Z"
        fill="rgba(244, 63, 94, 0.14)"
      />
      {/* Hand-drawn marker contour with organic wobble and overlap */}
      <path
        d="M23,12.5 C20,5 11.5,4 6.5,9 C1.5,14 2,21.5 7.5,27.5 C12.5,33 19,37 23,39.8 C27,37 33.5,33 38.5,27.5 C44,21.5 44.5,14 39.5,9 C34.5,4 26,5 23,12.5"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sketched second pass marker loop */}
      <path
        d="M22.5,14 C19.5,7 13,6.5 8.5,10.5 C4,14.5 4.5,20.5 9,25.5 C13.5,30.5 19.5,34.5 23,37.5 C26.5,34.5 32.5,30.5 37,25.5 C41.5,20.5 42,14.5 37.5,10.5 C33,6.5 26.5,7 23.5,14"
        fill="none"
        stroke="#fb7185"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="22 4 10 3"
        opacity="0.85"
      />
    </svg>
  );
}

// Fix #4: React.memo prevents all 35-42 cells from re-rendering on every
// selectedDate change — only the 2 affected cells (old + new selection) re-render.
function CalendarCell({
  cell,
  calendarMode,
  isSelected,
  isToday,
  occurrences = [],
  onSelect
}) {
  if (cell.isEmpty) {
    return <div className="calendar-cell empty" aria-hidden="true" />;
  }

  const isAd = calendarMode === "AD";
  const mainNumber = isAd ? cell.adDay : cell.bsDay;
  const secondaryNumber = isAd ? cell.bsDay : cell.adDay;
  const secondaryLabel = isAd ? "BS" : "AD";
  const tithiLabel = cell.tithiName || "";

  const hasEvents = occurrences.length > 0;
  const hasBirthday = occurrences.some((o) => o.event?.eventType === "BIRTHDAY");
  const hasAnniversary = occurrences.some((o) => o.event?.eventType === "ANNIVERSARY");

  // Identify reminder calendars present on this date
  const hasAdReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "AD");
  const hasBsReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "BS");
  const hasTithiReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "TITHI");

  return (
    <button
      type="button"
      className={`calendar-cell active ${cell.isOtherMonth ? "other-month" : ""} ${
        isSelected ? "selected" : ""
      } ${isToday ? "today" : ""} ${hasEvents ? "has-events" : ""} ${
        hasBirthday ? "cell-birthday" : ""
      } ${hasAnniversary ? "cell-anniversary" : ""}`}
      onClick={() => onSelect(cell.adDate)}
      title={`${cell.adDate} | BS: ${cell.bsDay}/${cell.bsMonth}/${cell.bsYear} | ${cell.tithiFull || ""}`}
    >
      {/* Top corner: Very small font date of unselected calendar type */}
      <span className="cell-corner-secondary" title={`${secondaryLabel}: ${secondaryNumber}`}>
        {secondaryNumber}
      </span>

      {/* Centre: Big number with realistic birthday hat or drawn pink calendar heart */}
      <div className="cell-number-wrapper">
        {hasBirthday && <RealisticBirthdayHat />}
        {hasAnniversary && <DrawnCalendarHeart />}
        <span className="cell-main-number">{mainNumber}</span>
      </div>

      {/* Bottom: Tithi date */}
      <span className="cell-tithi-label" title={cell.tithiFull}>
        {tithiLabel}
      </span>

      {/* Event indicator dots */}
      {hasEvents && (
        <div className="cell-event-dots" aria-hidden="true">
          {hasAdReminder && <span className="dot dot-ad" title="AD reminder" />}
          {hasBsReminder && <span className="dot dot-bs" title="BS reminder" />}
          {hasTithiReminder && <span className="dot dot-tithi" title="Tithi reminder" />}
        </div>
      )}
    </button>
  );
}

export default memo(CalendarCell);
