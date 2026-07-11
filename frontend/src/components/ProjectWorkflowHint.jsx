const STEPS = [
  { icon: 'bi-briefcase', title: '案件を選ぶ', desc: '募集中案件から選ぶか、案件内容を貼り付け' },
  { icon: 'bi-search', title: '候補者を検索', desc: 'スキル・単価・稼働状況で適合度を算出' },
  { icon: 'bi-person-plus', title: '候補に追加', desc: '案件詳細で選考を進める' },
];

export default function ProjectWorkflowHint() {
  return (
    <div className="project-workflow-hint" aria-label="案件マッチングの流れ">
      {STEPS.map((step, index) => (
        <div key={step.title} className="project-workflow-hint-step">
          <div className="project-workflow-hint-icon" aria-hidden="true">
            <i className={`bi ${step.icon}`} />
          </div>
          <div className="project-workflow-hint-body">
            <div className="project-workflow-hint-title">
              <span className="project-workflow-hint-num">{index + 1}</span>
              {step.title}
            </div>
            <div className="project-workflow-hint-desc">{step.desc}</div>
          </div>
          {index < STEPS.length - 1 && (
            <div className="project-workflow-hint-arrow" aria-hidden="true">
              <i className="bi bi-chevron-right" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
