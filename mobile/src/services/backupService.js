/**
 * TriCalendar Backup & Restore Data Service
 *
 * Handles serializing local SQLite database events into a standalone, portable
 * JSON backup file and importing it back safely with validation and deduplication.
 */

import { getAllEvents, createEvent, updateEvent, deleteEvent } from "../repositories/eventRepository";
import { uploadBackupToDrive, downloadBackupFromDrive, getStoredConfig } from "./googleDriveService";

export const BACKUP_VERSION = 1;

/**
 * Exports all database events into a structured JSON string/object.
 */
export async function createBackupPayload() {
  const events = await getAllEvents();
  return {
    app: "TriCalendar",
    version: BACKUP_VERSION,
    exportDate: new Date().toISOString(),
    eventCount: events.length,
    events
  };
}

/**
 * Imports a JSON backup file/payload into the database.
 * Mode: 'MERGE' (adds/updates without wiping existing) or 'OVERWRITE' (clears DB first)
 */
export async function importBackupPayload(payload, mode = "MERGE") {
  if (!payload || !Array.isArray(payload.events)) {
    throw new Error("Invalid backup file format: missing 'events' array.");
  }

  const existing = await getAllEvents();
  const existingMap = new Map(existing.map(e => [e.id, e]));

  if (mode === "OVERWRITE") {
    for (const e of existing) {
      await deleteEvent(e.id);
    }
    existingMap.clear();
  }

  let importedCount = 0;
  for (const ev of payload.events) {
    if (!ev || !ev.title || !ev.anchorAdDate) continue;

    const eventData = {
      id: ev.id,
      title: ev.title,
      description: ev.description || "",
      anchorAdDate: ev.anchorAdDate,
      anchorBsDate: ev.anchorBsDate,
      anchorLunarDate: ev.anchorLunarDate,
      recurrence: ev.recurrence || "ONCE",
      eventType: ev.eventType || "OTHER",
      reminderCalendars: ev.reminderCalendars || ["AD"],
      reminderTiming: ev.reminderTiming || { type: "DAY_BEFORE_1155PM" }
    };

    if (existingMap.has(ev.id)) {
      await updateEvent(ev.id, eventData);
    } else {
      await createEvent(eventData);
    }
    importedCount++;
  }

  return { success: true, count: importedCount };
}

/**
 * Downloads backup file directly to device (browser / mobile download)
 */
export async function downloadLocalBackupFile() {
  const payload = await createBackupPayload();
  const str = JSON.stringify(payload, null, 2);
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tricalendar-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return payload;
}

/**
 * Trigger background auto-sync to Google Drive if connected and online.
 * Never throws or alerts user if offline or unauthenticated.
 */
export async function triggerSilentDriveSync() {
  try {
    const config = getStoredConfig();
    if (!config.isConnected || !config.autoBackup) return;
    if (!navigator.onLine) return; // Silent skip if offline

    const payload = await createBackupPayload();
    await uploadBackupToDrive(payload, config.folderName);
  } catch (err) {
    // Silent fail - do not yell or disrupt user offline experience
    console.debug("Silent drive sync skipped or failed:", err?.message || err);
  }
}
