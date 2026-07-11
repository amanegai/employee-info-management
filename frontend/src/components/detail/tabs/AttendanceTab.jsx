import { useMemo } from 'react';
import SectionCard from '../SectionCard';
import {
  computeAttendanceFromRecords,
  summarizeAttendanceBreakdown,
  summarizeAttendanceRows,
} from '../../../utils/timesheetImport';
import { monthToPeriodLabel, periodLabelToMonth } from '../../../utils';
import { currentTargetMonth, formatTargetMonthLabel, recentTargetMonths } from '../../../utils/fileCategories';
import { getWeekdayJapaneseHolidayName } from '../../../utils/japaneseHolidays';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function resolveTargetMonth(att) {
  const fromLabel = periodLabelToMonth(att?.periodLabel);
  if (fromLabel) return fromLabel;
  return currentTargetMonth();
}

function parseDateParts(date) {
  const [y, m, d] = String(date ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function formatDayCell(date) {
  const parts = parseDateParts(date);
  if (!parts) return '—';
  return String(parts.d);
}

function formatWeekday(date) {
  const parts = parseDateParts(date);
  if (!parts) return '—';
  return WEEKDAYS[new Date(parts.y, parts.m - 1, parts.d).getDay()];
}

function isWeekendDate(date) {
  const parts = parseDateParts(date);
  if (!parts) return false;
  const dow = new Date(parts.y, parts.m - 1, parts.d).getDay();
  return dow === 0 || dow === 6;
}

function formatWorkHours(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num.toFixed(num % 1 === 0 ? 0 : 1) : '—';
}

function formatTimeCell(value) {
  const text = String(value ?? '').trim();
  return text || '—';
}

function formatRestHours(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(num % 1 === 0 ? 0 : 1) : '—';
}

function classifyRemarks(remarks) {
  const text = String(remarks ?? '');
  if (/有給|休暇/.test(text)) return 'leave';
  if (/祝日/.test(text)) return 'holiday';
  if (/休日|休み/.test(text)) return 'off';
  if (/遅刻|早退/.test(text)) return 'late';
  return 'normal';
}

function buildFullMonthRows(targetMonth, dailyRecords) {
  const [yearText, monthText] = String(targetMonth ?? '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) return dailyRecords;

  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map(dailyRecords.map((row) => [row.date, row]));
  const rows = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`;
    const existing = byDate.get(date);
    const dow = new Date(year, month - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const holidayName = getWeekdayJapaneseHolidayName(year, month, day);

    let remarks = existing?.remarks ?? '';
    if (!remarks) {
      if (isWeekend) remarks = '休日';
      else if (holidayName) remarks = `祝日（${holidayName}）`;
    }

    rows.push({
      date,
      startTime: existing?.startTime ?? '',
      endTime: existing?.endTime ?? '',
      restTime: existing?.restTime ?? null,
      workHours: existing?.workHours ?? null,
      remarks,
      lateEarly: existing?.lateEarly ?? false,
    });
  }

  return rows;
}

function RemarkBadge({ remarks, lateEarly }) {
  const kind = lateEarly ? 'late' : classifyRemarks(remarks);
  const text = String(remarks ?? '').trim();

  if (kind === 'late' || lateEarly) {
    return (
      <span className="attendance-remark-badge attendance-remark-badge--late">
        {text || '遅刻・早退'}
      </span>
    );
  }
  if (kind === 'leave') {
    return <span className="attendance-remark-badge attendance-remark-badge--leave">{text}</span>;
  }
  if (kind === 'holiday') {
    return <span className="attendance-remark-badge attendance-remark-badge--holiday">{text}</span>;
  }
  if (kind === 'off') {
    return <span className="attendance-remark-badge attendance-remark-badge--off">{text || '休日'}</span>;
  }
  return text ? <span className="attendance-remark-text">{text}</span> : <span className="text-muted">—</span>;
}

function AttendanceSummary({ att, monthRows, targetMonth, hasImportedRows }) {
  const computed = useMemo(() => {
    if (!hasImportedRows || !targetMonth || !monthRows?.length) return null;
    return computeAttendanceFromRecords(monthRows, targetMonth);
  }, [hasImportedRows, monthRows, targetMonth]);

  const ledgerStats = summarizeAttendanceRows(monthRows);
  const breakdown = summarizeAttendanceBreakdown(monthRows);
  const workDays = computed?.workDays ?? ledgerStats.workDays ?? att.workDays ?? null;
  const workHours = computed?.workHours ?? ledgerStats.workHours ?? att.workHours ?? null;
  const actualWorkDays = breakdown.actualWorkDays;
  const paidLeaveDays = breakdown.paidLeaveDays;
  const attendanceRate = computed?.attendanceRate ?? att.attendanceRate ?? null;
  const lateEarlyCount = computed?.lateEarlyCount ?? att.lateEarlyCount ?? null;

  const stats = [
    {
      key: 'workDays',
      label: '出勤日数',
      value: workDays ?? '—',
      unit: workDays != null ? '日' : '',
      sub:
        workDays != null && paidLeaveDays > 0
          ? `実勤務 ${actualWorkDays} 日 + 有給等 ${paidLeaveDays} 日`
          : workDays != null
            ? `実勤務 ${actualWorkDays} 日`
            : null,
      icon: 'bi-calendar2-check',
      tone: 'teal',
    },
    {
      key: 'workHours',
      label: '勤務時間',
      value: formatWorkHours(workHours),
      unit: workHours != null ? 'h' : '',
      icon: 'bi-clock-history',
      tone: 'cyan',
    },
    {
      key: 'attendanceRate',
      label: '出勤率',
      value: attendanceRate ?? '—',
      unit: attendanceRate != null ? '%' : '',
      icon: 'bi-graph-up-arrow',
      tone: 'indigo',
    },
    {
      key: 'lateEarlyCount',
      label: '遅刻・早退',
      value: lateEarlyCount ?? '—',
      unit: lateEarlyCount != null ? '件' : '',
      icon: 'bi-exclamation-circle',
      tone: 'amber',
    },
    {
      key: 'paidLeaveRemaining',
      label: '有給残',
      value: att.paidLeaveRemaining ?? '—',
      unit: att.paidLeaveRemaining != null ? '日' : '',
      icon: 'bi-suitcase',
      tone: 'rose',
    },
  ];

  return (
    <div className="attendance-summary">
      <div className="attendance-summary-grid">
        {stats.map((item) => (
          <div key={item.key} className={`attendance-stat-card attendance-stat-card--${item.tone}`}>
            <div className="attendance-stat-icon" aria-hidden="true">
              <i className={`bi ${item.icon}`} />
            </div>
            <div className="attendance-stat-body">
              <div className="attendance-stat-value">
                {item.value}
                {item.unit && <span className="attendance-stat-unit">{item.unit}</span>}
              </div>
              <div className="attendance-stat-label">{item.label}</div>
              {item.sub && <div className="attendance-stat-sub">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceLedger({ monthRows }) {
  const { workHours: totalHours } = summarizeAttendanceRows(monthRows);
  const { total: workDayCount, actualWorkDays, paidLeaveDays } = summarizeAttendanceBreakdown(monthRows);

  return (
    <div className="attendance-ledger">
      <div className="attendance-ledger-head">
        <div>
          <h3 className="attendance-ledger-title">出勤明細</h3>
          <p className="attendance-ledger-sub">勤務表テンプレートと同じ列構成（全月表示）</p>
        </div>
        <span className="attendance-ledger-badge">{monthRows.length} 日</span>
      </div>

      <div className="attendance-ledger-table-wrap">
        <table className="attendance-ledger-table">
          <thead>
            <tr>
              <th className="attendance-col-day">日</th>
              <th className="attendance-col-dow">曜日</th>
              <th className="attendance-col-time">開始</th>
              <th className="attendance-col-time">終了</th>
              <th className="attendance-col-rest">休憩(h)</th>
              <th className="attendance-col-hours">勤務時間(h)</th>
              <th className="attendance-col-remarks">備考</th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map((row) => {
              const remarkKind = row.lateEarly ? 'late' : classifyRemarks(row.remarks);
              const weekend = isWeekendDate(row.date);
              const rowClass = [
                weekend ? 'is-weekend' : '',
                remarkKind === 'late' ? 'is-late' : '',
                remarkKind === 'leave' ? 'is-leave' : '',
                remarkKind === 'holiday' || remarkKind === 'off' ? 'is-off' : '',
              ].filter(Boolean).join(' ');

              return (
                <tr key={row.date} className={rowClass || undefined}>
                  <td className="attendance-col-day">{formatDayCell(row.date)}</td>
                  <td className="attendance-col-dow">{formatWeekday(row.date)}</td>
                  <td className="attendance-col-time">{formatTimeCell(row.startTime)}</td>
                  <td className="attendance-col-time">{formatTimeCell(row.endTime)}</td>
                  <td className="attendance-col-rest">{formatRestHours(row.restTime)}</td>
                  <td className="attendance-col-hours">{formatWorkHours(row.workHours)}</td>
                  <td className="attendance-col-remarks">
                    <RemarkBadge remarks={row.remarks} lateEarly={row.lateEarly} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="attendance-ledger-foot-label">合計</td>
              <td className="attendance-col-hours">{formatWorkHours(totalHours)}</td>
              <td className="attendance-ledger-foot-note">
                {paidLeaveDays > 0 ? (
                  <>
                    実勤務 <strong>{actualWorkDays}</strong> 日 + 有給等 <strong>{paidLeaveDays}</strong> 日
                    <span className="attendance-ledger-foot-total">（計 {workDayCount} 日）</span>
                  </>
                ) : (
                  <>{actualWorkDays} 日出勤</>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function AttendanceMonthPicker({ months, selectedMonth, onChange, loading }) {
  const recentMonths = recentTargetMonths(12);
  const uniqueMonths = [...new Set([...recentMonths, ...(months ?? [])])].sort((a, b) => b.localeCompare(a));
  const value = selectedMonth || uniqueMonths[0] || currentTargetMonth();

  return (
    <div className="attendance-month-picker">
      <label className="visually-hidden" htmlFor="attendanceHistoryMonth">
        勤務履歴の対象月
      </label>
      <select
        id="attendanceHistoryMonth"
        className="form-select form-select-sm attendance-month-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        aria-label="勤務履歴の対象月"
      >
        {uniqueMonths.map((month) => (
          <option key={month} value={month}>
            {formatTargetMonthLabel(month)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AttendanceTab({
  employee,
  attendanceMonths = [],
  selectedMonth = '',
  onMonthChange,
  loading = false,
}) {
  const att = employee.attendance;
  const hist = employee.evaluationHistory;
  const memo = employee.memo;
  const targetMonth = selectedMonth || resolveTargetMonth(att);
  const monthLabel = att?.periodLabel || monthToPeriodLabel(targetMonth);
  const dailyRecords = att?.dailyRecords ?? [];
  const monthRows = buildFullMonthRows(targetMonth, dailyRecords);
  const hasImportedRows = dailyRecords.length > 0;

  return (
    <>
      <SectionCard
        title="勤怠情報"
        icon="bi-calendar-check"
        variant="teal"
        headerExtra={
          <AttendanceMonthPicker
            months={attendanceMonths}
            selectedMonth={selectedMonth || targetMonth}
            onChange={onMonthChange}
            loading={loading}
          />
        }
      >
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <p className="text-muted small mt-2 mb-0">勤怠データを読み込み中…</p>
          </div>
        ) : att ? (
          <div className="attendance-panel">
            <AttendanceSummary
              att={att}
              monthRows={monthRows}
              targetMonth={targetMonth}
              hasImportedRows={hasImportedRows}
            />
            {monthRows.length > 0 ? (
              <AttendanceLedger monthRows={monthRows} />
            ) : (
              <div className="attendance-ledger-empty">
                <i className="bi bi-table attendance-ledger-empty-icon" aria-hidden="true" />
                <p className="attendance-ledger-empty-title">当月の出勤明細はありません</p>
                <p className="attendance-ledger-empty-text mb-0">
                  ファイル管理から勤務表をアップロードし、「勤怠情報へ反映する」にチェックを入れると、日別明細が表示されます。
                </p>
              </div>
            )}
            {monthRows.length > 0 && !hasImportedRows && (
              <p className="attendance-ledger-hint text-muted small mb-0 mt-2">
                勤務表の取り込みデータはまだありません。土日・祝日はテンプレートと同様に自動表示しています。
              </p>
            )}
          </div>
        ) : (
          <div className="attendance-ledger-empty">
            <i className="bi bi-calendar-x attendance-ledger-empty-icon" aria-hidden="true" />
            <p className="attendance-ledger-empty-title">
              {monthLabel ? `${monthLabel}の勤怠情報は未登録です` : '勤怠情報は未登録です'}
            </p>
            <p className="attendance-ledger-empty-text mb-0">
              勤務表 CSV／Excel の取り込み、または社員編集画面から登録できます。
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="評価履歴" icon="bi-star" variant="slate" className="mt-3">
        {hist ? (
          <>
            <p className="mb-1 fw-semibold">
              {hist.yearLabel}：{hist.statusText}
            </p>
            {hist.nextEvaluationNote && (
              <p className="text-muted small mb-0">{hist.nextEvaluationNote}</p>
            )}
          </>
        ) : (
          <p className="text-muted mb-0">評価履歴は未登録です。</p>
        )}
      </SectionCard>

      <SectionCard title="メモ" icon="bi-chat-left-text" variant="gray" className="mt-3">
        {memo ? (
          <blockquote className="detail-memo-quote mb-0">{memo}</blockquote>
        ) : (
          <p className="text-muted mb-0">メモは未登録です。</p>
        )}
      </SectionCard>
    </>
  );
}
