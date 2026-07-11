import SectionCard from '../SectionCard';
import StarRating from '../StarRating';
import TechnicalSkillMatrix from '../../skills/TechnicalSkillMatrix';
import { technicalSkillsToMap } from '../../../constants/technicalSkillTemplate';
import { getCareerTitleSuffix, sortCareersByNewestFirst } from '../../../utils';
export default function SkillsTab({ employee }) {
  const { skills, qualifications, careers, technicalSkills } = employee;
  const technicalSkillMap = technicalSkillsToMap(technicalSkills);
  return (
    <>
      <SectionCard title="スキル評価" icon="bi-tools" variant="green">
        <p className="text-muted small mb-3">主要スキルのレベルを★で表しています。</p>
        {skills?.length ? (
          <div className="table-responsive">
            <table className="table table-bordered detail-skill-table mb-0">
              <thead>
                <tr>
                  <th>スキル名</th>
                  <th className="text-center">レベル</th>
                  <th className="text-center">経験年数</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s, i) => (
                  <tr key={i}>
                    <td>{s.skillName}</td>
                    <td className="text-center">
                      <StarRating level={s.level} />
                    </td>
                    <td className="text-center">{s.experienceYears}年</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mb-0">スキル情報は未登録です。</p>
        )}
      </SectionCard>

      <SectionCard title="関連技術" icon="bi-grid-3x3-gap" variant="purple" className="mt-3">
        <TechnicalSkillMatrix values={technicalSkillMap} readOnly />
      </SectionCard>

      <SectionCard title="保有資格" icon="bi-award" variant="amber" className="mt-3">
        {qualifications?.length ? (
          <ul className="detail-qual-list mb-0">
            {qualifications.map((q, i) => (
              <li key={i}>{q.description}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mb-0">資格情報は未登録です。</p>
        )}
      </SectionCard>

      <SectionCard title="職務経歴" icon="bi-briefcase" variant="slate" className="mt-3">
        {careers?.length ? (
          sortCareersByNewestFirst(careers).map((c, i) => {
            const phases = c.phases
              ? typeof c.phases === 'string'
                ? c.phases.split(',').filter(Boolean)
                : c.phases
              : [];
            return (
              <div key={i} className="detail-career-display-card mb-3">
                <div className="fw-semibold mb-2">
                  経歴 {i + 1}
                  {getCareerTitleSuffix(c)}
                </div>
                <div className="row g-2 small">
                  {(c.startDate || c.endDate) && (
                    <div className="col-md-4">
                      <span className="text-muted">期間：</span>
                      {c.startDate || '—'} ～ {c.endDate || '現在'}
                      {c.months != null ? `（${c.months}ヶ月）` : ''}
                    </div>
                  )}
                  {c.organization && (
                    <div className="col-md-4">
                      <span className="text-muted">案件：</span>
                      {c.organization}
                    </div>
                  )}
                  {c.workplace && (
                    <div className="col-md-4">
                      <span className="text-muted">作業場所：</span>
                      {c.workplace}
                    </div>
                  )}
                  {c.role && (
                    <div className="col-md-4">
                      <span className="text-muted">役割：</span>
                      {c.role}
                    </div>
                  )}
                  {c.roleOverview && (
                    <div className="col-12">
                      <span className="text-muted">業務内容：</span>
                      <div className="detail-career-text">{c.roleOverview}</div>
                    </div>
                  )}
                  {c.osDb && (
                    <div className="col-md-4">
                      <span className="text-muted">OS/DB：</span>
                      {c.osDb}
                    </div>
                  )}
                  {c.languages && (
                    <div className="col-md-4">
                      <span className="text-muted">使用言語：</span>
                      {c.languages}
                    </div>
                  )}
                  {c.fwTools && (
                    <div className="col-md-4">
                      <span className="text-muted">FW/MW：</span>
                      {c.fwTools}
                    </div>
                  )}
                  {phases.length > 0 && (
                    <div className="col-12">
                      <span className="text-muted">担当工程：</span>
                      {phases.join('、')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-muted mb-0">職務経歴は未登録です。</p>
        )}
      </SectionCard>
    </>
  );
}
