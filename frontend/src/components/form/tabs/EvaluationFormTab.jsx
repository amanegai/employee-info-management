import EvalCategorySectionHeader from '../../detail/EvalCategorySectionHeader';
import SectionCard from '../../detail/SectionCard';
import FormField from '../FormField';
import FormRowActions, { FormRemoveButton } from '../FormRowActions';
import {
  EVAL_CATEGORIES,
  EVAL_LEGEND,
  RANK_OPTIONS,
  EMPTY_DISPLAY,
  applyEvaluationToForm,
  calculateEvaluationFromItems,
  evaluationClass,
  getEvaluationItemsByCategory,
} from '../../../utils';
import RankBadge from '../../detail/RankBadge';

export default function EvaluationFormTab({ form, onChange }) {
  const calc = calculateEvaluationFromItems(form.evaluationItems);

  function commitForm(nextForm) {
    onChange(applyEvaluationToForm(nextForm));
  }

  function itemsForCategory(categoryCode) {
    return getEvaluationItemsByCategory(form.evaluationItems, categoryCode);
  }

  function updateCategoryItems(categoryCode, items) {
    const others = form.evaluationItems.filter((item) => item.categoryCode !== categoryCode);
    commitForm({ ...form, evaluationItems: [...others, ...items] });
  }

  function updateOverall(field, value) {
    onChange({ ...form, overallEvaluation: { ...form.overallEvaluation, [field]: value } });
  }

  return (
    <>
      <div className="eval-legend mb-3">
        {EVAL_LEGEND.map((item) => (
          <span key={item.rank} className="eval-legend-item">
            <RankBadge rank={item.rank} />
            <span className="eval-legend-label">{item.label}</span>
          </span>
        ))}
      </div>

      {EVAL_CATEGORIES.map((cat) => {
        const items = itemsForCategory(cat.code);
        return (
          <div key={cat.code} className="detail-section-card mb-3">
            <EvalCategorySectionHeader code={cat.code} label={cat.label} icon={cat.icon} />
            <div className="detail-section-body">
              {items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered detail-eval-table mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>評価項目</th>
                        <th style={{ width: '10%' }} className="text-center">
                          ランク
                        </th>
                        <th>コメント</th>
                        <th style={{ width: '5%' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.itemName}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx] = { ...item, itemName: e.target.value };
                                updateCategoryItems(cat.code, next);
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <select
                              className={`form-select form-select-sm detail-eval-rank-select${item.rankGrade ? '' : ' is-empty'}`}
                              value={item.rankGrade}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx] = { ...item, rankGrade: e.target.value };
                                updateCategoryItems(cat.code, next);
                              }}
                            >
                              <option value="">{EMPTY_DISPLAY}</option>
                              {RANK_OPTIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.comment}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx] = { ...item, comment: e.target.value };
                                updateCategoryItems(cat.code, next);
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <FormRemoveButton
                              onClick={() =>
                                updateCategoryItems(
                                  cat.code,
                                  items.filter((_, i) => i !== idx)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted mb-0">評価項目は未登録です。</p>
              )}
              <FormRowActions
                onAdd={() =>
                  updateCategoryItems(cat.code, [
                    ...items,
                    { categoryCode: cat.code, itemName: '', rankGrade: '', comment: '' },
                  ])
                }
                addLabel="項目を追加"
              />
            </div>
          </div>
        );
      })}

      <SectionCard title="総合評価" icon="bi-star-fill" headerColor="#495057" className="mt-3">
        <p className="text-muted small mb-3">
          評価項目のランクを入力すると、総合ランク（参考）は自動算出されます。
        </p>
        <div className="row g-3">
          <div className="col-md-4">
            <FormField label="総合ランク（参考）">
              <div className="detail-info-value pt-1">
                {calc?.evaluation ? (
                  <span className={`badge eval-badge ${evaluationClass(calc.evaluation)}`}>
                    {calc.evaluation}
                  </span>
                ) : (
                  <span className="text-muted">
                    <span className="eval-empty-mark">{EMPTY_DISPLAY}</span>
                    （評価項目のランク入力後に自動表示）
                  </span>
                )}
              </div>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="継続・延長可否" htmlFor="continuationText">
              <input
                id="continuationText"
                type="text"
                className="form-control"
                value={form.overallEvaluation.continuationText}
                onChange={(e) => updateOverall('continuationText', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="評価日" htmlFor="evaluationDate">
              <input
                id="evaluationDate"
                type="date"
                className="form-control"
                value={form.overallEvaluation.evaluationDate}
                onChange={(e) => updateOverall('evaluationDate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="評価者" htmlFor="evaluatorName">
              <input
                id="evaluatorName"
                type="text"
                className="form-control"
                value={form.overallEvaluation.evaluatorName}
                onChange={(e) => updateOverall('evaluatorName', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="評価者所属" htmlFor="evaluatorDepartment">
              <input
                id="evaluatorDepartment"
                type="text"
                className="form-control"
                value={form.overallEvaluation.evaluatorDepartment}
                onChange={(e) => updateOverall('evaluatorDepartment', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="総合コメント" htmlFor="overallComment">
              <textarea
                id="overallComment"
                className="form-control"
                rows={3}
                value={form.overallEvaluation.overallComment}
                onChange={(e) => updateOverall('overallComment', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
