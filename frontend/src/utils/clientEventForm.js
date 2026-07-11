export const EMPTY_FORM = {
  clientId: '',
  clientName: '',
  eventName: '',
  eventDate: '',
  eventTime: '',
  location: '',
  eventType: 'その他',
  eventStatus: '予定',
  notes: '',
  participantIds: [],
};

export const EVENT_STATUS_OPTIONS = ['予定', '実施済', '中止', '延期'];

export function eventToForm(event) {
  return {
    clientId: event.clientId != null ? String(event.clientId) : '',
    clientName: event.clientName ?? '',
    eventName: event.eventName ?? '',
    eventDate: event.eventDate ?? '',
    eventTime: event.eventTime ?? '',
    location: event.location ?? '',
    eventType: event.eventType ?? 'その他',
    eventStatus: event.eventStatus ?? '予定',
    notes: event.notes ?? '',
    participantIds: (event.participants ?? []).map((p) => String(p.employeeId)),
  };
}

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validatePostponedForm(form) {
  if (form.eventStatus !== '延期') {
    return null;
  }
  const hasNotes = form.notes.trim().length > 0;
  const hasFutureOrTodayDate = form.eventDate && form.eventDate >= todayIsoDate();
  if (!hasNotes && !hasFutureOrTodayDate) {
    return '延期の場合、本日以降の開催日または備考を入力してください';
  }
  return null;
}

export function formToPayload(form) {
  return {
    clientId: form.clientId ? Number(form.clientId) : null,
    clientName: form.clientName.trim(),
    eventName: form.eventName.trim(),
    eventDate: form.eventDate,
    eventTime: form.eventTime.trim() || undefined,
    location: form.location.trim() || undefined,
    eventType: form.eventType,
    eventStatus: form.eventStatus,
    notes: form.notes.trim() || undefined,
    participants: form.participantIds.map((id) => ({ employeeId: Number(id) })),
  };
}

export function formatOverlapConfirmMessage(overlaps) {
  const lines = overlaps.map((item) => {
    const time = item.conflictingEventTime || '時間未設定';
    const note = item.sameDayOnly
      ? '（時間未設定のため同日重複の可能性）'
      : '（時間帯が重複）';
    return `・${item.employeeName}：${item.conflictingEventName}（${item.conflictingClientName}） ${time} ${note}`;
  });
  return `以下の参加者にスケジュールの重複があります。\n\n${lines.join('\n')}\n\nこのまま保存しますか？`;
}

export function formatWeekday(dateStr) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
}

export const EVENT_TYPE_VARIANTS = {
  説明会: 'briefing',
  接待: 'reception',
  セミナー: 'seminar',
  訪問: 'visit',
  展示会: 'expo',
  その他: 'other',
};

export const EVENT_STATUS_VARIANTS = {
  予定: 'scheduled',
  実施済: 'done',
  中止: 'cancelled',
  延期: 'postponed',
};

export function eventTypeVariant(type) {
  return EVENT_TYPE_VARIANTS[type] ?? 'other';
}

export function eventStatusVariant(status) {
  return EVENT_STATUS_VARIANTS[status] ?? 'scheduled';
}
