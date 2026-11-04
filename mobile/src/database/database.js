import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

// Create the SQLite connection manager
const sqlite = new SQLiteConnection(CapacitorSQLite);

// Database configuration
const DB_NAME = 'tricalendar';
const DB_VERSION = 1;

let db = null;

export async function initializeDatabase() {
    // Avoid opening multiple connections
    if (db) {
        return db;
    }

    // Create connection
    db = await sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false
    );

    // Open database
    await db.open();

    console.log('TriCalendar database opened');

    return db;
}

export function getDatabase() {
    if (!db) {
        throw new Error('Database has not been initialized');
    }

    return db;
}
