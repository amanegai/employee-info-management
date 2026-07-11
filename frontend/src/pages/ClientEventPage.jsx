import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import SearchFieldLabel from '../components/SearchFieldLabel';
import { EVENT_STATUS_OPTIONS } from '../utils/clientEventForm';
import ListSectionBar from '../components/ListSectionBar';
import { canWriteClientEvents } from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FILTERS = {
  keyword: '',
  eventType: '',
  eventStatus: '',
  eventDate: '',
  participantEmployeeId: '',
};

const EVENT_TYPE_VARIANTS = {
  説明会: 'briefing',
  接待: 'reception',
  セミナー: 'seminar',
  訪問: 'visit',
  展示会: 'expo',
  その他: 'other',
};

const EVENT_STATUS_VARIANTS = {
  予定: 'scheduled',
  実施済: 'done',
  中止: 'cancelled',
  延期: 'postponed',
};

function eventStatusVariant(status) {
  return EVENT_STATUS_VARIANTS[status] ?? 'scheduled';
}

function eventTypeVariant(type) {
  return EVENT_TYPE_VARIANTS[type] ?? 'other';
}

function formatParticipantLabel(participant) {
  return [participant.name, participant.departmentName || '—', participant.position || '—'].join(' / ');
}

function formatEventDateParts(dateStr) {
  if (!dateStr) {
    return { year: '', month: '', day: '—', weekday: '' };
  }
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { year: '', month: '', day: dateStr, weekday: '' };
  }
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    year: String(date.getFullYear()),
    month: `${date.getMonth() + 1}月`,
    day: String(date.getDate()),
    weekday: weekdays[date.getDay()],
  };
}

