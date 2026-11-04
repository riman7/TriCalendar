import { mockCalendarData } from "../data/mockData";
import { adToBs, bsToAd, getTithiInfo } from "../utils/calendarUtils";

const STORAGE_KEY = "tricalendar_offline_store_v1";

// In-memory store that initializes from localStorage or mockCalendarData
let state = loadInitialData();
let listeners = new Set();

function loadInitialData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.events && parsed.occurrences) {
        return {
          today: parsed.today || mockCalendarData.today,
          events: parsed.events,
          occurrences: parsed.occurrences
        };
      }
    }
  } catch {
    // fallback to mockCalendarData on storage error
  }

  // Deep clone mockCalendarData
  return {
    today: mockCalendarData.today,
    events: JSON.parse(JSON.stringify(mockCalendarData.events)),
    occurrences: JSON.parse(JSON.stringify(mockCalendarData.occurrences))
  };
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to persist to localStorage:", err);
  }
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.error("Error in listener:", err);
    }
  });
}

export const calendarService = {
  /**
   * Subscribe to data changes
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get the current mock "today" date
   */
  getToday() {
    return state.today || "2026-11-04";
  },

  /**
   * Get all events
   */
  getEvents() {
    return [...state.events];
  },

  /**
   * Get event by ID
   */
  getEventById(id) {
    return state.events.find((e) => e.id === Number(id)) || null;
  },

  /**
   * Get all occurrences, optionally filtered by reminder calendar type ("ALL", "AD", "BS", "TITHI")
   */
  getOccurrences(filter = "ALL") {
    if (!filter || filter === "ALL") {
      return [...state.occurrences];
    }
    return state.occurrences.filter(
      (occ) => occ.reminderCalendar?.toUpperCase() === filter.toUpperCase()
    );
  },

  /**
   * Get occurrences mapped by occurrenceDateAd for fast calendar lookups
   * Returns: { "2026-11-04": [ { occurrence, event }, ... ] }
   */
  getOccurrencesByDateMap(filter = "ALL") {
    const occurrences = this.getOccurrences(filter);
    const eventMap = new Map(state.events.map((e) => [e.id, e]));
    const map = {};

    for (const occ of occurrences) {
      const dateKey = occ.occurrenceDateAd;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      const event = eventMap.get(occ.eventId);
      if (event) {
        map[dateKey].push({
          occurrence: occ,
          event
        });
      }
    }
    return map;
  },

  /**
   * Get all occurrences and their matching event for a specific AD date string ("YYYY-MM-DD")
   */
  getEventsForDate(adDateStr, filter = "ALL") {
    const occurrences = this.getOccurrences(filter);
    const eventMap = new Map(state.events.map((e) => [e.id, e]));
    const results = [];

    for (const occ of occurrences) {
      if (occ.occurrenceDateAd === adDateStr) {
        const event = eventMap.get(occ.eventId);
        if (event) {
          results.push({
            occurrence: occ,
            event
          });
        }
      }
    }

    return results;
  },

  /**
   * Get upcoming occurrences starting from a given date (inclusive),
   * sorted ascending by occurrenceDateAd
   */
  getUpcomingOccurrences(fromDateAdStr = state.today, filter = "ALL", limit = 10) {
    const occurrences = this.getOccurrences(filter);
    const eventMap = new Map(state.events.map((e) => [e.id, e]));

    const filtered = occurrences
      .filter((occ) => occ.occurrenceDateAd >= fromDateAdStr)
      .sort((a, b) => a.occurrenceDateAd.localeCompare(b.occurrenceDateAd));

    const results = [];
    for (const occ of filtered) {
      const event = eventMap.get(occ.eventId);
      if (event) {
        results.push({
          occurrence: occ,
          event
        });
      }
      if (results.length >= limit) break;
    }

    return results;
  },

  /**
   * Add a new event and generate its occurrences adhering to the exact data model
   */
  async addEvent(eventInput) {
    const {
      title,
      description = "",
      dateType = "AD", // "AD" or "BS"
      adDate,          // "YYYY-MM-DD" if dateType === "AD"
      bsDate,          // { year, month, day } if dateType === "BS"
      eventType = "OTHER", // "BIRTHDAY" | "ANNIVERSARY" | "OTHER"
      recurrence = "ONCE", // "ONCE" | "DAILY" | "WEEKLY" | "YEARLY"
      reminderCalendars = ["AD"] // Array: ["AD"], ["BS"], ["TITHI"]
    } = eventInput;

    // Resolve anchor dates
    let finalAnchorAdDate;
    let finalAnchorBsDate;

    if (dateType === "BS" && bsDate) {
      finalAnchorBsDate = {
        year: Number(bsDate.year),
        month: Number(bsDate.month),
        day: Number(bsDate.day)
      };
      const adResult = await bsToAd(finalAnchorBsDate.year, finalAnchorBsDate.month, finalAnchorBsDate.day);
      finalAnchorAdDate = adResult.adDate;
    } else {
      finalAnchorAdDate = adDate || state.today;
      const [y, m, d] = finalAnchorAdDate.split("-").map(Number);
      const bsResult = await adToBs(y, m, d);
      finalAnchorBsDate = { year: bsResult.year, month: bsResult.month, day: bsResult.day };
    }

    // Resolve anchorLunarDate
    const tithiInfo = await getTithiInfo(finalAnchorAdDate);
    const finalAnchorLunarDate = {
      month: tithiInfo.month,
      paksha: tithiInfo.paksha,
      tithi: tithiInfo.tithiInPaksha,
      tithiNumber: tithiInfo.tithiNumber
    };

    // Generate new unique ID
    const maxEventId = state.events.reduce((max, e) => Math.max(max, e.id), 0);
    const newEventId = maxEventId + 1;

    // Create event object adhering to provided schema
    const newEvent = {
      id: newEventId,
      title: title.trim(),
      description: description.trim(),
      anchorAdDate: finalAnchorAdDate,
      anchorBsDate: finalAnchorBsDate,
      anchorLunarDate: finalAnchorLunarDate,
      recurrence: recurrence.toUpperCase(),
      eventType: eventType.toUpperCase(),
      reminderCalendars: reminderCalendars.length > 0 ? reminderCalendars : ["AD"],
      createdAt: new Date().toISOString()
    };

    // Generate occurrences
    let maxOccId = state.occurrences.reduce((max, o) => Math.max(max, o.id), 100);
    const newOccurrences = [];

    // Base occurrence date for current year cycle
    // In our offline-first calendar, for recurring events we position the occurrence
    // for the active calendar year (2026 AD / 2083 BS)
    const targetAdYear = 2026;
    const targetBsYear = 2083;

    for (const remCal of newEvent.reminderCalendars) {
      let occDateAd = finalAnchorAdDate;

      if (newEvent.recurrence === "YEARLY" || newEvent.eventType === "BIRTHDAY" || newEvent.eventType === "ANNIVERSARY") {
        if (remCal === "AD") {
          // Same month and day in AD
          const [, m, d] = finalAnchorAdDate.split("-");
          occDateAd = `${targetAdYear}-${m}-${d}`;
        } else if (remCal === "BS") {
          // Same month and day in BS, converted to AD
          const adResult = await bsToAd(targetBsYear, finalAnchorBsDate.month, finalAnchorBsDate.day);
          occDateAd = adResult.adDate;
        } else if (remCal === "TITHI") {
          // Lunar anchor in target year
          occDateAd = finalAnchorAdDate;
        }
      }

      maxOccId += 1;
      newOccurrences.push({
        id: maxOccId,
        eventId: newEvent.id,
        reminderCalendar: remCal,
        occurrenceDateAd: occDateAd
      });
    }

    state.events.push(newEvent);
    state.occurrences.push(...newOccurrences);

    persistState();

    return {
      event: newEvent,
      occurrences: newOccurrences
    };
  },

  /**
   * Delete an event and all its occurrences
   */
  deleteEvent(eventId) {
    const id = Number(eventId);
    state.events = state.events.filter((e) => e.id !== id);
    state.occurrences = state.occurrences.filter((o) => o.eventId !== id);
    persistState();
  },

  /**
   * Reset data to initial mock data
   */
  resetToMockData() {
    state = {
      today: mockCalendarData.today,
      events: JSON.parse(JSON.stringify(mockCalendarData.events)),
      occurrences: JSON.parse(JSON.stringify(mockCalendarData.occurrences))
    };
    persistState();
  }
};
