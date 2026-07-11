/** 状態変更提案の reason（DB保存値）→ 営業向けの説明文 */
const STATUS_SUGGESTION_REASON_LABELS = {
  配属開始日により稼働中へ:
    '確定済みの次案件の開始日になったため、「稼働中」への変更をおすすめします。',
  'プロジェクト終了間近（R2）':
    '現在の案件の終了予定日が近づいています。「案件終了間近」への変更をおすすめします。下家案件のマッチングや、現案件の延長の有無をご確認ください。',
  'プロジェクト終了により待機中へ（R3）':
    '現在の案件が終了し、次の案件がまだ未確定です。「待機中」への変更をおすすめします。',
  現案件延長により終了間近解除: '現案件の終了日を延長したため、「稼働中」へ戻す変更が可能です。',
  '現案件延長（終了間近継続）': '現案件の終了日を延長しましたが、まだ終了が近い状態です。「案件終了間近」のまま終了予定日を更新してください。',
};

const TRANSITION_HINTS = {
  '待機中→稼働中': '次の案件の開始日に達したため、稼働開始として「稼働中」への変更をおすすめします。',
  '稼働中→案件終了間近':
    '担当案件の終了予定日が近づいています。下家案件のマッチングや延長の確認をお願いします。',
  '案件終了間近→待機中': '担当案件が終了し、次の案件が未確定のため、「待機中」への変更をおすすめします。',
  '案件終了間近→稼働中': '次の案件へ切り替わるタイミングです。「稼働中」への変更をおすすめします。',
};

/**
 * @param {string} [reason]
 * @param {{ currentWorkStatus?: string, suggestedStatus?: string }} [item]
 */
export function formatStatusSuggestionReason(reason, item) {
  if (reason && STATUS_SUGGESTION_REASON_LABELS[reason]) {
    return STATUS_SUGGESTION_REASON_LABELS[reason];
  }

  if (item?.currentWorkStatus && item?.suggestedStatus) {
    const key = `${item.currentWorkStatus}→${item.suggestedStatus}`;
    if (TRANSITION_HINTS[key]) {
      return TRANSITION_HINTS[key];
    }
  }

  if (!reason) return '—';

  return reason
    .replace(/プロジェクト/g, '案件')
    .replace(/（R2）/g, '')
    .replace(/（R3）/g, '')
    .replace(/\(R2\)/g, '')
    .replace(/\(R3\)/g, '')
    .trim();
}

/** 提案に付く終了予定日の表示 */
export function formatStatusSuggestionEndDate(suggestedEndDate, suggestedStatus) {
  if (!suggestedEndDate) return null;
  if (suggestedStatus === '案件終了間近') {
    return `所属案件の終了予定: ${suggestedEndDate}`;
  }
  return `終了予定: ${suggestedEndDate}`;
}
