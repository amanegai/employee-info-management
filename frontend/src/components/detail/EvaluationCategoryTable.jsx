import RankBadge from './RankBadge';

import EvalCategorySectionHeader from './EvalCategorySectionHeader';

export default function EvaluationCategoryTable({ category }) {
  return (
    <div className="detail-section-card mb-3">
      <EvalCategorySectionHeader
        code={category.code}
        label={category.label}
        icon={category.icon}
      />
      <div className="detail-section-body p-0">
        <div className="table-responsive">
          <table className="table table-bordered detail-eval-table mb-0">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>評価項目</th>
              <th style={{ width: '10%' }} className="text-center">
                ランク
              </th>
              <th>コメント</th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.itemName}</td>
                <td className="text-center">
                  <RankBadge rank={item.rankGrade} />
                </td>
                <td className="text-start">{item.comment}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
