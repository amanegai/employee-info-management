import EvaluationRadarChart from './EvaluationRadarChart';
import { evaluationClass } from '../../utils';

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '—';
}

function buildRadarDataFromCategoryScores(categoryScores) {
  return (categoryScores ?? [])
    .filter((cat) => typeof cat.averageScore === 'number' && cat.averageScore > 0)
    .map((cat) => ({
      code: cat.categoryCode,
      label: cat.categoryLabel || cat.categoryCode,
      score: cat.averageScore,
    }));
}

export default function EvaluationCalcSummary({ calculation }) {
  if (!calculation) {
    return null;
  }

  const { evaluation, averageScore, totalItemCount, categoryCount, rankLabel, categoryScores } =
    calculation;
  const radarData = buildRadarDataFromCategoryScores(categoryScores);
  const showRadar = radarData.length >= 3;
  return (
    <div className="eval-calc-summary mb-3">
      <div className="eval-calc-header">
        <span className="badge text-bg-info">
          <i className="bi bi-calculator me-1" />
          評価項目から自動算出
        </span>
        <span className="eval-calc-result">
          <span className={`badge eval-badge ${evaluationClass(evaluation)} me-2`}>
            {evaluation}
          </span>
          <span className="text-muted small">{rankLabel}</span>
        </span>
      </div>

      <div className="row g-2 mt-2 eval-calc-stats">
        <div className="col-auto">
          <span className="eval-calc-stat-label">総合スコア</span>
          <span className="eval-calc-stat-value">{formatScore(averageScore)}</span>
          <span className="text-muted small"> / 5.00</span>
        </div>
        <div className="col-auto">
          <span className="eval-calc-stat-label">評価項目数</span>
          <span className="eval-calc-stat-value">{totalItemCount}</span>
        </div>
        <div className="col-auto">
          <span className="eval-calc-stat-label">評価領域数</span>
          <span className="eval-calc-stat-value">{categoryCount}</span>
        </div>
      </div>

      {categoryScores?.length > 0 && (
        <div className={`eval-calc-split${showRadar ? ' eval-calc-split--half' : ''}`}>
          <div className="eval-calc-split-table">
            <div className="table-responsive">
              <table className="table table-sm table-bordered detail-eval-table mb-0 eval-calc-table">
                <thead className="table-light">
                  <tr>
                    <th>評価領域</th>
                    <th className="text-center">領域スコア</th>
                    <th className="text-center">項目数</th>
                    <th className="text-center">換算ランク</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryScores.map((cat) => (
                    <tr key={cat.categoryCode}>
                      <td>{cat.categoryLabel}</td>
                      <td className="text-center fw-semibold">{formatScore(cat.averageScore)}</td>
                      <td className="text-center">{cat.itemCount}</td>
                      <td className="text-center">
                        <span
                          className={`badge eval-badge ${evaluationClass(cat.categoryEvaluation)}`}
                        >
                          {cat.categoryEvaluation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {showRadar && (
            <div className="eval-calc-split-radar">
              <div className="eval-calc-radar-inner">
                <EvaluationRadarChart data={radarData} />
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-muted small mb-0 eval-calc-footnote">
        各領域の項目平均を算出し、領域間は均等な重み付けで総合スコア（1.0〜5.0）に換算、25段階（D1〜S5）へマッピングしています。
      </p>
    </div>
  );
}
