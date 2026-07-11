export const EMPTY_TASK = {
  key: '',
  title: '',
  description: '',
  status: '未着手',
  priority: '中',
  dueDate: '',
  assigneeEmployeeId: '',
};

export const EMPTY_FORM = {
  clientId: '',
  clientName: '',
  clientContactPerson: '',
  title: '',
  meetingDate: '',
  meetingTime: '',
  location: '',
  agenda: '',
  minutesBody: '',
  issuesSummary: '',
  attendeeIds: [],
  tasks: [],
};

export const TASK_STATUS_OPTIONS = ['未着手', '対応中', '完了', '保留'];
export const TASK_PRIORITY_OPTIONS = ['高', '中', '低'];

export const TASK_STATUS_VARIANTS = {
  未着手: 'todo',
  対応中: 'progress',
  完了: 'done',
  保留: 'hold',
};

export const TASK_PRIORITY_VARIANTS = {
  高: 'high',
  中: 'medium',
  低: 'low',
};

let taskKeyCounter = 0;

export function nextTaskKey() {
  taskKeyCounter += 1;
  return `task-${taskKeyCounter}`;
}

export function createEmptyTask() {
  return { ...EMPTY_TASK, key: nextTaskKey() };
}

export function formatEmployeeLabel(employee) {
  return [employee.name, employee.departmentName || '—', employee.position || '—'].join(' / ');
}

export function formatMeetingDateParts(dateStr) {
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

export function formatWeekday(dateStr) {
  const parts = formatMeetingDateParts(dateStr);
  return parts.weekday ? `（${parts.weekday}）` : '';
}

export function recordToForm(record) {
  return {
    clientId: record.clientId != null ? String(record.clientId) : '',
    clientName: record.clientName ?? '',
    clientContactPerson: record.clientContactPerson ?? '',
    title: record.title ?? '',
    meetingDate: record.meetingDate ?? '',
    meetingTime: record.meetingTime ?? '',
    location: record.location ?? '',
    agenda: record.agenda ?? '',
    minutesBody: record.minutesBody ?? '',
    issuesSummary: record.issuesSummary ?? '',
    attendeeIds: (record.attendees ?? []).map((a) => String(a.employeeId)),
    tasks: (record.tasks ?? []).map((task) => ({
      key: nextTaskKey(),
      title: task.title ?? '',
      description: task.description ?? '',
      status: task.status ?? '未着手',
      priority: task.priority ?? '中',
      dueDate: task.dueDate ?? '',
      assigneeEmployeeId: task.assigneeEmployeeId ? String(task.assigneeEmployeeId) : '',
    })),
  };
}

export function formToPayload(form) {
  return {
    clientId: form.clientId ? Number(form.clientId) : null,
    clientName: form.clientName.trim(),
    clientContactPerson: form.clientContactPerson.trim() || undefined,
    title: form.title.trim(),
    meetingDate: form.meetingDate,
    meetingTime: form.meetingTime.trim() || undefined,
    location: form.location.trim() || undefined,
    agenda: form.agenda.trim() || undefined,
    minutesBody: form.minutesBody.trim() || undefined,
    issuesSummary: form.issuesSummary.trim() || undefined,
    attendees: form.attendeeIds.map((id) => ({ employeeId: Number(id) })),
    tasks: form.tasks
      .filter((task) => task.title.trim())
      .map((task) => ({
        title: task.title.trim(),
        description: task.description.trim() || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || undefined,
        assigneeEmployeeId: task.assigneeEmployeeId ? Number(task.assigneeEmployeeId) : undefined,
      })),
  };
}

export function taskStatusVariant(status) {
  return TASK_STATUS_VARIANTS[status] ?? 'todo';
}

export function taskPriorityVariant(priority) {
  return TASK_PRIORITY_VARIANTS[priority] ?? 'medium';
}
