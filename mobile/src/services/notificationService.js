import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Stable 32-bit positive integer hash from a string.
 * Used because Capacitor LocalNotifications requires integer IDs.
 */
export function hashNotificationId(str, offset = 0) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs((hash + offset) % 2147483647);
}

/**
 * Reminder timing presets requested by the user:
 * - 11:55 PM on the day before event
 * - 10:00 PM on the day before event
 * - 8:00 PM on the day before event
 * - Specific time on the day of event
 * - 1 week before event
 * - 1 month before event
 * - Custom
 */
export const REMINDER_PRESETS = [
  { id: "DAY_BEFORE_1155PM", label: "Day before at 11:55 PM", defaultTime: "23:55", daysBefore: 1 },
  { id: "DAY_BEFORE_10PM",   label: "Day before at 10:00 PM", defaultTime: "22:00", daysBefore: 1 },
  { id: "DAY_BEFORE_8PM",    label: "Day before at 8:00 PM",  defaultTime: "20:00", daysBefore: 1 },
  { id: "DAY_OF_EVENT",      label: "Day of event (custom time)", defaultTime: "09:00", daysBefore: 0 },
  { id: "WEEK_BEFORE",       label: "1 week before event",    defaultTime: "09:00", daysBefore: 7 },
  { id: "MONTH_BEFORE",      label: "1 month before event",   defaultTime: "09:00", daysBefore: 30 },
  { id: "CUSTOM",            label: "Custom reminder",        defaultTime: "09:00", daysBefore: 1 },
];

/**
 * Checks and requests LocalNotifications permission.
 * Returns true if granted.
 */
export async function ensureNotificationPermissions() {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      return true;
    }
    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  } catch (err) {
    console.warn("LocalNotifications permission check failed (e.g. running on web):", err);
    return false;
  }
}

/**
 * Sync notifications for all events and their generated occurrences.
 * Ensures that newly rolled over or added occurrences (e.g. 4th, 5th years)
 * are always registered with Android's AlarmManager without duplicating alarms.
 *
 * @param {Array<object>} events - list of event objects from database
 * @param {Array<object>} occurrences - list of { eventId, reminderCalendar, occurrenceDateAd }
 */
export async function syncAllEventNotifications(events = [], occurrences = []) {
  if (!events || events.length === 0 || !occurrences || occurrences.length === 0) return;

  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) return;

    const pending = await LocalNotifications.getPending();
    const existingIds = new Set((pending?.notifications || []).map(n => n.id));

    const eventMap = new Map(events.map(e => [e.id, e]));
    const now = Date.now();
    const newNotifications = [];

    // Group occurrences by eventId
    const occsByEvent = new Map();
    for (const occ of occurrences) {
      if (!occsByEvent.has(occ.eventId)) {
        occsByEvent.set(occ.eventId, []);
      }
      occsByEvent.get(occ.eventId).push(occ);
    }

    for (const [eventId, occList] of occsByEvent.entries()) {
      const event = eventMap.get(eventId);
      if (!event) continue;

      const timings = normalizeReminderTimings(event.reminderTiming);

      occList.forEach((occ, idx) => {
        const occurrenceDate = occ.occurrenceDate || occ.occurrenceDateAd;
        if (!occurrenceDate) return;

        timings.forEach((timing, timingIdx) => {
          const triggerDate = calculateNotificationTriggerDate(occurrenceDate, timing);
          if (!triggerDate || triggerDate.getTime() <= now) return;

          const notifId = hashNotificationId(
            `${event.id}_${occ.reminderCalendar}_${occurrenceDate}_${timing.type}_${timing.time || ''}`,
            idx * 100 + timingIdx
          );

          // Only queue if not already registered in AlarmManager
          if (!existingIds.has(notifId)) {
            const calType = occ.reminderCalendar ? `[${occ.reminderCalendar}] ` : '';
            const typeLabel = event.eventType === 'BIRTHDAY' ? '🎂 Birthday' :
                              event.eventType === 'ANNIVERSARY' ? '💍 Anniversary' : '📅 Event';

            newNotifications.push({
              id: notifId,
              title: `${typeLabel}: ${event.title}`,
              body: `${calType}Reminder for ${occurrenceDate}. ${event.description || ''}`.trim(),
              schedule: {
                at: triggerDate,
                allowWhileIdle: true
              },
              extra: {
                eventId: event.id,
                occurrenceDate,
                calendar: occ.reminderCalendar,
                timingType: timing.type
              }
            });
            existingIds.add(notifId); // prevent duplicates within batch
          }
        });
      });
    }

    if (newNotifications.length > 0) {
      await LocalNotifications.schedule({
        notifications: newNotifications
      });
      console.log(`Auto-synced ${newNotifications.length} future notification(s) with AlarmManager`);
    }
  } catch (err) {
    console.warn("syncAllEventNotifications error:", err);
  }
}

/**
 * Calculate the exact Date when the reminder should fire.
 *
 * @param {string} occurrenceAdDate "YYYY-MM-DD"
 * @param {{ type: string, time?: string, daysBefore?: number }} reminderTiming
 * @returns {Date|null}
 */
