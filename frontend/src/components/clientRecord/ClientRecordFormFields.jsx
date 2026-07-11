import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClientNamePicker from '../ClientNamePicker';
import { formatEmployeeLabel } from '../../utils/clientRecordForm';

function participantInitial(name) {
  const t = String(name ?? '').trim();
  return t ? t.charAt(0) : '?';
}

function FormField({ label, htmlFor, required, hint, icon, children }) {
  return (
    <div className="client-event-form-field">
      <label className="client-event-form-label" htmlFor={htmlFor}>
        {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
        <span>{label}</span>
        {required && <span className="client-event-form-required">必須</span>}
      </label>
      {children}
      {hint && <p className="client-event-form-hint">{hint}</p>}
    </div>
  );
}

function FormSection({ title, icon, step, desc, children }) {
  return (
    <section className="client-event-form-section">
      <h3 className="client-event-form-section-title">
        {step != null && <span className="client-event-form-step">{step}</span>}
        <i className={`bi ${icon}`} aria-hidden="true" />
        {title}
      </h3>
      {desc && <p className="client-event-form-section-desc">{desc}</p>}
      <div className="client-event-form-section-body">{children}</div>
    </section>
  );
}

export default function ClientRecordFormFields({
  form,
  eligibleAttendees,
  eligibleAssignees,
  statusOptions,
  priorityOptions,
  onFieldChange,
  onToggleAttendee,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}) {
  const [attendeeQuery, setAttendeeQuery] = useState('');

  const filteredAttendees = useMemo(() => {
    const q = attendeeQuery.trim().toLowerCase();
    if (!q) return eligibleAttendees;
    return eligibleAttendees.filter((p) => formatEmployeeLabel(p).toLowerCase().includes(q));
  }, [eligibleAttendees, attendeeQuery]);

  const selectedAttendees = useMemo(
    () => eligibleAttendees.filter((p) => form.attendeeIds.includes(String(p.id))),
    [eligibleAttendees, form.attendeeIds]
  );

  return (
    <div className="client-record-form-fields">
      <FormSection title="基本情報" icon="bi-building" step={1}>
        <div className="client-record-form-basic-layout">
          <ClientNamePicker
            value={{ clientId: form.clientId, clientName: form.clientName }}
            onChange={({ clientId, clientName }) => {
              onFieldChange('clientId', clientId);
              onFieldChange('clientName', clientName);
            }}
            required
            layout="recordForm"
            hideManualField
            hideLinkedSummary
            manualInputId="formClientNameManual"
            headerSlot={
              <div className="client-event-form-field">
                <label className="client-event-form-label" htmlFor="formClientContact">
                  <i className="bi bi-person-badge" aria-hidden="true" />
                  <span>取引先担当者</span>
                </label>
                <input
                  id="formClientContact"
                  className="form-control"
                  placeholder="例: 田中 太郎"
                  value={form.clientContactPerson}
                  onChange={(e) => onFieldChange('clientContactPerson', e.target.value)}
                />
              </div>
            }
          />

          <div className="client-event-form-grid client-event-form-grid-2">
          {!form.clientId ? (
            <FormField
              label="取引先名（手入力）"
              htmlFor="formClientNameManual"
              required
              icon="bi-building"
            >
              <input
                id="formClientNameManual"
                className="form-control"
                required
                placeholder="取引先名を入力"
                value={form.clientName}
                onChange={(e) => {
                  onFieldChange('clientId', '');
                  onFieldChange('clientName', e.target.value);
                }}
              />
            </FormField>
          ) : (
            <FormField label="取引先名" icon="bi-building" hint="マスタ連携済みの取引先名です">
              <div className="client-record-form-selected-client">
                <input
                  id="formClientNameLinked"
                  type="text"
                  className="form-control"
                  value={form.clientName}
                  readOnly
                  aria-readonly="true"
                />
                <Link
                  to={`/clients/${form.clientId}`}
                  className="client-record-form-selected-client-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  詳細
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </Link>
              </div>
            </FormField>
          )}
          <FormField
            label="件名"
            htmlFor="formTitle"
            required
            icon="bi-journal-text"
            hint="この打合せの名称（一覧・検索用の短いタイトル）"
          >
            <input
              id="formTitle"
              className="form-control"
              required
              placeholder="例: 四半期レビュー打合せ"
              value={form.title}
              onChange={(e) => onFieldChange('title', e.target.value)}
            />
          </FormField>
          </div>
        </div>
      </FormSection>

      <FormSection title="日時・場所" icon="bi-calendar3" step={2}>
        <div className="client-event-form-grid client-event-form-grid-3">
          <FormField label="打合せ日" htmlFor="formMeetingDate" required icon="bi-calendar-event">
            <input
              id="formMeetingDate"
              type="date"
              className="form-control"
              required
              value={form.meetingDate}
              onChange={(e) => onFieldChange('meetingDate', e.target.value)}
            />
          </FormField>
          <FormField label="時間" htmlFor="formMeetingTime" icon="bi-clock" hint="例: 14:00-15:00">
            <input
              id="formMeetingTime"
              className="form-control"
              placeholder="14:00-15:00"
              value={form.meetingTime}
              onChange={(e) => onFieldChange('meetingTime', e.target.value)}
            />
          </FormField>
          <FormField label="場所" htmlFor="formLocation" icon="bi-geo-alt">
            <input
              id="formLocation"
              className="form-control"
              placeholder="会議室・オンライン URL など"
              value={form.location}
              onChange={(e) => onFieldChange('location', e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="議題・議事・課題"
        icon="bi-chat-left-text"
        step={3}
        desc="当日の議題、決定事項・議事録、確認された課題を記録します。"
      >
        <FormField label="議題" htmlFor="formAgenda" icon="bi-list-ul" hint="当日話し合う内容">
          <textarea
            id="formAgenda"
            className="form-control"
            rows={2}
            placeholder="例: ①進捗報告　②課題共有　③次回日程調整"
            value={form.agenda}
            onChange={(e) => onFieldChange('agenda', e.target.value)}
          />
        </FormField>
        <FormField label="議事内容" htmlFor="formMinutes" icon="bi-journal-text">
          <textarea
            id="formMinutes"
            className="form-control"
            rows={5}
            placeholder="決定事項・共有内容・次のアクション"
            value={form.minutesBody}
            onChange={(e) => onFieldChange('minutesBody', e.target.value)}
          />
        </FormField>
        <FormField label="課題" htmlFor="formIssues" icon="bi-exclamation-circle">
          <textarea
            id="formIssues"
            className="form-control"
            rows={3}
            placeholder="打合せで確認された課題・懸念事項"
            value={form.issuesSummary}
            onChange={(e) => onFieldChange('issuesSummary', e.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="出席者"
        icon="bi-people"
        step={4}
        desc="営業部、またはリーダー以上の社員のみ選択できます（複数可）。"
      >
        {selectedAttendees.length > 0 && (
          <div className="client-event-form-selected-bar">
            <span className="client-event-form-selected-label">
              選択中 {selectedAttendees.length} 名
            </span>
            <div className="client-event-form-selected-chips">
              {selectedAttendees.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="client-event-form-selected-chip"
                  onClick={() => onToggleAttendee(p.id)}
                  title="クリックで解除"
                >
                  {p.name}
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="client-event-form-participant-toolbar">
          <div className="client-event-form-participant-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="氏名・部署で検索"
              value={attendeeQuery}
              onChange={(e) => setAttendeeQuery(e.target.value)}
            />
          </div>
          {attendeeQuery && (
            <button
              type="button"
              className="btn btn-link btn-sm client-event-form-clear-search"
              onClick={() => setAttendeeQuery('')}
            >
              検索をクリア
            </button>
          )}
        </div>
        <div className="client-event-participant-picker client-event-form-participant-picker client-record-form-participant-picker">
          {eligibleAttendees.length === 0 ? (
            <p className="client-event-form-empty mb-0">選択可能な社員がありません。</p>
          ) : filteredAttendees.length === 0 ? (
            <p className="client-event-form-empty mb-0">検索条件に一致する社員がいません。</p>
          ) : (
            filteredAttendees.map((attendee) => {
              const checked = form.attendeeIds.includes(String(attendee.id));
              return (
                <label
                  key={attendee.id}
                  className={`client-event-participant-option client-event-form-participant-card${checked ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleAttendee(attendee.id)}
                  />
                  <span className="client-event-form-participant-avatar" aria-hidden="true">
                    {participantInitial(attendee.name)}
                  </span>
                  <span className="client-event-form-participant-info">
                    <span className="client-event-participant-name">{attendee.name}</span>
                    <span className="client-event-form-participant-meta">
                      {[attendee.employeeCode, attendee.departmentName, attendee.position]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {checked && (
                    <i
                      className="bi bi-check-circle-fill client-event-form-participant-check"
                      aria-hidden="true"
                    />
                  )}
                </label>
              );
            })
          )}
        </div>
      </FormSection>

      <FormSection title="タスク" icon="bi-list-check" step={5} desc="打合せから生じたフォローアップタスクを登録します。">
        <div className="client-record-form-tasks-toolbar">
          <span className="client-record-form-tasks-count">
            {form.tasks.length > 0 ? `${form.tasks.length} 件` : '未追加'}
          </span>
          <button type="button" className="btn btn-outline-primary btn-sm app-btn" onClick={onAddTask}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            タスク追加
          </button>
        </div>
        {form.tasks.length === 0 ? (
          <p className="client-event-form-hint mb-0">タスクは未設定です。必要に応じて追加してください。</p>
        ) : (
          <div className="client-record-task-form-list">
            {form.tasks.map((task, index) => (
              <div key={task.key} className="client-record-task-form-item">
                <div className="client-record-task-form-head">
                  <span className="client-record-task-form-index">タスク {index + 1}</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger p-0"
                    onClick={() => onRemoveTask(task.key)}
                  >
                    削除
                  </button>
                </div>
                <div className="client-event-form-grid client-event-form-grid-2">
                  <FormField label="タスク名" htmlFor={`task-title-${task.key}`} required>
                    <input
                      id={`task-title-${task.key}`}
                      className="form-control"
                      placeholder="例: 見積書送付"
                      value={task.title}
                      onChange={(e) => onUpdateTask(task.key, 'title', e.target.value)}
                    />
                  </FormField>
                  <div className="client-event-form-grid client-event-form-grid-2">
                    <FormField label="ステータス" htmlFor={`task-status-${task.key}`}>
                      <select
                        id={`task-status-${task.key}`}
                        className="form-select"
                        value={task.status}
                        onChange={(e) => onUpdateTask(task.key, 'status', e.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="優先度" htmlFor={`task-priority-${task.key}`}>
                      <select
                        id={`task-priority-${task.key}`}
                        className="form-select"
                        value={task.priority}
                        onChange={(e) => onUpdateTask(task.key, 'priority', e.target.value)}
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <FormField label="期限" htmlFor={`task-due-${task.key}`}>
                    <input
                      id={`task-due-${task.key}`}
                      type="date"
                      className="form-control"
                      value={task.dueDate}
                      onChange={(e) => onUpdateTask(task.key, 'dueDate', e.target.value)}
                    />
                  </FormField>
                  <FormField label="担当者" htmlFor={`task-assignee-${task.key}`}>
                    <select
                      id={`task-assignee-${task.key}`}
                      className="form-select"
                      value={task.assigneeEmployeeId}
                      onChange={(e) => onUpdateTask(task.key, 'assigneeEmployeeId', e.target.value)}
                    >
                      <option value="">担当者未設定</option>
                      {eligibleAssignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {formatEmployeeLabel(assignee)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="タスク詳細" htmlFor={`task-desc-${task.key}`}>
                  <textarea
                    id={`task-desc-${task.key}`}
                    className="form-control"
                    rows={2}
                    placeholder="対応内容・補足メモ"
                    value={task.description}
                    onChange={(e) => onUpdateTask(task.key, 'description', e.target.value)}
                  />
                </FormField>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}
