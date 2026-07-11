import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import ClientRecordFormFields from '../components/clientRecord/ClientRecordFormFields';
import ClientRecordFormPreview from '../components/clientRecord/ClientRecordFormPreview';
import { useAppMessage } from '../context/MessageContext';
import {
  createEmptyTask,
  EMPTY_FORM,
  formToPayload,
  recordToForm,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '../utils/clientRecordForm';

export default function ClientRecordFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useAppMessage();
  const isEdit = mode === 'edit';
  const savingRef = useRef(false);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [eligibleAttendees, setEligibleAttendees] = useState([]);
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [taskPriorities, setTaskPriorities] = useState([]);

  const statusOptions = taskStatuses.length > 0 ? taskStatuses : TASK_STATUS_OPTIONS;
  const priorityOptions = taskPriorities.length > 0 ? taskPriorities : TASK_PRIORITY_OPTIONS;

  const loadMeta = useCallback(async () => {
    const [attendeesResult, assigneesResult, statusesResult, prioritiesResult] =
      await Promise.allSettled([
        api.getClientMeetingEligibleAttendees(),
        api.getClientIssueEligibleAssignees(),
        api.getClientMeetingTaskStatuses(),
        api.getClientMeetingTaskPriorities(),
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
    if (prioritiesResult.status === 'fulfilled') {
      setTaskPriorities(prioritiesResult.value ?? []);
    } else {
      setTaskPriorities(TASK_PRIORITY_OPTIONS);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadMeta();
        if (isEdit && id) {
          setForm(recordToForm(await api.getClientMeeting(id)));
        }
      } catch (e) {
        showMessage(e.message || '読み込みに失敗しました', 'danger');
        navigate('/client-records', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, loadMeta, navigate, showMessage]);

  function updateFormField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAttendee(employeeId) {
    const pid = String(employeeId);
    setForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(pid)
        ? prev.attendeeIds.filter((value) => value !== pid)
        : [...prev.attendeeIds, pid],
    }));
  }

  function addTaskRow() {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, createEmptyTask()],
    }));
  }

  function updateTaskRow(taskKey, field, value) {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.key === taskKey ? { ...task, [field]: value } : task
      ),
    }));
  }

  function removeTaskRow(taskKey) {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.key !== taskKey),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (isEdit) {
        await api.updateClientMeeting(id, payload);
        showMessage(`「${payload.title}」を更新しました`);
      } else {
        await api.createClientMeeting(payload);
        showMessage(`「${payload.title}」を登録しました`);
      }
      navigate('/client-records');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center client-record-form-page">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0 text-muted">読み込み中…</p>
      </div>
    );
  }

  const title = isEdit ? '議事録・タスク編集' : '議事録・タスク登録';
  const submitLabel = saving ? '保存中…' : isEdit ? '変更を保存' : '登録する';

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page client-record-form-page">
      <form className={saving ? 'is-saving' : ''} onSubmit={handleSubmit}>
        <header className="page-header d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div className="page-header-main">
            <div className="page-header-icon" aria-hidden="true">
              <i className="bi bi-journal-check" />
            </div>
            <div>
              <div className="page-header-title-row">
                <h1 className="h3 mb-0">{title}</h1>
                <PageGuideHelpButton guideId="client-record-form" />
              </div>
              <p className="text-muted mb-0 small">取引先との打合せ記録とタスクを一体で登録</p>
            </div>
          </div>
          <div className="page-header-actions d-flex flex-wrap gap-2">
            <Link to="/client-records" className="btn btn-outline-secondary app-btn">
              キャンセル
            </Link>
            <button type="submit" className="btn btn-primary app-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  保存中…
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  {submitLabel}
                </>
              )}
            </button>
          </div>
        </header>

        <fieldset disabled={saving} className="client-record-form-page-fieldset">
          <div className="client-record-form-page-layout">
            <ClientRecordFormPreview form={form} isEdit={isEdit} />
            <div className="client-record-form-page-main">
              <ClientRecordFormFields
                form={form}
                eligibleAttendees={eligibleAttendees}
                eligibleAssignees={eligibleAssignees}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                onFieldChange={updateFormField}
                onToggleAttendee={toggleAttendee}
                onAddTask={addTaskRow}
                onUpdateTask={updateTaskRow}
                onRemoveTask={removeTaskRow}
              />
            </div>
          </div>
        </fieldset>
      </form>

      <AppFooter />
    </div>
  );
}
