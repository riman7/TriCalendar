package com.riman.tricalendar.plugins;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.riman.calendar_engine.converter.BsAdConverter;
import com.riman.calendar_engine.converter.TithiConverter;
import com.riman.calendar_engine.model.BsDate;
import com.riman.calendar_engine.model.CalendarDate;
import com.riman.calendar_engine.model.CalendarEvent;
import com.riman.calendar_engine.model.EventOccurrence;
import com.riman.calendar_engine.model.EventType;
import com.riman.calendar_engine.model.Recurrence;
import com.riman.calendar_engine.model.ReminderCalendar;
import com.riman.calendar_engine.service.CalendarService;
import com.riman.calendar_engine.service.OccurrenceService;

import com.misrilibrary.tithi.City;
import com.misrilibrary.tithi.model.LunarMonth;
import com.misrilibrary.tithi.model.MonthSystem;
import com.misrilibrary.tithi.model.Paksha;
import com.misrilibrary.tithi.model.TithiInfo;

import android.content.Context;
import android.location.Location;
import android.location.LocationManager;

import java.io.IOException;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * CalendarEnginePlugin — Capacitor bridge that exposes the Java calendar-engine
 * library to the React (TypeScript/JavaScript) layer.
 *
 * <p>All plugin methods are called asynchronously from JS via:
 * <pre>
 *   const CalendarEngine = registerPlugin('CalendarEngine');
 *   const result = await CalendarEngine.someMethod({ ... });
 * </pre>
 *
 * <h2>Exposed methods</h2>
 * <ul>
 *   <li>{@link #bsToAd}         — convert BS date → AD date</li>
 *   <li>{@link #adToBs}         — convert AD date → BS date</li>
 *   <li>{@link #adIntoTithi}    — get Tithi info for an AD date</li>
 *   <li>{@link #getCalendarDate}— full CalendarDate (AD + BS + Tithi) for one day</li>
 *   <li>{@link #getMonthAd}     — all CalendarDate entries for an AD month</li>
 *   <li>{@link #getMonthBs}     — all CalendarDate entries for a BS month</li>
 *   <li>{@link #getBsMonthDays} — total days in a BS month</li>
 *   <li>{@link #generateOccurrences} — generate event occurrence dates</li>
 * </ul>
 */
@CapacitorPlugin(name = "CalendarEngine")
public class CalendarEnginePlugin extends Plugin {

    private BsAdConverter   converter;
    private TithiConverter  tithiConverter;
    private CalendarService calendarService;
    private OccurrenceService occurrenceService;

    /**
     * Called once when the plugin is registered. Initialises the shared service
     * instances so they are ready for every subsequent plugin-method call.
     */
    @Override
    public void load() {
        try {
            converter         = new BsAdConverter();
            tithiConverter    = new TithiConverter();
            calendarService   = new CalendarService();
            occurrenceService = new OccurrenceService();
        } catch (IOException e) {
            converter         = null;
            tithiConverter    = null;
            calendarService   = null;
            occurrenceService = null;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BS ↔ AD Converters
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Convert a Bikram Sambat (BS) date to its Gregorian (AD) equivalent.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number, day: number }</pre>
     *
     * <p><b>Output</b>
     * <pre>{ year: number, month: number, day: number, adDate: "YYYY-MM-DD" }</pre>
     */
    @PluginMethod
    public void bsToAd(PluginCall call) {
        if (converter == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");
            Integer day   = call.getInt("day");

            if (year == null || month == null || day == null) {
                call.reject("Missing required parameters: year, month, or day");
                return;
            }

            LocalDate result = converter.bsToAd(year, month, day);

            JSObject response = new JSObject();
            response.put("year",   result.getYear());
            response.put("month",  result.getMonthValue());
            response.put("day",    result.getDayOfMonth());
            response.put("adDate", result.toString());          // "YYYY-MM-DD"
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Convert a Gregorian (AD) date to its Bikram Sambat (BS) equivalent.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number, day: number }</pre>
     *
     * <p><b>Output</b>
     * <pre>{ year: number, month: number, day: number, monthName: string }</pre>
     */
    @PluginMethod
    public void adToBs(PluginCall call) {
        if (converter == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");
            Integer day   = call.getInt("day");

            if (year == null || month == null || day == null) {
                call.reject("Missing required parameters: year, month, or day");
                return;
            }

            BsDate result = converter.adToBs(LocalDate.of(year, month, day));

            JSObject response = new JSObject();
            response.put("year",      result.year());
            response.put("month",     result.month());
            response.put("day",       result.day());
            response.put("monthName", result.getMonthName());
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Tithi
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Compute the Tithi (lunar day) for a given Gregorian (AD) date using the
     * Panchang library at sunrise in Kathmandu.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number, day: number }</pre>
     *
     * <p><b>Output</b>
     * <pre>{
     *   tithiNumber:  number,          // absolute 1–30
     *   tithiInPaksha: number,         // position within paksha 1–15
     *   tithiName:    string,          // e.g. "Tritiya"
     *   paksha:       "SHUKLA"|"KRISHNA",
     *   month:        string,          // LunarMonth enum name e.g. "KARTIKA"
     *   monthDisplay: string,          // human name e.g. "Kartika"
     *   adhika:       boolean,         // is this an intercalary month occurrence?
     *   fullText:     string           // e.g. "Kartika Shukla Tritiya"
     * }</pre>
     */
    @PluginMethod
    public void adIntoTithi(PluginCall call) {
        if (tithiConverter == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");
            Integer day   = call.getInt("day");

            if (year == null || month == null || day == null) {
                call.reject("Missing required parameters: year, month, or day");
                return;
            }

            TithiInfo info = tithiConverter.adIntoTithi(year, month, day);
            JSObject response = tithiInfoToJSObject(info);
            try {
                String segments = tithiConverter.TithiSegmets(LocalDate.of(year, month, day));
                response.put("tithiSegments", segments);
            } catch (Exception ignored) {}
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Get detailed tithi timing segments for an AD date (e.g. "Ashtami till 11:00 PM, then Navami").
     *
     * <p><b>Input</b>: { year, month, day } or { adDate: "YYYY-MM-DD" }, optional { city: string }
     * <p><b>Output</b>: { text: string, adDate: string, city: string }
     */
    @PluginMethod
    public void tithiSegments(PluginCall call) {
        if (tithiConverter == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");
            Integer day   = call.getInt("day");
            String adDate = call.getString("adDate");

            LocalDate date;
            if (adDate != null) {
                date = LocalDate.parse(adDate);
            } else if (year != null && month != null && day != null) {
                date = LocalDate.of(year, month, day);
            } else {
                call.reject("Missing required parameters: adDate or year, month, day");
                return;
            }

            String cityName = call.getString("city");
            City city = (cityName != null && !cityName.trim().isEmpty())
                    ? City.tryOf(cityName.trim())
                    : tithiConverter.getCity();

            if (city == null) city = City.KATHMANDU;

            String text = tithiConverter.TithiSegmets(date, city);

            JSObject response = new JSObject();
            response.put("text", text);
            response.put("adDate", date.toString());
            response.put("city", city.displayName());
            response.put("region", city.region());
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Set the current location for panchang and tithi calculations.
     * Accepts a city name or latitude/longitude coordinates.
     */
    @PluginMethod
    public void setLocation(PluginCall call) {
        if (tithiConverter == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            String cityName = call.getString("city");
            Double latitude = call.getDouble("latitude");
            Double longitude = call.getDouble("longitude");

            City resolvedCity = null;

            if (latitude != null && longitude != null) {
                String matchedCellCity = City.cityForCell(latitude, longitude);
                if (matchedCellCity != null) {
                    resolvedCity = City.tryOf(matchedCellCity);
                }
            }

            if (resolvedCity == null && cityName != null && !cityName.trim().isEmpty()) {
                resolvedCity = City.tryOf(cityName.trim());
            }

            if (resolvedCity == null) {
                resolvedCity = City.KATHMANDU;
            }

            tithiConverter.setCity(resolvedCity);
            if (calendarService != null) calendarService.setCity(resolvedCity.name());
            if (occurrenceService != null) occurrenceService.setCity(resolvedCity.name());

            JSObject response = new JSObject();
            response.put("city", resolvedCity.name());
            response.put("displayName", resolvedCity.displayName());
            response.put("region", resolvedCity.region());
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Get the currently active panchang location.
     */
    @PluginMethod
    public void getLocation(PluginCall call) {
        City c = (tithiConverter != null && tithiConverter.getCity() != null)
                ? tithiConverter.getCity()
                : City.KATHMANDU;

        JSObject response = new JSObject();
        response.put("city", c.name());
        response.put("displayName", c.displayName());
        response.put("region", c.region());
        call.resolve(response);
    }

    /**
     * Detect device location via Android LocationManager and resolve to closest panchang city.
     * Defaults to Kathmandu, Nepal if GPS/Network location cannot be determined.
     */
    @PluginMethod
    public void getDeviceLocation(PluginCall call) {
        try {
            Context context = getContext();
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            Location bestLocation = null;

            if (lm != null) {
                try {
                    boolean fine = context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED;
                    boolean coarse = context.checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED;

                    if (fine || coarse) {
                        Location gps = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                        Location net = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                        if (gps != null && net != null) {
                            bestLocation = (gps.getTime() > net.getTime()) ? gps : net;
                        } else if (gps != null) {
                            bestLocation = gps;
                        } else {
                            bestLocation = net;
                        }
                    }
                } catch (SecurityException ignored) {
                }
            }

            City resolvedCity = City.KATHMANDU;
            double lat = 27.7172;
            double lon = 85.3240;

            if (bestLocation != null) {
                lat = bestLocation.getLatitude();
                lon = bestLocation.getLongitude();
                String cellCity = City.cityForCell(lat, lon);
                if (cellCity != null) {
                    City c = City.tryOf(cellCity);
                    if (c != null) resolvedCity = c;
                }
            }

            tithiConverter.setCity(resolvedCity);
            if (calendarService != null) calendarService.setCity(resolvedCity.name());
            if (occurrenceService != null) occurrenceService.setCity(resolvedCity.name());

            JSObject response = new JSObject();
            response.put("city", resolvedCity.name());
            response.put("displayName", resolvedCity.displayName());
            response.put("region", resolvedCity.region());
            response.put("latitude", lat);
            response.put("longitude", lon);
            call.resolve(response);

        } catch (Exception e) {
            City resolvedCity = City.KATHMANDU;
            JSObject response = new JSObject();
            response.put("city", resolvedCity.name());
            response.put("displayName", resolvedCity.displayName());
            response.put("region", resolvedCity.region());
            call.resolve(response);
        }
    }

    /**
     * Return list of supported cities from misrilibrary.
     */
    @PluginMethod
    public void getSupportedCities(PluginCall call) {
        JSArray arr = new JSArray();
        for (City c : City.values()) {
            JSObject obj = new JSObject();
            obj.put("city", c.name());
            obj.put("displayName", c.displayName());
            obj.put("region", c.region());
            arr.put(obj);
        }
        JSObject response = new JSObject();
        response.put("cities", arr);
        call.resolve(response);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Single-day CalendarDate
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Return the combined AD + BS + Tithi data for a single AD date.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number, day: number }</pre>
     *
     * <p><b>Output</b> — a {@code CalendarDateObject} (see {@link #calendarDateToJSObject})
     */
    @PluginMethod
    public void getCalendarDate(PluginCall call) {
        if (calendarService == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");
            Integer day   = call.getInt("day");

            if (year == null || month == null || day == null) {
                call.reject("Missing required parameters: year, month, or day");
                return;
            }

            CalendarDate cd = calendarService.getCalendarDate(year, month, day);
            call.resolve(calendarDateToJSObject(cd));

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Month-level data builders  (used to fill calendar grids)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Return every day in a Gregorian (AD) month as an array of
     * {@code CalendarDateObject}s, each carrying BS and Tithi data.
     *
     * <p>This replaces the old JS loops that called {@code adToBs} / {@code getTithiInfo}
     * one day at a time — a single bridge call now delivers the entire month.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number }</pre>
     *
     * <p><b>Output</b>
     * <pre>{ days: CalendarDateObject[] }</pre>
     */
    @PluginMethod
    public void getMonthAd(PluginCall call) {
        if (calendarService == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");

            if (year == null || month == null) {
                call.reject("Missing required parameters: year or month");
                return;
            }

            List<CalendarDate> dates = calendarService.getMonthAd(year, month);

            JSArray days = new JSArray();
            for (CalendarDate cd : dates) {
                days.put(calendarDateToJSObject(cd));
            }

            JSObject response = new JSObject();
            response.put("days", days);
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Return every day in a Bikram Sambat (BS) month as an array of
     * {@code CalendarDateObject}s, each carrying AD and Tithi data.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number }  — BS year and month</pre>
     *
     * <p><b>Output</b>
     * <pre>{ days: CalendarDateObject[] }</pre>
     */
    @PluginMethod
    public void getMonthBs(PluginCall call) {
        if (calendarService == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");

            if (year == null || month == null) {
                call.reject("Missing required parameters: year or month");
                return;
            }

            List<CalendarDate> dates = calendarService.getMonthBs(year, month);

            JSArray days = new JSArray();
            for (CalendarDate cd : dates) {
                days.put(calendarDateToJSObject(cd));
            }

            JSObject response = new JSObject();
            response.put("days", days);
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Return the total number of days in a Bikram Sambat (BS) month.
     *
     * <p><b>Input</b>
     * <pre>{ year: number, month: number }  — BS year and month</pre>
     *
     * <p><b>Output</b>
     * <pre>{ days: number }</pre>
     */
    @PluginMethod
    public void getBsMonthDays(PluginCall call) {
        if (calendarService == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            Integer year  = call.getInt("year");
            Integer month = call.getInt("month");

            if (year == null || month == null) {
                call.reject("Missing required parameters: year or month");
                return;
            }

            int totalDays = calendarService.getBsMonthDays(year, month);

            JSObject response = new JSObject();
            response.put("days", totalDays);
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Occurrence generation
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Generate the future (and past-catch-up) occurrence dates for a calendar
     * event, delegating to {@link OccurrenceService#generateOccurrences}.
     *
     * <p>Supports all three reminder-calendar types: {@code AD}, {@code BS},
     * and {@code TITHI}.  For {@code TITHI} reminders the caller must supply
     * {@code anchorLunarDate} so that the panchang library can search for the
     * matching tithi in each successive year.
     *
     * <p><b>Input</b>
     * <pre>{
     *   eventId:          string | number,
     *   title:            string,
     *   description:      string,                     // optional
     *   anchorAdDate:     "YYYY-MM-DD",
     *   anchorBsDate:     { year, month, day },
     *   anchorLunarDate: {                            // required for TITHI calendar
     *     tithiNumber: number,                        // absolute 1–30
     *     month:       string,                        // LunarMonth enum e.g. "KARTIKA"
     *     adhika:      boolean                        // optional, default false
     *   },
     *   recurrence:       "ONCE"|"YEARLY",
     *   eventType:        "BIRTHDAY"|"ANNIVERSARY"|"MEETING"|"OTHER",
     *   reminderCalendars: ("AD"|"BS"|"TITHI")[],
     *   numberOfYears:    number                      // optional, default 5
     * }</pre>
     *
     * <p><b>Output</b>
     * <pre>{
     *   occurrences: [
     *     { eventId, reminderCalendar: "AD"|"BS"|"TITHI", occurrenceDate: "YYYY-MM-DD" },
     *     ...
     *   ]
     * }</pre>
     */
    @PluginMethod
    public void generateOccurrences(PluginCall call) {
        if (occurrenceService == null) { call.reject("Calendar data could not be loaded"); return; }

        try {
            CalendarEvent event = new CalendarEvent();

            // ── Event ID (accept string or number from JS) ───────────────
            String eventIdStr = call.getString("eventId");
            if (eventIdStr != null) {
                try { event.setId(Long.parseLong(eventIdStr)); }
                catch (NumberFormatException ignored) { /* keep null */ }
            } else {
                Integer eventIdInt = call.getInt("eventId");
                if (eventIdInt != null) event.setId(eventIdInt.longValue());
            }

            event.setTitle(call.getString("title", ""));
            event.setDescription(call.getString("description", ""));

            // ── anchorAdDate (required) ───────────────────────────────────
            String anchorAdDateStr = call.getString("anchorAdDate");
            if (anchorAdDateStr == null) {
                call.reject("Missing required parameter: anchorAdDate");
                return;
            }
            event.setAnchorAdDate(LocalDate.parse(anchorAdDateStr));

            // ── anchorBsDate ──────────────────────────────────────────────
            JSObject bsDateObj = call.getObject("anchorBsDate");
            if (bsDateObj != null) {
                event.setAnchorBsDate(new BsDate(
                    bsDateObj.has("year")  ? bsDateObj.getInt("year")  : 0,
                    bsDateObj.has("month") ? bsDateObj.getInt("month") : 0,
                    bsDateObj.has("day")   ? bsDateObj.getInt("day")   : 0
                ));
            }

            // ── anchorLunarDate (required only for TITHI reminders) ───────
            // We use TithiInfo.fromStored() so we do NOT need to call Panchang
            // just to build the anchor object; the TithiOccurrenceService will
            // call panchang.findDate() internally when it searches future years.
            JSObject lunarObj = call.getObject("anchorLunarDate");
            if (lunarObj != null) {
                try {
                    int    tithiNumber = lunarObj.getInt("tithiNumber");
                    String monthName   = lunarObj.getString("month");
                    boolean adhika     = lunarObj.has("adhika") && lunarObj.getBoolean("adhika");

                    LunarMonth lunarMonth = LunarMonth.valueOf(monthName.toUpperCase());
                    // Build a lightweight TithiInfo using the public fromStored factory.
                    // MonthSystem.PURNIMANT matches the Panchang instance used by
                    // TithiConverter and TithiOccurrenceService.
                    TithiInfo tithiInfo = TithiInfo.fromStored(
                        tithiNumber, lunarMonth, MonthSystem.PURNIMANT, adhika, null
                    );
                    event.setAnchorLunarDate(tithiInfo);
                } catch (Exception ignored) {
                    // anchorLunarDate is optional — skip on parse failure
                }
            }

            // ── Recurrence ────────────────────────────────────────────────
            String recurrenceStr = call.getString("recurrence", "ONCE");
            try {
                event.setRecurrence(Recurrence.valueOf(recurrenceStr.toUpperCase()));
            } catch (IllegalArgumentException e) {
                event.setRecurrence(Recurrence.ONCE);
            }

            // ── EventType ─────────────────────────────────────────────────
            String eventTypeStr = call.getString("eventType", "OTHER");
            try {
                event.setEventType(EventType.valueOf(eventTypeStr.toUpperCase()));
            } catch (IllegalArgumentException e) {
                event.setEventType(EventType.OTHER);
            }

            // ── ReminderCalendars ─────────────────────────────────────────
            Set<ReminderCalendar> reminderCalendars = new HashSet<>();
            JSArray remCalArr = call.getArray("reminderCalendars");
            if (remCalArr != null) {
                for (int i = 0; i < remCalArr.length(); i++) {
                    try {
                        reminderCalendars.add(
                            ReminderCalendar.valueOf(remCalArr.getString(i).toUpperCase())
                        );
                    } catch (Exception ignored) {}
                }
            }
            if (reminderCalendars.isEmpty()) {
                reminderCalendars.add(ReminderCalendar.AD);     // sensible default
            }
            event.setReminderCalendars(reminderCalendars);

            // ── numberOfYears ─────────────────────────────────────────────
            Integer numberOfYears = call.getInt("numberOfYears");
            int n = (numberOfYears != null && numberOfYears > 0) ? numberOfYears : 3;

            // ── Generate & serialize ──────────────────────────────────────
            List<EventOccurrence> occurrences = occurrenceService.generateOccurrences(event, n);

            JSArray occArray = new JSArray();
            for (EventOccurrence occ : occurrences) {
                if (occ == null || occ.occurrenceDate() == null) continue;
                JSObject occObj = new JSObject();
                occObj.put("eventId",          occ.eventId() != null ? occ.eventId() : 0L);
                occObj.put("reminderCalendar", occ.reminderCalendar() != null ? occ.reminderCalendar().name() : "AD");
                occObj.put("occurrenceDate",   occ.occurrenceDate().toString()); // "YYYY-MM-DD"
                occArray.put(occObj);
            }

            JSObject response = new JSObject();
            response.put("occurrences", occArray);
            call.resolve(response);

        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Private serialisation helpers
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Converts a {@link CalendarDate} model object into the flat JS-friendly
     * shape consumed by the React calendar-grid components.
     *
     * <pre>
     * {
     *   adDate:      "YYYY-MM-DD",
     *   adYear:      number,
     *   adMonth:     number,
     *   adDay:       number,
     *   bsYear:      number,
     *   bsMonth:     number,
     *   bsDay:       number,
     *   bsMonthName: string,          // e.g. "Kartik"
     *   tithi: {
     *     tithiNumber:   number,      // absolute 1–30
     *     tithiInPaksha: number,      // 1–15
     *     tithiName:     string,      // e.g. "Tritiya"
     *     paksha:        "SHUKLA"|"KRISHNA",
     *     month:         string,      // LunarMonth enum name  e.g. "KARTIKA"
     *     monthDisplay:  string,      // human name            e.g. "Kartika"
     *     adhika:        boolean,
     *     fullText:      string       // e.g. "Kartika Shukla Tritiya"
     *   }
     * }
     * </pre>
     */
    private JSObject calendarDateToJSObject(CalendarDate cd) throws Exception {
        JSObject obj = new JSObject();

        // AD part
        obj.put("adDate",  cd.adDate().toString());
        obj.put("adYear",  cd.adDate().getYear());
        obj.put("adMonth", cd.adDate().getMonthValue());
        obj.put("adDay",   cd.adDate().getDayOfMonth());

        // BS part
        obj.put("bsYear",      cd.bsDate().year());
        obj.put("bsMonth",     cd.bsDate().month());
        obj.put("bsDay",       cd.bsDate().day());
        obj.put("bsMonthName", cd.bsDate().getMonthName());

        // Tithi part
        if (cd.tithiInfo() != null) {
            obj.put("tithi", tithiInfoToJSObject(cd.tithiInfo()));
        }

        return obj;
    }

    /**
     * Converts a {@link TithiInfo} (from the misrilibrary panchang engine) into
     * a flat JS-friendly object.
     *
     * <p>Field mapping:
     * <pre>
     * tithiNumber   ← TithiInfo.getTithiNumber()       (absolute 1–30)
     * tithiInPaksha ← TithiInfo.getTithiInPaksha()     (1–15)
     * tithiName     ← TithiInfo.getTithiName()         e.g. "Tritiya"
     * paksha        ← TithiInfo.getPaksha().name()     "SHUKLA"|"KRISHNA"
     * month         ← TithiInfo.getMonth().name()      "KARTIKA" etc.
     * monthDisplay  ← TithiInfo.getMonth().getDisplayName()  "Kartika"
     * adhika        ← TithiInfo.isAdhika()
     * fullText      ← TithiInfo.getDisplayName()       "Kartika Shukla Tritiya"
     * </pre>
     */
    private JSObject tithiInfoToJSObject(TithiInfo info) throws Exception {
        JSObject obj = new JSObject();
        obj.put("tithiNumber",   info.getTithiNumber());
        obj.put("tithiInPaksha", info.getTithiInPaksha());
        obj.put("tithiName",     info.getTithiName());
        obj.put("paksha",        info.getPaksha().name());
        obj.put("month",         info.getMonth().name());
        obj.put("monthDisplay",  info.getMonth().getDisplayName());
        obj.put("adhika",        info.isAdhika());
        obj.put("fullText",      info.getDisplayName());
        return obj;
    }
}
