package com.riman.calendar_engine.model;
import java.time.LocalDate;

// This stores each year in BS's corresponding AD New Year date and number of days in each 12 months  

public record BsCalendarData (
    int year,
    LocalDate newYearAD,
    int[] monthDays
){}
