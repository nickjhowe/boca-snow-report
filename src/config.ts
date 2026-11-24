// Trips shown on the bocaskiclub.com snow report page.
// Edit this file to add, remove or change a trip; the daily job picks it up automatically.

export type Observation =
  | { kind: "snotel"; triplet: string; label: string }
  | { kind: "jma"; stationName: string; label: string };

export interface Trip {
  id: string;
  resort: string;
  region: string;
  /** First and last day of the trip, local to the resort (YYYY-MM-DD, inclusive). */
  start: string;
  end: string;
  eventUrl: string;
  /** Set true when registration is at its limit; the button then reads "View trip". */
  full: boolean;
  officialReportUrl: string;
  lat: number;
  lon: number;
  /** Elevations in metres. */
  baseM: number;
  midM: number;
  summitM: number;
  observation: Observation;
}

export const trips: Trip[] = [
  {
    id: "vail",
    resort: "Vail",
    region: "Colorado",
    start: "2027-01-10",
    end: "2027-01-17",
    eventUrl: "https://bocaskiclub.com/event-6693377",
    full: true,
    officialReportUrl: "https://www.vail.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx",
    lat: 39.6205,
    lon: -106.3735,
    baseM: 2475,
    midM: 3050,
    summitM: 3527,
    observation: { kind: "snotel", triplet: "842:CO:SNTL", label: "Vail Mountain SNOTEL" },
  },
  {
    id: "steamboat",
    resort: "Steamboat",
    region: "Colorado",
    start: "2027-01-24",
    end: "2027-01-31",
    eventUrl: "https://bocaskiclub.com/event-6631536",
    full: false,
    officialReportUrl: "https://www.steamboat.com/the-mountain/mountain-report",
    lat: 40.4572,
    lon: -106.7853,
    baseM: 2103,
    midM: 2740,
    summitM: 3221,
    observation: { kind: "snotel", triplet: "825:CO:SNTL", label: "Tower SNOTEL (Buffalo Pass)" },
  },
  {
    id: "whitefish",
    resort: "Whitefish",
    region: "Montana",
    start: "2027-02-06",
    end: "2027-02-13",
    eventUrl: "https://bocaskiclub.com/event-6685081",
    full: false,
    officialReportUrl: "https://skiwhitefish.com/snowreport/",
    lat: 48.4855,
    lon: -114.3525,
    baseM: 1361,
    midM: 1740,
    summitM: 2078,
    observation: { kind: "snotel", triplet: "482:MT:SNTL", label: "Flattop Mtn SNOTEL" },
  },
  {
    id: "hakuba",
    resort: "Hakuba Valley",
    region: "Nagano, Japan",
    start: "2027-03-04",
    end: "2027-03-17",
    eventUrl: "https://bocaskiclub.com/event-6686006",
    full: true,
    officialReportUrl: "https://www.hakubavalley.com/en/",
    // Happo-one, the valley's largest resort
    lat: 36.6989,
    lon: 137.8317,
    baseM: 760,
    midM: 1300,
    summitM: 1831,
    observation: { kind: "jma", stationName: "白馬", label: "JMA Hakuba station" },
  },
];

/** Seasons used for the "typical trip week" figure (season ending in each year). */
export const climatologyYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
