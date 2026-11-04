// Nepali Bikram Sambat (BS) & Gregorian (AD) & Lunar Tithi Utility
// All heavy computation (BS↔AD conversion, Tithi lookup) is now delegated to the
// native Java calendar-engine via the CalendarEngine Capacitor plugin.

import { registerPlugin } from '@capacitor/core';

const CalendarEngine = registerPlugin('CalendarEngine');

// ─────────────────────────────────────────────────────────────────────────────
//  JS-side conversion cache  (Fix #2)
//
//  BS↔AD and Tithi values are deterministic — the same input always yields the
//  same output — so caching is safe and requires no expiry logic.
//  Each Map stores at most a few hundred entries per session (a few KB).
// ─────────────────────────────────────────────────────────────────────────────

const _bsCache      = new Map(); // "AD_Y-M-D"  → { year, month, day, monthName }
const _adCache      = new Map(); // "BS_Y-M-D"  → { year, month, day, adDate }
const _tithiCache   = new Map(); // "YYYY-MM-DD" → tithi result object
const _monthAdCache = new Map(); // "AD_Y-M"    → { days }
const _monthBsCache = new Map(); // "BS_Y-M"    → { days }

// ─────────────────────────────────────────────────────────────────────────────
//  Static data (names only — no algorithmic tables)
// ─────────────────────────────────────────────────────────────────────────────

export const NEPALI_MONTHS = [
  { id: 1,  name: "Baisakh",  np: "बैशाख" },
  { id: 2,  name: "Jestha",   np: "जेठ" },
  { id: 3,  name: "Ashadh",   np: "असार" },
  { id: 4,  name: "Shrawan",  np: "साउन" },
  { id: 5,  name: "Bhadra",   np: "भदौ" },
  { id: 6,  name: "Ashwin",   np: "असोज" },
  { id: 7,  name: "Kartik",   np: "कार्तिक" },
  { id: 8,  name: "Mangsir",  np: "मंसिर" },
  { id: 9,  name: "Poush",    np: "पुस" },
  { id: 10, name: "Magh",     np: "माघ" },
  { id: 11, name: "Falgun",   np: "फागुन" },
  { id: 12, name: "Chaitra",  np: "चैत" },
];

// Supported Bikram Sambat year range matching BsCalendarData.csv (1970 BS – 2100 BS)
export const MIN_BS_YEAR = 1970;
export const MAX_BS_YEAR = 2100;
export const BS_YEARS = Array.from(
  { length: MAX_BS_YEAR - MIN_BS_YEAR + 1 },
  (_, i) => MIN_BS_YEAR + i
);

export const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi",  "Saptami", "Ashtami", "Navami",    "Dashami",
  "Ekadashi",  "Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Amavasya",  // 15 Krishna
];

// ─────────────────────────────────────────────────────────────────────────────
//  Pure-JS date helpers (no calendar knowledge — only standard Date arithmetic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a Date object or ISO string as "YYYY-MM-DD".
 * @param {Date|string} date
 * @returns {string}
 */
