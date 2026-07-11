import { LANGUAGE_CONVERSATION_LEGEND, LANGUAGE_DOCUMENT_LEGEND } from '../constants/languageLegend';

export default function LanguageLegendNotes({ className = '' }) {
  return (
    <div className={`detail-language-legend${className ? ` ${className}` : ''}`}>
      <p className="detail-language-legend-item mb-1">{LANGUAGE_CONVERSATION_LEGEND}</p>
      <p className="detail-language-legend-item mb-0">{LANGUAGE_DOCUMENT_LEGEND}</p>
    </div>
  );
}
