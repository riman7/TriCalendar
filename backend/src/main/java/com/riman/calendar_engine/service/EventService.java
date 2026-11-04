package com.riman.calendar_engine.service;

import com.riman.calendar_engine.model.*;

import java.io.IOException;
import java.time.LocalDate; 
import java.util.List;

import java.util.Set;



public class EventService {
    private final CalendarService calendarService;
    private final OccurrenceService occurrenceService;

    public EventService() throws IOException {
        this.calendarService = new CalendarService();
        this.occurrenceService = new OccurrenceService();
    }

    public CreatedEvent createEvent(String title, String description, LocalDate anchorAdDate, Recurrence recurrence, EventType eventType, Set<ReminderCalendar> reminderCalendars) throws IOException {
        // Implementation for creating an event
        CalendarEvent event = new CalendarEvent();
        event.setTitle(title);
        event.setDescription(description);
        event.setAnchorAdDate(anchorAdDate);

        CalendarDate calendarDate = calendarService.getCalendarDate(anchorAdDate);
        
        event.setAnchorBsDate(calendarDate.bsDate());
        event.setAnchorLunarDate(calendarDate.tithiInfo());

        event.setRecurrence(recurrence);
        event.setEventType(eventType);
        event.setReminderCalendars(reminderCalendars);

        event.setCreatedAt(java.time.LocalDateTime.now());

        List<EventOccurrence> occurrences = occurrenceService.generateOccurrences(event, 5); // Generate occurrences for the next 5 years

        return new CreatedEvent(event, occurrences);

    }

    public static void main(String[] args) throws IOException {
        EventService eventService = new EventService();
        CreatedEvent createdEvent = eventService.createEvent(
            "Riman's Birthday",
            "hahahah.",
            LocalDate.of(2004, 11, 18),
            Recurrence.YEARLY,
            EventType.BIRTHDAY,
            Set.of(ReminderCalendar.AD, ReminderCalendar.BS, ReminderCalendar.TITHI)
        );
        System.out.println("Event Created: " + createdEvent.event());

        System.out.println("Event Created: " + createdEvent.event().getTitle());
        System.out.println("Occurrences:");
        for (EventOccurrence occurrence : createdEvent.occurrences()) {
            System.out.println(occurrence );
        }
    }
}
