package com.riman.calendar_engine.model;

import com.misrilibrary.tithi.model.LunarMonth;
import com.misrilibrary.tithi.model.Paksha;

public record LunarDate(
    LunarMonth month,
    Paksha paksha,
    int tithi
) {}