function ClientEventCard({ event, canWrite, onEdit, onDelete }) {
  const dateParts = formatEventDateParts(event.eventDate);
  const typeVariant = eventTypeVariant(event.eventType);
  const statusVariant = eventStatusVariant(event.eventStatus ?? '予定');

  return (
    <article className={`client-event-card client-event-card-${typeVariant}`}>
      <div className="client-event-card-layout">
        <div className="client-event-date-block" aria-label={`開催日 ${event.eventDate}`}>
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
              <div className="client-event-card-title-row">
                <h3 className="client-event-card-title">{event.eventName}</h3>
                <div className="client-event-card-badges">
                  <span className={`client-event-type-badge client-event-type-badge-${typeVariant}`}>
                    {event.eventType}
                  </span>
                  <span className={`client-event-status-badge client-event-status-${statusVariant}`}>
                    {event.eventStatus ?? '予定'}
                  </span>
                </div>
              </div>
              <div className="client-event-card-client">
                <i className="bi bi-building" aria-hidden="true" />
                {event.clientId ? (
                  <Link to={`/clients/${event.clientId}`} className="client-detail-entity-link">
                    {event.clientName}
                    <i className="bi bi-box-arrow-up-right client-detail-entity-link-icon" aria-hidden="true" />
                  </Link>
                ) : (
                  event.clientName
                )}
              </div>
            </div>
            {canWrite && (
              <div className="client-event-card-actions">
                <button
                  type="button"
                  className="btn btn-light btn-sm app-btn client-event-action-btn"
                  onClick={() => onEdit(event)}
                >
                  <i className="bi bi-pencil-square" aria-hidden="true" />
                  編集
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm app-btn client-event-action-btn client-event-action-btn-danger"
                  onClick={() => onDelete(event)}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                  削除
                </button>
              </div>
            )}
          </div>

          <div className="client-event-info-grid">
            <div className="client-event-info-item">
              <span className="client-event-info-label">開催時間</span>
              <span className="client-event-info-value">
                <i className="bi bi-clock" aria-hidden="true" />
                {event.eventTime || '—'}
              </span>
            </div>
            <div className="client-event-info-item">
              <span className="client-event-info-label">場所</span>
              <span className="client-event-info-value">
                <i className="bi bi-geo-alt" aria-hidden="true" />
                {event.location || '—'}
              </span>
            </div>
          </div>

          <div className="client-event-participants-block">
            <span className="client-event-info-label">参加者</span>
            {event.participants?.length ? (
              <div className="client-event-participant-tags">
                {event.participants.map((participant) => (
                  <span key={participant.employeeId} className="client-event-participant-tag">
                    <span className="client-event-participant-name">{participant.employeeName}</span>
                    {(participant.departmentName || participant.position) && (
                      <span className="client-event-participant-meta">
                        {[participant.departmentName, participant.position].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="client-event-info-value text-muted">未設定</span>
            )}
          </div>

          {event.notes?.trim() && (
            <div className="client-event-card-notes">
              <span className="client-event-info-label">備考</span>
              <p>{event.notes.trim()}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ClientEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canWrite = canWriteClientEvents(user);

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [eligibleParticipants, setEligibleParticipants] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const skipSearchEffectRef = useRef(true);

  const participantOptions = useMemo(
    () => eligibleParticipants,
    [eligibleParticipants]
  );

  const statusOptions = eventStatuses.length > 0 ? eventStatuses : EVENT_STATUS_OPTIONS;

  const loadMeta = useCallback(async () => {
    const [typesResult, statusesResult, participantsResult] = await Promise.allSettled([
      api.getClientEventTypes(),
      api.getClientEventStatuses(),
      api.getClientEventEligibleParticipants(),
    ]);

    if (typesResult.status === 'fulfilled') {
      setEventTypes(typesResult.value ?? []);
    }
    if (statusesResult.status === 'fulfilled') {
      setEventStatuses(statusesResult.value ?? []);
    } else {
      setEventStatuses(EVENT_STATUS_OPTIONS);
    }
    if (participantsResult.status === 'fulfilled') {
      setEligibleParticipants(participantsResult.value ?? []);
    }
  }, []);

  const loadEvents = useCallback(
    async (searchFilters) => {
      setLoading(true);
      try {
        const data = await api.searchClientEvents({
          keyword: searchFilters.keyword || undefined,
          eventType: searchFilters.eventType || undefined,
          eventStatus: searchFilters.eventStatus || undefined,
          dateFrom: searchFilters.eventDate || undefined,
          dateTo: searchFilters.eventDate || undefined,
          participantEmployeeId: searchFilters.participantEmployeeId || undefined,
        });
        setEvents(data ?? []);
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
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      loadEvents(EMPTY_FILTERS);
      return;
    }
    const timer = setTimeout(() => loadEvents(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, loadEvents]);

  function openEditPage(event) {
    navigate(`/client-events/${event.id}/edit`);
  }

  async function handleDelete(event) {
    if (!window.confirm(`「${event.eventName}」を削除しますか？`)) return;
    try {
      await api.deleteClientEvent(event.id);
      showMessage(`「${event.eventName}」を削除しました`);
      await loadEvents(filters);
    } catch (err) {
      showMessage(err.message, 'danger');
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page client-event-page">
      <PageHeader
        guideId="client-events"
        icon="bi-calendar-event-fill"
        title="取引先イベント参加管理"
        lead="営業・管理職の取引先イベント参加記録"
      >
        {canWrite && (
          <Link to="/client-events/new" className="btn btn-primary app-btn">
            <i className="bi bi-calendar-plus" aria-hidden="true" />
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
          aria-controls="client-event-search-panel"
        >
          <span className="h6 text-muted mb-0">検索条件</span>
          <span className="search-toggle-icon" aria-hidden="true">
            {searchExpanded ? '▲' : '▼'}
          </span>
        </button>
        {searchExpanded && (
          <div id="client-event-search-panel" className="search-form-panel mt-2">
            <div className="search-form-grid">
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="eventKeyword" icon="bi-search">
                  キーワード
                </SearchFieldLabel>
                <input
                  id="eventKeyword"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="取引先名 / イベント名 / 場所"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                />
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="eventTypeFilter" icon="bi-tag">
                  種別
                </SearchFieldLabel>
                <select
                  id="eventTypeFilter"
                  className="form-select form-select-sm"
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                >
                  <option value="">すべて</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="eventStatusFilter" icon="bi-circle-half">
                  状態
                </SearchFieldLabel>
                <select
                  id="eventStatusFilter"
                  className="form-select form-select-sm"
                  value={filters.eventStatus}
                  onChange={(e) => setFilters({ ...filters, eventStatus: e.target.value })}
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
                <SearchFieldLabel htmlFor="eventDateFilter" icon="bi-calendar-event">
                  開催日
                </SearchFieldLabel>
                <input
                  id="eventDateFilter"
                  type="date"
                  className="form-control form-control-sm"
                  value={filters.eventDate}
                  onChange={(e) => setFilters({ ...filters, eventDate: e.target.value })}
                />
              </div>
              <div className="search-form-field">
                <SearchFieldLabel htmlFor="eventParticipantFilter" icon="bi-people">
                  参加者
                </SearchFieldLabel>
                <select
                  id="eventParticipantFilter"
                  className="form-select form-select-sm"
                  value={filters.participantEmployeeId}
                  onChange={(e) =>
                    setFilters({ ...filters, participantEmployeeId: e.target.value })
                  }
                >
                  <option value="">すべて</option>
                  {participantOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatParticipantLabel(p)}
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
        aria-label="イベント一覧"
        data-guide="client-event-list"
      >
        <ListSectionBar
          icon="bi-calendar-event"
          title="イベント一覧"
          count={events.length}
          hideCount={loading}
        />

        <div className="list-section-body list-section-body-padded">
        {loading ? (
          <div className="client-event-state client-event-state-loading">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 mb-0 text-muted">読み込み中…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="client-event-state client-event-state-empty">
            <i className="bi bi-calendar-x client-event-state-icon" aria-hidden="true" />
            <p className="mb-0">該当するイベントがありません。</p>
          </div>
        ) : (
          <div className="client-event-list">
            {events.map((event) => (
              <ClientEventCard
                key={event.id}
                event={event}
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
