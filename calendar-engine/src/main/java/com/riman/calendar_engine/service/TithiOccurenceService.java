package com.riman.calendar_engine.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import com.misrilibrary.tithi.*;
import com.misrilibrary.tithi.model.*;
import com.riman.calendar_engine.converter.TithiConverter;

public class TithiOccurenceService {

    private final Panchang panchang = new Panchang(MonthSystem.PURNIMANT);
    private City currentCity = City.KATHMANDU;

    LocalDate today = LocalDate.now();

    public TithiOccurenceService() {
    }

    public void setCity(City city) {
        if (city != null) {
            this.currentCity = city;
        }
    }

    public void setCity(String cityName) {
        City c = City.tryOf(cityName);
        if (c != null) {
            this.currentCity = c;
        }
    }

    public City getCity() {
        return currentCity;
    }

    public List<LocalDate> findYearlyTithiDates(int year, LunarMonth month, Tithi tithi, int numberOfYears) {
        int currentYear = today.getYear();
        List<LocalDate> tithiDatesInAD = new ArrayList<>();

        for (int n = 0; n < numberOfYears; n++) {
            int targetYear = currentYear + n;
            LocalDate date = panchang.findDate(month, tithi, targetYear, this.currentCity);
            if (date == null) {
                date = fallbackFindDate(month, tithi.paksha(), tithi.dayInPaksha(), targetYear);
            }
            if (date != null) {
                tithiDatesInAD.add(date);
            }
        }

        return tithiDatesInAD;
    }

    public List<LocalDate> findYearlyTithiDates(TithiInfo tithiInfo, int anchorYear, int numberOfYears) {
        List<LocalDate> tithiDatesInAD = new ArrayList<>();

        if (tithiInfo == null) {
            return tithiDatesInAD;
        }

        Tithi tithi;
        if (tithiInfo.getPaksha() == Paksha.SHUKLA) {
            tithi = Tithi.shukla(tithiInfo.getTithiInPaksha());
        } else {
            tithi = Tithi.krishna(tithiInfo.getTithiInPaksha());
        }

        for (int n = 0; n < numberOfYears; n++) {
            int targetYear = anchorYear + n;
            LocalDate date = panchang.findDate(tithiInfo.getMonth(), tithi, targetYear, this.currentCity);
            if (date == null) {
                date = fallbackFindDate(tithiInfo.getMonth(), tithiInfo.getPaksha(), tithiInfo.getTithiInPaksha(), targetYear);
            }
            if (date != null) {
                tithiDatesInAD.add(date);
            }
        }

        return tithiDatesInAD;
    }

    /**
     * Fallback finder when a tithi is skipped at sunrise (kshaya tithi) or not detected by findDate.
     * Searches tithi segments around the target year to find the civil date where the tithi prevailed.
     */
    private LocalDate fallbackFindDate(LunarMonth month, Paksha paksha, int tithiInPaksha, int year) {
        try {
            ZoneOffset offset = TithiConverter.getOffsetForCity(this.currentCity);
            Instant start = LocalDate.of(year - 1, 11, 1).atStartOfDay(offset).toInstant();
            Instant end = LocalDate.of(year + 1, 2, 28).atStartOfDay(offset).toInstant();

            List<TithiSegment> segments = panchang.tithiSegments(start, end, this.currentCity, offset);
            for (TithiSegment seg : segments) {
                TithiInfo info = seg.getTithi();
                if (info != null && info.getMonth() == month && info.getPaksha() == paksha && info.getTithiInPaksha() == tithiInPaksha) {
                    ZonedDateTime segStart = seg.getStartUtc().atZone(offset);
                    ZonedDateTime segEnd = seg.getEndUtc().atZone(offset);

                    LocalDate startDate = segStart.toLocalDate();
                    LocalDate endDate = segEnd.toLocalDate();

                    if (startDate.equals(endDate)) {
                        return startDate;
                    }

                    // Choose day with larger daytime overlap (06:00 - 18:00)
                    long day1Sec = getDaytimeOverlap(segStart, segEnd, startDate, offset);
                    long day2Sec = getDaytimeOverlap(segStart, segEnd, endDate, offset);

                    return (day2Sec > day1Sec) ? endDate : startDate;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private long getDaytimeOverlap(ZonedDateTime start, ZonedDateTime end, LocalDate date, ZoneOffset offset) {
        ZonedDateTime dayStart = date.atTime(6, 0).atZone(offset);
        ZonedDateTime dayEnd = date.atTime(18, 0).atZone(offset);
        ZonedDateTime overlapStart = start.isAfter(dayStart) ? start : dayStart;
        ZonedDateTime overlapEnd = end.isBefore(dayEnd) ? end : dayEnd;
        long duration = Duration.between(overlapStart, overlapEnd).getSeconds();
        return Math.max(0, duration);
    }
}
