import { parseYMD, getRelativeDaysDesc, NEPALI_MONTHS } from "../utils/calendarUtils";
import { BirthdayIcon, AnniversaryIcon, MeetingIcon, OtherIcon } from "./Icons";

export default function BaseEvents({
  events = [],
  todayStr,
  selectedDate,
  onSelectDate,
  onEditEvent,
  onDeleteEvent
}) {
  const renderEventTypeIcon = (type = "") => {
    switch (type.toUpperCase()) {
      case "BIRTHDAY":    return <BirthdayIcon size={15} />;
      case "ANNIVERSARY": return <AnniversaryIcon size={15} />;
      case "MEETING":     return <MeetingIcon size={15} />;
      default:            return <OtherIcon size={15} />;
    }
  };

  return (
    <section className="base-events-section" aria-label="Base Events">
      <div className="section-header-row">
        <div className="section-title-wrap">
          <h3 className="section-title">Base Events</h3>
        </div>
        <span className="count-pill">{events.length} saved</span>
      </div>

      <div className="base-events-list">
        {events.length > 0 ? (
          events.map((event) => {
            const isSelected = event.anchorAdDate === selectedDate;
            const adObj = parseYMD(event.anchorAdDate);
            const adYear = adObj.getUTCFullYear();
            const adMonth = adObj.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
            const adDay = adObj.getUTCDate();

            // BS date details from stored anchorBsDate
            const bsYear = event.anchorBsDate?.year;
            const bsMonthNum = event.anchorBsDate?.month;
            const bsDay = event.anchorBsDate?.day;
            const bsMonthName = bsMonthNum ? (NEPALI_MONTHS[bsMonthNum - 1]?.name || "") : "";
            const bsLabel = (bsDay && bsMonthName) ? `${bsDay} ${bsMonthName}${bsYear ? ` ${bsYear}` : ""}` : "";

            // Tithi details from stored anchorLunarDate
            const tithiText = event.anchorLunarDate?.fullText ||
              (event.anchorLunarDate?.month
                ? `${event.anchorLunarDate.month} ${event.anchorLunarDate.paksha || ""} ${event.anchorLunarDate.tithiName || event.anchorLunarDate.tithi || ""}`.trim()
                : null);

            const eventType = event.eventType || "OTHER";
            const isBirthday = eventType.toUpperCase() === "BIRTHDAY";
            const isAnniversary = eventType.toUpperCase() === "ANNIVERSARY";
            const typeIcon = renderEventTypeIcon(eventType);
            const relativeTime = getRelativeDaysDesc(event.anchorAdDate, todayStr);
            const isToday = event.anchorAdDate === todayStr;

            return (
              <div
                key={event.id}
                className={`upcoming-card base-event-card ${isSelected ? "selected" : ""} ${
                  isBirthday ? "card-birthday" : ""
                } ${isAnniversary ? "card-anniversary" : ""}`}
                onClick={() => onSelectDate(event.anchorAdDate)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectDate(event.anchorAdDate);
                }}
                title="Click to view and jump to this base event on the calendar"
              >
                {/* Date Badge */}
                <div
                  className={`upcoming-date-box ${
                    isBirthday ? "badge-birthday" : ""
                  } ${isAnniversary ? "badge-anniversary" : ""}`}
                >
                  <span className="date-box-day">{adDay}</span>
                  <span className="date-box-month">{adMonth} {adYear}</span>
                  {bsLabel && <span className="date-box-bs">{bsDay} {bsMonthName}</span>}
                </div>

                {/* Event Details */}
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

                  {/* Base Dates Row */}
                  <div className="base-event-dates-pill">
                    <span className="base-date-item"><b>AD:</b> {event.anchorAdDate}</span>
                    {bsLabel && <span className="base-date-item"><b>BS:</b> {bsLabel}</span>}
                    {tithiText && <span className="base-date-item tithi-text"><b>Tithi:</b> {tithiText}</span>}
                  </div>

                  {/* Relative Distance (Days ago / later) on its own row */}
                  {relativeTime && (
                    <div className="base-event-relative-row">
                      <span className={`time-pill ${isToday ? "time-today" : ""}`}>
                        {relativeTime}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="upcoming-tags">
                    {event.recurrence && (
                      <span className="time-pill">
                        {event.recurrence}
                      </span>
                    )}
                    {event.reminderCalendars?.map((cal) => (
                      <span key={cal} className={`cal-indicator cal-${cal.toLowerCase()}`}>
                        {cal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons: Edit & Delete */}
                <div className="base-event-actions">
                  {onEditEvent && (
                    <button
                      type="button"
                      className="base-event-action-btn base-event-edit-btn"
                      title={`Edit "${event.title}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent(event);
                      }}
                      aria-label={`Edit event ${event.title}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  )}

                  {onDeleteEvent && (
                    <button
                      type="button"
                      className="base-event-action-btn base-event-delete-btn"
                      title={`Delete "${event.title}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete base event "${event.title}"?`)) {
                          onDeleteEvent(event.id);
                        }
                      }}
                      aria-label={`Delete event ${event.title}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="upcoming-chevron" aria-hidden="true">›</div>
              </div>
            );
          })
        ) : (
          <div className="empty-upcoming-box">
            <p>No base events added yet. Add an event to see it here!</p>
          </div>
        )}
      </div>
    </section>
  );
}
