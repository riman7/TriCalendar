import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import Header from "./components/Header";
import CalendarView from "./components/CalendarView";
import SelectedDateDetails from "./components/SelectedDateDetails";
import AddEventModal from "./components/AddEventModal";
import UpcomingEvents from "./components/UpcomingEvents";
import { calendarService } from "./services/calendarService";

function App() {
  const [todayStr] = useState(() => calendarService.getToday());
  const [selectedDate, setSelectedDate] = useState(() => calendarService.getToday());
  const [activeFilter, setActiveFilter] = useState("ALL"); // "ALL", "AD", "BS", "TITHI"
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState(null);

  // Synchronized state from calendarService
  const [dataState, setDataState] = useState(() => ({
    events: calendarService.getEvents(),
    occurrences: calendarService.getOccurrences()
  }));

  useEffect(() => {
    // Subscribe to service updates (when events are added/deleted/reset)
    const unsubscribe = calendarService.subscribe((state) => {
      setDataState({
        events: [...state.events],
        occurrences: [...state.occurrences]
      });
    });
    return unsubscribe;
  }, []);

  // Events map for calendar cells (filtered)
  const occurrencesByDateMap = useMemo(() => {
    if (!dataState) return {};
    return calendarService.getOccurrencesByDateMap(activeFilter);
  }, [activeFilter, dataState]);

  // Events on the currently selected date
  const eventsOnSelectedDate = useMemo(() => {
    if (!dataState) return [];
    return calendarService.getEventsForDate(selectedDate, activeFilter);
  }, [selectedDate, activeFilter, dataState]);

  // Upcoming occurrences
  const upcomingOccurrences = useMemo(() => {
    if (!dataState) return [];
    return calendarService.getUpcomingOccurrences(todayStr, activeFilter, 15);
  }, [todayStr, activeFilter, dataState]);

  // Calendar container ref for smooth scrolling when an upcoming event is clicked
  const calendarRef = useRef(null);

  const handleSelectDate = (adDateStr) => {
    setSelectedDate(adDateStr);
  };

  const handleUpcomingClick = (adDateStr) => {
    setSelectedDate(adDateStr);
    // Smooth scroll to calendar
    if (calendarRef.current) {
      calendarRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOpenAddEvent = (presetDate = selectedDate) => {
    setAddModalInitialDate(presetDate || selectedDate || todayStr);
    setShowAddModal(true);
  };

  const handleSaveNewEvent = (eventInput) => {
    const result = calendarService.addEvent(eventInput);
    if (result && result.event) {
      // Select the anchor date of the created event
      setSelectedDate(result.event.anchorAdDate);
    }
  };

  const handleDeleteEvent = (eventId) => {
    calendarService.deleteEvent(eventId);
  };

  const handleResetData = () => {
    calendarService.resetToMockData();
    setSelectedDate(todayStr);
  };

  return (
    <div className="mobile-viewport-wrapper">
      <main className="mobile-container">
        {/* Top Header: App name, Circle Profile Picture, Settings */}
        <Header onResetData={handleResetData} />

        {/* Calendar Interface: AD & BS switch, Pick Date section, 3-value cells */}
        <div ref={calendarRef}>
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            occurrencesByDateMap={occurrencesByDateMap}
            todayStr={todayStr}
            activeFilter={activeFilter}
            onChangeFilter={setActiveFilter}
          />
        </div>

        {/* Selected Date Details */}
        <SelectedDateDetails
          selectedDate={selectedDate}
          eventsOnDate={eventsOnSelectedDate}
          onDeleteEvent={handleDeleteEvent}
          onOpenAddEvent={handleOpenAddEvent}
        />

        {/* Big "Add Event" Button */}
        <section className="add-action-section">
          <button
            type="button"
            className="big-add-event-btn"
            onClick={() => handleOpenAddEvent(selectedDate)}
          >
            <span className="btn-plus-icon">+</span>
            <span>Add Event</span>
          </button>
        </section>

        {/* Upcoming Events Section (click to select date) */}
        <UpcomingEvents
          upcomingOccurrences={upcomingOccurrences}
          todayStr={todayStr}
          selectedDate={selectedDate}
          onSelectDate={handleUpcomingClick}
        />

        {/* Add Event Modal Dialog */}
        {showAddModal && (
          <AddEventModal
            initialDateAd={addModalInitialDate || selectedDate}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveNewEvent}
          />
        )}

        <footer className="app-footer">
          <p>TriCalendar · Offline-First Engine · AD · BS · Tithi</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
