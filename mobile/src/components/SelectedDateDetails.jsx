import { useState, useEffect } from "react";
import { adToBs, getTithiInfo, parseYMD, getRelativeDaysDesc, NEPALI_MONTHS } from "../utils/calendarUtils";
import {
  BirthdayIcon,
  AnniversaryIcon,
  MeetingIcon,
  OtherIcon,
  RepeatIcon,
  CalendarEmptyIcon
} from "./Icons";

export default function SelectedDateDetails({
  selectedDate,
  todayStr,
  eventsOnDate = [],
  onDeleteEvent,
  onOpenAddEvent,
  location
}) {
  const [dateInfo, setDateInfo] = useState(null);
  const relativeDaysText = getRelativeDaysDesc(selectedDate, todayStr);

  // Load BS date and Tithi asynchronously from the native plugin every time
  // selectedDate or location changes.
  useEffect(() => {
    if (!selectedDate) {
      setDateInfo(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const adObj = parseYMD(selectedDate);
        const weekday = adObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
        const adFormatted = adObj.toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric", timeZone: "UTC"
        });

        const [y, m, d] = selectedDate.split("-").map(Number);

        // Fire both plugin calls in parallel
        const [bs, tithi] = await Promise.all([
          adToBs(y, m, d),
          getTithiInfo(selectedDate)
        ]);

        if (cancelled) return;

        const bsMonthName   = NEPALI_MONTHS[bs.month - 1]?.name || "";
        const bsMonthNepali = NEPALI_MONTHS[bs.month - 1]?.np   || "";

        setDateInfo({
          weekday,
          adFormatted,
          bsFormatted:   `${bs.day} ${bsMonthName} ${bs.year} BS (${bsMonthNepali})`,
          bsDay:         bs.day,
          bsMonth:       bsMonthName,
          bsYear:        bs.year,
          bsMonthNepali: bsMonthNepali,
          tithiFormatted: tithi.fullText,
          tithiTiming:    tithi.tithiSegments || "",
        });
      } catch (err) {
        console.error("SelectedDateDetails: failed to load date info", err);
      }
    }

    // Clear stale data while the new date loads so the UI doesn't flicker
    setDateInfo(null);
    load();

    return () => { cancelled = true; };
  }, [selectedDate, location]);

  if (!dateInfo) {
    // Show skeleton / loading state while async calls are in-flight
    return (
      <section className="selected-date-card" aria-label="Selected Date Details">
        <div className="selected-date-header">
          <div className="date-header-left">
            <span className="date-eyebrow">— — —</span>
            <h3 className="date-ad-title">{selectedDate}</h3>
            {relativeDaysText && (
              <span className="date-relative-pill">{relativeDaysText}</span>
            )}
            <div className="date-multiverse-row">
              <span className="multiverse-item bs-item"><span className="multiverse-label">BS:</span> …</span>
              <span className="multiverse-item tithi-item"><span className="multiverse-label">TITHI:</span> …</span>
              <span className="multiverse-item tithi-timing-item"><span className="multiverse-label">TIMING:</span> …</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const renderEventTypeIcon = (type = "") => {
    switch (type.toUpperCase()) {
      case "BIRTHDAY":    return <BirthdayIcon size={18} />;
      case "ANNIVERSARY": return <AnniversaryIcon size={18} />;
      case "MEETING":     return <MeetingIcon size={18} />;
      default:            return <OtherIcon size={18} />;
    }
  };

  return (
    <section className="selected-date-card" aria-label="Selected Date Details">
      {/* Date Header Info */}
      <div className="selected-date-header">
        <div className="date-header-left">
          <span className="date-eyebrow">{dateInfo.weekday.toUpperCase()}</span>
          <h3 className="date-ad-title">{dateInfo.adFormatted}</h3>
          {relativeDaysText && (
            <span className="date-relative-pill">{relativeDaysText}</span>
          )}
          <div className="date-multiverse-row">
            <span className="multiverse-item bs-item">
              <span className="multiverse-label">BS:</span> {dateInfo.bsFormatted}
            </span>
            <span className="multiverse-item tithi-item">
              <span className="multiverse-label">TITHI:</span> {dateInfo.tithiFormatted}
            </span>
            {dateInfo.tithiTiming ? (
              <span className="multiverse-item tithi-timing-item">
                <span className="multiverse-label">TIMING:</span> {dateInfo.tithiTiming}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Events List for Selected Date */}
      <div className="selected-events-list">
        {eventsOnDate.length > 0 ? (
          <>
            {eventsOnDate.map(({ occurrence, event }, index) => {
              const eventType = event.eventType || "OTHER";
              const remCal = occurrence?.reminderCalendar ? occurrence.reminderCalendar.toUpperCase() : "AD";
              const basisLabel = remCal === "TITHI" ? "Tithi" : remCal;

              return (
                <article
                  className={`event-item-card occ-${remCal.toLowerCase()}`}
                  key={`${event.id}-${remCal}-${index}`}
                >
                  <div className="event-card-top">
                    <div className="event-type-icon" aria-hidden="true">
                      {renderEventTypeIcon(eventType)}
                    </div>
                    <div className="event-main-content">
                      <div className="event-title-row">
                        <h4 className="event-title">{event.title}</h4>
                        <span className={`event-type-badge badge-${eventType.toLowerCase()}`}>
                          {eventType}
                        </span>
                        <span className={`occ-basis-badge occ-basis-${remCal.toLowerCase()}`}>
                          According to {basisLabel}
                        </span>
                      </div>

                      {event.description && (
                        <p className="event-desc">{event.description}</p>
                      )}

                      <div className="event-meta-row">
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

                        {event.recurrence && (
                          <span className="recurrence-tag">
                            <RepeatIcon size={10} className="tag-icon" />
                            <span>{event.recurrence}</span>
                          </span>
                        )}
                      </div>
                    </div>

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
            })}

            <button
              type="button"
              className="add-another-event-btn"
              onClick={() => onOpenAddEvent(selectedDate)}
            >
              <span>+ Add another event for this date</span>
            </button>
          </>
        ) : (
          <div className="date-empty-action-card">
            <div className="empty-action-icon" aria-hidden="true">
              <CalendarEmptyIcon size={28} />
            </div>
            <div className="empty-action-content">
              <h4>No events scheduled</h4>
              <p>Add a birthday, anniversary, or reminder for this date</p>
            </div>
            <button
              type="button"
              className="date-add-event-btn"
              onClick={() => onOpenAddEvent(selectedDate)}
            >
              <span className="btn-plus">+</span>
              <span>Add Event for this Date</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
