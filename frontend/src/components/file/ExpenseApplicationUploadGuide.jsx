import { buildExpenseApplicationFileName } from '../../utils/expenseApplicationImport';

const SAMPLE_FILE = buildExpenseApplicationFileName('E2008', '周凱', '2026-05');

export default function ExpenseApplicationUploadGuide({ syncExpense, onSyncChange, disabled = false }) {
  return (
    <div className="timesheet-upload-panel expense-upload-panel">
      <div className="timesheet-upload-panel-head">
        <div className="timesheet-upload-panel-icon" aria-hidden="true">
          <i className="bi bi-receipt" />
        </div>
        <div className="timesheet-upload-panel-intro">
          <h3 className="timesheet-upload-panel-title">経費申請書のアップロード</h3>
          <p className="timesheet-upload-panel-lead mb-0">
            社員が提出した経費申請 Excel（交通費・営業費）をアップロードすると、定期券・通勤手当・営業費を自動読み取り、社員詳細の給与情報に反映します。
          </p>
        </div>
      </div>

      <ol className="timesheet-upload-steps">
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">1</span>
          <span className="timesheet-upload-step-text">経費申請書テンプレートに記入</span>
        </li>
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">2</span>
          <span className="timesheet-upload-step-text">ファイル名を規定形式に変更</span>
        </li>
        <li className="timesheet-upload-step">
          <span className="timesheet-upload-step-num">3</span>
          <span className="timesheet-upload-step-text">分類「申請書」でアップロード</span>
        </li>
      </ol>

      <div className={`timesheet-sync-card${syncExpense ? ' is-active' : ''}`}>
        <label className="timesheet-sync-label" htmlFor="syncExpenseInput">
          <input
            id="syncExpenseInput"
            type="checkbox"
            className="timesheet-sync-input"
            checked={syncExpense}
            onChange={(e) => onSyncChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="timesheet-sync-switch" aria-hidden="true" />
          <span className="timesheet-sync-copy">
            <strong>給与情報へ自動反映</strong>
            <span>定期券・通勤手当（個別交通費）・営業費を社員情報に更新します</span>
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
