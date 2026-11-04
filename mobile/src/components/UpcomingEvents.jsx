import { parseYMD, NEPALI_MONTHS } from "../utils/calendarUtils";
import { BirthdayIcon, AnniversaryIcon, MeetingIcon, OtherIcon } from "./Icons";

// upcomingOccurrences items:
// { occurrence: { eventId, reminderCalendar, occurrenceDateAd },
//   event: { ... },
//   bs: { year, month, day, monthName } | null }   ← pre-resolved by App.jsx
export default function UpcomingEvents({
  upcomingOccurrences = [],
  todayStr,
  selectedDate,
  onSelectDate
}) {
  const getRelativeDaysText = (targetDateStr) => {
    if (targetDateStr === todayStr) return "Today";
    const dToday  = parseYMD(todayStr);
    const dTarget = parseYMD(targetDateStr);
    const diff = Math.round((dTarget - dToday) / (1000 * 60 * 60 * 24));
    if (diff === 1) return "Tomorrow";
    if (diff > 1)   return `In ${diff} days`;
    if (diff < 0)   return `${Math.abs(diff)} days ago`;
    return "Today";
  };

  const renderEventTypeIcon = (type = "") => {
    switch (type.toUpperCase()) {
      case "BIRTHDAY":    return <BirthdayIcon size={15} />;
      case "ANNIVERSARY": return <AnniversaryIcon size={15} />;
      case "MEETING":     return <MeetingIcon size={15} />;
      default:            return <OtherIcon size={15} />;
    }
  };

  return (
    <section className="upcoming-events-section" aria-label="Upcoming Events">
      <div className="section-header-row">
        <div className="section-title-wrap">
          <h3 className="section-title">Upcoming Events</h3>
        </div>
        <span className="count-pill">{upcomingOccurrences.length} upcoming</span>
      </div>

      <div className="upcoming-list">
        {upcomingOccurrences.length > 0 ? (
          upcomingOccurrences.map(({ occurrence, event, bs }, idx) => {
            const isSelected   = occurrence.occurrenceDateAd === selectedDate;
            const relativeTime = getRelativeDaysText(occurrence.occurrenceDateAd);
            const isToday      = occurrence.occurrenceDateAd === todayStr;

            const adObj    = parseYMD(occurrence.occurrenceDateAd);
            const adMonth  = adObj.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
            const adDay    = adObj.getUTCDate();

            // bs is pre-resolved — may be null if the plugin call failed
            const bsMonthName = bs ? (NEPALI_MONTHS[bs.month - 1]?.name || "") : "";
            const bsLabel     = bs ? `${bs.day} ${bsMonthName}` : "";

            const eventType    = event.eventType || "OTHER";
            const isBirthday   = eventType.toUpperCase() === "BIRTHDAY";
            const isAnniversary = eventType.toUpperCase() === "ANNIVERSARY";
            const typeIcon     = renderEventTypeIcon(eventType);

            return (
              <div
                key={`${event.id}-${occurrence.reminderCalendar}-${idx}`}
                className={`upcoming-card ${isSelected ? "selected" : ""} ${
                  isToday ? "today-event" : ""
                } ${isBirthday ? "card-birthday" : ""} ${
                  isAnniversary ? "card-anniversary" : ""
                }`}
                onClick={() => onSelectDate(occurrence.occurrenceDateAd)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectDate(occurrence.occurrenceDateAd);
                }}
                title="Click to view and jump to this date on the calendar"
              >
                {/* Date Badge */}
                <div className={`upcoming-date-box ${isBirthday ? "badge-birthday" : ""} ${isAnniversary ? "badge-anniversary" : ""}`}>
                  <span className="date-box-day">{adDay}</span>
                  <span className="date-box-month">{adMonth}</span>
                  {bsLabel && <span className="date-box-bs">{bsLabel}</span>}
                </div>

                {/* Event Info */}
                <div className="upcoming-details">
                  <div className="upcoming-title-row">
                    <span className="upcoming-icon" aria-hidden="true">{typeIcon}</span>
                    <h4 className="upcoming-title">{event.title}</h4>
                    {isBirthday && (
                      <span className="event-special-pill birthday-pill">
                        <BirthdayIcon size={10} /> Birthday
                      </span>
                    )}
                    {isAnniversary && (
                      <span className="event-special-pill anniversary-pill">
                        <AnniversaryIcon size={10} /> Anniversary
                      </span>
                    )}
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

                <div className="upcoming-chevron" aria-hidden="true">›</div>
              </div>
            );
          })
        ) : (
          <div className="empty-upcoming-box">
            <p>No upcoming events yet. Add one using the button above!</p>
          </div>
        )}
      </div>
    </section>
  );
}
