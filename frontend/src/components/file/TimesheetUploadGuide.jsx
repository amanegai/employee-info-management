import { buildTimesheetFileName } from '../../utils/timesheetImport';

const SAMPLE_FILE = buildTimesheetFileName('E2008', '周凱', '2026-05');

export default function TimesheetUploadGuide({ syncAttendance, onSyncChange, disabled = false }) {
  return (
    <div className="timesheet-upload-panel">
      <div className="timesheet-upload-panel-head">
        <div className="timesheet-upload-panel-icon" aria-hidden="true">
          <i className="bi bi-calendar2-week" />
        </div>
        <div className="timesheet-upload-panel-intro">
          <h3 className="timesheet-upload-panel-title">勤務表のアップロード</h3>
          <p className="timesheet-upload-panel-lead mb-0">
            記入済み Excel または CSV（社員勤務情報）をアップロードすると、勤務時間・出勤率・遅刻早退を集計し、社員詳細の勤怠情報に反映します。
          </p>
        </div>
      </div>

      <ol className="timesheet-upload-steps">
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">1</span>
          <span className="timesheet-upload-step-text">テンプレートをダウンロード</span>
        </li>
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">2</span>
          <span className="timesheet-upload-step-text">氏名・開始／終了時刻を記入</span>
        </li>
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">3</span>
          <span className="timesheet-upload-step-text">対象年月を指定して Excel / CSV をアップロード</span>
        </li>
      </ol>

      <div className="timesheet-download-grid">
        <a
          href="/templates/勤務表_テンプレート.xlsx"
          download
          className="timesheet-download-card timesheet-download-card--primary"
        >
          <span className="timesheet-download-card-icon" aria-hidden="true">
            <i className="bi bi-file-earmark-arrow-down" />
          </span>
          <span className="timesheet-download-card-body">
            <strong>空白テンプレート</strong>
            <span>記入用フォーマット</span>
          </span>
          <i className="bi bi-chevron-right timesheet-download-card-arrow" aria-hidden="true" />
        </a>
        <a
          href={`/templates/${encodeURIComponent(SAMPLE_FILE)}`}
          download={SAMPLE_FILE}
          className="timesheet-download-card"
        >
          <span className="timesheet-download-card-icon timesheet-download-card-icon--sample" aria-hidden="true">
            <i className="bi bi-file-earmark-excel" />
          </span>
          <span className="timesheet-download-card-body">
            <strong>記入サンプル</strong>
            <span>E2008・周凱・2026年5月</span>
          </span>
          <i className="bi bi-chevron-right timesheet-download-card-arrow" aria-hidden="true" />
        </a>
      </div>

      <div className={`timesheet-sync-card${syncAttendance ? ' is-active' : ''}`}>
        <label className="timesheet-sync-label" htmlFor="syncAttendanceInput">
          <input
            id="syncAttendanceInput"
            type="checkbox"
            className="timesheet-sync-input"
            checked={syncAttendance}
            onChange={(e) => onSyncChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="timesheet-sync-switch" aria-hidden="true" />
          <span className="timesheet-sync-copy">
            <strong>勤怠情報へ自動反映</strong>
            <span>アップロードと同時に対象月の勤怠データを更新します（過去月は履歴として保持）</span>
          </span>
        </label>
        <div className="timesheet-sync-meta">
          <span className="timesheet-sync-meta-label">ファイル名の例</span>
          <code className="timesheet-sync-filename">{SAMPLE_FILE}</code>
        </div>
      </div>
    </div>
  );
}
