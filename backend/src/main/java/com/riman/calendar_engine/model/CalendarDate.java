package com.riman.calendar_engine.model;

import java.time.LocalDate;

import com.misrilibrary.tithi.model.TithiInfo;

public record CalendarDate(
    LocalDate adDate,
    BsDate bsDate,
    TithiInfo tithiInfo
) {
} 
    
