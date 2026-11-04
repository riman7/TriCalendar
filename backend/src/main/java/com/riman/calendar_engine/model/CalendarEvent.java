package com.riman.calendar_engine.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import com.misrilibrary.tithi.model.TithiInfo;

public class CalendarEvent {

    private Long id;

    private String title;
    private String description;

    // Canonical date, converted to AD
    private LocalDate anchorAdDate;

    // Date representations derived when the event is created
    private BsDate anchorBsDate;
    private TithiInfo anchorLunarDate;

    private Recurrence recurrence;
    private EventType eventType;

    // Which reminders the user wants
    private Set<ReminderCalendar> reminderCalendars;

    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getAnchorAdDate() {
        return anchorAdDate;
    }

    public void setAnchorAdDate(LocalDate anchorAdDate) {
        this.anchorAdDate = anchorAdDate;
    }

    public BsDate getAnchorBsDate() {
        return anchorBsDate;
    }

    public void setAnchorBsDate(BsDate anchorBsDate) {
        this.anchorBsDate = anchorBsDate;
    }

    public TithiInfo getAnchorLunarDate() {
        return anchorLunarDate;
    }

    public void setAnchorLunarDate(TithiInfo anchorLunarDate) {
        this.anchorLunarDate = anchorLunarDate;
    }

    public Recurrence getRecurrence() {
        return recurrence;
    }

    public void setRecurrence(Recurrence recurrence) {
        this.recurrence = recurrence;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public Set<ReminderCalendar> getReminderCalendars() {
        return reminderCalendars;
    }

    public void setReminderCalendars(Set<ReminderCalendar> reminderCalendars) {
        this.reminderCalendars = reminderCalendars;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}