import { useEffect, useMemo, useState } from 'react';
import {
  formatWarekiDate,
  isoToWareki,
  JAPANESE_ERA_NAMES,
  maxWarekiYear,
  warekiToIso,
} from '../../utils/japaneseEra';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function warekiYearToGregorian(era, warekiYear) {
  if (era === '令和') return warekiYear + 2018;
  if (era === '平成') return warekiYear + 1988;
  if (era === '昭和') return warekiYear + 1925;
  return warekiYear + 2018;
}

export default function JapaneseEraDateInput({ id, value, onChange, disabled, futureBuffer = 15 }) {
  const parsed = useMemo(() => isoToWareki(value), [value]);
  const [era, setEra] = useState(parsed?.era ?? '令和');
  const [year, setYear] = useState(parsed?.year ? String(parsed.year) : '');
  const [month, setMonth] = useState(parsed?.month ? String(parsed.month) : '');
  const [day, setDay] = useState(parsed?.day ? String(parsed.day) : '');

  useEffect(() => {
    const next = isoToWareki(value);
    setEra(next?.era ?? '令和');
    setYear(next?.year ? String(next.year) : '');
    setMonth(next?.month ? String(next.month) : '');
    setDay(next?.day ? String(next.day) : '');
  }, [value]);

  const gregorianYear = year ? warekiYearToGregorian(era, Number(year)) : null;
  const dayMax = month && gregorianYear ? new Date(gregorianYear, Number(month), 0).getDate() : 31;
  const dayOptions = useMemo(
    () => Array.from({ length: dayMax }, (_, i) => i + 1),
    [dayMax]
  );
  const yearMax = maxWarekiYear(era, { futureBuffer });
  const yearOptions = useMemo(
    () => Array.from({ length: yearMax }, (_, i) => i + 1),
    [yearMax]
  );

  function emit(nextEra, nextYear, nextMonth, nextDay) {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange('');
      return;
    }
    const iso = warekiToIso(nextEra, nextYear, nextMonth, nextDay);
    onChange(iso);
  }

  function handleEraChange(nextEra) {
    setEra(nextEra);
    emit(nextEra, year, month, day);
  }

  function handleYearChange(nextYear) {
    setYear(nextYear);
    emit(era, nextYear, month, day);
  }

  function handleMonthChange(nextMonth) {
    setMonth(nextMonth);
    let nextDay = day;
    if (nextDay && nextMonth && year) {
      const gy = warekiYearToGregorian(era, Number(year));
      const maxDay = new Date(gy, Number(nextMonth), 0).getDate();
      if (Number(nextDay) > maxDay) {
        nextDay = String(maxDay);
        setDay(nextDay);
      }
    }
    emit(era, year, nextMonth, nextDay);
  }

  function handleDayChange(nextDay) {
    setDay(nextDay);
    emit(era, year, month, nextDay);
  }

  const preview = value ? formatWarekiDate(value) : '—';

  return (
    <div className="japanese-era-date-input">
      <div className="japanese-era-date-input__controls">
        <select
          id={id}
          className="form-select japanese-era-date-input__era"
          value={era}
          disabled={disabled}
          aria-label="年号"
          onChange={(e) => handleEraChange(e.target.value)}
        >
          {JAPANESE_ERA_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="form-select japanese-era-date-input__part"
          value={year}
          disabled={disabled}
          aria-label="年"
          onChange={(e) => handleYearChange(e.target.value)}
        >
          <option value="">年</option>
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>
              {y}年
            </option>
          ))}
        </select>
        <select
          className="form-select japanese-era-date-input__part"
          value={month}
          disabled={disabled}
          aria-label="月"
          onChange={(e) => handleMonthChange(e.target.value)}
        >
          <option value="">月</option>
          {MONTHS.map((m) => (
            <option key={m} value={String(m)}>
              {m}月
            </option>
          ))}
        </select>
        <select
          className="form-select japanese-era-date-input__part"
          value={day}
          disabled={disabled}
          aria-label="日"
          onChange={(e) => handleDayChange(e.target.value)}
        >
          <option value="">日</option>
          {dayOptions.map((d) => (
            <option key={d} value={String(d)}>
              {d}日
            </option>
          ))}
        </select>
      </div>
      <p className="japanese-era-date-input__preview" aria-live="polite">
        {preview}
      </p>
    </div>
  );
}
