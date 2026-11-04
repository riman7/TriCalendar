package com.riman.calendar_engine.model;

public record BsDate(
    int year,
    int month,
    int day
) {
    public String getMonthName() {
    return switch (month) {
        case 1 -> "Baisakh";
        case 2 -> "Jestha";
        case 3 -> "Ashadh";
        case 4 -> "Shrawan";
        case 5 -> "Bhadra";
        case 6 -> "Ashwin";
        case 7 -> "Kartik";
        case 8 -> "Mangsir";
        case 9 -> "Poush";
        case 10 -> "Magh";
        case 11 -> "Falgun";
        case 12 -> "Chaitra";
        default -> throw new IllegalArgumentException("Invalid BS month");
    };
}    
}
