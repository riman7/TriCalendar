package com.riman.calendar_engine.service;

import com.misrilibrary.tithi.model.TithiInfo;

import com.riman.calendar_engine.model.BsDate;
import com.riman.calendar_engine.model.CalendarDate;
import com.riman.calendar_engine.model.CalendarEvent;
import com.riman.calendar_engine.model.EventOccurrence;
import com.riman.calendar_engine.model.Recurrence;
import com.riman.calendar_engine.model.ReminderCalendar;


import java.io.IOException;
import java.time.LocalDate;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class OccurrenceService {

    private final CalendarService calendarService;
    private final TithiOccurenceService tithiOccurenceService;

    public OccurrenceService() throws IOException {
        this.calendarService = new CalendarService();
        this.tithiOccurenceService = new TithiOccurenceService();
    }

    public void setCity(String cityName) {
        this.tithiOccurenceService.setCity(cityName);
        this.calendarService.setCity(cityName);
    }

    public List<EventOccurrence> getAdOccurrences(CalendarEvent event, int n) {
        List<EventOccurrence> adOccurrences = new ArrayList<>();

        LocalDate anchorAdDate = event.getAnchorAdDate();
        if (anchorAdDate == null) {
            return adOccurrences;
        }

        for (int i = 0; i < n; i++) {
            LocalDate occurrenceDate = anchorAdDate.plusYears(i);
            EventOccurrence occurrence = new EventOccurrence(
                    event.getId(),
                    ReminderCalendar.AD,
                    occurrenceDate
            );
            adOccurrences.add(occurrence);
        }

        return adOccurrences;
    }

    public List<EventOccurrence> getBsOccurrences(CalendarEvent event, int n) throws IOException {
        List<EventOccurrence> bsOccurrences = new ArrayList<>();

        BsDate anchorBsDate = event.getAnchorBsDate();
        if (anchorBsDate == null) {
            return bsOccurrences;
        }

        for (int i = 0; i < n; i++) {
            int year = anchorBsDate.year() + i;
            int month = anchorBsDate.month();
            int day = anchorBsDate.day();

            try {
                // Find the maximum number of days in this BS month
                int maxDays = calendarService.getBsMonthDays(year, month);

                // Use the original day, unless it exceeds the month's length
                int validDay = Math.min(day, maxDays);

                BsDate occurrenceBsDate = new BsDate(year, month, validDay);

                CalendarDate cd = calendarService.getCalendarDate(occurrenceBsDate);
                if (cd != null && cd.adDate() != null) {
                    EventOccurrence occurrence = new EventOccurrence(
                            event.getId(),
                            ReminderCalendar.BS,
                            cd.adDate()
                    );
                    bsOccurrences.add(occurrence);
                }
            } catch (Exception e) {
                // Stop if year exceeds supported range (e.g. beyond 2100 BS)
                break;
            }
        }

        return bsOccurrences;
    }

    public List<EventOccurrence> getLunarOccurrences(CalendarEvent event, int n) {
        List<EventOccurrence> lunarOccurrences = new ArrayList<>();

        TithiInfo anchorLunarDate = event.getAnchorLunarDate();
        LocalDate anchorAdDate = event.getAnchorAdDate();

        if (anchorLunarDate == null || anchorAdDate == null) {
            return lunarOccurrences;
        }

        List<LocalDate> lunarDates = tithiOccurenceService.findYearlyTithiDates(anchorLunarDate, anchorAdDate.getYear(), n);
        
        for (LocalDate occurrenceDate : lunarDates) {
            if (occurrenceDate == null) {
                continue;
            }
            EventOccurrence occurrence = new EventOccurrence(
                    event.getId(),
                    ReminderCalendar.TITHI,
                    occurrenceDate
            );
            lunarOccurrences.add(occurrence);
        }

        return lunarOccurrences;
    }

    public List<EventOccurrence> generateOccurrences(CalendarEvent event, int numberOfYears) throws IOException {
        List<EventOccurrence> mainOccurrences = new ArrayList<>();

        if (event.getRecurrence() == Recurrence.ONCE) {
            if (event.getAnchorAdDate() != null) {
                mainOccurrences.add(new EventOccurrence(
                    event.getId(),
                    ReminderCalendar.AD,
                    event.getAnchorAdDate()
                ));
            }
            return mainOccurrences;
        } 

        Set<ReminderCalendar> calendars = event.getReminderCalendars();

        LocalDate today = LocalDate.now();
        int n = numberOfYears;

        if (event.getAnchorAdDate() != null && event.getRecurrence() == Recurrence.YEARLY) {
            LocalDate anchor = event.getAnchorAdDate();
            int yearsPassed = Math.max(0, today.getYear() - anchor.getYear());
            // If this year's anniversary has already passed today, advance by one more year
            // so that we maintain at least numberOfYears upcoming occurrences in the future
            if (anchor.plusYears(yearsPassed).isBefore(today)) {
                yearsPassed++;
            }
            n = yearsPassed + numberOfYears;
        }

        if (calendars != null && calendars.contains(ReminderCalendar.AD)) {
            mainOccurrences.addAll(getAdOccurrences(event, n));
        }

        if (calendars != null && calendars.contains(ReminderCalendar.BS)) {
            mainOccurrences.addAll(getBsOccurrences(event, n));
        }

        if (calendars != null && calendars.contains(ReminderCalendar.TITHI)) {
            mainOccurrences.addAll(getLunarOccurrences(event, n));
        }

        // Filter out any potential null occurrence dates before sorting
        mainOccurrences.removeIf(o -> o == null || o.occurrenceDate() == null);

        mainOccurrences.sort((a, b) -> {
            if (a.occurrenceDate() == null && b.occurrenceDate() == null) return 0;
            if (a.occurrenceDate() == null) return 1;
            if (b.occurrenceDate() == null) return -1;
            return a.occurrenceDate().compareTo(b.occurrenceDate());
        });

        return mainOccurrences;
    }
}
