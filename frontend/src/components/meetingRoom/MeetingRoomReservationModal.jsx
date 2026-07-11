import { useEffect, useMemo, useState } from 'react';
import { canModifyMeetingRoomReservation } from '../../auth';
import { useAuth } from '../../context/AuthContext';
import {
  buildDateTime,
  buildTimeSlots,
  durationOptions,
  parseTimeToMinutes,
} from '../../utils/meetingRoomCalendar';

const EMPTY_FORM = {
  title: '',
  dateText: '',
  startMinute: '',
  durationSlots: 1,
  description: '',
};

function formatMinuteLabel(minute) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function MeetingRoomReservationModal({
  open,
  mode,
  room,
  initialDateText,
  initialStartMinute,
  reservation,
  onClose,
  onSubmit,
  onCancelReservation,
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const timeSlots = useMemo(() => buildTimeSlots(room), [room]);
  const durations = useMemo(() => durationOptions(room), [room]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (mode === 'edit' && reservation) {
      const startDate = reservation.startAt?.slice(0, 10);
      const startTime = reservation.startAt?.slice(11, 16);
      const startMinute = parseTimeToMinutes(startTime);
      const endMinute = parseTimeToMinutes(reservation.endAt?.slice(11, 16));
      const durationSlots = Math.max(1, Math.round((endMinute - startMinute) / (room?.slotMinutes || 30)));
      setForm({
        title: reservation.title || '',
        dateText: startDate,
        startMinute: String(startMinute),
        durationSlots,
        description: reservation.description || '',
      });
      return;
    }
    setForm({
      title: '',
      dateText: initialDateText || '',
      startMinute: initialStartMinute != null ? String(initialStartMinute) : String(timeSlots[0]?.minute ?? ''),
      durationSlots: 1,
      description: '',
    });
  }, [open, mode, reservation, initialDateText, initialStartMinute, room, timeSlots]);

  const timeSummary = useMemo(() => {
    if (!room || !form.startMinute || !form.dateText) return '';
    const start = Number(form.startMinute);
    const end = start + Number(form.durationSlots) * room.slotMinutes;
    return `${formatMinuteLabel(start)} 〜 ${formatMinuteLabel(end)}`;
  }, [room, form.startMinute, form.durationSlots, form.dateText]);

  if (!open || !room) return null;

  const canModify = mode !== 'create' && canModifyMeetingRoomReservation(user, reservation);
  const readOnly = mode === 'view' || (mode === 'edit' && !canModify);
  const formLocked = readOnly;
  const titleText =
    mode === 'create' ? '会議室を予約' : canModify ? '予約を編集' : '予約詳細';
  const headerIcon =
    mode === 'create' ? 'bi-calendar2-plus' : canModify ? 'bi-pencil-square' : 'bi-eye';

  async function handleSubmit(event) {
    event.preventDefault();
    if (readOnly || (mode === 'edit' && !canModify)) return;
    setSaving(true);
    setError('');
    try {
      const startMinute = Number(form.startMinute);
      const duration = Number(form.durationSlots);
      const endMinute = startMinute + duration * room.slotMinutes;
      const payload = {
        roomId: room.id,
        title: form.title.trim(),
        startAt: buildDateTime(form.dateText, startMinute),
        endAt: buildDateTime(form.dateText, endMinute),
        description: form.description.trim() || null,
      };
      await onSubmit(payload, mode === 'edit' ? reservation.id : null);
      onClose();
    } catch (err) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelReservation() {
    if (!canModify || !reservation?.id) return;
    if (!window.confirm('この予約をキャンセルしますか？')) return;
    setSaving(true);
    setError('');
    try {
      await onCancelReservation(reservation.id);
      onClose();
    } catch (err) {
      setError(err.message || 'キャンセルに失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="meeting-room-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-reservation-modal-title"
      onClick={onClose}
    >
      <div
        className="meeting-room-modal-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="meeting-room-modal-panel">
          <form onSubmit={handleSubmit} className="meeting-room-modal-form">
            <header className="meeting-room-modal-header">
              <div className="meeting-room-modal-header-main">
                <span className="meeting-room-modal-header-icon" aria-hidden="true">
                  <i className={`bi ${headerIcon}`} />
                </span>
                <h2 id="meeting-reservation-modal-title" className="meeting-room-modal-title">
                  {titleText}
                </h2>
              </div>
              <button
                type="button"
                className="meeting-room-modal-close"
                aria-label="閉じる"
                onClick={onClose}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className="meeting-room-modal-body">
              {error && (
                <div className="meeting-room-modal-alert" role="alert">
                  <i className="bi bi-exclamation-circle" aria-hidden="true" />
                  {error}
                </div>
              )}

              <div className="meeting-room-modal-room-chip">
                <i className="bi bi-door-open" aria-hidden="true" />
                <span className="meeting-room-modal-room-name">{room.name}</span>
                <span className="meeting-room-modal-room-meta">{room.slotMinutes}分単位</span>
              </div>

              {mode !== 'create' && !canModify && (
                <div className="meeting-room-modal-readonly-notice">
                  <i className="bi bi-info-circle" aria-hidden="true" />
                  他人の予約は閲覧のみ可能です。編集・取消は予約者本人または管理者のみ行えます。
                </div>
              )}

              <div className="meeting-room-modal-field">
                <label className="meeting-room-modal-label" htmlFor="meeting-reservation-title">
                  件名 <span className="meeting-room-modal-required">*</span>
                </label>
                <input
                  id="meeting-reservation-title"
                  className="meeting-room-modal-input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  readOnly={formLocked}
                  placeholder="例：定例ミーティング"
                  required
                />
              </div>

              <div className="meeting-room-modal-schedule">
                <div className="meeting-room-modal-field">
                  <label className="meeting-room-modal-label" htmlFor="meeting-reservation-date">
                    日付
                  </label>
                  <div className="meeting-room-modal-input-wrap">
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    <input
                      id="meeting-reservation-date"
                      type="date"
                      className="meeting-room-modal-input meeting-room-modal-input-with-icon"
                      value={form.dateText}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateText: e.target.value }))}
                      readOnly={readOnly || mode === 'edit'}
                      required
                    />
                  </div>
                </div>
                <div className="meeting-room-modal-field">
                  <label className="meeting-room-modal-label" htmlFor="meeting-reservation-start">
                    開始
                  </label>
                  <div className="meeting-room-modal-input-wrap">
                    <i className="bi bi-clock" aria-hidden="true" />
                    <select
                      id="meeting-reservation-start"
                      className="meeting-room-modal-select meeting-room-modal-input-with-icon"
                      value={form.startMinute}
                      onChange={(e) => setForm((prev) => ({ ...prev, startMinute: e.target.value }))}
                      disabled={formLocked}
                      required
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot.minute} value={slot.minute}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="meeting-room-modal-field">
                  <label className="meeting-room-modal-label" htmlFor="meeting-reservation-duration">
                    時間
                  </label>
                  <div className="meeting-room-modal-input-wrap">
                    <i className="bi bi-hourglass-split" aria-hidden="true" />
                    <select
                      id="meeting-reservation-duration"
                      className="meeting-room-modal-select meeting-room-modal-input-with-icon"
                      value={form.durationSlots}
                      onChange={(e) => setForm((prev) => ({ ...prev, durationSlots: Number(e.target.value) }))}
                      disabled={formLocked}
                    >
                      {durations.map((item) => (
                        <option key={item.slots} value={item.slots}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {timeSummary && (
                <p className="meeting-room-modal-time-summary">
                  <i className="bi bi-arrow-right-circle" aria-hidden="true" />
                  {timeSummary}
                </p>
              )}

              <div className="meeting-room-modal-field">
                <label className="meeting-room-modal-label" htmlFor="meeting-reservation-description">
                  備考
                </label>
                <textarea
                  id="meeting-reservation-description"
                  className="meeting-room-modal-textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  readOnly={formLocked}
                  placeholder="共有事項があれば入力してください"
                />
              </div>

              {mode !== 'create' && reservation && (
                <div className="meeting-room-modal-reserved-by">
                  <i className="bi bi-person-circle" aria-hidden="true" />
                  <span>予約者：{reservation.reservedByName}</span>
                </div>
              )}
            </div>

            <footer className="meeting-room-modal-footer">
              {canModify && (
                <button
                  type="button"
                  className="meeting-room-modal-btn meeting-room-modal-btn-danger"
                  onClick={handleCancelReservation}
                  disabled={saving}
                >
                  予約を取消
                </button>
              )}
              <div className="meeting-room-modal-footer-actions">
                <button
                  type="button"
                  className="meeting-room-modal-btn meeting-room-modal-btn-ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  閉じる
                </button>
                {!readOnly && mode === 'create' && (
                  <button
                    type="submit"
                    className="meeting-room-modal-btn meeting-room-modal-btn-primary"
                    disabled={saving}
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                )}
                {canModify && mode === 'edit' && (
                  <button
                    type="submit"
                    className="meeting-room-modal-btn meeting-room-modal-btn-primary"
                    disabled={saving}
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                )}
              </div>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}
