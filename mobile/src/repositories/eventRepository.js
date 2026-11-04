import { getDatabase } from '../database/database';

// ── Create ────────────────────────────────────────────────────────────────────
export async function createEvent(event) {
    const db = getDatabase();
    const createdAt = new Date().toISOString();
    const id = event.id || crypto.randomUUID();

    await db.run(
        `INSERT INTO events (
            id, title, description, anchor_ad_date, anchor_bs_date,
            anchor_lunar_date, recurrence, event_type, reminder_calendars,
            reminder_timing, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            event.title,
            event.description ?? '',
            event.anchorAdDate,
            JSON.stringify(event.anchorBsDate),
            JSON.stringify(event.anchorLunarDate ?? null),
            event.recurrence,
            event.eventType,
            JSON.stringify(event.reminderCalendars),
            JSON.stringify(event.reminderTiming ?? { type: 'DAY_BEFORE_1155PM' }),
            createdAt
        ]
    );

    return id;
}

// ── Read all ──────────────────────────────────────────────────────────────────
// Returns each event as a clean camelCase object with all JSON fields parsed.
export async function getAllEvents() {
    const db = getDatabase();

    const result = await db.query('SELECT * FROM events ORDER BY anchor_ad_date ASC');

    return (result.values ?? []).map(row => ({
        id:                row.id,
        title:             row.title,
        description:       row.description ?? '',
        anchorAdDate:      row.anchor_ad_date,
        anchorBsDate:      row.anchor_bs_date      ? JSON.parse(row.anchor_bs_date)      : null,
        anchorLunarDate:   row.anchor_lunar_date   ? JSON.parse(row.anchor_lunar_date)   : null,
        recurrence:        row.recurrence,
        eventType:         row.event_type,
        reminderCalendars: row.reminder_calendars  ? JSON.parse(row.reminder_calendars)  : ['AD'],
        reminderTiming:    row.reminder_timing     ? JSON.parse(row.reminder_timing)     : { type: 'DAY_BEFORE_1155PM' },
        createdAt:         row.created_at,
    }));
}

// ── Read one ──────────────────────────────────────────────────────────────────
export async function getEventById(id) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    const row = result.values?.[0];
    if (!row) return null;

    return {
        id:                row.id,
        title:             row.title,
        description:       row.description ?? '',
        anchorAdDate:      row.anchor_ad_date,
        anchorBsDate:      row.anchor_bs_date      ? JSON.parse(row.anchor_bs_date)      : null,
        anchorLunarDate:   row.anchor_lunar_date   ? JSON.parse(row.anchor_lunar_date)   : null,
        recurrence:        row.recurrence,
        eventType:         row.event_type,
        reminderCalendars: row.reminder_calendars  ? JSON.parse(row.reminder_calendars)  : ['AD'],
        reminderTiming:    row.reminder_timing     ? JSON.parse(row.reminder_timing)     : { type: 'DAY_BEFORE_1155PM' },
        createdAt:         row.created_at,
    };
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateEvent(id, event) {
    const db = getDatabase();
    await db.run(
        `UPDATE events SET
            title = ?,
            description = ?,
            anchor_ad_date = ?,
            anchor_bs_date = ?,
            anchor_lunar_date = ?,
            recurrence = ?,
            event_type = ?,
            reminder_calendars = ?,
            reminder_timing = ?
         WHERE id = ?`,
        [
            event.title,
            event.description ?? '',
            event.anchorAdDate,
            JSON.stringify(event.anchorBsDate),
            JSON.stringify(event.anchorLunarDate ?? null),
            event.recurrence,
            event.eventType,
            JSON.stringify(event.reminderCalendars),
            JSON.stringify(event.reminderTiming ?? { type: 'DAY_BEFORE_1155PM' }),
            id
        ]
    );
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteEvent(id) {
    const db = getDatabase();
    await db.run('DELETE FROM events WHERE id = ?', [id]);
}
