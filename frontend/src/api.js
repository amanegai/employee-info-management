const API_BASE = '/api';

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function importMasterFile(path, file, dryRun) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dryRun', dryRun ? 'true' : 'false');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (res.status === 401) {
    unauthorizedHandler?.();
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail || body.message || body.title || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    const skipUnauthorizedRedirect =
      path === '/auth/me' ||
      path === '/auth/login' ||
      path === '/auth/logout' ||
      path.startsWith('/auth/mfa/');
    if (!skipUnauthorizedRedirect) {
      unauthorizedHandler?.();
    }
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail || body.message || body.title || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  verifyMfa: (body) => request('/auth/mfa/verify', { method: 'POST', body: JSON.stringify(body) }),
  beginMfaSetup: (body = {}) =>
    request('/auth/mfa/setup/begin', { method: 'POST', body: JSON.stringify(body) }),
  confirmMfaSetup: (body) =>
    request('/auth/mfa/setup/confirm', { method: 'POST', body: JSON.stringify(body) }),
  regenerateRecoveryCodes: (body) =>
    request('/auth/mfa/recovery/regenerate', { method: 'POST', body: JSON.stringify(body) }),
  disableMfa: () => request('/auth/mfa/disable', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  getMyPage: () => request('/mypage'),
  getSummary: () => request('/summary'),
  getMaster: () => request('/master'),
  searchEmployees: (params) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.employeeCode) q.set('employeeCode', params.employeeCode);
    if (params.name) q.set('name', params.name);
    if (params.departmentId) q.set('departmentId', params.departmentId);
    if (params.affiliationCompany) q.set('affiliationCompany', params.affiliationCompany);
    if (params.summaryFilter) q.set('summaryFilter', params.summaryFilter);
    if (params.skillKeyword) q.set('skillKeyword', params.skillKeyword);
    if (params.technicalCategory) q.set('technicalCategory', params.technicalCategory);
    if (params.technicalItem) q.set('technicalItem', params.technicalItem);
    if (params.technicalMinLevel) q.set('technicalMinLevel', params.technicalMinLevel);
    if (params.employeeType) q.set('employeeType', params.employeeType);
    if (params.workStatus) q.set('workStatus', params.workStatus);
    const query = q.toString();
    return request(`/employees${query ? `?${query}` : ''}`);
  },
  getEmployeeDetail: (id) => request(`/employees/${id}/detail`),
  downloadEmployeeResumeExcel: async (id, filename) => {
    const res = await fetch(`${API_BASE}/employees/${id}/resume.xlsx`, {
      credentials: 'include',
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    const headerName = utfMatch
      ? decodeURIComponent(utfMatch[1])
      : plainMatch
        ? plainMatch[1]
        : '';
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || headerName || '技術履歴書.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
  getEmployeeAttendanceMonths: (id) => request(`/employees/${id}/attendance/months`),
  getEmployeeAttendance: (id, targetMonth) =>
    request(`/employees/${id}/attendance?targetMonth=${encodeURIComponent(targetMonth)}`),
  getEmployeePayrollSlips: (id) => request(`/employees/${id}/payroll-slips`),
  getEmployee: (id) => request(`/employees/${id}`),
  getNextEmployeeCode: () => request('/employee-code/next'),
  recommendEmployeeCode: (employeeType, departmentId, affiliationCompany) => {
    const q = new URLSearchParams();
    q.set('employeeType', employeeType);
    q.set('departmentId', String(departmentId));
    if (affiliationCompany) q.set('affiliationCompany', affiliationCompany);
    return request(`/employee-code/recommend?${q}`);
  },
  employeeCodeExists: (code) => {
    const q = new URLSearchParams();
    q.set('code', code ?? '');
    return request(`/employee-code/exists?${q}`);
  },
  createEmployee: (body) =>
    request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  createEmployeeFromImport: (body) =>
    request('/employees/import', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  listUsers: () => request('/admin/users'),
  importMasterEmployees: (file, dryRun = true) => importMasterFile('/admin/master/employees/import', file, dryRun),
  importMasterClients: (file, dryRun = true) => importMasterFile('/admin/master/clients/import', file, dryRun),
  createUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  listAuditLogs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.action) q.set('action', params.action);
    const query = q.toString();
    return request(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  matchProject: (body) => request('/project-match', { method: 'POST', body: JSON.stringify(body) }),
  getProjectStatuses: () => request('/projects/meta/statuses'),
  getCandidateStages: () => request('/candidates/meta/stages'),
  searchProjects: (params) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.status) q.set('status', params.status);
    const query = q.toString();
    return request(`/projects${query ? `?${query}` : ''}`);
  },
  getProject: (id) => request(`/projects/${id}`),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  patchProjectStatus: (id, body) =>
    request(`/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getBpHelpRequests: () => request('/bp-help-requests'),
  getBpHelpRequestCount: () => request('/bp-help-requests/count'),
  requestBpHelp: (id, body) =>
    request(`/projects/${id}/bp-help`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  cancelBpHelp: (id) => request(`/projects/${id}/bp-help/cancel`, { method: 'POST' }),
  getBpHelpReferrals: (projectId) => request(`/projects/${projectId}/bp-help/referrals`),
  submitBpHelpReferral: async (projectId, { candidateName, bpCompanyName, note, resume }) => {
    const formData = new FormData();
    formData.append('candidateName', candidateName);
    if (bpCompanyName?.trim()) formData.append('bpCompanyName', bpCompanyName.trim());
    if (note?.trim()) formData.append('note', note.trim());
    formData.append('resume', resume);
    const res = await fetch(`${API_BASE}/projects/${projectId}/bp-help/referrals`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.error || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.json();
  },
  approveBpHelpReferral: (id) => request(`/bp-help/referrals/${id}/approve`, { method: 'POST' }),
  rejectBpHelpReferral: (id, body) =>
    request(`/bp-help/referrals/${id}/reject`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  submitBpHelpReferralToClient: (id) =>
    request(`/bp-help/referrals/${id}/submit`, { method: 'POST' }),
  advanceBpHelpReferralStage: (id, body) =>
    request(`/bp-help/referrals/${id}/stage`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  hireBpHelpReferral: (id, body) =>
    request(`/bp-help/referrals/${id}/hire`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  withdrawBpHelpReferral: (id) =>
    request(`/bp-help/referrals/${id}/withdraw`, { method: 'POST' }),
  getNotifications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.unreadOnly) q.set('unreadOnly', 'true');
    if (params.limit) q.set('limit', String(params.limit));
    const query = q.toString();
    return request(`/notifications${query ? `?${query}` : ''}`);
  },
  getNotificationUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  markProjectNotificationsRead: (projectId) =>
    request(`/notifications/by-project/${projectId}/read`, { method: 'POST' }),
  getProjectCandidates: (projectId) => request(`/projects/${projectId}/candidates`),
  addProjectCandidate: (projectId, body) =>
    request(`/projects/${projectId}/candidates`, { method: 'POST', body: JSON.stringify(body) }),
  getEmployeeCandidates: (employeeId) => request(`/employees/${employeeId}/candidates`),
  patchCandidateStage: (id, body) =>
    request(`/candidates/${id}/stage`, { method: 'PATCH', body: JSON.stringify(body) }),
  confirmCandidate: (id, body) =>
    request(`/candidates/${id}/confirm`, { method: 'POST', body: JSON.stringify(body) }),
  rejectCandidate: (id, body) =>
    request(`/candidates/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
  withdrawCandidate: (id, body) =>
    request(`/candidates/${id}/withdraw`, { method: 'POST', body: JSON.stringify(body) }),
  getEmployeeAssignments: (employeeId) => request(`/employees/${employeeId}/assignments`),
  updateAssignment: (id, body) =>
    request(`/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelAssignment: (id, body) =>
    request(`/assignments/${id}/cancel`, { method: 'POST', body: JSON.stringify(body) }),
  getStatusSuggestions: (params) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    const query = q.toString();
    return request(`/employee-status/suggestions${query ? `?${query}` : ''}`);
  },
  applyStatusSuggestion: (id) => request(`/employee-status/suggestions/${id}/apply`, { method: 'POST' }),
  dismissStatusSuggestion: (id) => request(`/employee-status/suggestions/${id}/dismiss`, { method: 'POST' }),
  runStatusMaintenance: () => request('/employee-status/maintenance/run', { method: 'POST' }),
  getCancelFollowups: (params) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    const query = q.toString();
    return request(`/assignment-cancel-followups${query ? `?${query}` : ''}`);
  },
  getCancelFollowupOpenCount: () => request('/assignment-cancel-followups/open-count'),
  getEmployeeCancelFollowups: (employeeId, params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    const query = q.toString();
    return request(`/employees/${employeeId}/assignment-cancel-followups${query ? `?${query}` : ''}`);
  },
  resolveCancelFollowup: (id, body) =>
    request(`/assignment-cancel-followups/${id}/resolve`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  dismissCancelFollowup: (id) =>
    request(`/assignment-cancel-followups/${id}/dismiss`, { method: 'POST' }),
  getClientEventTypes: () => request('/client-events/meta/event-types'),
  getClientEventStatuses: () => request('/client-events/meta/event-statuses'),
  getClientEventEligibleParticipants: () => request('/client-events/eligible-participants'),
  searchClientEvents: (params) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.eventType) q.set('eventType', params.eventType);
    if (params.eventStatus) q.set('eventStatus', params.eventStatus);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo) q.set('dateTo', params.dateTo);
    if (params.participantEmployeeId) q.set('participantEmployeeId', params.participantEmployeeId);
    const query = q.toString();
    return request(`/client-events${query ? `?${query}` : ''}`);
  },
  getClientEvent: (id) => request(`/client-events/${id}`),
  checkClientEventOverlaps: (body, excludeEventId) => {
    const q = new URLSearchParams();
    if (excludeEventId) q.set('excludeEventId', excludeEventId);
    const query = q.toString();
    return request(`/client-events/check-overlaps${query ? `?${query}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  createClientEvent: (body) => request('/client-events', { method: 'POST', body: JSON.stringify(body) }),
  updateClientEvent: (id, body) =>
    request(`/client-events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClientEvent: (id) => request(`/client-events/${id}`, { method: 'DELETE' }),
  getClientMeetingEligibleAttendees: () => request('/client-meetings/eligible-attendees'),
  getClientMeetingSummaries: (clientName) => {
    const q = new URLSearchParams();
    if (clientName) q.set('clientName', clientName);
    const query = q.toString();
    return request(`/client-meetings/summaries${query ? `?${query}` : ''}`);
  },
  searchClientMeetings: (params) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo) q.set('dateTo', params.dateTo);
    if (params.attendeeEmployeeId) q.set('attendeeEmployeeId', params.attendeeEmployeeId);
    if (params.taskStatus) q.set('taskStatus', params.taskStatus);
    if (params.taskAssigneeEmployeeId) q.set('taskAssigneeEmployeeId', params.taskAssigneeEmployeeId);
    const query = q.toString();
    return request(`/client-meetings${query ? `?${query}` : ''}`);
  },
  getClientMeetingTaskStatuses: () => request('/client-meetings/meta/task-statuses'),
  getClientMeetingTaskPriorities: () => request('/client-meetings/meta/task-priorities'),
  getClientMeeting: (id) => request(`/client-meetings/${id}`),
  createClientMeeting: (body) => request('/client-meetings', { method: 'POST', body: JSON.stringify(body) }),
  updateClientMeeting: (id, body) =>
    request(`/client-meetings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClientMeeting: (id) => request(`/client-meetings/${id}`, { method: 'DELETE' }),
  getClientIssueStatuses: () => request('/client-issues/meta/statuses'),
  getClientIssuePriorities: () => request('/client-issues/meta/priorities'),
  getClientIssueEligibleAssignees: () => request('/client-issues/eligible-assignees'),
  searchClientIssues: (params) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.status) q.set('status', params.status);
    if (params.priority) q.set('priority', params.priority);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo) q.set('dateTo', params.dateTo);
    if (params.assigneeEmployeeId) q.set('assigneeEmployeeId', params.assigneeEmployeeId);
    if (params.meetingId) q.set('meetingId', params.meetingId);
    const query = q.toString();
    return request(`/client-issues${query ? `?${query}` : ''}`);
  },
  getClientIssue: (id) => request(`/client-issues/${id}`),
  createClientIssue: (body) => request('/client-issues', { method: 'POST', body: JSON.stringify(body) }),
  updateClientIssue: (id, body) =>
    request(`/client-issues/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClientIssue: (id) => request(`/client-issues/${id}`, { method: 'DELETE' }),
  getClientSummary: () => request('/clients/summary'),
  getClientContractStatuses: () => request('/clients/meta/contract-statuses'),
  getClientContractTypes: () => request('/clients/meta/contract-types'),
  getClientRanks: () => request('/clients/meta/ranks'),
  getClientEligibleInternalContacts: () => request('/clients/meta/eligible-internal-contacts'),
  searchClients: (params = {}) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.name) q.set('name', params.name);
    if (params.location) q.set('location', params.location);
    if (params.contractStatus) q.set('contractStatus', params.contractStatus);
    const query = q.toString();
    return request(`/clients${query ? `?${query}` : ''}`);
  },
  getClient: (id) => request(`/clients/${id}`),
  getClientProjects: (id) => request(`/clients/${id}/projects`),
  createClient: (body) => request('/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient: (id, body) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  listFiles: (params = {}) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.category) q.set('category', params.category);
    if (params.targetMonth) q.set('targetMonth', params.targetMonth);
    const query = q.toString();
    return request(`/files${query ? `?${query}` : ''}`);
  },
  uploadFile: async (file, options = {}) => {
    const { description, category, targetMonth, employeeId } = options;
    const formData = new FormData();
    formData.append('file', file);
    if (description?.trim()) {
      formData.append('description', description.trim());
    }
    if (category?.trim()) {
      formData.append('category', category.trim());
    }
    if (targetMonth?.trim()) {
      formData.append('targetMonth', targetMonth.trim());
    }
    if (employeeId != null && employeeId !== '') {
      formData.append('employeeId', String(employeeId));
    }
    const res = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.error || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.json();
  },
  uploadFilesBatch: async (files, options = {}) => {
    const { description, category, targetMonth, syncAttendance, attendanceUpdates, syncExpense, expenseUpdates } =
      options;
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (description?.trim()) formData.append('description', description.trim());
    if (category?.trim()) formData.append('category', category.trim());
    if (targetMonth?.trim()) formData.append('targetMonth', targetMonth.trim());
    if (syncAttendance) formData.append('syncAttendance', 'true');
    if (attendanceUpdates?.length) {
      formData.append('attendanceUpdates', JSON.stringify(attendanceUpdates));
    }
    if (syncExpense) formData.append('syncExpense', 'true');
    if (expenseUpdates?.length) {
      formData.append('expenseUpdates', JSON.stringify(expenseUpdates));
    }
    const res = await fetch(`${API_BASE}/files/batch`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.error || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.json();
  },
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),
  fetchFileBlob: async (id) => {
    const res = await fetch(`${API_BASE}/files/${id}/download`, {
      credentials: 'include',
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.blob();
  },
  downloadFile: async (id, filename) => {
    const res = await fetch(`${API_BASE}/files/${id}/download`, {
      credentials: 'include',
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.detail || body.message || body.title || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  getHrOpsClientMailStatus: () => request('/hr-ops/client-send/mail-status'),
  getHrOpsClientActiveEmployees: (clientId) =>
    request(`/hr-ops/client-send/clients/${clientId}/active-employees`),
  sendHrOpsClientMail: (payload) =>
    request('/hr-ops/client-send', { method: 'POST', body: JSON.stringify(payload) }),
  getPayrollMailStatus: () => request('/hr-ops/payroll-mail/mail-status'),
  sendBulkPayrollMail: (payload) =>
    request('/hr-ops/payroll-mail/bulk', { method: 'POST', body: JSON.stringify(payload) }),

  getHrOpsRequestTypes: () => request('/hr-ops/meta/request-types'),
  getHrOpsStatuses: () => request('/hr-ops/meta/statuses'),
  getHrOpsRequests: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.requestType) query.set('requestType', params.requestType);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/hr-ops/requests${suffix}`);
  },
  getHrOpsPendingCount: () => request('/hr-ops/requests/pending-count'),
  getHrOpsRequest: (id) => request(`/hr-ops/requests/${id}`),
  createHrOpsRequest: (payload) => request('/hr-ops/requests', { method: 'POST', body: JSON.stringify(payload) }),
  updateHrOpsRequest: (id, payload) => request(`/hr-ops/requests/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  submitHrOpsRequest: (id) => request(`/hr-ops/requests/${id}/submit`, { method: 'POST' }),
  startHrOpsRequest: (id) => request(`/hr-ops/requests/${id}/start`, { method: 'POST' }),
  completeHrOpsRequest: (id, payload) =>
    request(`/hr-ops/requests/${id}/complete`, { method: 'POST', body: JSON.stringify(payload ?? {}) }),
  rejectHrOpsRequest: (id, payload) =>
    request(`/hr-ops/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelHrOpsRequest: (id) => request(`/hr-ops/requests/${id}/cancel`, { method: 'POST' }),

  getMeetingRooms: (all = false) => request(`/meeting-rooms${all ? '?all=true' : ''}`),
  getMeetingRoom: (id) => request(`/meeting-rooms/${id}`),
  createMeetingRoom: (body) => request('/meeting-rooms', { method: 'POST', body: JSON.stringify(body) }),
  updateMeetingRoom: (id, body) => request(`/meeting-rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMeetingRoom: (id) => request(`/meeting-rooms/${id}`, { method: 'DELETE' }),
  searchMeetingRoomReservations: (params) => {
    const q = new URLSearchParams();
    q.set('dateFrom', params.dateFrom);
    q.set('dateTo', params.dateTo);
    if (params.roomId) q.set('roomId', params.roomId);
    return request(`/meeting-room-reservations?${q.toString()}`);
  },
  getMeetingRoomReservation: (id) => request(`/meeting-room-reservations/${id}`),
  createMeetingRoomReservation: (body) =>
    request('/meeting-room-reservations', { method: 'POST', body: JSON.stringify(body) }),
  updateMeetingRoomReservation: (id, body) =>
    request(`/meeting-room-reservations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  cancelMeetingRoomReservation: (id) =>
    request(`/meeting-room-reservations/${id}`, { method: 'DELETE' }),
};
