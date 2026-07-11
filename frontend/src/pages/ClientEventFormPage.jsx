import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import ClientEventFormFields from '../components/clientEvent/ClientEventFormFields';
import ClientEventFormPreview from '../components/clientEvent/ClientEventFormPreview';
import { useAppMessage } from '../context/MessageContext';
import {
  EMPTY_FORM,
  EVENT_STATUS_OPTIONS,
  eventToForm,
  formatOverlapConfirmMessage,
  formToPayload,
  validatePostponedForm,
} from '../utils/clientEventForm';

export default function ClientEventFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useAppMessage();
  const isEdit = mode === 'edit';
  const savingRef = useRef(false);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [participantOptions, setParticipantOptions] = useState([]);

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
      setParticipantOptions(participantsResult.value ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadMeta();
        if (isEdit && id) {
          setForm(eventToForm(await api.getClientEvent(id)));
        }
      } catch (e) {
        showMessage(e.message || '読み込みに失敗しました', 'danger');
        navigate('/client-events', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, loadMeta, navigate, showMessage]);

  function updateFormField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleParticipant(employeeId) {
    const pid = String(employeeId);
    setForm((prev) => {
      const exists = prev.participantIds.includes(pid);
      return {
        ...prev,
        participantIds: exists
          ? prev.participantIds.filter((value) => value !== pid)
          : [...prev.participantIds, pid],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (savingRef.current) return;

    const postponeError = validatePostponedForm(form);
    if (postponeError) {
      showMessage(postponeError, 'danger');
      return;
    }

    const payload = formToPayload(form);
    if (payload.participants.length > 0 && payload.eventDate) {
      try {
        const overlaps = await api.checkClientEventOverlaps(
          payload,
          isEdit ? Number(id) : undefined
        );
        if (overlaps?.length && !window.confirm(formatOverlapConfirmMessage(overlaps))) {
          return;
        }
      } catch (err) {
        showMessage(err.message, 'danger');
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateClientEvent(id, payload);
        showMessage(`「${payload.eventName}」を更新しました`);
      } else {
        await api.createClientEvent(payload);
        showMessage(`「${payload.eventName}」を登録しました`);
      }
      navigate('/client-events');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center client-event-form-page">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0 text-muted">読み込み中…</p>
      </div>
    );
  }

  const title = isEdit ? 'イベント編集' : 'イベント新規登録';
  const submitLabel = saving ? '保存中…' : isEdit ? '変更を保存' : '登録する';

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page client-event-form-page">
      <form className={saving ? 'is-saving' : ''} onSubmit={handleSubmit}>
        <header className="page-header d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div className="page-header-main">
            <div className="page-header-icon" aria-hidden="true">
              <i className="bi bi-calendar-event-fill" />
            </div>
            <div>
              <div className="page-header-title-row">
                <h1 className="h3 mb-0">{title}</h1>
                <PageGuideHelpButton guideId="client-event-form" />
              </div>
              <p className="text-muted mb-0 small">取引先とのイベント参加情報を入力してください</p>
            </div>
          </div>
          <div className="page-header-actions d-flex flex-wrap gap-2">
            <Link to="/client-events" className="btn btn-outline-secondary app-btn">
              キャンセル
            </Link>
            <button type="submit" className="btn btn-primary app-btn client-event-form-submit" disabled={saving}>
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

        <fieldset disabled={saving} className="client-event-form-page-fieldset">
          <div className="client-event-form-page-layout">
            <ClientEventFormPreview form={form} isEdit={isEdit} />
            <div className="client-event-form-page-main">
              <ClientEventFormFields
                form={form}
                eventTypes={eventTypes.length > 0 ? eventTypes : ['その他']}
                statusOptions={statusOptions}
                participantOptions={participantOptions}
                onFieldChange={updateFormField}
                onToggleParticipant={toggleParticipant}
              />
            </div>
          </div>
        </fieldset>
      </form>

      <AppFooter />
    </div>
  );
}
