import { useMemo, useState } from 'react';
import ClientNamePicker from '../ClientNamePicker';
import { eventStatusVariant, eventTypeVariant } from '../../utils/clientEventForm';

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

function FormSection({ title, icon, step, children }) {
  return (
    <section className="client-event-form-section">
      <h3 className="client-event-form-section-title">
        {step != null && <span className="client-event-form-step">{step}</span>}
        <i className={`bi ${icon}`} aria-hidden="true" />
        {title}
      </h3>
      <div className="client-event-form-section-body">{children}</div>
    </section>
  );
}

function ChipGroup({ label, options, value, onChange, getVariant }) {
  return (
    <div className="client-event-form-field">
      <span className="client-event-form-label client-event-form-label-static">{label}</span>
      <div className="client-event-chip-group" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          const variant = getVariant(option);
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`client-event-chip client-event-chip--${variant}${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientEventFormFields({
  form,
  eventTypes,
  statusOptions,
  participantOptions,
  onFieldChange,
  onToggleParticipant,
}) {
  const [participantQuery, setParticipantQuery] = useState('');

  const filteredParticipants = useMemo(() => {
    const q = participantQuery.trim().toLowerCase();
    if (!q) return participantOptions;
    return participantOptions.filter((p) => {
      const haystack = [p.name, p.employeeCode, p.departmentName, p.position]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [participantOptions, participantQuery]);

  const selectedParticipants = useMemo(
    () =>
      participantOptions.filter((p) => form.participantIds.includes(String(p.id))),
    [participantOptions, form.participantIds]
  );

  const isPostponed = form.eventStatus === '延期';

  return (
    <div className="client-event-form-fields">
      {isPostponed && (
        <div className="client-event-form-alert" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            延期の場合は、<strong>本日以降の開催日</strong>または<strong>備考</strong>
            のいずれかを入力してください。
          </span>
        </div>
      )}

      <FormSection title="基本情報" icon="bi-building" step={1}>
        <div className="client-event-form-grid client-event-form-grid-2">
          <FormField label="取引先" required icon="bi-building">
            <ClientNamePicker
              value={{ clientId: form.clientId, clientName: form.clientName }}
              onChange={({ clientId, clientName }) => {
                onFieldChange('clientId', clientId);
                onFieldChange('clientName', clientName);
              }}
              required
            />
          </FormField>
          <FormField label="イベント名" htmlFor="eventName" required icon="bi-megaphone">
            <input
              id="eventName"
              type="text"
              className="form-control"
              placeholder="例：製品説明会、新年挨拶"
              value={form.eventName}
              onChange={(e) => onFieldChange('eventName', e.target.value)}
              required
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="日時・場所" icon="bi-calendar3" step={2}>
        <div className="client-event-form-grid client-event-form-grid-3">
          <FormField label="開催日" htmlFor="eventDate" required icon="bi-calendar-event">
            <input
              id="eventDate"
              type="date"
              className="form-control"
              value={form.eventDate}
              onChange={(e) => onFieldChange('eventDate', e.target.value)}
              required
            />
          </FormField>
          <FormField label="時間" htmlFor="eventTime" icon="bi-clock" hint="例：14:00-16:00">
            <input
              id="eventTime"
              type="text"
              className="form-control"
              placeholder="14:00-16:00"
              value={form.eventTime}
              onChange={(e) => onFieldChange('eventTime', e.target.value)}
            />
          </FormField>
          <FormField label="場所" htmlFor="eventLocation" icon="bi-geo-alt">
            <input
              id="eventLocation"
              type="text"
              className="form-control"
              placeholder="会場名・住所など"
              value={form.location}
              onChange={(e) => onFieldChange('location', e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="分類" icon="bi-tags" step={3}>
        <div className="client-event-form-grid client-event-form-grid-2">
          <ChipGroup
            label="イベント種別"
            options={eventTypes}
            value={form.eventType}
            onChange={(v) => onFieldChange('eventType', v)}
            getVariant={eventTypeVariant}
          />
          <ChipGroup
            label="開催状態"
            options={statusOptions}
            value={form.eventStatus}
            onChange={(v) => onFieldChange('eventStatus', v)}
            getVariant={eventStatusVariant}
          />
        </div>
      </FormSection>

      <FormSection title="参加者" icon="bi-people" step={4}>
        <p className="client-event-form-section-desc">
          営業・管理職から選択（複数可）。スケジュール重複は保存時に確認します。
        </p>
        {selectedParticipants.length > 0 && (
          <div className="client-event-form-selected-bar">
            <span className="client-event-form-selected-label">
              選択中 {selectedParticipants.length} 名
            </span>
            <div className="client-event-form-selected-chips">
              {selectedParticipants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="client-event-form-selected-chip"
                  onClick={() => onToggleParticipant(p.id)}
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
              placeholder="氏名・社員番号・部署で検索"
              value={participantQuery}
              onChange={(e) => setParticipantQuery(e.target.value)}
            />
          </div>
          {participantQuery && (
            <button
              type="button"
              className="btn btn-link btn-sm client-event-form-clear-search"
              onClick={() => setParticipantQuery('')}
            >
              検索をクリア
            </button>
          )}
        </div>
        <div className="client-event-participant-picker client-event-form-participant-picker">
          {participantOptions.length === 0 ? (
            <p className="client-event-form-empty mb-0">選択可能な参加者がありません。</p>
          ) : filteredParticipants.length === 0 ? (
            <p className="client-event-form-empty mb-0">検索条件に一致する社員がいません。</p>
          ) : (
            filteredParticipants.map((p) => {
              const checked = form.participantIds.includes(String(p.id));
              return (
                <label
                  key={p.id}
                  className={`client-event-participant-option client-event-form-participant-card${checked ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleParticipant(p.id)}
                  />
                  <span className="client-event-form-participant-avatar" aria-hidden="true">
                    {participantInitial(p.name)}
                  </span>
                  <span className="client-event-form-participant-info">
                    <span className="client-event-participant-name">{p.name}</span>
                    <span className="client-event-form-participant-meta">
                      {[p.employeeCode, p.departmentName, p.position].filter(Boolean).join(' · ')}
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

      <FormSection title="備考" icon="bi-card-text" step={5}>
        <FormField label="メモ・補足" htmlFor="eventNotes" icon="bi-journal-text">
          <textarea
            id="eventNotes"
            className="form-control"
            rows={4}
            placeholder="延期理由、持ち物、集合場所など"
            value={form.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
          />
        </FormField>
      </FormSection>
    </div>
  );
}
