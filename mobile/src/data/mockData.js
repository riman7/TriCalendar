
export const mockCalendarData = {
  today: "2026-11-04",

  events: [
    {
      id: 1,
      title: "Mother's Birthday",
      description: "Buy a cake and prepare a gift",

      anchorAdDate: "2001-08-27",
      anchorBsDate: {
        year: 2058,
        month: 5,
        day: 12
      },
      anchorLunarDate: {
        month: "BHADRAPADA",
        paksha: "SHUKLA",
        tithi: 9
      },

      recurrence: "YEARLY",
      eventType: "BIRTHDAY",
      reminderCalendars: ["BS"],
      createdAt: "2026-11-04T10:00:00"
    },

    {
      id: 2,
      title: "Wedding Anniversary",
      description: "Our wedding anniversary",

      anchorAdDate: "2020-11-10",
      anchorBsDate: {
        year: 2077,
        month: 7,
        day: 25
      },
      anchorLunarDate: {
        month: "KARTIKA",
        paksha: "KRISHNA",
        tithi: 10
      },

      recurrence: "YEARLY",
      eventType: "ANNIVERSARY",
      reminderCalendars: ["AD"],
      createdAt: "2026-10-20T12:30:00"
    },

    {
      id: 3,
      title: "Ekadashi",
      description: "Observe the Ekadashi fast",

      anchorAdDate: "2026-10-26",
      anchorBsDate: {
        year: 2083,
        month: 7,
        day: 9
      },
      anchorLunarDate: {
        month: "KARTIKA",
        paksha: "SHUKLA",
        tithi: 11
      },

      recurrence: "YEARLY",
      eventType: "OTHER",
      reminderCalendars: ["TITHI"],
      createdAt: "2026-10-25T08:00:00"
    },

    {
      id: 4,
      title: "Project Meeting",
      description: "Discuss the TriCalendar project",

      anchorAdDate: "2026-11-06",
      anchorBsDate: {
        year: 2083,
        month: 7,
        day: 21
      },
      anchorLunarDate: null,

      recurrence: "ONCE",
      eventType: "MEETING",
      reminderCalendars: ["AD"],
      createdAt: "2026-11-01T09:00:00"
    },

    {
      id: 5,
      title: "Family Puja",
      description: "Annual family puja",

      anchorAdDate: "2026-11-11",
      anchorBsDate: {
        year: 2083,
        month: 7,
        day: 26
      },
      anchorLunarDate: {
        month: "KARTIKA",
        paksha: "SHUKLA",
        tithi: 1
      },

      recurrence: "YEARLY",
      eventType: "OTHER",
      reminderCalendars: ["BS", "TITHI"],
      createdAt: "2026-10-30T15:00:00"
    }
  ],

  occurrences: [
    {
      id: 101,
      eventId: 1,
      reminderCalendar: "BS",
      occurrenceDateAd: "2026-11-04"
    },
    {
      id: 102,
      eventId: 2,
      reminderCalendar: "AD",
      occurrenceDateAd: "2026-11-10"
    },
    {
      id: 103,
      eventId: 3,
      reminderCalendar: "TITHI",
      occurrenceDateAd: "2026-11-06"
    },
    {
      id: 104,
      eventId: 4,
      reminderCalendar: "AD",
      occurrenceDateAd: "2026-11-06"
    },
    {
      id: 105,
      eventId: 5,
      reminderCalendar: "BS",
      occurrenceDateAd: "2026-11-11"
    },
    {
      id: 106,
      eventId: 5,
      reminderCalendar: "TITHI",
      occurrenceDateAd: "2026-11-11"
    }
  ]
};


