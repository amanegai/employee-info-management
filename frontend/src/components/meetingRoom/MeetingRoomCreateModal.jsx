import { useEffect, useState } from 'react';
import { getFloorInputProps, isDuplicateRoomOnFloor } from '../../utils/meetingRoomValidation';

const SLOT_OPTIONS = [
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
];

const EMPTY_FORM = {
  name: '',
  floor: '',
  capacity: '',
  equipment: '',
  slotMinutes: 30,
  businessStart: '09:00',
  businessEnd: '22:00',
};

export default function MeetingRoomCreateModal({ open, existingRooms = [], onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(EMPTY_FORM);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('会議室名は必須です');
      return;
    }
    const trimmedFloor = form.floor.trim() || null;
    if (isDuplicateRoomOnFloor(trimmedName, trimmedFloor, existingRooms)) {
      setError('同じフロアに同じ名前の会議室が既に存在します');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        name: trimmedName,
        floor: trimmedFloor,
        capacity: form.capacity ? Number(form.capacity) : null,
        equipment: form.equipment.trim() || null,
        slotMinutes: Number(form.slotMinutes),
        businessStart: form.businessStart.slice(0, 5),
        businessEnd: form.businessEnd.slice(0, 5),
        active: true,
      });
    } catch (err) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal d-block meeting-room-modal-backdrop" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered modal-lg meeting-room-modal">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2 className="modal-title h5 mb-0">新規会議室</h2>
              <button type="button" className="btn-close" aria-label="閉じる" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="meeting-room-create-name">
                    会議室名 <span className="text-danger">*</span>
                  </label>
                  <input
                    id="meeting-room-create-name"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="meeting-room-create-floor">
                    フロア
                  </label>
                  <input
                    id="meeting-room-create-floor"
                    className="form-control"
                    {...getFloorInputProps(form.floor, (floor) => setForm((prev) => ({ ...prev, floor })))}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="meeting-room-create-capacity">
                    定員
                  </label>
                  <input
                    id="meeting-room-create-capacity"
                    type="number"
                    min="1"
                    className="form-control"
                    value={form.capacity}
                    onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="meeting-room-create-equipment">
                    設備
                  </label>
                  <input
                    id="meeting-room-create-equipment"
                    className="form-control"
                    placeholder="例：テレビモニター、ホワイトボード"
                    value={form.equipment}
                    onChange={(e) => setForm((prev) => ({ ...prev, equipment: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="meeting-room-create-slot">
                    予約時間枠
                  </label>
                  <select
                    id="meeting-room-create-slot"
                    className="form-select"
                    value={form.slotMinutes}
                    onChange={(e) => setForm((prev) => ({ ...prev, slotMinutes: Number(e.target.value) }))}
                  >
                    {SLOT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="meeting-room-create-start">
                    利用開始
                  </label>
                  <input
                    id="meeting-room-create-start"
                    type="time"
                    className="form-control"
                    value={form.businessStart}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessStart: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="meeting-room-create-end">
                    利用終了
                  </label>
                  <input
                    id="meeting-room-create-end"
                    type="time"
                    className="form-control"
                    value={form.businessEnd}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessEnd: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                閉じる
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '登録中…' : '登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
