// Nepali Bikram Sambat (BS) & Gregorian (AD) & Lunar Tithi Utility

export const NEPALI_MONTHS = [
  { id: 1, name: "Baisakh", np: "बैशाख" },
  { id: 2, name: "Jestha", np: "जेठ" },
  { id: 3, name: "Ashadh", np: "असार" },
  { id: 4, name: "Shrawan", np: "साउन" },
  { id: 5, name: "Bhadra", np: "भदौ" },
  { id: 6, name: "Ashwin", np: "असोज" },
  { id: 7, name: "Kartik", np: "कार्तिक" },
  { id: 8, name: "Mangsir", np: "मंसिर" },
  { id: 9, name: "Poush", np: "पुस" },
  { id: 10, name: "Magh", np: "माघ" },
  { id: 11, name: "Falgun", np: "फागुन" },
  { id: 12, name: "Chaitra", np: "चैत" }
];

export const TITHI_NAMES = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima", // 15 Shukla
  "Amavasya" // 15 Krishna
];

// Month lengths for BS years 2070 to 2085 (standard Bikram Sambat table)
const BS_CALENDAR_DATA = {
  2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2073: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2074: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [31, 32, 31, 32, 30, 31, 30, 29, 30, 29, 30, 30]
};

// Reference point: 2083 Baisakh 1 = 2026-04-14 Gregorian (from mockCalendarMonths)
const REF_BS_YEAR = 2083;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(Date.UTC(2026, 3, 14)); // 2026-04-14 UTC

// Reference Lunar Point: 2026-04-02 is Chaitra Shukla Purnima (Full moon, tithi 15 Shukla)
// Synodic lunar month duration ~ 29.530588 days
const LUNAR_REF_DATE = new Date(Date.UTC(2026, 3, 2)); // 2026-04-02 Purnima
const SYNODIC_MONTH = 29.530588;

/**
 * Calculates days between two UTC dates
 */
function diffDays(d1, d2) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((d2 - d1) / MS_PER_DAY);
}

/**
 * Formats a Date object or string as "YYYY-MM-DD"
 */
