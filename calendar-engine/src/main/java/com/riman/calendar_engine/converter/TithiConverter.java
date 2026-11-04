package com.riman.calendar_engine.converter;

import com.misrilibrary.tithi.*;
import com.misrilibrary.tithi.model.*;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.riman.calendar_engine.model.BsDate;

public class TithiConverter {
    private final Panchang panchang = new Panchang(MonthSystem.PURNIMANT);
    private City currentCity = City.KATHMANDU;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

    public TithiConverter() {
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

    public static ZoneOffset getOffsetForCity(City city) {
        if (city == null) return ZoneOffset.ofHoursMinutes(5, 45);
        try {
            java.lang.reflect.Method m = City.class.getDeclaredMethod("getLocation", String.class);
            m.setAccessible(true);
            Object loc = m.invoke(null, city.name());
            if (loc != null) {
                java.lang.reflect.Method offsetMethod = loc.getClass().getDeclaredMethod("getUtcOffset");
                offsetMethod.setAccessible(true);
                double utcOffset = (Double) offsetMethod.invoke(loc);
                int totalMinutes = (int) Math.round(utcOffset * 60);
                return ZoneOffset.ofTotalSeconds(totalMinutes * 60);
            }
        } catch (Exception ignored) {
        }
        return ZoneOffset.ofHoursMinutes(5, 45);
    }

    /**
     * Function requested by user to get tithi timing summary like:
     * "Ashtami till 11:00 PM, then Navami" for a particular date.
     */
    public String TithiSegmets(LocalDate date) {
        return TithiSegmets(date, this.currentCity);
    }

    public String TithiSegmets(LocalDate date, City city) {
        if (date == null) return "";
        if (city == null) city = this.currentCity;
        ZoneOffset offset = getOffsetForCity(city);

        Instant startUtc = date.atStartOfDay(offset).toInstant();
        Instant endUtc = date.plusDays(1).atStartOfDay(offset).toInstant();

        List<TithiSegment> segments = panchang.tithiSegments(startUtc, endUtc, city, offset);
        if (segments == null || segments.isEmpty()) {
            TithiInfo sunriseTithi = panchang.tithiOnDate(date, city);
            return sunriseTithi != null ? sunriseTithi.getTithiName() : "";
        }

        Instant sunriseInstant = panchang.sunrise(date, city);
        TithiSegment primarySegment = null;

        if (sunriseInstant != null) {
            for (TithiSegment seg : segments) {
                if (!seg.getStartUtc().isAfter(sunriseInstant) && seg.getEndUtc().isAfter(sunriseInstant)) {
                    primarySegment = seg;
                    break;
                }
            }
        }

        if (primarySegment == null) {
            primarySegment = segments.get(0);
        }

        int idx = segments.indexOf(primarySegment);
        if (primarySegment.isEndTransition() && idx + 1 < segments.size()) {
            ZonedDateTime endLocal = primarySegment.getEndUtc().atZone(offset);
            TithiSegment nextSegment = segments.get(idx + 1);
            String currentName = primarySegment.getTithi().getTithiName();
            String nextName = nextSegment.getTithi().getTithiName();
            String timeStr = endLocal.format(TIME_FMT);
            return currentName + " till " + timeStr + ", then " + nextName;
        } else {
            return primarySegment.getTithi().getTithiName() + " whole day";
        }
    }

    public String TithiSegmets(int year, int month, int day) {
        return TithiSegmets(LocalDate.of(year, month, day), this.currentCity);
    }

    public String tithiSegments(LocalDate date) {
        return TithiSegmets(date);
    }

    public String tithiSegments(int year, int month, int day) {
        return TithiSegmets(LocalDate.of(year, month, day));
    }

    public TithiInfo adIntoTithi(int year, int month, int day) {
        return adIntoTithi(year, month, day, this.currentCity);
    }

    public TithiInfo adIntoTithi(int year, int month, int day, City city) {
        if (city == null) city = this.currentCity;
        return panchang.tithiOnDate(LocalDate.of(year, month, day), city);
    }

    public TithiInfo bsIntoTithi(BsDate bsDate) throws IOException {
        return bsIntoTithi(bsDate, this.currentCity);
    }

    public TithiInfo bsIntoTithi(BsDate bsDate, City city) throws IOException {
        if (city == null) city = this.currentCity;
        LocalDate adDate = new BsAdConverter().bsToAd(bsDate.year(), bsDate.month(), bsDate.day());
        return panchang.tithiOnDate(adDate, city);
    }

    public LocalDate tithiIntoAd(int year, LunarMonth month, Tithi tithi) {
        return tithiIntoAd(year, month, tithi, this.currentCity);
    }

    public LocalDate tithiIntoAd(int year, LunarMonth month, Tithi tithi, City city) {
        if (city == null) city = this.currentCity;
        return panchang.findDate(month, tithi, year, city);
    }

    public LocalDate findAdFromTithi(int year, LunarMonth month, Tithi tithi) {
        return tithiIntoAd(year, month, tithi, this.currentCity);
    }
}
