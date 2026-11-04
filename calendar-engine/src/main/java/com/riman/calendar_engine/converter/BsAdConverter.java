package com.riman.calendar_engine.converter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.TreeMap;

import com.riman.calendar_engine.data.CsvDataLoader;
import com.riman.calendar_engine.model.BsCalendarData;
import com.riman.calendar_engine.model.BsDate;

public class BsAdConverter {

    private final TreeMap<Integer, BsCalendarData> calendar;

    // Constructor
    public BsAdConverter() throws IOException {
        calendar = CsvDataLoader.load();
    }

    //System.out.println("Calendar data loaded!");

    //private final TreeMap<Integer, CalendarData> calendar = new TreeMap<>();

    public void addYear(BsCalendarData data) {
        calendar.put(data.year(), data);
    }
    
    public LocalDate bsToAd(int year, int month, int day){
        BsCalendarData data = calendar.get(year);

        if (data == null)
            throw new IllegalArgumentException("Unsupported BS year");

        if (month < 1 || month > 12)
            throw new IllegalArgumentException("Invalid month");

        if (day < 1 || day > data.monthDays()[month - 1])
            throw new IllegalArgumentException("Invalid day");

        int elapsedDays = day - 1;

        for (int i = 0; i < month - 1; i++) {
            elapsedDays += data.monthDays()[i];
        }

        return data.newYearAD().plusDays(elapsedDays);
    }

    // AD -> BS
    public BsDate adToBs(LocalDate adDate) {

        BsCalendarData selected = null;

        for (BsCalendarData data : calendar.values()) {


            if (!data.newYearAD().isAfter(adDate)) {
                selected = data;
            } else {
                break;
            }
        }

        if (selected == null)
            throw new IllegalArgumentException("Date out of range");

        long remainingDays = ChronoUnit.DAYS.between(
            selected.newYearAD(), adDate
        );

        int month = 1;

        for (int days : selected.monthDays()) {

            if (remainingDays < days) {
                break;
            }

            remainingDays -= days;
            month++;
        }

        if (month > 12)
            throw new IllegalArgumentException("Date out of range");

        int day = (int) remainingDays + 1;
        BsDate bsDate = new BsDate(selected.year(), month, day);

        return bsDate;
    }

    public int getTotalDaysInYearMonth(int year, int month) throws IOException {
        BsCalendarData data = calendar.get(year);
        if (data == null) {
            throw new IllegalArgumentException("Unsupported BS year");
        }
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Invalid month");
        }
        return data.monthDays()[month - 1];
    }


}
