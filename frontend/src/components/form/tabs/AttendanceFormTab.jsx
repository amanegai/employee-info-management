import SectionCard from '../../detail/SectionCard';
import FormField from '../FormField';
import PeriodMonthInput from '../PeriodMonthInput';
import { monthToPeriodLabel } from '../../../utils';
import { currentTargetMonth } from '../../../utils/fileCategories';

function resolveAttendanceMonthLabel(attendance) {
  if (attendance?.periodLabel) return attendance.periodLabel;
  return monthToPeriodLabel(currentTargetMonth());
}

export default function AttendanceFormTab({ form, onChange }) {
  function updateAttendance(field, value) {
    onChange({ ...form, attendance: { ...form.attendance, [field]: value } });
  }

  function updateEvalHistory(field, value) {
    onChange({ ...form, evaluationHistory: { ...form.evaluationHistory, [field]: value } });
  }

  return (
    <>
      <SectionCard
        title="勤怠情報"
        icon="bi-calendar-check"
        headerColor="#20a0b0"
        headerExtra={resolveAttendanceMonthLabel(form.attendance)}
      >
        <div className="row g-3 detail-form-attendance-fields">
          <div className="col-md-6 col-lg-3">
            <FormField label="出勤率（%）" htmlFor="attendanceRate">
              <input
                id="attendanceRate"
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={form.attendance.attendanceRate}
                onChange={(e) => updateAttendance('attendanceRate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="遅刻・早退（件）" htmlFor="lateEarlyCount">
              <input
                id="lateEarlyCount"
                type="number"
                min="0"
                className="form-control"
                value={form.attendance.lateEarlyCount}
                onChange={(e) => updateAttendance('lateEarlyCount', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="有給残数（日）" htmlFor="paidLeaveRemaining">
              <input
                id="paidLeaveRemaining"
                type="number"
                min="0"
                className="form-control"
                value={form.attendance.paidLeaveRemaining}
                onChange={(e) => updateAttendance('paidLeaveRemaining', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="出勤日数" htmlFor="workDays">
              <input
                id="workDays"
                type="number"
                min="0"
                step="0.5"
                className="form-control"
                value={form.attendance.workDays}
                onChange={(e) => updateAttendance('workDays', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="勤務時間" htmlFor="workHours">
              <input
                id="workHours"
                type="number"
                min="0"
                step="0.5"
                className="form-control"
                value={form.attendance.workHours}
                onChange={(e) => updateAttendance('workHours', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="対象期間" htmlFor="periodMonth">
              <PeriodMonthInput
                id="periodMonth"
                value={form.attendance.periodLabel}
                onChange={(periodLabel) => updateAttendance('periodLabel', periodLabel)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="評価履歴" icon="bi-star" headerColor="#495057" className="mt-3">
        <div className="row g-3 detail-form-eval-history-fields">
          <div className="col-md-6 col-lg-3">
            <FormField label="年度" htmlFor="yearLabel">
              <input
                id="yearLabel"
                type="text"
                className="form-control"
                placeholder="2026年度"
                value={form.evaluationHistory.yearLabel}
                onChange={(e) => updateEvalHistory('yearLabel', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="ステータス" htmlFor="statusText">
              <input
                id="statusText"
                type="text"
                className="form-control"
                placeholder="初回評価対象"
                value={form.evaluationHistory.statusText}
                onChange={(e) => updateEvalHistory('statusText', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="次回評価メモ" htmlFor="nextEvaluationNote">
              <input
                id="nextEvaluationNote"
                type="text"
                className="form-control"
                value={form.evaluationHistory.nextEvaluationNote}
                onChange={(e) => updateEvalHistory('nextEvaluationNote', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="メモ" icon="bi-chat-left-text" headerColor="#adb5bd" className="mt-3">
        <textarea
          className="form-control"
          rows={4}
          placeholder="社員に関するメモ"
          value={form.memo}
          onChange={(e) => onChange({ ...form, memo: e.target.value })}
        />
      </SectionCard>
    </>
  );
}
