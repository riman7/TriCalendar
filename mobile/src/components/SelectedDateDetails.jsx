import { useMemo } from "react";
import { adToBs, getTithiInfo, parseYMD, NEPALI_MONTHS } from "../utils/calendarUtils";

export default function SelectedDateDetails({
  selectedDate,
  eventsOnDate = [],
  onDeleteEvent,
  onOpenAddEvent
}) {
  // Format the selected date in AD, BS, and Tithi
  const dateInfo = useMemo(() => {
    if (!selectedDate) return null;
    const adObj = parseYMD(selectedDate);
    
    // AD formatted
    const weekday = adObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const adFormatted = adObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });

    // BS formatted
    const bs = adToBs(selectedDate);
    const bsMonthName = NEPALI_MONTHS[bs.month - 1]?.name || "";
    const bsMonthNepali = NEPALI_MONTHS[bs.month - 1]?.np || "";
    const bsFormatted = `${bs.day} ${bsMonthName} ${bs.year} BS (${bsMonthNepali})`;

    // Tithi formatted
    const tithi = getTithiInfo(selectedDate);

    return {
      weekday,
      adFormatted,
      bsFormatted,
      tithiFormatted: tithi.fullText,
      bsDay: bs.day,
      bsMonth: bsMonthName
    };
  }, [selectedDate]);

  if (!dateInfo) return null;

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
    <section className="selected-date-card" aria-label="Selected Date Details">
      {/* Date Header Info */}
      <div className="selected-date-header">
        <div className="date-header-left">
          <span className="date-eyebrow">{dateInfo.weekday.toUpperCase()}</span>
          <h3 className="date-ad-title">{dateInfo.adFormatted}</h3>
          <div className="date-multiverse-row">
            <span className="multiverse-item bs-item">
              <span className="multiverse-label">BS:</span> {dateInfo.bsFormatted}
            </span>
            <span className="multiverse-item tithi-item">
              <span className="multiverse-label">TITHI:</span> {dateInfo.tithiFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Events List for Selected Date */}
      <div className="selected-events-list">
        {eventsOnDate.length > 0 ? (
          eventsOnDate.map(({ occurrence, event }, index) => {
            const eventType = event.eventType || "OTHER";
            const typeIcon = getEventTypeIcon(eventType);

            return (
              <article className="event-item-card" key={`${occurrence.id}-${index}`}>
                <div className="event-card-top">
                  <div className="event-type-icon" aria-hidden="true">
                    {typeIcon}
                  </div>
                  <div className="event-main-content">
                    <div className="event-title-row">
                      <h4 className="event-title">{event.title}</h4>
                      <span className={`event-type-badge badge-${eventType.toLowerCase()}`}>
                        {eventType}
                      </span>
                    </div>

                    {event.description && (
                      <p className="event-desc">{event.description}</p>
                    )}

                    <div className="event-meta-row">
                      {/* Reminder Calendars badges */}
                      <div className="reminder-cals-wrapper">
                        <span className="meta-label">Reminder on:</span>
                        {event.reminderCalendars?.map((cal) => (
                          <span
                            key={cal}
                            className={`cal-tag tag-${cal.toLowerCase()} ${
                              occurrence.reminderCalendar === cal ? "active-occ" : ""
                            }`}
                            title={`Reminding on ${cal} calendar`}
                          >
                            {cal}
                          </span>
                        ))}
                      </div>

                      {/* Recurrence badge */}
                      {event.recurrence && (
                        <span className="recurrence-tag">
                          🔁 {event.recurrence}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete event action */}
                  <button
                    type="button"
                    className="delete-event-btn"
                    title="Delete this event"
                    onClick={() => {
                      if (window.confirm(`Delete event "${event.title}"?`)) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    aria-label={`Delete event ${event.title}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="no-events-box">
            <span className="empty-sparkle">✦</span>
            <p className="no-events-text">No events on this date</p>
            <button
              type="button"
              className="quick-add-link"
              onClick={() => onOpenAddEvent(selectedDate)}
            >
              + Add an event for this date
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