export function formatYMD(date) {
  if (typeof date === "string") {
    return date.split("T")[0];
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses "YYYY-MM-DD" into UTC Date
 */
export function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Returns number of days in a given BS month
 */
export function getDaysInBsMonth(year, month) {
  if (BS_CALENDAR_DATA[year] && BS_CALENDAR_DATA[year][month - 1]) {
    return BS_CALENDAR_DATA[year][month - 1];
  }
  return 30; // fallback standard
}

/**
 * Converts AD Date ("YYYY-MM-DD" or Date) to BS Date object { year, month, day }
 */
export function adToBs(adDateInput) {
  const targetDate = typeof adDateInput === "string" ? parseYMD(adDateInput) : adDateInput;
  let daysFromRef = diffDays(REF_AD_DATE, targetDate);

  let currentYear = REF_BS_YEAR;
  let currentMonth = REF_BS_MONTH;
  let currentDay = REF_BS_DAY;

  if (daysFromRef >= 0) {
    while (daysFromRef > 0) {
      const daysInCurrentMonth = getDaysInBsMonth(currentYear, currentMonth);
      const daysLeftInMonth = daysInCurrentMonth - currentDay;

      if (daysFromRef <= daysLeftInMonth) {
        currentDay += daysFromRef;
        daysFromRef = 0;
      } else {
        daysFromRef -= (daysLeftInMonth + 1);
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }
  } else {
    daysFromRef = Math.abs(daysFromRef);
    while (daysFromRef > 0) {
      if (daysFromRef < currentDay) {
        currentDay -= daysFromRef;
        daysFromRef = 0;
      } else {
        daysFromRef -= currentDay;
        currentMonth--;
        if (currentMonth < 1) {
          currentMonth = 12;
          currentYear--;
        }
        currentDay = getDaysInBsMonth(currentYear, currentMonth);
      }
    }
  }

  return { year: currentYear, month: currentMonth, day: currentDay };
}

/**
 * Converts BS Date ({ year, month, day }) to AD "YYYY-MM-DD"
 */
export function bsToAd(year, month, day) {
  let daysOffset = 0;

  if (year > REF_BS_YEAR || (year === REF_BS_YEAR && month > REF_BS_MONTH) || (year === REF_BS_YEAR && month === REF_BS_MONTH && day >= REF_BS_DAY)) {
    let curY = REF_BS_YEAR;
    let curM = REF_BS_MONTH;
    let curD = REF_BS_DAY;

    while (curY < year || (curY === year && curM < month)) {
      const daysInM = getDaysInBsMonth(curY, curM);
      daysOffset += (daysInM - curD + 1);
      curD = 1;
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    daysOffset += (day - curD);
  } else {
    let curY = REF_BS_YEAR;
    let curM = REF_BS_MONTH;
    let curD = REF_BS_DAY;

    while (curY > year || (curY === year && curM > month)) {
      daysOffset -= curD;
      curM--;
      if (curM < 1) {
        curM = 12;
        curY--;
      }
      curD = getDaysInBsMonth(curY, curM);
    }
    daysOffset -= (curD - day);
  }

  const resultDate = new Date(REF_AD_DATE.getTime() + daysOffset * 86400000);
  return formatYMD(resultDate);
}

/**
 * Computes Tithi for a given Gregorian date
 */
export function getTithiInfo(adDateInput) {
  const targetDate = typeof adDateInput === "string" ? parseYMD(adDateInput) : adDateInput;
  const daysDiff = diffDays(LUNAR_REF_DATE, targetDate);

  // Synodic lunar phase offset: 0 = Purnima
  let phase = ((daysDiff % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  // Lunar month is split into Shukla Paksha (15 tithis) and Krishna Paksha (15 tithis)
  // Each tithi is approx 29.530588 / 30 = 0.98435 days
  const tithiDuration = SYNODIC_MONTH / 30;
  
  // Phase 0 is Purnima (end of Shukla Paksha / start of Krishna Paksha)
  const tithiIndex = Math.floor(phase / tithiDuration);
  let paksha;
  let tithiName;
  let tithiNumber;

  if (tithiIndex < 15) {
    paksha = "KRISHNA";
    tithiNumber = tithiIndex + 1;
    if (tithiNumber === 15) {
      tithiName = "Amavasya";
    } else {
      tithiName = TITHI_NAMES[tithiNumber - 1];
    }
  } else {
    paksha = "SHUKLA";
    tithiNumber = tithiIndex - 15 + 1;
    if (tithiNumber === 15) {
      tithiName = "Purnima";
    } else {
      tithiName = TITHI_NAMES[tithiNumber - 1];
    }
  }

  const bs = adToBs(targetDate);
  const monthName = NEPALI_MONTHS[bs.month - 1]?.name || "";
  const fullText = `${monthName} ${paksha === "SHUKLA" ? "Shukla" : "Krishna"} ${tithiName}`;

  return {
    tithiNumber,
    paksha,
    tithiName,
    fullText,
    month: monthName.toUpperCase()
  };
}

/**
 * Returns complete day data for any AD date string
 */
export function getCalendarDayData(adDateStr) {
  const bsDate = adToBs(adDateStr);
  const tithi = getTithiInfo(adDateStr);
  return {
    adDate: adDateStr,
    bsDate,
    tithiInfo: tithi.fullText,
    shortTithi: tithi.tithiName
  };
}

/**
 * Returns Month Grid for AD month view (7 columns, Mon-Sun or Sun-Sat)
 */
export function getAdMonthGrid(year, month) {
  // month is 1-indexed (1 = Jan, 11 = Nov)
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startingDayOfWeek = firstDay.getUTCDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells = [];

  // Empty leading days from previous month to align grid to Sunday
  for (let i = 0; i < startingDayOfWeek; i++) {
    cells.push({ isEmpty: true, id: `prev-${i}` });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const adDateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = getCalendarDayData(adDateStr);
    cells.push({
      isEmpty: false,
      id: adDateStr,
      adDate: adDateStr,
      adDay: d,
      bsDay: dayData.bsDate.day,
      bsMonth: dayData.bsDate.month,
      bsYear: dayData.bsDate.year,
      tithiName: dayData.shortTithi,
      tithiFull: dayData.tithiInfo
    });
  }

  return cells;
}

/**
 * Returns Month Grid for BS month view
 */
export function getBsMonthGrid(bsYear, bsMonth) {
  // bsMonth is 1-indexed (1 = Baisakh, 7 = Kartik)
  const daysInBs = getDaysInBsMonth(bsYear, bsMonth);
  const firstAdDateStr = bsToAd(bsYear, bsMonth, 1);
  const firstAdDate = parseYMD(firstAdDateStr);
  const startingDayOfWeek = firstAdDate.getUTCDay(); // 0 = Sun

  const cells = [];

  // Empty leading days
  for (let i = 0; i < startingDayOfWeek; i++) {
    cells.push({ isEmpty: true, id: `bs-prev-${i}` });
  }

  // Days of current BS month
  for (let d = 1; d <= daysInBs; d++) {
    const adDateStr = bsToAd(bsYear, bsMonth, d);
    const dayData = getCalendarDayData(adDateStr);
    const adObj = parseYMD(adDateStr);
    cells.push({
      isEmpty: false,
      id: `bs-${bsYear}-${bsMonth}-${d}`,
      adDate: adDateStr,
      adDay: adObj.getUTCDate(),
      adMonth: adObj.getUTCMonth() + 1,
      adYear: adObj.getUTCFullYear(),
      bsDay: d,
      bsMonth: bsMonth,
      bsYear: bsYear,
      tithiName: dayData.shortTithi,
      tithiFull: dayData.tithiInfo
    });
  }

  return cells;
}
