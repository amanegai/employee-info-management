import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { canManageMeetingRooms, canModifyMeetingRoomReservation, canWriteMeetingRoomReservations } from '../auth';
import AppFooter from '../components/AppFooter';
import MeetingRoomCreateModal from '../components/meetingRoom/MeetingRoomCreateModal';
import MeetingRoomReservationModal from '../components/meetingRoom/MeetingRoomReservationModal';
import MeetingRoomSettingsModal from '../components/meetingRoom/MeetingRoomSettingsModal';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import {
  addDays,
  buildTimeSlots,
  buildWeekDays,
  countSlotSpan,
  formatReservationRange,
  formatReservationTimeShort,
  parseTimeToMinutes,
  reservationOverlapsSlot,
  reservationStartsAtSlot,
  startOfWeekMonday,
  toDateInputValue,
} from '../utils/meetingRoomCalendar';

function parseEquipmentList(equipment) {
  if (!equipment?.trim()) return [];
  return equipment
    .split(/[,、，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findReservationAtSlot(reservations, dateText, slot) {
  return reservations.find((reservation) => reservationStartsAtSlot(reservation, dateText, slot));
}

function isContinuationCell(reservations, dateText, slot) {
  return reservations.some(
    (reservation) =>
      reservationOverlapsSlot(reservation, dateText, slot) &&
      !reservationStartsAtSlot(reservation, dateText, slot)
  );
}

function isCurrentWeek(weekStart) {
  const today = new Date();
  const currentWeekStart = startOfWeekMonday(today);
  return toDateInputValue(weekStart) === toDateInputValue(currentWeekStart);
}

export default function MeetingRoomCalendarPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({
    open: false,
    mode: 'create',
    reservation: null,
    dateText: '',
    startMinute: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const room = useMemo(
    () => rooms.find((item) => item.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const equipmentItems = useMemo(() => parseEquipmentList(room?.equipment), [room]);

  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const timeSlots = useMemo(() => buildTimeSlots(room), [room]);
  const viewingCurrentWeek = useMemo(() => isCurrentWeek(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${weekStart.getFullYear()}年 ${weekStart.getMonth() + 1}月 ${weekStart.getDate()}日 〜 ${end.getDate()}日`;
    }
    return `${weekStart.getFullYear()}年 ${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
  }, [weekStart]);

  const reservationCount = reservations.length;

  const currentTimeRow = useMemo(() => {
    if (!viewingCurrentWeek || !room) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(room.businessStart);
    const endMinutes = parseTimeToMinutes(room.businessEnd);
    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;
    const index = timeSlots.findIndex((slot, i) => {
      const next = timeSlots[i + 1];
      const slotEnd = next ? next.minute : endMinutes;
      return nowMinutes >= slot.minute && nowMinutes < slotEnd;
    });
    if (index < 0) return null;
    const slot = timeSlots[index];
    const next = timeSlots[index + 1];
    const slotEnd = next ? next.minute : endMinutes;
    const offsetRatio = (nowMinutes - slot.minute) / (slotEnd - slot.minute);
    return { index, offsetRatio };
  }, [viewingCurrentWeek, room, timeSlots]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: '4rem repeat(7, minmax(0, 1fr))',
      gridTemplateRows: `auto repeat(${Math.max(timeSlots.length, 1)}, minmax(3rem, auto))`,
    }),
    [timeSlots.length]
  );

  const loadRooms = useCallback(async () => {
    try {
      const list = await api.getMeetingRooms();
      setRooms(list);
      setSelectedRoomId((prev) => (prev && list.some((item) => item.id === prev) ? prev : null));
    } catch (err) {
      showMessage(err.message || '会議室の読み込みに失敗しました', 'danger');
      setRooms([]);
      setSelectedRoomId(null);
    }
  }, [showMessage]);

  const loadReservations = useCallback(async () => {
    if (!selectedRoomId) {
      setReservations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dateFrom = toDateInputValue(weekStart);
      const dateTo = toDateInputValue(addDays(weekStart, 6));
      const items = await api.searchMeetingRoomReservations({
        dateFrom,
        dateTo,
        roomId: selectedRoomId,
      });
      setReservations(items);
    } catch (err) {
      showMessage(err.message || '会議室予約の読み込みに失敗しました', 'danger');
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, weekStart, showMessage]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  function handleRoomChange(nextId) {
    const id = Number(nextId);
    if (!id || id === selectedRoomId) return;
    setSelectedRoomId(id);
  }

  function openCreateModal(dateText, startMinute) {
    if (!canWriteMeetingRoomReservations(user) || !room) return;
    setModalState({
      open: true,
      mode: 'create',
      reservation: null,
      dateText,
      startMinute,
    });
  }

  function openReservationModal(reservation) {
    const canModify = canModifyMeetingRoomReservation(user, reservation);
    setModalState({
      open: true,
      mode: canModify ? 'edit' : 'view',
      reservation,
      dateText: reservation.startAt?.slice(0, 10) || '',
      startMinute: null,
    });
  }

  async function handleReservationSubmit(payload, reservationId) {
    if (reservationId) {
      await api.updateMeetingRoomReservation(reservationId, payload);
      showMessage('予約を更新しました', 'success');
    } else {
      await api.createMeetingRoomReservation(payload);
      showMessage('予約を登録しました', 'success');
    }
    await loadReservations();
  }

  async function handleReservationCancel(reservationId) {
    await api.cancelMeetingRoomReservation(reservationId);
    showMessage('予約をキャンセルしました', 'success');
    await loadReservations();
  }

  async function handleRoomSettingsSubmit(payload) {
    const roomId = room?.id;
    if (!roomId) return;

    await api.updateMeetingRoom(roomId, payload);
    setSettingsOpen(false);
    showMessage('会議室設定を保存しました', 'success');
    try {
      await loadRooms();
      await loadReservations();
    } catch (err) {
      showMessage(err.message || '会議室の再読み込みに失敗しました', 'danger');
    }
  }

  async function handleRoomDelete(roomId) {
    await api.deleteMeetingRoom(roomId);
    setSettingsOpen(false);
    setSelectedRoomId((prev) => (prev === roomId ? null : prev));
    setReservations([]);
    setRooms((prev) => prev.filter((item) => item.id !== roomId));
    showMessage('会議室を削除しました', 'success');
    try {
      await loadRooms();
    } catch (err) {
      showMessage(err.message || '会議室の再読み込みに失敗しました', 'danger');
    }
  }

  async function handleRoomCreateSubmit(payload) {
    const created = await api.createMeetingRoom(payload);
    setCreateOpen(false);
    showMessage('会議室を登録しました', 'success');
    try {
      await loadRooms();
      if (created?.id) {
        setSelectedRoomId(created.id);
      }
    } catch (err) {
      showMessage(err.message || '会議室の再読み込みに失敗しました', 'danger');
    }
  }

  const existingRooms = useMemo(() => rooms, [rooms]);

  function renderDayCell(day, slot, slotIndex) {
    const dayIndex = weekDays.findIndex((item) => item.dateText === day.dateText);
    const gridColumn = dayIndex + 2;
    const reservation = findReservationAtSlot(reservations, day.dateText, slot);
    const isHourStart = slot.minute % 60 === 0;
    const dayClasses = [
      'meeting-room-calendar-cell',
      day.isOffDay ? 'is-off-day' : '',
      day.isWeekend ? 'is-weekend' : '',
      day.isHoliday ? 'is-holiday' : '',
      day.isToday ? 'is-today-col' : '',
      isHourStart ? 'is-hour-start' : 'is-half-hour',
    ]
      .filter(Boolean)
      .join(' ');

    if (reservation) {
      const span = countSlotSpan(reservation, room);
      const canModify = canModifyMeetingRoomReservation(user, reservation);
      return (
        <button
          key={`${day.dateText}-${slot.minute}`}
          type="button"
          className={`${dayClasses} meeting-room-calendar-cell-booked${reservation.ownedByCurrentUser ? ' is-own' : ''}${canModify ? '' : ' is-view-only'}`}
          style={{
            gridColumn,
            gridRow: `${slotIndex + 2} / span ${span}`,
          }}
          onClick={() => openReservationModal(reservation)}
          title={canModify ? formatReservationRange(reservation) : `${formatReservationRange(reservation)}（閲覧のみ）`}
        >
          <span className="meeting-room-calendar-event-time">{formatReservationTimeShort(reservation)}</span>
          <span className="meeting-room-calendar-event-title">{reservation.title}</span>
          <span className="meeting-room-calendar-event-meta">
            <i className="bi bi-person-fill" aria-hidden="true" />
            {reservation.reservedByName}
          </span>
        </button>
      );
    }
    if (isContinuationCell(reservations, day.dateText, slot)) {
      return null;
    }
    return (
      <button
        key={`${day.dateText}-${slot.minute}`}
        type="button"
        className={`${dayClasses} meeting-room-calendar-cell-free`}
        style={{
          gridColumn,
          gridRow: slotIndex + 2,
        }}
        onClick={() => openCreateModal(day.dateText, slot.minute)}
        disabled={!canWriteMeetingRoomReservations(user)}
        aria-label={`${day.dateText} ${slot.label} を予約`}
      >
        <span className="meeting-room-calendar-cell-hint" aria-hidden="true">
          <i className="bi bi-plus-lg" />
        </span>
      </button>
    );
  }

  return (
    <div className="page-content meeting-room-page">
      <div className="meeting-room-page-inner">
        <section className="meeting-room-hero">
          <div className="meeting-room-hero-top">
            <div className="meeting-room-hero-brand">
              <div className="meeting-room-hero-icon" aria-hidden="true">
                <i className="bi bi-door-open" />
              </div>
              <div>
                <div className="meeting-room-hero-title-row">
                  <h1 className="meeting-room-hero-title">会議室予約</h1>
                  {canManageMeetingRooms(user) && (
                    <button
                      type="button"
                      className="btn btn-primary meeting-room-quick-btn meeting-room-hero-create-btn"
                      onClick={() => setCreateOpen(true)}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      新規会議室
                    </button>
                  )}
                  <PageGuideHelpButton guideId="meeting-room-calendar" />
                </div>
                <p className="meeting-room-hero-lead">会議室を選び、空き時間をクリックして予約できます</p>
              </div>
            </div>
          </div>

          {rooms.length > 0 && (
            <div className="meeting-room-cards-section" data-guide="meeting-room-selector">
              <h2 className="meeting-room-section-title">会議室を選択</h2>
              <div className="meeting-room-cards" role="listbox" aria-label="会議室を選択">
                {rooms.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === selectedRoomId}
                    className={`meeting-room-card${item.id === selectedRoomId ? ' is-active' : ''}`}
                    onClick={() => handleRoomChange(item.id)}
                  >
                    <span className="meeting-room-card-icon" aria-hidden="true">
                      <i className="bi bi-door-open" />
                    </span>
                    <span className="meeting-room-card-name">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {room && (
          <section className="meeting-room-detail-panel" aria-live="polite">
            <div className="meeting-room-detail-header">
              <h2 className="meeting-room-detail-title">{room.name}</h2>
              <span className="meeting-room-detail-badge">基本情報</span>
            </div>
            <div className="meeting-room-meta-grid">
              <div className="meeting-room-meta-card">
                <span className="meeting-room-meta-label">定員</span>
                <strong>{room.capacity != null ? `${room.capacity}名` : '—'}</strong>
              </div>
              <div className="meeting-room-meta-card">
                <span className="meeting-room-meta-label">予約単位</span>
                <strong>{room.slotMinutes}分</strong>
              </div>
              <div className="meeting-room-meta-card">
                <span className="meeting-room-meta-label">利用時間</span>
                <strong>
                  {room.businessStart} 〜 {room.businessEnd}
                </strong>
              </div>
            </div>
            {equipmentItems.length > 0 && (
              <div className="meeting-room-equipment-section">
                <h3 className="meeting-room-equipment-title">設備</h3>
                <div className="meeting-room-equipment-cards">
                  {equipmentItems.map((item) => (
                    <div key={item} className="meeting-room-equipment-card">
                      <span className="meeting-room-equipment-card-icon" aria-hidden="true">
                        <i className="bi bi-check2-circle" />
                      </span>
                      <span className="meeting-room-equipment-card-name">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {!room && !loading && rooms.length === 0 && (
          <div className="alert alert-warning meeting-room-empty-alert">
            利用可能な会議室が登録されていません。管理者に会議室設定を依頼してください。
          </div>
        )}

        {room && (
          <section className="meeting-room-calendar-panel" data-guide="meeting-room-calendar">
            <div className="meeting-room-calendar-toolbar" data-guide="meeting-room-week">
              <div className="meeting-room-toolbar-top">
                <div className="meeting-room-toolbar-period">
                  <span className="meeting-room-toolbar-period-icon" aria-hidden="true">
                    <i className="bi bi-calendar3-week" />
                  </span>
                  <div className="meeting-room-toolbar-period-text">
                    <h2 className="meeting-room-calendar-period">{weekLabel}</h2>
                    <p className="meeting-room-toolbar-subtitle">週間予約カレンダー</p>
                  </div>
                </div>
                <div className="meeting-room-toolbar-meta">
                  <span className="meeting-room-count-chip">
                    <i className="bi bi-journal-check" aria-hidden="true" />
                    今週 <strong>{reservationCount}</strong> 件
                  </span>
                  {canManageMeetingRooms(user) && (
                    <button
                      type="button"
                      className="meeting-room-toolbar-settings-btn"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <i className="bi bi-gear" aria-hidden="true" />
                      <span>設定</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="meeting-room-toolbar-bottom">
                <div className="meeting-room-week-nav" role="group" aria-label="週移動">
                  <button
                    type="button"
                    className="meeting-room-week-nav-btn"
                    onClick={() => setWeekStart((prev) => addDays(prev, -7))}
                    aria-label="前の週"
                  >
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`meeting-room-week-nav-btn meeting-room-week-nav-btn-label${viewingCurrentWeek ? ' is-active' : ''}`}
                    onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
                  >
                    今週
                  </button>
                  <button
                    type="button"
                    className="meeting-room-week-nav-btn"
                    onClick={() => setWeekStart((prev) => addDays(prev, 7))}
                    aria-label="次の週"
                  >
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </div>
                <div className="meeting-room-legend-chips" aria-label="予約の凡例">
                  <span className="meeting-room-legend-chip is-own">
                    <span className="meeting-room-legend-swatch is-own" aria-hidden="true" />
                    自分
                  </span>
                  <span className="meeting-room-legend-chip is-other">
                    <span className="meeting-room-legend-swatch is-other" aria-hidden="true" />
                    他人
                  </span>
                </div>
              </div>
            </div>

            <div className={`meeting-room-calendar-wrap${loading ? ' is-loading' : ''}`}>
              {loading && (
                <div className="meeting-room-calendar-loading">
                  <div className="spinner-border text-primary" role="status" />
                  <span>読み込み中…</span>
                </div>
              )}
              <div className="meeting-room-calendar-inner">
                <div className="meeting-room-calendar" style={gridStyle}>
                  <div className="meeting-room-calendar-corner">
                    <span className="meeting-room-calendar-corner-label">GMT+9</span>
                  </div>
                  {weekDays.map((day, index) => (
                    <div
                      key={day.dateText}
                      className={`meeting-room-calendar-day-head${day.isOffDay ? ' is-off-day' : ''}${day.isWeekend ? ' is-weekend' : ''}${day.isHoliday ? ' is-holiday' : ''}${day.isToday ? ' is-today' : ''}`}
                      style={{ gridColumn: index + 2, gridRow: 1 }}
                      title={day.holidayName || undefined}
                    >
                      <span className="meeting-room-calendar-weekday">{day.weekdayLabel}</span>
                      <span className={`meeting-room-calendar-day-badge${day.isToday ? ' is-today' : ''}`}>{day.dayLabel}</span>
                      {day.holidayName ? (
                        <span className="meeting-room-calendar-holiday-name">{day.holidayName}</span>
                      ) : (
                        !day.isToday && <span className="meeting-room-calendar-month">{day.monthLabel}月</span>
                      )}
                    </div>
                  ))}
                  {timeSlots.map((slot, slotIndex) => (
                    <div
                      key={`time-${slot.minute}`}
                      className={`meeting-room-calendar-time-col${slot.minute % 60 === 0 ? ' is-hour' : ' is-half'}`}
                      style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
                    >
                      {slot.minute % 60 === 0 ? slot.label : ''}
                    </div>
                  ))}
                  {timeSlots.flatMap((slot, slotIndex) => weekDays.map((day) => renderDayCell(day, slot, slotIndex)))}
                  {currentTimeRow && (
                    <div
                      className="meeting-room-now-line"
                      style={{
                        gridColumn: '2 / -1',
                        gridRow: currentTimeRow.index + 2,
                        '--now-offset': `${currentTimeRow.offsetRatio * 100}%`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <MeetingRoomReservationModal
          open={modalState.open}
          mode={modalState.mode}
          room={room}
          initialDateText={modalState.dateText}
          initialStartMinute={modalState.startMinute}
          reservation={modalState.reservation}
          onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
          onSubmit={handleReservationSubmit}
          onCancelReservation={handleReservationCancel}
        />

        <MeetingRoomCreateModal
          open={createOpen}
          existingRooms={existingRooms}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleRoomCreateSubmit}
        />

        <MeetingRoomSettingsModal
          open={settingsOpen}
          room={room}
          existingRooms={existingRooms}
          onClose={() => setSettingsOpen(false)}
          onSubmit={handleRoomSettingsSubmit}
          onDelete={handleRoomDelete}
        />

        <AppFooter />
      </div>
    </div>
  );
}
