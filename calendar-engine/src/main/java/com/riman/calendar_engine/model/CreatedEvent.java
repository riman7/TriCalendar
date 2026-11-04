package com.riman.calendar_engine.model;

import java.util.List;

public record CreatedEvent(
    CalendarEvent event,
    List<EventOccurrence> occurrences
) {}