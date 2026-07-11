import { getJapaneseHolidayName } from './japaneseHolidays';

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

export function parseTimeToMinutes(timeText) {
  const [h, m] = String(timeText || '00:00').split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateText) {
  const [y, m, d] = dateText.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeekMonday(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function buildWeekDays(weekStart) {
  const todayText = toDateInputValue(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateText = toDateInputValue(date);
    const isWeekend = index >= 5;
    const holidayName = getJapaneseHolidayName(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const isHoliday = Boolean(holidayName);
    return {
      date,
      dateText,
      weekdayLabel: WEEKDAY_LABELS[index],
      dayLabel: String(date.getDate()),
      monthLabel: date.getMonth() + 1,
      isToday: dateText === todayText,
      isWeekend,
      isHoliday,
      holidayName,
      isOffDay: isWeekend || isHoliday,
    };
  });
}

export function buildTimeSlots(room) {
  if (!room) return [];
  const start = parseTimeToMinutes(room.businessStart);
  const end = parseTimeToMinutes(room.businessEnd);
  const step = room.slotMinutes;
  const slots = [];
  for (let minute = start; minute < end; minute += step) {
    slots.push({
      minute,
      label: formatMinutesToTime(minute),
      endMinute: minute + step,
      endLabel: formatMinutesToTime(minute + step),
    });
  }
  return slots;
}

export function parseDateTimeLocal(value) {
  if (!value) return null;
  const text = value.length === 16 ? `${value}:00` : value;
  const [datePart, timePart] = text.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss || 0, 0);
}

export function toDateTimeLocalValue(date) {
  return `${toDateInputValue(date)}T${formatMinutesToTime(date.getHours() * 60 + date.getMinutes())}`;
}

export function reservationOverlapsSlot(reservation, dateText, slot) {
  const start = parseDateTimeLocal(reservation.startAt);
  const end = parseDateTimeLocal(reservation.endAt);
  if (!start || !end) return false;
  if (toDateInputValue(start) !== dateText) return false;
  const slotStartMinutes = slot.minute;
  const slotEndMinutes = slot.endMinute;
  const resStartMinutes = start.getHours() * 60 + start.getMinutes();
  const resEndMinutes = end.getHours() * 60 + end.getMinutes();
  return resStartMinutes < slotEndMinutes && resEndMinutes > slotStartMinutes;
}

export function reservationStartsAtSlot(reservation, dateText, slot) {
  const start = parseDateTimeLocal(reservation.startAt);
  if (!start || toDateInputValue(start) !== dateText) return false;
  const resStartMinutes = start.getHours() * 60 + start.getMinutes();
  return resStartMinutes === slot.minute;
}

export function countSlotSpan(reservation, room) {
  const start = parseDateTimeLocal(reservation.startAt);
  const end = parseDateTimeLocal(reservation.endAt);
  if (!start || !end) return 1;
  const minutes = (end.getTime() - start.getTime()) / 60000;
  return Math.max(1, Math.round(minutes / room.slotMinutes));
}

export function durationOptions(room, maxSlots = 8) {
  if (!room) return [];
  return Array.from({ length: maxSlots }, (_, index) => {
    const slots = index + 1;
    const minutes = slots * room.slotMinutes;
    return {
      slots,
      minutes,
      label: minutes >= 60 ? `${minutes / 60}時間` : `${minutes}分`,
    };
  });
}

export function buildDateTime(dateText, minuteValue) {
  return `${dateText}T${formatMinutesToTime(minuteValue)}`;
}

export function formatReservationRange(reservation) {
  const start = parseDateTimeLocal(reservation.startAt);
  const end = parseDateTimeLocal(reservation.endAt);
  if (!start || !end) return '';
  const fmt = (date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${formatMinutesToTime(date.getHours() * 60 + date.getMinutes())}`;
  return `${fmt(start)} 〜 ${formatMinutesToTime(end.getHours() * 60 + end.getMinutes())}`;
}

export function formatReservationTimeShort(reservation) {
  const start = parseDateTimeLocal(reservation.startAt);
  const end = parseDateTimeLocal(reservation.endAt);
  if (!start || !end) return '';
  return `${formatMinutesToTime(start.getHours() * 60 + start.getMinutes())}–${formatMinutesToTime(end.getHours() * 60 + end.getMinutes())}`;
}
