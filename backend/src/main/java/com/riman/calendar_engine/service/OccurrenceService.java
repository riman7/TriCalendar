package com.riman.calendar_engine.service;

import com.misrilibrary.tithi.model.TithiInfo;

import com.riman.calendar_engine.model.BsDate;
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

    public List<EventOccurrence> getAdOccurrences(CalendarEvent event, int n) {
        List<EventOccurrence> adOccurrences = new ArrayList<>();

        LocalDate anchorAdDate = event.getAnchorAdDate();

        for(int i = 0; i < n; i++) {

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


        for(int i = 0; i < n; i++) {

            int year = anchorBsDate.year() + i;
            int month = anchorBsDate.month();
            int day = anchorBsDate.day();

            // Find the maximum number of days in this BS month
            int maxDays = calendarService.getBsMonthDays(year, month);

            // Use the original day, unless it exceeds the month's length
            int validDay = Math.min(day, maxDays);

            BsDate occurrenceBsDate = new BsDate(year, month, validDay);


            LocalDate occurrenceAdDate = calendarService.getCalendarDate(occurrenceBsDate).adDate();

            EventOccurrence occurrence = new EventOccurrence(
                    event.getId(),
                    ReminderCalendar.BS,
                    occurrenceAdDate
                );
                
            bsOccurrences.add(occurrence);

        }

        return bsOccurrences;
    }

    public List<EventOccurrence> getLunarOccurrences(CalendarEvent event, int n) {
        List<EventOccurrence> lunarOccurrences = new ArrayList<>();

        TithiInfo anchorLunarDate = event.getAnchorLunarDate();

        LocalDate anchorAdDate = event.getAnchorAdDate();

        List<LocalDate> lunarDates = tithiOccurenceService.findYearlyTithiDates(anchorLunarDate, anchorAdDate.getYear(), n);
        
        for (LocalDate occurrenceDate : lunarDates) {
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
            mainOccurrences.add(new EventOccurrence(
                event.getId(),
                ReminderCalendar.AD,
                event.getAnchorAdDate()
            ));
            return mainOccurrences;
        } 

        Set<ReminderCalendar> calendars = event.getReminderCalendars();


        int currYear = LocalDate.now().getYear();
        int n = numberOfYears;

        


        if(event.getAnchorAdDate().isBefore(LocalDate.now()) && event.getRecurrence() == Recurrence.YEARLY) {
            n = currYear - event.getAnchorAdDate().getYear() + numberOfYears ;
        }

        if (calendars.contains(ReminderCalendar.AD)) {
            mainOccurrences.addAll(getAdOccurrences(event, n));
        }

        if(calendars.contains(ReminderCalendar.BS)) {
            mainOccurrences.addAll(getBsOccurrences(event, n));
        }

        if(calendars.contains(ReminderCalendar.TITHI)) {
            mainOccurrences.addAll(getLunarOccurrences(event, n));
        }
        


        mainOccurrences.sort(
            (a, b) -> a.occurrenceDate().compareTo(b.occurrenceDate())
        );



        return mainOccurrences;
    }
    
}
