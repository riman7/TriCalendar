package com.riman.calendar_engine.service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import com.riman.calendar_engine.converter.*;
import com.riman.calendar_engine.model.BsDate;
import com.riman.calendar_engine.model.CalendarDate;


public class CalendarService {

    private final BsAdConverter bsAdConverter;
    private final TithiConverter tithiConverter;

    public CalendarService() throws IOException {
        this.bsAdConverter = new BsAdConverter();
        this.tithiConverter = new TithiConverter();
    }

    //From AD
    public CalendarDate getCalendarDate(int year, int month, int day) throws IOException {
        
        CalendarDate calendarDate = new CalendarDate(
            LocalDate.of(year, month, day),
            bsAdConverter.adToBs(LocalDate.of(year, month, day)),
            tithiConverter.adIntoTithi(year, month, day)
        );
        return calendarDate;
    }
    public CalendarDate getCalendarDate(LocalDate adDate) throws IOException {
        
        CalendarDate calendarDate = new CalendarDate(
            adDate,
            bsAdConverter.adToBs(adDate),
            tithiConverter.adIntoTithi(adDate.getYear(), adDate.getMonthValue(), adDate.getDayOfMonth())
        );
        return calendarDate;
    }
    //From BS
    public CalendarDate getCalendarDate(BsDate bsDate) throws IOException {
        
        CalendarDate calendarDate = new CalendarDate(
            bsAdConverter.bsToAd(bsDate.year(), bsDate.month(), bsDate.day()),
            bsDate,
            tithiConverter.bsIntoTithi(bsDate)
        );

        return calendarDate;
    }

    public List<CalendarDate> getMonthAd(int year, int month) throws IOException {

        List<CalendarDate> dates = new ArrayList<>();
        YearMonth yearMonth = YearMonth.of(year, month);

         for (int day = 1; day <= yearMonth.lengthOfMonth(); day++) {

            LocalDate adDate = yearMonth.atDay(day);

            CalendarDate calendarDate = new CalendarDate(adDate, bsAdConverter.adToBs(adDate), tithiConverter.adIntoTithi(year, month, day));

            dates.add(calendarDate);
        }

        return dates;

    }


    public List<CalendarDate> getMonthBs(int year, int month) throws IOException {

        List<CalendarDate> dates = new ArrayList<>();
        BsAdConverter bsAdConverter = new BsAdConverter();
        TithiConverter tithiConverter = new TithiConverter();
        int totalDaysInMonth = bsAdConverter.getTotalDaysInYearMonth(year, month);

        for (int day = 1; day <= totalDaysInMonth; day++) {

            BsDate bsDate = new BsDate(year, month, day);
            LocalDate adDate = bsAdConverter.bsToAd(year, month, day);

            CalendarDate calendarDate = new CalendarDate(adDate, bsDate, tithiConverter.bsIntoTithi(bsDate));

            dates.add(calendarDate);
        }
        return dates;

    }

    public int getBsMonthDays(int year, int month) throws IOException {
        return bsAdConverter.getTotalDaysInYearMonth(year, month);
    }


    public static void main(String[] args) throws IOException {
        CalendarService service = new CalendarService();
        System.out.println(service.getMonthBs(2072, 7));
    }

}
