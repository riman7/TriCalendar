import { adToBs, parseYMD, NEPALI_MONTHS } from "../utils/calendarUtils";

export default function UpcomingEvents({
  upcomingOccurrences = [],
  todayStr,
  selectedDate,
  onSelectDate
}) {
  const getRelativeDaysText = (targetDateStr) => {
    if (targetDateStr === todayStr) return "Today";
    const dToday = parseYMD(todayStr);
    const dTarget = parseYMD(targetDateStr);
    const diffDays = Math.round((dTarget - dToday) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return "Today";
  };

  const getEventTypeIcon = (type = "") => {
    switch (type.toUpperCase()) {
      case "BIRTHDAY":
        return "🎂";
      case "ANNIVERSARY":
        return "💍";
      case "MEETING":
        return "💼";
      default:
        return "📌";
    }
  };

  return (
    <section className="upcoming-events-section" aria-label="Upcoming Events">
      <div className="section-header-row">
        <div className="section-title-wrap">
          <span className="eyebrow-text">SCHEDULE</span>
          <h3 className="section-title">Upcoming Events</h3>
        </div>
        <span className="count-pill">{upcomingOccurrences.length} upcoming</span>
      </div>

      <div className="upcoming-list">
        {upcomingOccurrences.length > 0 ? (
          upcomingOccurrences.map(({ occurrence, event }, idx) => {
            const isSelected = occurrence.occurrenceDateAd === selectedDate;
            const relativeTime = getRelativeDaysText(occurrence.occurrenceDateAd);
            const isToday = occurrence.occurrenceDateAd === todayStr;

            const adObj = parseYMD(occurrence.occurrenceDateAd);
            const adMonth = adObj.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
            const adDay = adObj.getUTCDate();

            const bs = adToBs(occurrence.occurrenceDateAd);
            const bsMonthName = NEPALI_MONTHS[bs.month - 1]?.name || "";

            const eventType = event.eventType || "OTHER";
            const typeIcon = getEventTypeIcon(eventType);

            return (
              <div
                key={`${occurrence.id}-${idx}`}
                className={`upcoming-card ${isSelected ? "selected" : ""} ${isToday ? "today-event" : ""}`}
                onClick={() => onSelectDate(occurrence.occurrenceDateAd)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectDate(occurrence.occurrenceDateAd);
                  }
                }}
                title="Click to view and jump to this date on the calendar"
              >
                {/* Date Badge */}
                <div className="upcoming-date-box">
                  <span className="date-box-day">{adDay}</span>
                  <span className="date-box-month">{adMonth}</span>
                  <span className="date-box-bs">{bs.day} {bsMonthName}</span>
                </div>

                {/* Event Info */}
                <div className="upcoming-details">
                  <div className="upcoming-title-row">
                    <span className="upcoming-icon" aria-hidden="true">{typeIcon}</span>
                    <h4 className="upcoming-title">{event.title}</h4>
                  </div>

                  {event.description && (
                    <p className="upcoming-desc">{event.description}</p>
                  )}

                  <div className="upcoming-tags">
                    <span className={`time-pill ${isToday ? "time-today" : ""}`}>
                      {relativeTime}
                    </span>
                    <span className={`cal-indicator cal-${occurrence.reminderCalendar?.toLowerCase()}`}>
                      {occurrence.reminderCalendar} Reminder
                    </span>
                  </div>
                </div>

                {/* Jump indicator arrow */}
                <div className="upcoming-chevron" aria-hidden="true">
                  ›
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-upcoming-box">
            <p>No upcoming events matching current filter.</p>
          </div>
        )}
      </div>
    </section>
  );
}
