package com.riman;

import com.misrilibrary.tithi.City;
import com.misrilibrary.tithi.model.MonthSystem;
import com.misrilibrary.tithi.Panchang;
import com.misrilibrary.tithi.model.TithiInfo;
import com.misrilibrary.tithi.model.TithiSegment;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class EngineTest {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

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

    public static String TithiSegmets(Panchang panchang, LocalDate date, City city) {
        if (date == null) return "";
        if (city == null) city = City.KATHMANDU;
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

    public static void main(String[] args) {
        Panchang panchang = new Panchang(MonthSystem.PURNIMANT);
        City ktm = City.KATHMANDU;
        City delhi = City.DELHI;
        City london = City.LONDON;

        System.out.println("Kathmandu offset: " + getOffsetForCity(ktm));
        System.out.println("Delhi offset: " + getOffsetForCity(delhi));
        System.out.println("London offset: " + getOffsetForCity(london));

        System.out.println("KTM 2026-01-01: " + TithiSegmets(panchang, LocalDate.of(2026, 1, 1), ktm));
        System.out.println("Delhi 2026-01-01: " + TithiSegmets(panchang, LocalDate.of(2026, 1, 1), delhi));
        System.out.println("London 2026-01-01: " + TithiSegmets(panchang, LocalDate.of(2026, 1, 1), london));
    }
}





