/** テンプレート生成用（frontend/src/utils/japaneseHolidays.js と同等ロジック） */
function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getNthWeekdayOfMonth(year, month, weekday, nth) {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month - 1, day).getDay() === weekday) {
      count += 1;
      if (count === nth) return day;
    }
  }
  return null;
}

function springEquinoxDay(year) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
}

function autumnEquinoxDay(year) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
}

function addHoliday(map, year, month, day, name) {
  if (day >= 1 && day <= 31) map.set(toDateKey(year, month, day), name);
}

function buildBaseHolidays(year) {
  const map = new Map();
  addHoliday(map, year, 1, 1, '元日');
  const comingOfAge = getNthWeekdayOfMonth(year, 1, 1, 2);
  if (comingOfAge) addHoliday(map, year, 1, comingOfAge, '成人の日');
  addHoliday(map, year, 2, 11, '建国記念の日');
  addHoliday(map, year, 2, 23, '天皇誕生日');
  addHoliday(map, year, 3, springEquinoxDay(year), '春分の日');
  addHoliday(map, year, 4, 29, '昭和の日');
  addHoliday(map, year, 5, 3, '憲法記念日');
  addHoliday(map, year, 5, 4, 'みどりの日');
  addHoliday(map, year, 5, 5, 'こどもの日');
  const marineDay = getNthWeekdayOfMonth(year, 7, 1, 3);
  if (marineDay) addHoliday(map, year, 7, marineDay, '海の日');
  addHoliday(map, year, 8, 11, '山の日');
  const respectDay = getNthWeekdayOfMonth(year, 9, 1, 3);
  if (respectDay) addHoliday(map, year, 9, respectDay, '敬老の日');
  addHoliday(map, year, 9, autumnEquinoxDay(year), '秋分の日');
  const sportsDay = getNthWeekdayOfMonth(year, 10, 1, 2);
  if (sportsDay) addHoliday(map, year, 10, sportsDay, 'スポーツの日');
  addHoliday(map, year, 11, 3, '文化の日');
  addHoliday(map, year, 11, 23, '勤労感謝の日');
  return map;
}

function applyCitizensHoliday(map, year) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 2; day < daysInMonth; day += 1) {
      const key = toDateKey(year, month, day);
      if (map.has(key)) continue;
      const prev = toDateKey(year, month, day - 1);
      const next = toDateKey(year, month, day + 1);
      if (map.has(prev) && map.has(next)) map.set(key, '国民の休日');
    }
  }
}

function applySubstituteHolidays(map, year) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateKey(year, month, day);
      if (!map.has(key) || new Date(year, month - 1, day).getDay() !== 0) continue;
      for (let offset = 1; offset <= 7; offset += 1) {
        const nextKey = toDateKey(year, month, day + offset);
        if (!map.has(nextKey)) {
          map.set(nextKey, '振替休日');
          break;
        }
      }
    }
  }
}

const cache = new Map();

export function getJapaneseHolidaysForYear(year) {
  if (cache.has(year)) return cache.get(year);
  const map = buildBaseHolidays(year);
  applyCitizensHoliday(map, year);
  applySubstituteHolidays(map, year);
  cache.set(year, map);
  return map;
}

export function getWeekdayJapaneseHolidayName(year, month, day) {
  const dow = new Date(year, month - 1, day).getDay();
  if (dow === 0 || dow === 6) return null;
  return getJapaneseHolidaysForYear(year).get(toDateKey(year, month, day)) ?? null;
}
