import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import SearchFieldLabel from '../components/SearchFieldLabel';
import ListSectionBar from '../components/ListSectionBar';
import { canWriteClientRecords } from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import {
  formatEmployeeLabel,
  formatMeetingDateParts,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_VARIANTS,
} from '../utils/clientRecordForm';

const EMPTY_FILTERS = {
  keyword: '',
  meetingDate: '',
  attendeeEmployeeId: '',
  taskStatus: '',
  taskAssigneeEmployeeId: '',
};

function TaskListItem({ task }) {
  const statusVariant = TASK_STATUS_VARIANTS[task.status] ?? 'todo';
  const priorityVariant = TASK_PRIORITY_VARIANTS[task.priority] ?? 'medium';

  return (
    <div className={`client-record-task-item client-record-task-${statusVariant}`}>
      <div className="client-record-task-item-head">
        <span className="client-record-task-title">{task.title}</span>
        <div className="client-record-issue-badges">
          <span className={`client-record-status-badge client-record-status-${statusVariant}`}>
            {task.status}
          </span>
          <span className={`client-record-priority-badge client-record-priority-${priorityVariant}`}>
            {task.priority}
          </span>
        </div>
      </div>
      <div className="client-record-task-meta">
        <span>
          <i className="bi bi-calendar-event" aria-hidden="true" />
          {task.dueDate || '期限未設定'}
        </span>
        <span>
          <i className="bi bi-person" aria-hidden="true" />
          {task.assigneeName || '担当未設定'}
        </span>
      </div>
      {task.description?.trim() && (
        <p className="client-record-task-description">{task.description.trim()}</p>
      )}
    </div>
  );
}

