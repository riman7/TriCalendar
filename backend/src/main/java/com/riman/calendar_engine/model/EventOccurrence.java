package com.riman.calendar_engine.model;

import java.time.LocalDate;

public record EventOccurrence(
    Long eventId,
    ReminderCalendar reminderCalendar,
    LocalDate occurrenceDate
) {}