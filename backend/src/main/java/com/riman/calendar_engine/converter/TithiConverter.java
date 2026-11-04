package com.riman.calendar_engine.converter;

import com.misrilibrary.tithi.*;
import com.misrilibrary.tithi.model.*;

import java.io.IOException;
import java.time.LocalDate;

import com.riman.calendar_engine.model.BsDate;

public class TithiConverter {
    Panchang panchang = new Panchang(MonthSystem.PURNIMANT);

    public TithiInfo adIntoTithi(int year, int month, int day) {
        // Date → Tithi (sunrise tithi of the panchang day; for display/observance)
        TithiInfo info = panchang.tithiOnDate(LocalDate.of(year, month, day), City.KATHMANDU);
        System.out.println(info); // "Phalguna Krishna Trayodashi"
        return info;
    }

    public TithiInfo bsIntoTithi(BsDate bsDate) throws IOException {
        // Date → Tithi (sunrise tithi of the panchang day; for display/observance)
        LocalDate adDate = new BsAdConverter().bsToAd(bsDate.year(), bsDate.month(), bsDate.day());
        TithiInfo info = panchang.tithiOnDate(adDate, City.KATHMANDU);
        // System.out.println(info); // "Phalguna Krishna Trayodashi"
        return info;
    }

    public void tithiIntoAd(int year, LunarMonth month, Tithi tithi) {
        // Tithi → Date
        // LocalDate date = panchang.findDate(LunarMonth.BHADRAPADA, Tithi.krishna(8), 2026, City.KATHMANDU);
        LocalDate date = panchang.findDate(month, tithi, year, City.KATHMANDU);
        System.out.println("Janmashtami 2026 KATHMANDU: " + date);
    }

    public void findAdFromTithi(int year, LunarMonth month, Tithi tithi) {
        LocalDate date = panchang.findDate(month, tithi, year, City.KATHMANDU);
        System.out.println("Janmashtami 2026 KATHMANDU: " + date);
    }

    public static void main(String[] args) {
        TithiConverter converter = new TithiConverter();
        converter.adIntoTithi(2006, 1, 29);

        //the 15th is Purnima in shukla, Amavasya in krishna
        // converter.tithiIntoAd(2006, LunarMonth.MAGHA, Tithi.krishna(15));

        // converter.findAdFromTithi(2028, LunarMonth.MAGHA, Tithi.krishna(15));
        
    }
}
