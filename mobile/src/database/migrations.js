import { getDatabase } from './database.js';

export async function runMigrations() {
    const db = getDatabase();

    const result = await db.query(`PRAGMA user_version;`);
    console.log("Database version:", result.values);

    const currentVersion = result.values?.[0]?.user_version ?? 0;

    // Migration 1: Create events table
    if (currentVersion < 1) {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                anchor_ad_date TEXT NOT NULL,
                anchor_bs_date TEXT NOT NULL,
                anchor_lunar_date TEXT NOT NULL,
                recurrence TEXT NOT NULL,
                event_type TEXT NOT NULL,
                reminder_calendars TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        `);
        await db.execute('PRAGMA user_version = 1;');
    }

    // Migration 2: Settings table and extra columns
    if (currentVersion < 2) {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        try {
            await db.execute(`ALTER TABLE events ADD COLUMN source_calendar TEXT;`);
        } catch {}

        try {
            await db.execute(`ALTER TABLE events ADD COLUMN source_date TEXT;`);
        } catch {}

        await db.execute('PRAGMA user_version = 2;');
    }

    // Migration 3: Reminder timing configuration for notifications
    if (currentVersion < 3) {
        try {
            await db.execute(`ALTER TABLE events ADD COLUMN reminder_timing TEXT;`);
        } catch {}

        await db.execute('PRAGMA user_version = 3;');
    }
}
