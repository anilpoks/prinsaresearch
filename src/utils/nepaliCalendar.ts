/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore
import NepaliDate from "nepali-date-converter";

/**
 * Converts a Gregorian (AD) date string "YYYY-MM-DD" to Bikram Sambat (BS) date string "YYYY-MM-DD"
 */
export function convertADToBS(adDateStr: string): string {
  if (!adDateStr) return "";
  try {
    // Parse the date components to avoid timezone offset shifts
    const [year, month, day] = adDateStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
    
    // JS Months are 0-indexed, so subtract 1
    const jsDate = new Date(year, month - 1, day);
    const nepaliDateObj = new NepaliDate(jsDate);
    
    const bsYear = nepaliDateObj.getYear();
    const bsMonth = nepaliDateObj.getMonth() + 1; // 0-indexed in nepali-date-converter
    const bsDay = nepaliDateObj.getDate();
    
    return `${bsYear}-${String(bsMonth).padStart(2, "0")}-${String(bsDay).padStart(2, "0")}`;
  } catch (error) {
    console.error("Error converting AD to BS", error);
    return "";
  }
}

/**
 * Converts a Bikram Sambat (BS) date string "YYYY-MM-DD" to Gregorian (AD) date string "YYYY-MM-DD"
 */
export function convertBSToAD(bsDateStr: string): string {
  if (!bsDateStr) return "";
  try {
    const [year, month, day] = bsDateStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
    
    // Month is 0-indexed in nepali-date-converter
    const nepaliDateObj = new NepaliDate(year, month - 1, day);
    const jsDate = nepaliDateObj.toJsDate();
    
    const adYear = jsDate.getFullYear();
    const adMonth = jsDate.getMonth() + 1;
    const adDay = jsDate.getDate();
    
    return `${adYear}-${String(adMonth).padStart(2, "0")}-${String(adDay).padStart(2, "0")}`;
  } catch (error) {
    console.error("Error converting BS to AD", error);
    return "";
  }
}

/**
 * Formats a BS date or a combined BS/AD date beautifully for displaying in the registry
 */
export function formatComboDate(adDateStr: string): string {
  if (!adDateStr) return "N/A";
  const bsDateStr = convertADToBS(adDateStr);
  if (!bsDateStr) return adDateStr;
  return `${bsDateStr} BS (${adDateStr} AD)`;
}

export const NEPALI_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra"
];

/**
 * Gets the maximum number of days in a given Bikram Sambat (BS) year and month.
 * @param year BS Year (e.g. 2080)
 * @param month BS Month index 0-11 (0 = Baisakh, 1 = Jestha ... 11 = Chaitra)
 */
export function getDaysInBSMonth(year: number, month: number): number {
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return 30;
  for (let day = 32; day >= 29; day--) {
    try {
      const nd = new NepaliDate(year, month, day);
      if (nd.getMonth() === month && nd.getYear() === year) {
        return day;
      }
    } catch {
      // Ignore
    }
  }
  return 30; // fallback
}