export function formatYMD(date) {
  if (typeof date === "string") return date.split("T")[0];
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses "YYYY-MM-DD" into a UTC Date object.
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Calculates human-friendly relative days description from today's date.
 * e.g. "Today", "Tomorrow", "Yesterday", "1 day ago", "5 days later", "2 days ago"
 *
 * @param {string} targetDateStr "YYYY-MM-DD"
 * @param {string} [todayDateStr] "YYYY-MM-DD" (optional, defaults to current date)
 * @returns {string}
 */
export function getRelativeDaysDesc(targetDateStr, todayDateStr) {
  if (!targetDateStr) return "";
  const dToday = todayDateStr ? parseYMD(todayDateStr) : parseYMD(formatYMD(new Date()));
  const dTarget = parseYMD(targetDateStr);
  const diffDays = Math.round((dTarget - dToday) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow (1 day later)";
  if (diffDays === -1) return "Yesterday (1 day ago)";
  if (diffDays > 1) return `${diffDays} days later`;
  return `${Math.abs(diffDays)} days ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  BS ↔ AD Converters  (delegated to CalendarEngine Java plugin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a Bikram Sambat (BS) date to Gregorian (AD).
 *
 * @param {number} year  BS year
 * @param {number} month BS month (1–12)
 * @param {number} day   BS day
 * @returns {Promise<{ year: number, month: number, day: number, adDate: string }>}
 */
export async function bsToAd(year, month, day) {
  const key = `BS_${year}-${month}-${day}`;
  if (_adCache.has(key)) return _adCache.get(key);
  const result = await CalendarEngine.bsToAd({ year, month, day });
  const val = { year: result.year, month: result.month, day: result.day, adDate: result.adDate };
  _adCache.set(key, val);
  return val;
}

/**
 * Convert a Gregorian (AD) date to Bikram Sambat (BS).
 *
 * @param {number} year  AD year
 * @param {number} month AD month (1–12)
 * @param {number} day   AD day
 * @returns {Promise<{ year: number, month: number, day: number, monthName: string }>}
 */
export async function adToBs(year, month, day) {
  const key = `AD_${year}-${month}-${day}`;
  if (_bsCache.has(key)) return _bsCache.get(key);
  const result = await CalendarEngine.adToBs({ year, month, day });
  const val = { year: result.year, month: result.month, day: result.day, monthName: result.monthName };
  _bsCache.set(key, val);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tithi  (delegated to CalendarEngine Java plugin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the Tithi info for a Gregorian (AD) date using the Panchang library.
 *
 * @param {string|Date} adDateInput  "YYYY-MM-DD" or a Date object
 * @returns {Promise<{
 *   tithiNumber:   number,
 *   tithiInPaksha: number,
 *   tithiName:     string,
 *   paksha:        "SHUKLA"|"KRISHNA",
 *   month:         string,       // LunarMonth enum name e.g. "KARTIKA"
 *   monthDisplay:  string,       // human name e.g. "Kartika"
 *   adhika:        boolean,
 *   fullText:      string        // e.g. "Kartika Shukla Tritiya"
 * }>}
 */
export async function getTithiInfo(adDateInput) {
  const dateStr = typeof adDateInput === "string"
    ? adDateInput.split("T")[0]
    : formatYMD(adDateInput);

  if (_tithiCache.has(dateStr)) return _tithiCache.get(dateStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  const result = await CalendarEngine.adIntoTithi({ year: y, month: m, day: d });
  _tithiCache.set(dateStr, result);
  return result;
}

/**
 * Get the detailed tithi segments string (e.g. "Ashtami till 11:00 PM, then Navami")
 * for a given Gregorian (AD) date and optional city name.
 *
 * @param {string|Date} adDateInput "YYYY-MM-DD" or Date object
 * @param {string} [city] Optional city name (e.g. "KATHMANDU")
 * @returns {Promise<{ text: string, adDate: string, city: string, region: string }>}
 */
export async function getTithiSegments(adDateInput, city) {
  const adDate = typeof adDateInput === "string"
    ? adDateInput.split("T")[0]
    : formatYMD(adDateInput);
  return CalendarEngine.tithiSegments({ adDate, city });
}

/**
 * Set the current active Panchang location / city in the native calendar engine.
 *
 * @param {{ city?: string, latitude?: number, longitude?: number }} params
 * @returns {Promise<{ city: string, region: string }>}
 */
export async function setCalendarLocation(params) {
  return CalendarEngine.setLocation(params);
}

/**
 * Get the current active Panchang location / city from the native calendar engine.
 *
 * @returns {Promise<{ city: string, displayName: string, region: string }>}
 */
export async function getCalendarLocation() {
  return CalendarEngine.getLocation();
}

/**
 * Request device location via native Android LocationManager and resolve to nearest city.
 *
 * @returns {Promise<{ city: string, displayName: string, region: string, latitude: number, longitude: number }>}
 */
export async function getDeviceCalendarLocation() {
  return CalendarEngine.getDeviceLocation();
}

/**
 * Retrieve the list of supported cities from the native library.
 *
 * @returns {Promise<{ name: string, displayName: string, region: string }[]>}
 */
export async function getSupportedCalendarCities() {
  const result = await CalendarEngine.getSupportedCities();
  return result?.cities || [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Single-day data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns complete day data (AD + BS + Tithi) for any AD date string.
 *
 * @param {string} adDateStr "YYYY-MM-DD"
 * @returns {Promise<{
 *   adDate:    string,
 *   adYear:    number,
 *   adMonth:   number,
 *   adDay:     number,
 *   bsYear:    number,
 *   bsMonth:   number,
 *   bsDay:     number,
 *   bsMonthName: string,
 *   tithi: object
 * }>}
 */
export async function getCalendarDayData(adDateStr) {
  const [y, m, d] = adDateStr.split("-").map(Number);
  return CalendarEngine.getCalendarDate({ year: y, month: m, day: d });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Month Grids
//
//  Both getAdMonthGrid and getBsMonthGrid now use a single batch call to the
//  native plugin (getMonthAd / getMonthBs) which returns all days in one round
//  trip, then pad the result to a 35- or 42-cell calendar grid in JS.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the per-day index from a CalendarDate array returned by the plugin.
 * Maps "YYYY-MM-DD" → CalendarDateObject for O(1) lookup during grid building.
 *
 * @param {object[]} days
 * @returns {Map<string, object>}
 */
function buildDayIndex(days) {
  const map = new Map();
  for (const day of days) {
    map.set(day.adDate, day);
  }
  return map;
}

/**
 * Returns the month grid for an AD (Gregorian) month view.
 *
 * The grid is 35 or 42 cells wide (7 columns × 5 or 6 rows) and includes
 * leading days from the previous month and trailing days from the next month
 * so every row is complete.
 *
 * Uses a single {@code getMonthAd} call for the main month, and individual
 * {@code getCalendarDate} calls only for the small number of overflow days at
 * the leading / trailing edges.
 *
 * @param {number} year  AD year
 * @param {number} month AD month (1–12)
 * @returns {Promise<object[]>}  Array of cell objects
 */
export async function getAdMonthGrid(year, month) {
  // ── Main month ──────────────────────────────────────────────────────────
  const mainKey = `AD_${year}-${month}`;
  let mainDays;
  if (_monthAdCache.has(mainKey)) {
    mainDays = _monthAdCache.get(mainKey);
  } else {
    const r = await CalendarEngine.getMonthAd({ year, month });
    mainDays = r.days;
    _monthAdCache.set(mainKey, mainDays);
  }

  const firstAdDate  = parseYMD(mainDays[0].adDate);
  const startDOW     = firstAdDate.getUTCDay();   // 0 = Sun
  const daysInMonth  = mainDays.length;

  const cells = [];

  // ── 1. Leading days from the previous month ──────────────────────────────
  if (startDOW > 0) {
    let prevMonth = month - 1;
    let prevYear  = year;
    if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }

    // Fetch previous month — use cache if available
    const prevKey = `AD_${prevYear}-${prevMonth}`;
    let prevDays;
    if (_monthAdCache.has(prevKey)) {
      prevDays = _monthAdCache.get(prevKey);
    } else {
      const r = await CalendarEngine.getMonthAd({ year: prevYear, month: prevMonth });
      prevDays = r.days;
      _monthAdCache.set(prevKey, prevDays);
    }
    const prevTotal = prevDays.length;

    for (let i = startDOW - 1; i >= 0; i--) {
      const cd = prevDays[prevTotal - 1 - i];
      cells.push({
        isEmpty: false, isOtherMonth: true,
        id: `prev-${cd.adDate}`,
        adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
        bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
        tithiName: cd.tithi?.tithiName ?? "",
        tithiFull: cd.tithi?.fullText   ?? "",
      });
    }
  }

  // ── 2. Days of the current month ─────────────────────────────────────────
  for (const cd of mainDays) {
    cells.push({
      isEmpty: false, isOtherMonth: false,
      id: cd.adDate,
      adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
      bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
      tithiName: cd.tithi?.tithiName ?? "",
      tithiFull: cd.tithi?.fullText   ?? "",
    });
  }

  // ── 3. Trailing days from the next month ──────────────────────────────────
  const totalGridCells = cells.length > 35 ? 42 : 35;
  const trailingCount  = totalGridCells - cells.length;

  if (trailingCount > 0) {
    let nextMonth = month + 1;
    let nextYear  = year;
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

    const nextKey = `AD_${nextYear}-${nextMonth}`;
    let nextDays;
    if (_monthAdCache.has(nextKey)) {
      nextDays = _monthAdCache.get(nextKey);
    } else {
      const r = await CalendarEngine.getMonthAd({ year: nextYear, month: nextMonth });
      nextDays = r.days;
      _monthAdCache.set(nextKey, nextDays);
    }

    for (let i = 0; i < trailingCount; i++) {
      const cd = nextDays[i];
      cells.push({
        isEmpty: false, isOtherMonth: true,
        id: `next-${cd.adDate}`,
        adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
        bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
        tithiName: cd.tithi?.tithiName ?? "",
        tithiFull: cd.tithi?.fullText   ?? "",
      });
    }
  }

  return cells;
}

/**
 * Returns the month grid for a BS (Bikram Sambat) month view.
 *
 * Uses a single {@code getMonthBs} call for the main month.
 * The first AD date of the BS month determines the starting day-of-week so the
 * grid aligns correctly on a Sunday-first week layout.
 *
 * @param {number} bsYear  BS year
 * @param {number} bsMonth BS month (1–12)
 * @returns {Promise<object[]>}  Array of cell objects
 */
export async function getBsMonthGrid(bsYear, bsMonth) {
  // ── Main month ──────────────────────────────────────────────────────────
  const mainKey = `BS_${bsYear}-${bsMonth}`;
  let mainDays;
  if (_monthBsCache.has(mainKey)) {
    mainDays = _monthBsCache.get(mainKey);
  } else {
    const r = await CalendarEngine.getMonthBs({ year: bsYear, month: bsMonth });
    mainDays = r.days;
    _monthBsCache.set(mainKey, mainDays);
  }

  const firstAdDate = parseYMD(mainDays[0].adDate);
  const startDOW    = firstAdDate.getUTCDay();  // 0 = Sun

  const cells = [];

  // ── 1. Leading days from the previous BS month ────────────────────────────
  if (startDOW > 0) {
    let prevBsMonth = bsMonth - 1;
    let prevBsYear  = bsYear;
    if (prevBsMonth < 1) { prevBsMonth = 12; prevBsYear -= 1; }

    const prevKey = `BS_${prevBsYear}-${prevBsMonth}`;
    let prevDays;
    if (_monthBsCache.has(prevKey)) {
      prevDays = _monthBsCache.get(prevKey);
    } else {
      const r = await CalendarEngine.getMonthBs({ year: prevBsYear, month: prevBsMonth });
      prevDays = r.days;
      _monthBsCache.set(prevKey, prevDays);
    }
    const prevTotal = prevDays.length;

    for (let i = startDOW - 1; i >= 0; i--) {
      const cd = prevDays[prevTotal - 1 - i];
      cells.push({
        isEmpty: false, isOtherMonth: true,
        id: `bs-prev-${cd.bsYear}-${cd.bsMonth}-${cd.bsDay}`,
        adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
        bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
        tithiName: cd.tithi?.tithiName ?? "",
        tithiFull: cd.tithi?.fullText   ?? "",
      });
    }
  }

  // ── 2. Days of the current BS month ──────────────────────────────────────
  for (const cd of mainDays) {
    cells.push({
      isEmpty: false, isOtherMonth: false,
      id: `bs-${cd.bsYear}-${cd.bsMonth}-${cd.bsDay}`,
      adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
      bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
      tithiName: cd.tithi?.tithiName ?? "",
      tithiFull: cd.tithi?.fullText   ?? "",
    });
  }

  // ── 3. Trailing days from the next BS month ───────────────────────────────
  const totalGridCells = cells.length > 35 ? 42 : 35;
  const trailingCount  = totalGridCells - cells.length;

  if (trailingCount > 0) {
    let nextBsMonth = bsMonth + 1;
    let nextBsYear  = bsYear;
    if (nextBsMonth > 12) { nextBsMonth = 1; nextBsYear += 1; }

    const nextKey = `BS_${nextBsYear}-${nextBsMonth}`;
    let nextDays;
    if (_monthBsCache.has(nextKey)) {
      nextDays = _monthBsCache.get(nextKey);
    } else {
      const r = await CalendarEngine.getMonthBs({ year: nextBsYear, month: nextBsMonth });
      nextDays = r.days;
      _monthBsCache.set(nextKey, nextDays);
    }

    for (let i = 0; i < trailingCount; i++) {
      const cd = nextDays[i];
      cells.push({
        isEmpty: false, isOtherMonth: true,
        id: `bs-next-${cd.bsYear}-${cd.bsMonth}-${cd.bsDay}`,
        adDate: cd.adDate, adDay: cd.adDay, adMonth: cd.adMonth, adYear: cd.adYear,
        bsDay: cd.bsDay, bsMonth: cd.bsMonth, bsYear: cd.bsYear, bsMonthName: cd.bsMonthName,
        tithiName: cd.tithi?.tithiName ?? "",
        tithiFull: cd.tithi?.fullText   ?? "",
      });
    }
  }

  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Occurrence generation  (delegated to CalendarEngine Java plugin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate recurring occurrence dates for an event using the OccurrenceService.
 *
 * @param {{
 *   eventId:           string|number,
 *   title:             string,
 *   description?:      string,
 *   anchorAdDate:      string,       // "YYYY-MM-DD"
 *   anchorBsDate:      { year, month, day },
 *   anchorLunarDate?:  { tithiNumber, month, adhika? },
 *   recurrence:        "ONCE"|"YEARLY",
 *   eventType:         "BIRTHDAY"|"ANNIVERSARY"|"MEETING"|"OTHER",
 *   reminderCalendars: ("AD"|"BS"|"TITHI")[],
 *   numberOfYears?:    number
 * }} eventInput
 * @returns {Promise<{ eventId, reminderCalendar: string, occurrenceDate: string }[]>}
 */
export async function generateOccurrences(eventInput) {
  const result = await CalendarEngine.generateOccurrences(eventInput);
  return result.occurrences;
}

// ─────────────────────────────────────────────────────────────────────────────
//  BS month days helper  (delegated to CalendarEngine Java plugin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the number of days in a given BS year and month.
 *
 * @param {number} year  BS year
 * @param {number} month BS month (1–12)
 * @returns {Promise<number>}
 */
export async function getDaysInBsMonth(year, month) {
  const { days } = await CalendarEngine.getBsMonthDays({ year, month });
  return days;
}