export function calculateNotificationTriggerDate(occurrenceAdDate, reminderTiming) {
  if (!occurrenceAdDate) return null;

  const [y, m, d] = occurrenceAdDate.split('-').map(Number);
  const timing = reminderTiming || { type: "DAY_BEFORE_1155PM" };

  let daysBefore = 1;
  let [hours, minutes] = [23, 55];

  switch (timing.type) {
    case "DAY_BEFORE_1155PM":
      daysBefore = 1;
      hours = 23;
      minutes = 55;
      break;
    case "DAY_BEFORE_10PM":
      daysBefore = 1;
      hours = 22;
      minutes = 0;
      break;
    case "DAY_BEFORE_8PM":
      daysBefore = 1;
      hours = 20;
      minutes = 0;
      break;
    case "DAY_OF_EVENT": {
      daysBefore = 0;
      const t = timing.time || "09:00";
      const parts = t.split(':').map(Number);
      hours = parts[0] || 9;
      minutes = parts[1] || 0;
      break;
    }
    case "WEEK_BEFORE": {
      daysBefore = 7;
      const t = timing.time || "09:00";
      const parts = t.split(':').map(Number);
      hours = parts[0] || 9;
      minutes = parts[1] || 0;
      break;
    }
    case "MONTH_BEFORE": {
      daysBefore = 30;
      const t = timing.time || "09:00";
      const parts = t.split(':').map(Number);
      hours = parts[0] || 9;
      minutes = parts[1] || 0;
      break;
    }
    case "CUSTOM": {
      daysBefore = Number(timing.daysBefore ?? 1);
      const t = timing.time || "09:00";
      const parts = t.split(':').map(Number);
      hours = parts[0] || 9;
      minutes = parts[1] || 0;
      break;
    }
    default:
      daysBefore = 1;
      hours = 23;
      minutes = 55;
      break;
  }

  // Construct target Date in local timezone
  const date = new Date(y, m - 1, d - daysBefore, hours, minutes, 0, 0);
  return date;
}

/**
 * Normalizes reminderTiming into an array of reminder configs.
 * Supports backward compatibility where an object was stored previously.
 */
export function normalizeReminderTimings(timing) {
  if (!timing) {
    return [{ type: "DAY_BEFORE_1155PM", time: "23:55", daysBefore: 1 }];
  }
  if (Array.isArray(timing)) {
    return timing.length > 0
      ? timing
      : [{ type: "DAY_BEFORE_1155PM", time: "23:55", daysBefore: 1 }];
  }
  return [timing];
}

/**
 * Schedule notifications for all upcoming occurrences of an event.
 *
 * @param {object} event
 * @param {Array<{ occurrenceDate: string, reminderCalendar: string }>} occurrences
 */
export async function scheduleEventNotifications(event, occurrences = []) {
  if (!event || !occurrences || occurrences.length === 0) return;

  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      console.warn("Notification permission not granted, skipping notification scheduling");
      return;
    }

    // Cancel any previous notifications for this event first
    await cancelEventNotifications(event.id);

    const now = Date.now();
    const notificationsToSchedule = [];
    const timings = normalizeReminderTimings(event.reminderTiming);

    occurrences.forEach((occ, idx) => {
      const occurrenceDate = occ.occurrenceDate || occ.occurrenceDateAd;
      if (!occurrenceDate) return;

      timings.forEach((timing, timingIdx) => {
        const triggerDate = calculateNotificationTriggerDate(occurrenceDate, timing);
        if (!triggerDate || triggerDate.getTime() <= now) {
          // Occurrence is in the past or trigger time has passed
          return;
        }

        const notifId = hashNotificationId(
          `${event.id}_${occ.reminderCalendar}_${occurrenceDate}_${timing.type}_${timing.time || ''}`,
          idx * 100 + timingIdx
        );
        const calType = occ.reminderCalendar ? `[${occ.reminderCalendar}] ` : '';
        const typeLabel = event.eventType === 'BIRTHDAY' ? '🎂 Birthday' :
                          event.eventType === 'ANNIVERSARY' ? '💍 Anniversary' : '📅 Event';

        notificationsToSchedule.push({
          id: notifId,
          title: `${typeLabel}: ${event.title}`,
          body: `${calType}Reminder for ${occurrenceDate}. ${event.description || ''}`.trim(),
          schedule: {
            at: triggerDate,
            allowWhileIdle: true
          },
          extra: {
            eventId: event.id,
            occurrenceDate,
            calendar: occ.reminderCalendar,
            timingType: timing.type
          }
        });
      });
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      console.log(`Scheduled ${notificationsToSchedule.length} notifications for event ${event.title}`);
    }
  } catch (err) {
    console.warn("Failed to schedule local notifications:", err);
  }
}

/**
 * Cancel all scheduled notifications belonging to a specific event.
 *
 * @param {string} eventId
 */
export async function cancelEventNotifications(eventId) {
  if (!eventId) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (!pending || !pending.notifications || pending.notifications.length === 0) return;

    const toCancel = pending.notifications.filter(
      (n) => n.extra?.eventId === eventId
    );

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({
        notifications: toCancel.map((n) => ({ id: n.id }))
      });
      console.log(`Cancelled ${toCancel.length} notifications for event ${eventId}`);
    }
  } catch (err) {
    console.warn("Failed to cancel local notifications:", err);
  }
}
