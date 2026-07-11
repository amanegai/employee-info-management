import {
  FormPreviewDateBanner,
  FormPreviewDetail,
  FormPreviewDetails,
  FormPreviewEmpty,
  FormPreviewPanel,
  FormPreviewStats,
  FormPreviewTitle,
} from '../form/FormPreviewPanel';

export default function ClientRecordFormPreview({ form, isEdit }) {
  const taskCount = form.tasks.filter((t) => t.title.trim()).length;
  const attendeeCount = form.attendeeIds.length;
  const hasContent = form.clientName || form.title || form.meetingDate;

  if (!hasContent) {
    return <FormPreviewEmpty />;
  }

  return (
    <FormPreviewPanel
      isEdit={isEdit}
      theme="blue"
      footer={
        <FormPreviewStats
          items={[
            { icon: 'bi-people', label: '出席者', value: attendeeCount, suffix: ' 名', key: 'attendees' },
            { icon: 'bi-list-check', label: 'タスク', value: taskCount, suffix: ' 件', key: 'tasks' },
          ]}
        />
      }
    >
      <FormPreviewDateBanner dateIso={form.meetingDate} />
      <FormPreviewTitle>{form.title || '件名未入力'}</FormPreviewTitle>
      <FormPreviewDetails>
        <FormPreviewDetail
          icon="bi-building"
          label="取引先"
          value={form.clientName || '未選択'}
        />
        <FormPreviewDetail
          icon="bi-person-badge"
          label="取引先担当"
          value={form.clientContactPerson?.trim()}
        />
        <FormPreviewDetail icon="bi-clock" label="時間" value={form.meetingTime} />
        <FormPreviewDetail icon="bi-geo-alt" label="場所" value={form.location} />
      </FormPreviewDetails>
    </FormPreviewPanel>
  );
}
