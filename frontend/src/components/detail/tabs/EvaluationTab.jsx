import EvaluationCalcSummary from '../EvaluationCalcSummary';
import EvaluationCategoryTable from '../EvaluationCategoryTable';
import EvaluationRankDisplay from '../EvaluationRankDisplay';
import RankBadge from '../RankBadge';
import SectionCard from '../SectionCard';
import { EVAL_LEGEND, formatJapaneseDate } from '../../../utils';

function hasOverallMeta(overall) {
  if (!overall) return false;
  return Boolean(
    overall.overallRank ||
      overall.fullEvaluation ||
      overall.continuationText ||
      overall.evaluationDate ||
      overall.evaluatorName ||
      overall.evaluatorDepartment ||
      overall.overallComment
  );
}

function hasRankedEvaluationItems(categories) {
  return categories.some((cat) => (cat.items ?? []).some((item) => item.rankGrade?.trim()));
}

export default function EvaluationTab({ employee }) {
  const categories = employee.evaluationCategories || [];
  const overall = employee.overallEvaluation;
  const calc = employee.evaluationCalculation;
  const isCalculated = employee.evaluationCalculated && calc;
  const hasEvalItems = categories.length > 0;
  const hasRankedItems = hasRankedEvaluationItems(categories);
  const showOverallSection = isCalculated || hasEvalItems || hasOverallMeta(overall);

  const rankEval = isCalculated
    ? calc?.evaluation
    : hasRankedItems
      ? overall?.fullEvaluation || employee.evaluation
      : '';

  return (
    <>
      {isCalculated && (
        <SectionCard title="総合評価（自動算出）" icon="bi-calculator" variant="cyan" className="mb-3">
          <EvaluationCalcSummary calculation={calc} />
        </SectionCard>
      )}

      <div className="eval-legend mb-3">
        {EVAL_LEGEND.map((item) => (
          <span key={item.rank} className="eval-legend-item">
            <RankBadge rank={item.rank} />
            <span className="eval-legend-label">{item.label}</span>
          </span>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-muted">評価項目は未登録です。</p>
      )}
      {categories.map((cat) => (
        <EvaluationCategoryTable key={cat.code} category={cat} />
      ))}

      {showOverallSection && (
        <SectionCard title="総合評価" icon="bi-star-fill" variant="slate" className="mt-3">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="detail-info-label">
                総合ランク
                <span className="text-muted fw-normal ms-1 small">
                  {isCalculated ? '（評価項目から自動算出）' : '（一覧評価と連動）'}
                </span>
              </div>
              <div className="mt-1">
                {rankEval ? (
                  <EvaluationRankDisplay
                    evaluation={rankEval}
                    rankLabel={overall?.rankLabel || calc?.rankLabel}
                  />
                ) : (
                  <span className="text-muted">未評価</span>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <div className="detail-info-label">継続・延長可否</div>
              <div className="detail-info-value mt-1">{overall?.continuationText || '—'}</div>
            </div>
            <div className="col-md-4">
              <div className="detail-info-label">評価日</div>
              <div className="detail-info-value mt-1">
                {formatJapaneseDate(overall?.evaluationDate)}
              </div>
            </div>
            <div className="col-md-4">
              <div className="detail-info-label">評価者</div>
              <div className="detail-info-value mt-1">{overall?.evaluatorName || '—'}</div>
            </div>
            <div className="col-md-4">
              <div className="detail-info-label">評価者所属</div>
              <div className="detail-info-value mt-1">{overall?.evaluatorDepartment || '—'}</div>
            </div>
          </div>
          {overall?.overallComment && (
            <div>
              <div className="detail-info-label">総合コメント</div>
              <p className="mb-0 mt-2">{overall.overallComment}</p>
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
}
