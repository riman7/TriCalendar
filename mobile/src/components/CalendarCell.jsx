export default function CalendarCell({
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

  // Identify reminder calendars present on this date
  const hasAdReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "AD");
  const hasBsReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "BS");
  const hasTithiReminder = occurrences.some((o) => o.occurrence.reminderCalendar === "TITHI");

  return (
    <button
      type="button"
      className={`calendar-cell active ${isSelected ? "selected" : ""} ${
        isToday ? "today" : ""
      } ${hasEvents ? "has-events" : ""}`}
      onClick={() => onSelect(cell.adDate)}
      title={`${cell.adDate} | BS: ${cell.bsDay}/${cell.bsMonth}/${cell.bsYear} | ${cell.tithiFull || ""}`}
    >
      {/* 2. Top corner: Very small font date of unselected calendar type */}
      <span className="cell-corner-secondary" title={`${secondaryLabel}: ${secondaryNumber}`}>
        {secondaryNumber}
      </span>

      {/* 1. Centre: Selected date AD or BS as big number */}
      <span className="cell-main-number">{mainNumber}</span>

      {/* 3. Bottom: Tithi date (e.g. Dwitiya, Ekadasi...) */}
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
