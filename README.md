# TriCalendar

> **An offline, tri-system calendar and event management application unifying Gregorian (AD), Bikram Sambat (BS), and Vedic Lunar Panchang (Tithi).**

## Ever forgotten someone's birthday?

Ever had that moment when you realize you forgot someone's birthday? Not because you didn't care, but because you simply lost track of the date?

Maybe your friend celebrates their birthday in Bikram Sambat (BS), your grandmother follows the Lunar Calendar (Tithi), while someone else uses the Gregorian Calendar (AD). You open your usual reminder app, only to discover that it doesn't understand half the calendars your family and friends use.

Converting dates manually every year? Keeping separate calendars? Hoping you remember? There has to be a better way. TriCalendar!! One place to manage your important dates and never miss a celebration, whether it's based on AD, BS, or Tithi. Because remembering people should be easier than remembering calendars.

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [Architecture Overview](#-architecture-overview)
3. [Technology Stack](#-technology-stack)
4. [Calendar Engine & Calculation Model](#-calendar-engine--calculation-model)
5. [Storage & Synchronization Strategy](#-storage--synchronization-strategy)
6. [Notifications & Alarms](#-notifications--alarms)
7. [Getting Started & Development Setup](#-getting-started--development-setup)
8. [How to Build & Install the App (APK)](#-how-to-build--install-the-app-apk)
9. [User Guide: Backup & Restore](#-user-guide-backup--restore)
10. [Roadmap & Future Implementations](#-roadmap--future-implementations)
11. [License & Acknowledgements](#-license--acknowledgements)

---

## Core Features

- **Tri-System Harmonization:** Simultaneously displays and converts between **AD (Gregorian)**, **BS (Bikram Sambat)**, and **Vedic Lunar Tithi** (Paksha, lunar month, tithi index, and Adhika Masa adjustments).
- **Offline-First Foundation:** Complete operation without an active data connection. Date conversions, panchang astronomical algorithms, event storage, search, and recurrence generation all execute directly on-device.
- **Location-Aware Panchang:** Calculates accurate sunrise-based tithi transitions according to geographic coordinates, with built-in presets for major cities in Nepal, India, the US, UK, Australia, and Japan.
- **Cross-Calendar Event Recurrences:** Create recurring events anchored to any calendar:
  - *Gregorian Recurring:* Standard AD daily, weekly, monthly, yearly.
  - *Bikram Sambat Recurring:* Follows Nepali solar month boundaries (e.g., Baishakh 1st every year).
  - *Tithi / Lunar Recurring:* Generates event occurrences based on lunar phase (e.g., Kartika Shukla Ekadashi), accounting for skipped (*Kshaya*) or doubled (*Vriddhi*) tithis.
- **Reminder System:** Schedules persistent native Android notifications via `AlarmManager` with sliding-window multi-year projection so future events always ring on time.
- **Private Cloud Backup & Restore:** Optional Google Drive integration using restricted app-only folder permissions (`drive.file` scope) with automatic silent background synchronization and offline fallback.
- **Portable Local Backups:** JSON-based database export/import with duplicate detection and merge capabilities.

---

## 🏛️ Architecture Overview

TriCalendar is structured as a modular mono-repository consisting of two primary domains:

```
TriCalendar/
├── calendar-engine/       # Standalone Java core library (Astronomical conversions & calculations)
│   ├── src/main/java/     # Converters, Panchang math, Recurrence & Occurrence engines
│   ├── src/main/resources/# Curated Bikram Sambat calendar matrix (1970–2100 BS)
│   └── pom.xml            # Maven build definition (Java 21)
└── mobile/                # Hybrid mobile application powered by Capacitor & React
    ├── src/               # React 19 UI, SQLite repositories, and client services
    └── android/           # Native Android shell & Custom Capacitor Java plugin bridge
```

### High-Level Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                      │
│   (Vite + Custom CSS UI, CalendarGrid, Event Modals, Theme) │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│       Capacitor Plugins       │ │      Service Layer        │
│  • SQLite (Offline Storage)   │ │  • backupService          │
│  • Local Notifications        │ │  • googleDriveService     │
│  • CalendarEngine (Custom)    │ │  • notificationService    │
└──────────────┬────────────────┘ └─────────────┬─────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     Android Native Bridge     │ │ Google Drive REST API v3  │
│  • Play Services Auth (OAuth) │ │ (App Folder:              │
│  • Android AlarmManager       │ │  "TriCalendar Backoff")   │
└──────────────┬────────────────┘ └───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Java Calendar Engine                     │
│  • BsAdConverter  • TithiConverter  • OccurrenceService     │
│  • Misri Panchang Astronomical Model                        │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Domain | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, Vite 8 | Fast reactive UI with zero heavy styling dependencies |
| **Mobile Runtime** | Capacitor 8 | Native Android bridge and runtime wrapper |
| **Database** | `@capacitor-community/sqlite` | Persistent on-device SQL storage |
| **Core Calculations** | Java 21, `calendar-engine` | AD/BS conversion matrices & occurrence algorithms |
| **Panchang Engine** | `io.github.misrilibrary:tithi-engine:5.0.0` | Astronomical lunar ephemeris and tithi computations |
| **Notifications** | `@capacitor/local-notifications` + Android `AlarmManager` | Reliable time-exact offline reminders |
| **Authentication** | Google Play Services Auth (`play-services-auth:21.3.0`) | Native one-tap Android sign-in without loopback webviews |
| **Cloud Storage** | Google Drive REST API v3 (`drive.file` scope) | Sandboxed JSON backup synchronization |
| **Build Tools** | Apache Maven 3.9+, Gradle 8.14+, JDK 21, Node.js 26+ | Polyglot compilation and packaging pipeline |

---

##  Calendar Engine & Calculation Model

### 1. Bikram Sambat (BS) ↔ Gregorian (AD)
Because Bikram Sambat months are based on the solar transit of the sun across zodiac signs (Rāshi), the number of days per BS month fluctuates between 29 and 32 days depending on astronomical solar longitude.
- TriCalendar bundles an optimized CSV database (`BsCalendarData.csv`) spanning **1970 BS through 2100 BS (1913 AD to 2043 AD)**.
- Day-level delta offsets map Julian day numbers directly across both systems with `O(1)` binary search lookups.

### 2. Vedic Tithi Calculation
- A Tithi represents a 12-degree separation of the Moon from the Sun along the ecliptic.
- Computations use local solar coordinates (latitude, longitude, elevation) to identify sunrise (*Udaya Tithi*), accurately resolving:
  - **Adhika Masa** (Intercalary leap lunar months).
  - **Kshaya Tithi** (Tithis that start and end between consecutive sunrises).
  - **Vriddhi Tithi** (Tithis extending across two consecutive sunrises).

### 3. Recurrence Projection
- **Sliding-Window Generator:** Future occurrences for recurring yearly events are continuously computed for at least 3 years ahead to avoid database bloat while ensuring native alarms are consistently primed.

---

##  Storage & Synchronization Strategy

### Local Database
The application relies on SQLite with transactional migrations:
- **`events` Table:** Stores base event definitions (title, description, anchor date, event type, recurrence pattern, reminder offset).
- **`event_occurrences` Table:** Materialized projection of computed dates used for fast monthly calendar rendering.

### Cloud Synchronization (Google Drive)
- **Least-Privilege Security:** TriCalendar requests strictly `https://www.googleapis.com/auth/drive.file`. The app can only see and edit files it created; it has zero access to photos, docs, or other personal files on Drive.
- **Fixed Dedicated Folder:** Backups are saved inside `TriCalendar Backoff` as `tricalendar-backup.json`.
- **Silent Background Sync:** Whenever an event is created, modified, or deleted, TriCalendar queues a background sync. If the device is offline or without internet, network exceptions are swallowed silently without annoying banners or alerts.

---

##  Notifications & Alarms

- Alarms are scheduled using exact native Android triggers.
- Handles time zone changes, device reboots, and day rollover silently.
- Configurable offsets: exact time, 15 minutes before, 1 hour before, 1 day before, or 2 days before.

---

##  User Guide: Backup & Restore

### Setting Up Google Drive
1. Open TriCalendar and tap the **Settings** gear icon in the top header.
2. Under **Backup & Restore**, tap **Connect Google Drive**.
3. Select your Google account from the native Android prompt and grant file permission.
4. Your events will now back up automatically in the background.

### Manual Backup & Offline Migration
- **Instant Cloud Backup:** Tap **"Backup Now"** in Settings to push changes immediately.
- **Offline Export:** Tap **"Save File to Device"** to download `tricalendar-backup.json` to your phone's Downloads folder.
- **Restoring on a New Device:**
  - *Via Drive:* Tap **Connect Google Drive** on the new device, then tap **"Restore from Drive"**.
  - *Via File:* Transfer your `tricalendar-backup.json` file and tap **"Select & Import File"**.

---

##  Roadmap & Future Implementations

- [ ] **Festival & Holiday Database:** Curated national holidays (Nepal and India) and major Hindu, Buddhist, and international observances.
- [ ] **Home Screen Widgets:** 2x2 and 4x2 Android home screen widgets displaying current AD date, BS date, Tithi, and today's schedule.  
- [ ] **Export to iCalendar (.ics):** Standalone `.ics` feed generation for third-party calendar software.

---

## 📜 License & Acknowledgements

- **License:** Distributed under the MIT License.
- **Tithi Astronomical Calculations:** Powered by the open-source [`io.github.misrilibrary:tithi-engine`](https://github.com/misrilibrary).
- **Icons & Visuals:** Designed with custom Feather & Material minimal SVGs.
