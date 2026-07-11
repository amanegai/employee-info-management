export const JAPANESE_ERA_NAMES = ['令和', '平成', '昭和'];

/** @returns {{ era: string, year: number, month: number, day: number } | null} */
export function isoToWareki(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).trim().split('-').map(Number);
  if (!y || !m || !d) return null;
  const n = y * 10000 + m * 100 + d;
  if (n >= 20190501) return { era: '令和', year: y - 2018, month: m, day: d };
  if (n >= 19890108) return { era: '平成', year: y - 1988, month: m, day: d };
  if (n >= 19261225) return { era: '昭和', year: y - 1925, month: m, day: d };
  return null;
}

/** 和暦 → ISO (YYYY-MM-DD)。不正な日付は空文字 */
export function warekiToIso(era, year, month, day) {
  const wy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  if (!wy || !mm || !dd) return '';

  let gy;
  if (era === '令和') gy = wy + 2018;
  else if (era === '平成') gy = wy + 1988;
  else if (era === '昭和') gy = wy + 1925;
  else return '';

  const dt = new Date(gy, mm - 1, dd);
  if (dt.getFullYear() !== gy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return '';

  const iso = `${gy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const back = isoToWareki(iso);
  if (!back || back.era !== era || back.year !== wy) return '';
  return iso;
}

export function formatWarekiDate(iso, emptyEra = '令和') {
  if (!iso) return `${emptyEra}　　　年　　月　　日`;
  const w = isoToWareki(iso);
  if (!w) return iso;
  return `${w.era}${w.year}年${w.month}月${w.day}日`;
}

/** 和暦年の上限（令和は現在年＋futureBuffer まで選択可） */
export function maxWarekiYear(era, { futureBuffer = 15 } = {}) {
  const now = new Date();
  const current = isoToWareki(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  if (era === '令和') {
    const reiwaNow = current?.era === '令和' ? current.year : now.getFullYear() - 2018;
    return reiwaNow + futureBuffer;
  }
  if (era === '平成') return 31;
  if (era === '昭和') return 64;
  return 99;
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
