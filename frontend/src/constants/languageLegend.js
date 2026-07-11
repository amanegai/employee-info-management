export const LANGUAGE_CONVERSATION_LEGEND = '【A：ネイティブ同等、B：流暢、C：一人称、D：簡単会話】';
export const LANGUAGE_DOCUMENT_LEGEND = '【◎：問題なし、〇：ほぼ問題なし、△：若干不足気味】';

export const LANGUAGE_CONVERSATION_MEANINGS = {
  A: 'ネイティブ同等',
  B: '流暢',
  C: '一人称',
  D: '簡単会話',
};

export const LANGUAGE_DOCUMENT_MEANINGS = {
  '◎': '問題なし',
  '〇': 'ほぼ問題なし',
  '△': '若干不足気味',
};

function normalizeConversationLevel(level) {
  if (level == null || level === '') return null;
  const key = String(level).trim().toUpperCase();
  return LANGUAGE_CONVERSATION_MEANINGS[key] ? key : null;
}

function describeConversationAbility(level, langLabel) {
  const key = normalizeConversationLevel(level);
  if (!key) return null;

  switch (key) {
    case 'A':
      return `${langLabel}での会話はネイティブ同等の水準にあり、打合せや説明もスムーズに行えます`;
    case 'B':
      return `${langLabel}での会話は流暢な水準にあり、日常の業務コミュニケーションに支障はありません`;
    case 'C':
      return `${langLabel}での会話は一人称でのやり取りが可能で、必要に応じて丁寧なコミュニケーションができます`;
    case 'D':
      return `${langLabel}での会話は簡単な会話での意思疎通が可能です`;
    default:
      return null;
  }
}

function describeDocumentReading(mark) {
  switch (mark) {
    case '◎':
      return '仕様書の解読に問題はありません';
    case '〇':
      return '仕様書の解読もほぼ問題なく対応できます';
    case '△':
      return '仕様書の解読はやや不足気味な面もありますが、実務上の支障は限定的です';
    default:
      return null;
  }
}

function describeDocumentWriting(mark) {
  switch (mark) {
    case '◎':
      return '仕様書の作成にも問題はありません';
    case '〇':
      return '仕様書の作成もほぼ問題なく対応できます';
    case '△':
      return '仕様書の作成はやや不足気味な面もありますが、実務上の支障は限定的です';
    default:
      return null;
  }
}

function summarizeDocumentAbility(reading, writing) {
  const parts = [describeDocumentReading(reading), describeDocumentWriting(writing)].filter(Boolean);
  if (!parts.length) return null;
  return parts.join('。また、');
}

function buildLanguageRowSummary(label, conversation, reading, writing) {
  const conversationText = describeConversationAbility(conversation, label);
  const documentText = summarizeDocumentAbility(reading, writing);
  if (!conversationText && !documentText) return null;

  if (conversationText && documentText) {
    return `${conversationText}。${documentText}`;
  }
  return conversationText || documentText;
}

export function buildLanguageAppealParagraph(personal = {}) {
  const rows = [
    buildLanguageRowSummary(
      '日本語',
      personal.japaneseLevel,
      personal.japaneseReading,
      personal.japaneseWriting
    ),
    buildLanguageRowSummary(
      '英語',
      personal.englishLevel,
      personal.englishReading,
      personal.englishWriting
    ),
  ].filter(Boolean);

  if (!rows.length) return '';

  const jpKey = normalizeConversationLevel(personal.japaneseLevel);
  const jpReading = personal.japaneseReading;
  const jpWriting = personal.japaneseWriting;
  const enKey = normalizeConversationLevel(personal.englishLevel);

  let synthesis = '';
  const jpDocStrong =
    (jpReading === '◎' || jpReading === '〇') && (jpWriting === '◎' || jpWriting === '〇' || !jpWriting);
  const jpConvStrong = jpKey === 'A' || jpKey === 'B';

  if (jpConvStrong && jpDocStrong) {
    synthesis =
      '以上より、日本語での顧客折衝、社内・社外との調整、設計書を前提とした開発業務まで幅広く対応できる語学力を有しています。';
  } else if (jpConvStrong) {
    synthesis =
      '以上より、日本語でのコミュニケーションを強みに、チーム内・対外的なやり取りを中心に貢献できます。';
  } else if (jpKey === 'C' || jpKey === 'D') {
    synthesis =
      '以上より、日本語での基本コミュニケーションに加え、読み書きのスキルを活かしながら着実に業務へ参画できます。';
  } else if (enKey === 'A' || enKey === 'B') {
    synthesis = '以上より、英語を活かした情報収集や海外ベンダーとの連携にも対応可能です。';
  } else {
    synthesis = '以上より、プロジェクトの言語要件に応じて柔軟に対応できる語学力を有しています。';
  }

  return `語学面では、${rows.join('。')}。${synthesis}`;
}
