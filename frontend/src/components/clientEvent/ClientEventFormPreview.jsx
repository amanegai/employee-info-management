import { eventStatusVariant, eventTypeVariant } from '../../utils/clientEventForm';
import {
  FormPreviewBadges,
  FormPreviewDateBanner,
  FormPreviewDetail,
  FormPreviewDetails,
  FormPreviewEmpty,
  FormPreviewPanel,
  FormPreviewTitle,
} from '../form/FormPreviewPanel';

export default function ClientEventFormPreview({ form, isEdit }) {
  const hasContent = form.clientName || form.eventName || form.eventDate;

  if (!hasContent) {
    return <FormPreviewEmpty />;
  }

  return (
    <FormPreviewPanel isEdit={isEdit} theme="indigo">
      <FormPreviewDateBanner dateIso={form.eventDate} />
      <FormPreviewTitle>{form.eventName || 'イベント名未入力'}</FormPreviewTitle>
      <FormPreviewDetails>
        <FormPreviewDetail
          icon="bi-building"
          label="取引先"
          value={form.clientName || '未選択'}
        />
        <FormPreviewDetail icon="bi-clock" label="時間" value={form.eventTime} />
        <FormPreviewDetail icon="bi-geo-alt" label="場所" value={form.location} />
      </FormPreviewDetails>
      <FormPreviewBadges>
        {form.eventType && (
          <span
            className={`client-event-type-badge client-event-type-badge-${eventTypeVariant(form.eventType)}`}
          >
            {form.eventType}
          </span>
        )}
        {form.eventStatus && (
          <span
            className={`client-event-status-badge client-event-status-${eventStatusVariant(form.eventStatus)}`}
          >
            {form.eventStatus}
          </span>
        )}
      </FormPreviewBadges>
    </FormPreviewPanel>
  );
}