export const mockCalendarMonths = {
  adMonth: {
    year: 2026,
    month: 4,
    dates: [
      ["2026-04-01", 2082, 12, 18, "Chaitra Shukla Chaturdashi"],
      ["2026-04-02", 2082, 12, 19, "Chaitra Shukla Purnima"],
      ["2026-04-03", 2082, 12, 20, "Vaishakha Krishna Pratipada"],
      ["2026-04-04", 2082, 12, 21, "Vaishakha Krishna Dwitiya"],
      ["2026-04-05", 2082, 12, 22, "Vaishakha Krishna Tritiya"],
      ["2026-04-06", 2082, 12, 23, "Vaishakha Krishna Chaturthi"],
      ["2026-04-07", 2082, 12, 24, "Vaishakha Krishna Panchami"],
      ["2026-04-08", 2082, 12, 25, "Vaishakha Krishna Shashthi"],
      ["2026-04-09", 2082, 12, 26, "Vaishakha Krishna Saptami"],
      ["2026-04-10", 2082, 12, 27, "Vaishakha Krishna Ashtami"],
      ["2026-04-11", 2082, 12, 28, "Vaishakha Krishna Navami"],
      ["2026-04-12", 2082, 12, 29, "Vaishakha Krishna Dashami"],
      ["2026-04-13", 2082, 12, 30, "Vaishakha Krishna Ekadashi"],
      ["2026-04-14", 2083, 1, 1, "Vaishakha Krishna Dwadashi"],
      ["2026-04-15", 2083, 1, 2, "Vaishakha Krishna Trayodashi"],
      ["2026-04-16", 2083, 1, 3, "Vaishakha Krishna Chaturdashi"],
      ["2026-04-17", 2083, 1, 4, "Vaishakha Krishna Amavasya"],
      ["2026-04-18", 2083, 1, 5, "Vaishakha Shukla Pratipada"],
      ["2026-04-19", 2083, 1, 6, "Vaishakha Shukla Dwitiya"],
      ["2026-04-20", 2083, 1, 7, "Vaishakha Shukla Tritiya"],
      ["2026-04-21", 2083, 1, 8, "Vaishakha Shukla Panchami"],
      ["2026-04-22", 2083, 1, 9, "Vaishakha Shukla Shashthi"],
      ["2026-04-23", 2083, 1, 10, "Vaishakha Shukla Saptami"],
      ["2026-04-24", 2083, 1, 11, "Vaishakha Shukla Ashtami"],
      ["2026-04-25", 2083, 1, 12, "Vaishakha Shukla Navami"],
      ["2026-04-26", 2083, 1, 13, "Vaishakha Shukla Dashami"],
      ["2026-04-27", 2083, 1, 14, "Vaishakha Shukla Ekadashi"],
      ["2026-04-28", 2083, 1, 15, "Vaishakha Shukla Dwadashi"],
      ["2026-04-29", 2083, 1, 16, "Vaishakha Shukla Trayodashi"],
      ["2026-04-30", 2083, 1, 17, "Vaishakha Shukla Chaturdashi"]
    ]
  },

  bsMonth: {
    year: 2072,
    month: 7,
    dates: [
      ["2015-10-18", 1, "Ashvina Shukla Panchami"],
      ["2015-10-19", 2, "Ashvina Shukla Shashthi"],
      ["2015-10-20", 3, "Ashvina Shukla Saptami"],
      ["2015-10-21", 4, "Ashvina Shukla Ashtami"],
      ["2015-10-22", 5, "Ashvina Shukla Navami"],
      ["2015-10-23", 6, "Ashvina Shukla Dashami"],
      ["2015-10-24", 7, "Ashvina Shukla Ekadashi"],
      ["2015-10-25", 8, "Ashvina Shukla Trayodashi"],
      ["2015-10-26", 9, "Ashvina Shukla Chaturdashi"],
      ["2015-10-27", 10, "Ashvina Shukla Purnima"],
      ["2015-10-28", 11, "Kartika Krishna Pratipada"],
      ["2015-10-29", 12, "Kartika Krishna Dwitiya"],
      ["2015-10-30", 13, "Kartika Krishna Tritiya"],
      ["2015-10-31", 14, "Kartika Krishna Chaturthi"],
      ["2015-11-01", 15, "Kartika Krishna Shashthi"],
      ["2015-11-02", 16, "Kartika Krishna Saptami"],
      ["2015-11-03", 17, "Kartika Krishna Ashtami"],
      ["2015-11-04", 18, "Kartika Krishna Ashtami"],
      ["2015-11-05", 19, "Kartika Krishna Navami"],
      ["2015-11-06", 20, "Kartika Krishna Dashami"],
      ["2015-11-07", 21, "Kartika Krishna Ekadashi"],
      ["2015-11-08", 22, "Kartika Krishna Dwadashi"],
      ["2015-11-09", 23, "Kartika Krishna Trayodashi"],
      ["2015-11-10", 24, "Kartika Krishna Chaturdashi"],
      ["2015-11-11", 25, "Kartika Krishna Amavasya"],
      ["2015-11-12", 26, "Kartika Shukla Pratipada"],
      ["2015-11-13", 27, "Kartika Shukla Dwitiya"],
      ["2015-11-14", 28, "Kartika Shukla Tritiya"],
      ["2015-11-15", 29, "Kartika Shukla Chaturthi"],
      ["2015-11-16", 30, "Kartika Shukla Panchami"]
    ]
  }
};

// Convert compact mock records into CalendarDate-like objects.
export const getAdMonthDates = () =>
  mockCalendarMonths.adMonth.dates.map(
    ([adDate, year, month, day, tithiInfo]) => ({
      adDate,
      bsDate: { year, month, day },
      tithiInfo
    })
  );

export const getBsMonthDates = () =>
  mockCalendarMonths.bsMonth.dates.map(
    ([adDate, day, tithiInfo]) => ({
      adDate,
      bsDate: {
        year: mockCalendarMonths.bsMonth.year,
        month: mockCalendarMonths.bsMonth.month,
        day
      },
      tithiInfo
    })
  );

