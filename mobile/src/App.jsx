import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { initializeDatabase } from "./database/database";
import { runMigrations }      from './database/migrations';
import {
  getAllEvents,
  createEvent,
  updateEvent as dbUpdateEvent,
  deleteEvent as dbDeleteEvent,
} from './repositories/eventRepository';
import { generateOccurrences, adToBs, setCalendarLocation } from './utils/calendarUtils';
import {
  scheduleEventNotifications,
  cancelEventNotifications,
  ensureNotificationPermissions,
  syncAllEventNotifications
} from './services/notificationService';
import { checkAuthRedirectCallback } from './services/googleDriveService';
import { triggerSilentDriveSync } from './services/backupService';

import "./App.css";
import Header              from "./components/Header";
import CalendarView        from "./components/CalendarView";
import SelectedDateDetails from "./components/SelectedDateDetails";
import AddEventModal       from "./components/AddEventModal";
import UpcomingEvents      from "./components/UpcomingEvents";
import BaseEvents          from "./components/BaseEvents";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRealTodayStr() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const d   = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // ── DB bootstrap ────────────────────────────────────────────────────────────
  const [dbReady, setDbReady]   = useState(false);
  const [dbError, setDbError]   = useState(null);

  useEffect(() => {
    async function setup() {
      try {
        checkAuthRedirectCallback();
        await initializeDatabase();
        await runMigrations();
        console.log("Database and migrations ready");
        setDbReady(true);
      } catch (error) {
        console.error("Error initializing database:", error);
        setDbError(error?.message ?? String(error));
      }
    }
    setup();
  }, []);

  // ── Today / selected date ────────────────────────────────────────────────────
  const todayStr = useMemo(() => getRealTodayStr(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ── Theme ────────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem("tricalendar_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleToggleTheme = (newTheme) => {
    setTheme(newTheme);
    try { localStorage.setItem("tricalendar_theme", newTheme); } catch {}
  };

  // ── Location (Panchang / Tithi City) ─────────────────────────────────────────
  const [location, setLocation] = useState(() => {
    try {
      return localStorage.getItem("tricalendar_location") || "KATHMANDU";
    } catch {
      return "KATHMANDU";
    }
  });

  useEffect(() => {
    if (location) {
      setCalendarLocation({ city: location }).catch((err) =>
        console.warn("Could not set initial calendar location:", err)
      );
    }
  }, [location]);

  // ── Events + Occurrences state (sourced entirely from SQLite + Java engine) ──
  const [events,      setEvents]      = useState([]);
  const [occurrences, setOccurrences] = useState([]); // { eventId, reminderCalendar, occurrenceDateAd }
  const [visibleYearOccurrences, setVisibleYearOccurrences] = useState([]); // on-demand occurrences for navigated year
  const [visibleYear, setVisibleYear] = useState(null);

  // Load all events from SQLite and generate their occurrence dates via the
  // native CalendarEngine plugin (OccurrenceService.generateOccurrences).
  // Fix #1: parallelise all generateOccurrences calls with Promise.all instead
  //         of awaiting them one-by-one in a sequential for…of loop.
  // Fix #6: wrapped in useCallback so the reference is stable across renders.
  const loadData = useCallback(async () => {
    try {
      const dbEvents = await getAllEvents();
      setEvents(dbEvents);

      // Fire ALL generateOccurrences calls in parallel — no sequential waiting
      const results = await Promise.all(
        dbEvents.map(event =>
          generateOccurrences({
            eventId:           event.id,
            title:             event.title,
            description:       event.description || "",
            anchorAdDate:      event.anchorAdDate,
            anchorBsDate:      event.anchorBsDate,
            anchorLunarDate:   event.anchorLunarDate,   // may be null → plugin skips TITHI
            recurrence:        event.recurrence,
            eventType:         event.eventType,
            reminderCalendars: event.reminderCalendars,
            numberOfYears:     3,
          }).catch(err => {
            console.error("Failed to generate occurrences for event:", event.id, err);
            return []; // graceful degradation — don't fail the whole load
          })
        )
      );

      const allOccs = results.flatMap((occs, i) =>
        occs.map(occ => ({
          eventId:          dbEvents[i].id,
          reminderCalendar: occ.reminderCalendar,
          occurrenceDateAd: occ.occurrenceDate,
        }))
      );

      setOccurrences(allOccs);

      // Automatically sync future reminders with Android's AlarmManager
      // so 4th, 5th, etc. years are always queued even if user never re-edits events
      syncAllEventNotifications(dbEvents, allOccs).catch(err =>
        console.warn("Could not sync background alarms:", err)
      );
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }, []); // stable — only uses setters and top-level imports

  // Load once DB is ready, and re-check occurrences whenever todayStr rolls over
  useEffect(() => {
    if (dbReady) loadData();
  }, [dbReady, todayStr, loadData]);

  // Dynamically compute occurrences when user navigates to a year outside the standard 3-year window
  useEffect(() => {
    if (!visibleYear || !events || events.length === 0) {
      setVisibleYearOccurrences([]);
      return;
    }

    const currentYear = new Date().getFullYear();
    // Normal window covers [currentYear, currentYear + 3]
    if (visibleYear >= currentYear && visibleYear <= currentYear + 3) {
      setVisibleYearOccurrences([]);
      return;
    }

    let cancelled = false;
    const yearlyEvents = events.filter(e => e.recurrence === "YEARLY");
    if (yearlyEvents.length === 0) {
      setVisibleYearOccurrences([]);
      return;
    }

    Promise.all(
      yearlyEvents.map(event =>
        generateOccurrences({
          eventId:           event.id,
          title:             event.title,
          description:       event.description || "",
          anchorAdDate:      event.anchorAdDate,
          anchorBsDate:      event.anchorBsDate,
          anchorLunarDate:   event.anchorLunarDate,
          recurrence:        event.recurrence,
          eventType:         event.eventType,
          reminderCalendars: event.reminderCalendars,
          targetYear:        visibleYear
        }).catch(err => {
          console.warn("Failed to generate occurrences for navigated year:", visibleYear, err);
          return [];
        })
      )
    ).then(results => {
      if (cancelled) return;
      const extraOccs = results.flatMap((occs, i) =>
        occs.map(occ => ({
          eventId:          yearlyEvents[i].id,
          reminderCalendar: occ.reminderCalendar,
          occurrenceDateAd: occ.occurrenceDate,
        }))
      );
      setVisibleYearOccurrences(extraOccs);
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [visibleYear, events]);

  // ── Derived maps ──────────────────────────────────────────────────────────────

  // { "YYYY-MM-DD": [ { occurrence, event }, ... ] }
  const occurrencesByDateMap = useMemo(() => {
    const eventMap = new Map(events.map(e => [e.id, e]));
    const map = {};
    const combined = visibleYearOccurrences.length > 0
      ? [...occurrences, ...visibleYearOccurrences]
      : occurrences;

    for (const occ of combined) {
      const key = occ.occurrenceDateAd;
      if (!map[key]) map[key] = [];
      const event = eventMap.get(occ.eventId);
      if (event) {
        // Prevent duplicate occurrences for the same event & calendar on the same day
        const alreadyAdded = map[key].some(
          item => item.occurrence.eventId === occ.eventId && item.occurrence.reminderCalendar === occ.reminderCalendar
        );
        if (!alreadyAdded) {
          map[key].push({ occurrence: occ, event });
        }
      }
    }
    return map;
  }, [events, occurrences, visibleYearOccurrences]);

  // Events on the currently selected date (both generated occurrences and base event anchors)
  const eventsOnSelectedDate = useMemo(() => {
    const list = occurrencesByDateMap[selectedDate] ? [...occurrencesByDateMap[selectedDate]] : [];
    const presentEventIds = new Set(list.map(item => item.event.id));

    // Also include any base event whose anchor date is selectedDate
    for (const ev of events) {
      if (ev.anchorAdDate === selectedDate && !presentEventIds.has(ev.id)) {
        list.push({
          occurrence: {
            eventId: ev.id,
            reminderCalendar: ev.reminderCalendars?.[0] || "AD",
            occurrenceDateAd: ev.anchorAdDate
          },
          event: ev
        });
        presentEventIds.add(ev.id);
      }
    }
    return list;
  }, [selectedDate, occurrencesByDateMap, events]);

  // Upcoming occurrences starting from today, sorted ascending.
  // Fix #3: separate the pure filtering/sorting (useMemo — no async, stable ref)
  // from the BS date resolution (useEffect — only re-runs when candidates change).
  // Combined with the adToBs cache (Fix #2), repeated BS lookups cost ~0 ms.
  const [upcomingOccurrences, setUpcomingOccurrences] = useState([]);

  const upcomingCandidates = useMemo(() => {
    const eventMap = new Map(events.map(e => [e.id, e]));
    return occurrences
      .filter(occ => occ.occurrenceDateAd >= todayStr)
      .sort((a, b) => a.occurrenceDateAd.localeCompare(b.occurrenceDateAd))
      .slice(0, 15)
      .map(occ => ({ occurrence: occ, event: eventMap.get(occ.eventId) }))
      .filter(x => x.event);
  }, [occurrences, events, todayStr]);

  useEffect(() => {
    let cancelled = false;
    // Pre-resolve BS date for each occurrence in parallel
    Promise.all(
      upcomingCandidates.map(async (item) => {
        const [y, m, d] = item.occurrence.occurrenceDateAd.split("-").map(Number);
        try {
          const bs = await adToBs(y, m, d); // hits cache on 2nd+ run (Fix #2)
          return { ...item, bs };
        } catch {
          return { ...item, bs: null };
        }
      })
    ).then(result => { if (!cancelled) setUpcomingOccurrences(result); })
     .catch(console.error);
    return () => { cancelled = true; };
  }, [upcomingCandidates]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const calendarRef = useRef(null);

  // Fix #4: stable callback so CalendarCell's React.memo can prevent re-renders
  const handleSelectDate = useCallback((adDateStr) => setSelectedDate(adDateStr), []);

  const handleUpcomingClick = useCallback((adDateStr) => {
    setSelectedDate(adDateStr);
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    ensureNotificationPermissions().catch((err) =>
      console.warn("Notification permissions init error:", err)
    );
  }, []);

  const [showAddModal, setShowAddModal]               = useState(false);
  const [editingEvent, setEditingEvent]               = useState(null);
  const [addModalInitialDate, setAddModalInitialDate] = useState(null);

  const handleOpenAddEvent = (presetDate = selectedDate) => {
    setEditingEvent(null);
    setAddModalInitialDate(presetDate || selectedDate || todayStr);
    setShowAddModal(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setAddModalInitialDate(event.anchorAdDate);
    setShowAddModal(true);
  };

  async function handleSaveEvent(eventInput) {
    let targetId = eventInput.id;
    if (targetId) {
      await dbUpdateEvent(targetId, eventInput);
    } else {
      targetId = await createEvent(eventInput);
      eventInput.id = targetId;
    }

    const adDateStr = eventInput.anchorAdDate || eventInput.adDate;
    setSelectedDate(adDateStr);

    // Schedule notifications for occurrences
    try {
      const occs = await generateOccurrences({
        eventId:           targetId,
        title:             eventInput.title,
        description:       eventInput.description || "",
        anchorAdDate:      adDateStr,
        anchorBsDate:      eventInput.anchorBsDate || eventInput.bsDate,
        anchorLunarDate:   eventInput.anchorLunarDate || eventInput.lunarDate,
        recurrence:        eventInput.recurrence,
        eventType:         eventInput.eventType,
        reminderCalendars: eventInput.reminderCalendars,
        numberOfYears:     3,
      });

      await scheduleEventNotifications(
        { ...eventInput, id: targetId },
        occs
      );
    } catch (notifErr) {
      console.warn("Could not schedule notifications for event:", notifErr);
    }

    await loadData();
    setShowAddModal(false);
    setEditingEvent(null);

    // Silent background sync with connected Google Drive (never interrupts offline users)
    triggerSilentDriveSync();
  }

  async function handleDeleteEvent(eventId) {
    try {
      await cancelEventNotifications(eventId);
      await dbDeleteEvent(eventId);
      await loadData();
      triggerSilentDriveSync();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (dbError) return <p>Database error: {dbError}</p>;
  if (!dbReady) return <p>Initializing TriCalendar…</p>;

  return (
    <div className="mobile-viewport-wrapper" data-theme={theme}>
      <main className="mobile-container">

        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentLocation={location}
          onDataReload={loadData}
          onLocationChange={async (newCity) => {
            setLocation(newCity);
            try {
              await setCalendarLocation({ city: newCity });
            } catch (err) {
              console.warn("Failed to set calendar location:", err);
            }
            await loadData();
          }}
          onResetData={async () => {
            // "Reset" now just clears all user events from the DB
            if (window.confirm("Delete ALL events? This cannot be undone.")) {
              const all = await getAllEvents();
              for (const e of all) await dbDeleteEvent(e.id);
              await loadData();
            }
          }}
        />

        {/* Calendar — grid built entirely from getMonthAd/getMonthBs plugin calls */}
        <div ref={calendarRef}>
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            occurrencesByDateMap={occurrencesByDateMap}
            todayStr={todayStr}
            onVisibleYearChange={setVisibleYear}
          />
        </div>

        {/* Selected date details — BS and Tithi fetched asynchronously from plugin */}
        <SelectedDateDetails
          selectedDate={selectedDate}
          todayStr={todayStr}
          eventsOnDate={eventsOnSelectedDate}
          onDeleteEvent={handleDeleteEvent}
          onOpenAddEvent={handleOpenAddEvent}
          location={location}
        />

        {/* Minimal Add Event Button */}
        <div className="add-event-action-bar">
          <button
            type="button"
            className="minimal-add-event-btn"
            onClick={() => handleOpenAddEvent(selectedDate)}
          >
            <span className="add-btn-plus">+</span>
            <span>Add Event</span>
          </button>
        </div>

        {/* Upcoming events */}
        <UpcomingEvents
          upcomingOccurrences={upcomingOccurrences}
          todayStr={todayStr}
          selectedDate={selectedDate}
          onSelectDate={handleUpcomingClick}
        />

        {/* Base events (original registered dates, e.g. Birthdays, Anniversaries) */}
        <BaseEvents
          events={events}
          todayStr={todayStr}
          selectedDate={selectedDate}
          onSelectDate={handleUpcomingClick}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />

        {/* Add / Edit Event modal */}
        {showAddModal && (
          <AddEventModal
            initialDateAd={addModalInitialDate || selectedDate}
            eventToEdit={editingEvent}
            onClose={() => {
              setShowAddModal(false);
              setEditingEvent(null);
            }}
            onSave={handleSaveEvent}
          />
        )}

        <footer className="app-footer">
          <p>TriCalendar · AD · BS · Tithi</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
