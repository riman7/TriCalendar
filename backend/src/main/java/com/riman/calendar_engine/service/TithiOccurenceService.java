package com.riman.calendar_engine.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.misrilibrary.tithi.*;
import com.misrilibrary.tithi.model.*;

public class TithiOccurenceService {

    Panchang panchang = new Panchang(MonthSystem.PURNIMANT);

    LocalDate today = LocalDate.now();

    public List<LocalDate> findYearlyTithiDates(int year, LunarMonth month, Tithi tithi, int numberOfYears) {
        // Implementation for finding yearly tithi dates

        int currentYear = today.getYear();

        List<LocalDate> tithiDatesInAD = new ArrayList<>();
        //Example: 2006, LunarMonth.MAGHA, Tithi.krishna(15)



        for (int n = 0; n < numberOfYears; n++) {
            LocalDate date = panchang.findDate(month, tithi, currentYear + n, City.KATHMANDU);
            tithiDatesInAD.add(date);
        }

        return tithiDatesInAD;
    }

    public List<LocalDate> findYearlyTithiDates(TithiInfo tithiInfo, int anchorYear,  int numberOfYears) {
        // Implementation for finding yearly tithi dates

        List<LocalDate> tithiDatesInAD = new ArrayList<>();
        //Example: 2006, LunarMonth.MAGHA, Tithi.krishna(15)

        Tithi tithi;
        if (tithiInfo.getPaksha() == Paksha.SHUKLA) {
            tithi = Tithi.shukla(tithiInfo.getTithiInPaksha());
        } else {
            tithi = Tithi.krishna(tithiInfo.getTithiInPaksha());
        }

        for (int n = 0; n < numberOfYears; n++) { 
            LocalDate date = panchang.findDate(tithiInfo.getMonth(), tithi, anchorYear + n, City.KATHMANDU);
            tithiDatesInAD.add(date);
        }

        System.out.println(tithiDatesInAD);
        return tithiDatesInAD;
    }

//     public static void main(String[] args) {
//         TithiOccurenceService service = new TithiOccurenceService();
//         // service.findYearlyTithiDates(2006, LunarMonth.MAGHA, Tithi.krishna(15), 10);
//         // service.findYearlyTithiDates(2026, LunarMonth.JYESHTHA, Tithi.shukla(11), 10);
//         service.findYearlyTithiDates(2024, LunarMonth.KARTIKA, Tithi.shukla(7), 10);
//     }


}