function ClientRecordCard({ record, canWrite, onEdit, onDelete }) {
  const dateParts = formatMeetingDateParts(record.meetingDate);

  return (
    <article className="client-event-card client-event-card-briefing client-record-meeting-card">
      <div className="client-event-card-layout">
        <div className="client-event-date-block" aria-label={`打合せ日 ${record.meetingDate}`}>
          <span className="client-event-date-year">{dateParts.year}</span>
          <span className="client-event-date-month">{dateParts.month}</span>
          <span className="client-event-date-day">{dateParts.day}</span>
          {dateParts.weekday && (
            <span className="client-event-date-weekday">({dateParts.weekday})</span>
          )}
        </div>

        <div className="client-event-card-body">
          <div className="client-event-card-top">
            <div className="client-event-card-heading">
              <span className="client-event-type-badge client-event-type-badge-briefing">議事録</span>
              <h3 className="client-event-card-title">{record.title}</h3>
              <div className="client-event-card-client">
                <i className="bi bi-building" aria-hidden="true" />
                {record.clientId ? (
                  <Link to={`/clients/${record.clientId}`} className="client-detail-entity-link">
                    {record.clientName}
                    <i className="bi bi-box-arrow-up-right client-detail-entity-link-icon" aria-hidden="true" />
                  </Link>
                ) : (
                  record.clientName
                )}
              </div>
              {record.clientContactPerson?.trim() && (
                <div className="client-record-contact-person">
                  <i className="bi bi-person-badge" aria-hidden="true" />
                  取引先担当者: {record.clientContactPerson.trim()}
                </div>
              )}
            </div>
            {canWrite && (
              <div className="client-event-card-actions">
                <button
                  type="button"
                  className="btn btn-light btn-sm app-btn client-event-action-btn"
                  onClick={() => onEdit(record)}
                >
                  <i className="bi bi-pencil-square" aria-hidden="true" />
                  編集
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm app-btn client-event-action-btn client-event-action-btn-danger"
                  onClick={() => onDelete(record)}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                  削除
                </button>
              </div>
            )}
          </div>

          <div className="client-event-info-grid">
            <div className="client-event-info-item">
              <span className="client-event-info-label">時間</span>
              <span className="client-event-info-value">
                <i className="bi bi-clock" aria-hidden="true" />
                {record.meetingTime || '—'}
              </span>
            </div>
            <div className="client-event-info-item">
              <span className="client-event-info-label">場所</span>
              <span className="client-event-info-value">
                <i className="bi bi-geo-alt" aria-hidden="true" />
                {record.location || '—'}
              </span>
            </div>
          </div>

          {record.agenda?.trim() && (
            <div className="client-event-participants-block">
              <span className="client-event-info-label">議題</span>
              <p className="client-record-text-block mb-0">{record.agenda.trim()}</p>
            </div>
          )}

          {record.minutesBody?.trim() && (
            <div className="client-event-card-notes">
              <span className="client-event-info-label">議事内容</span>
              <p>{record.minutesBody.trim()}</p>
            </div>
          )}

          {record.issuesSummary?.trim() && (
            <div className="client-event-card-notes">
              <span className="client-event-info-label">課題</span>
              <p>{record.issuesSummary.trim()}</p>
            </div>
          )}

          <div className="client-event-participants-block">
            <span className="client-event-info-label">出席者</span>
            {record.attendees?.length ? (
              <div className="client-event-participant-tags">
                {record.attendees.map((attendee) => (
                  <span key={attendee.employeeId} className="client-event-participant-tag">
                    <span className="client-event-participant-name">{attendee.employeeName}</span>
                    {(attendee.departmentName || attendee.position) && (
                      <span className="client-event-participant-meta">
                        {[attendee.departmentName, attendee.position].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="client-event-info-value text-muted">未設定</span>
            )}
          </div>

          <div className="client-event-participants-block client-record-tasks-block">
            <span className="client-event-info-label">タスク</span>
            {record.tasks?.length ? (
              <div className="client-record-task-list">
                {record.tasks.map((task) => (
                  <TaskListItem key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <span className="client-event-info-value text-muted">未設定</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ClientRecordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canWrite = canWriteClientRecords(user);

  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [eligibleAttendees, setEligibleAttendees] = useState([]);
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const skipSearchRef = useRef(true);

  const statusOptions = taskStatuses.length > 0 ? taskStatuses : TASK_STATUS_OPTIONS;

  const loadMeta = useCallback(async () => {
    const [attendeesResult, assigneesResult, statusesResult] = await Promise.allSettled([
      api.getClientMeetingEligibleAttendees(),
      api.getClientIssueEligibleAssignees(),
      api.getClientMeetingTaskStatuses(),
    ]);

    if (attendeesResult.status === 'fulfilled') {
      setEligibleAttendees(attendeesResult.value ?? []);
    }
    if (assigneesResult.status === 'fulfilled') {
      setEligibleAssignees(assigneesResult.value ?? []);
    }
    if (statusesResult.status === 'fulfilled') {
      setTaskStatuses(statusesResult.value ?? []);
    } else {
      setTaskStatuses(TASK_STATUS_OPTIONS);
    }
  }, []);

  const loadRecords = useCallback(
    async (searchFilters) => {
      setLoading(true);
      try {
        const data = await api.searchClientMeetings({
          keyword: searchFilters.keyword || undefined,
          dateFrom: searchFilters.meetingDate || undefined,
          dateTo: searchFilters.meetingDate || undefined,
          attendeeEmployeeId: searchFilters.attendeeEmployeeId || undefined,
          taskStatus: searchFilters.taskStatus || undefined,
          taskAssigneeEmployeeId: searchFilters.taskAssigneeEmployeeId || undefined,
        });
        setRecords(data ?? []);
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setLoading(false);
      }
    },
    [showMessage]
  );

  useEffect(() => {
    loadMeta().catch((e) => showMessage(e.message, 'danger'));
  }, [loadMeta, showMessage]);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      loadRecords(EMPTY_FILTERS);
      return;
    }
    const timer = setTimeout(() => loadRecords(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, loadRecords]);

  function openEditPage(record) {
    navigate(`/client-records/${record.id}/edit`);
  }

  async function handleDelete(record) {
    if (!window.confirm(`「${record.title}」を削除しますか？関連タスクも削除されます。`)) return;
    try {
      await api.deleteClientMeeting(record.id);
      showMessage(`「${record.title}」を削除しました`);
      await loadRecords(filters);
    } catch (err) {
      showMessage(err.message, 'danger');
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page client-record-page">
      <PageHeader
        guideId="client-records"
        icon="bi-journal-check"
        title="取引先議事録＆タスク管理"
        lead="取引先との打合せ記録とタスクを一体管理"
      >
        {canWrite && (
          <Link to="/client-records/new" className="btn btn-primary app-btn">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            新規登録
          </Link>
        )}
      </PageHeader>

      <section className="search-section" aria-label="検索条件">
        <button
          type="button"
          className="search-section-toggle"
          onClick={() => setSearchExpanded((v) => !v)}
          aria-expanded={searchExpanded}
          aria-controls="client-record-search-panel"
        >
          <span className="h6 text-muted mb-0">検索条件</span>
          <span className="search-toggle-icon" aria-hidden="true">
            {searchExpanded ? '▲' : '▼'}
          </span>
        </button>
        {searchExpanded && (
          <div id="client-record-search-panel" className="search-form-panel mt-2">
            <div className="search-form-grid">
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="recordKeyword" icon="bi-search">
                  キーワード
                </SearchFieldLabel>
                <input
                  id="recordKeyword"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="取引先名 / 担当者 / 件名 / 課題 / タスク"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                />
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="recordMeetingDate" icon="bi-calendar-event">
                  打合せ日
                </SearchFieldLabel>
                <input
                  id="recordMeetingDate"
                  type="date"
                  className="form-control form-control-sm"
                  value={filters.meetingDate}
                  onChange={(e) => setFilters({ ...filters, meetingDate: e.target.value })}
                />
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="recordAttendee" icon="bi-people">
                  出席者
                </SearchFieldLabel>
                <select
                  id="recordAttendee"
                  className="form-select form-select-sm"
                  value={filters.attendeeEmployeeId}
                  onChange={(e) => setFilters({ ...filters, attendeeEmployeeId: e.target.value })}
                >
                  <option value="">すべて</option>
                  {eligibleAttendees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatEmployeeLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="recordTaskStatus" icon="bi-list-check">
                  タスク状態
                </SearchFieldLabel>
                <select
                  id="recordTaskStatus"
                  className="form-select form-select-sm"
                  value={filters.taskStatus}
                  onChange={(e) => setFilters({ ...filters, taskStatus: e.target.value })}
                >
                  <option value="">すべて</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="recordTaskAssignee" icon="bi-person-check">
                  タスク担当
                </SearchFieldLabel>
                <select
                  id="recordTaskAssignee"
                  className="form-select form-select-sm"
                  value={filters.taskAssigneeEmployeeId}
                  onChange={(e) => setFilters({ ...filters, taskAssigneeEmployeeId: e.target.value })}
                >
                  <option value="">すべて</option>
                  {eligibleAssignees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatEmployeeLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        className="table-section list-section-panel client-event-list-section"
        aria-label="議事録一覧"
        data-guide="client-record-list"
      >
        <ListSectionBar
          icon="bi-journal-check"
          title="議事録一覧"
          count={records.length}
          hideCount={loading}
        />

        <div className="list-section-body list-section-body-padded">
          {loading ? (
            <div className="client-event-state client-event-state-loading">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-3 mb-0 text-muted">読み込み中…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="client-event-state client-event-state-empty">
              <i className="bi bi-journal-x client-event-state-icon" aria-hidden="true" />
              <p className="mb-0">該当する議事録がありません。</p>
            </div>
          ) : (
            <div className="client-event-list">
              {records.map((record) => (
                <ClientRecordCard
                  key={record.id}
                  record={record}
                  canWrite={canWrite}
                  onEdit={openEditPage}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
