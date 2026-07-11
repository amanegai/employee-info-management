import SectionCard from '../../detail/SectionCard';
import FormRowActions, { FormRemoveButton } from '../FormRowActions';
import FormField from '../FormField';
import TechnicalSkillMatrix from '../../skills/TechnicalSkillMatrix';
import { EMPTY_CAREER, CAREER_PHASE_OPTIONS } from '../../../utils';



export default function SkillsFormTab({ form, onChange }) {

  function updateSkills(skills) {

    onChange({ ...form, skills });

  }



  function updateQualifications(qualifications) {

    onChange({ ...form, qualifications });

  }



  function updateCareers(careers) {

    onChange({ ...form, careers });

  }



  function updateTechnicalSkills(technicalSkills) {

    onChange({ ...form, technicalSkills });

  }



  function updateCareer(index, patch) {

    const careers = [...form.careers];

    careers[index] = { ...careers[index], ...patch };

    updateCareers(careers);

  }



  function togglePhase(index, phase) {

    const c = form.careers[index];

    const phases = c.phases.includes(phase)

      ? c.phases.filter((p) => p !== phase)

      : [...c.phases, phase];

    updateCareer(index, { phases });

  }



  return (

    <>

      <SectionCard title="スキル評価" icon="bi-tools" headerColor="#198754">

        <p className="text-muted small mb-3">主要スキルのレベルを1〜5で入力してください。</p>

        {form.skills.length > 0 ? (

          <div className="table-responsive">

            <table className="table table-bordered detail-skill-table mb-0">

              <thead>

                <tr>

                  <th>スキル名</th>

                  <th style={{ width: '12%' }} className="text-center">

                    レベル

                  </th>

                  <th style={{ width: '12%' }} className="text-center">

                    経験年数

                  </th>

                  <th style={{ width: '5%' }} />

                </tr>

              </thead>

              <tbody>

                {form.skills.map((s, i) => (

                  <tr key={i}>

                    <td>

                      <input

                        type="text"

                        className="form-control form-control-sm"

                        value={s.skillName}

                        onChange={(e) => {

                          const skills = [...form.skills];

                          skills[i] = { ...s, skillName: e.target.value };

                          updateSkills(skills);

                        }}

                      />

                    </td>

                    <td>

                      <input

                        type="number"

                        min="1"

                        max="5"

                        className="form-control form-control-sm text-center"

                        value={s.level}

                        onChange={(e) => {

                          const skills = [...form.skills];

                          skills[i] = { ...s, level: e.target.value };

                          updateSkills(skills);

                        }}

                      />

                    </td>

                    <td>

                      <input

                        type="number"

                        min="0"

                        className="form-control form-control-sm text-center"

                        value={s.experienceYears}

                        onChange={(e) => {

                          const skills = [...form.skills];

                          skills[i] = { ...s, experienceYears: e.target.value };

                          updateSkills(skills);

                        }}

                      />

                    </td>

                    <td className="text-center">

                      <FormRemoveButton

                        onClick={() => updateSkills(form.skills.filter((_, idx) => idx !== i))}

                      />

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <p className="text-muted mb-0">スキル情報は未登録です。</p>

        )}

        <FormRowActions

          onAdd={() =>

            updateSkills([...form.skills, { skillName: '', level: 3, experienceYears: 0 }])

          }

          addLabel="スキルを追加"

        />

      </SectionCard>



      <SectionCard title="関連技術" icon="bi-grid-3x3-gap" headerColor="#6f42c1" className="mt-3">

        <TechnicalSkillMatrix

          values={form.technicalSkills}

          onChange={updateTechnicalSkills}

        />

      </SectionCard>



      <SectionCard title="保有資格" icon="bi-award" headerColor="#e6a800" className="mt-3">

        {form.qualifications.length > 0 ? (

          <div className="table-responsive">

            <table className="table table-bordered mb-0">

              <tbody>

                {form.qualifications.map((q, i) => (

                  <tr key={i}>

                    <td>

                      <input

                        type="text"

                        className="form-control form-control-sm"

                        placeholder="資格名・取得時期など"

                        value={q.description}

                        onChange={(e) => {

                          const qualifications = [...form.qualifications];

                          qualifications[i] = { description: e.target.value };

                          updateQualifications(qualifications);

                        }}

                      />

                    </td>

                    <td style={{ width: '5%' }} className="text-center">

                      <FormRemoveButton

                        onClick={() =>

                          updateQualifications(form.qualifications.filter((_, idx) => idx !== i))

                        }

                      />

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <p className="text-muted mb-0">資格情報は未登録です。</p>

        )}

        <FormRowActions

          onAdd={() => updateQualifications([...form.qualifications, { description: '' }])}

          addLabel="資格を追加"

        />

      </SectionCard>



      <SectionCard title="職務経歴" icon="bi-briefcase" headerColor="#495057" className="mt-3">

        <p className="text-muted small mb-3">履歴書テンプレートの経歴表に対応する項目です。</p>

        {form.careers.length > 0 ? (

          form.careers.map((c, i) => (

            <div key={i} className="detail-career-form-card mb-3">

              <div className="d-flex justify-content-between align-items-center mb-2">

                <strong>経歴 {i + 1}</strong>

                <FormRemoveButton onClick={() => updateCareers(form.careers.filter((_, idx) => idx !== i))} />

              </div>

              <div className="row g-2">

                <div className="col-md-3">

                  <FormField label="開始日">

                    <input

                      type="date"

                      className="form-control form-control-sm"

                      value={c.startDate}

                      onChange={(e) => updateCareer(i, { startDate: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-3">

                  <FormField label="終了日">

                    <input

                      type="date"

                      className="form-control form-control-sm"

                      value={c.endDate}

                      onChange={(e) => updateCareer(i, { endDate: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-2">

                  <FormField label="月数">

                    <input

                      type="number"

                      min="0"

                      className="form-control form-control-sm"

                      value={c.months}

                      onChange={(e) => updateCareer(i, { months: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="期間（表示用）" hint="未入力時は開始〜終了から自動生成">

                    <input

                      type="text"

                      className="form-control form-control-sm"

                      placeholder="2022/07～2023/06"

                      value={c.period}

                      onChange={(e) => updateCareer(i, { period: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="組織/案件名">

                    <input

                      type="text"

                      className="form-control form-control-sm"

                      value={c.organization}

                      onChange={(e) => updateCareer(i, { organization: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="作業場所">

                    <input

                      type="text"

                      className="form-control form-control-sm"

                      placeholder="中国 / 東京 等"

                      value={c.workplace}

                      onChange={(e) => updateCareer(i, { workplace: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="役割">

                    <input

                      type="text"

                      className="form-control form-control-sm"

                      placeholder="PG / SE / PL 等"

                      value={c.role}

                      onChange={(e) => updateCareer(i, { role: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-12">

                  <FormField label="業務内容">

                    <textarea

                      className="form-control form-control-sm"

                      rows={3}

                      value={c.roleOverview}

                      onChange={(e) => updateCareer(i, { roleOverview: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="OS/DB">

                    <textarea

                      className="form-control form-control-sm"

                      rows={2}

                      value={c.osDb}

                      onChange={(e) => updateCareer(i, { osDb: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="使用言語">

                    <textarea

                      className="form-control form-control-sm"

                      rows={2}

                      value={c.languages}

                      onChange={(e) => updateCareer(i, { languages: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-md-4">

                  <FormField label="FW/MW/ツール">

                    <textarea

                      className="form-control form-control-sm"

                      rows={2}

                      value={c.fwTools}

                      onChange={(e) => updateCareer(i, { fwTools: e.target.value })}

                    />

                  </FormField>

                </div>

                <div className="col-12">

                  <FormField label="担当工程">

                    <div className="d-flex flex-wrap gap-2">

                      {CAREER_PHASE_OPTIONS.map((phase) => (

                        <label key={phase} className="form-check-label small me-2">

                          <input

                            type="checkbox"

                            className="form-check-input me-1"

                            checked={c.phases.includes(phase)}

                            onChange={() => togglePhase(i, phase)}

                          />

                          {phase}

                        </label>

                      ))}

                    </div>

                  </FormField>

                </div>

              </div>

            </div>

          ))

        ) : (

          <p className="text-muted mb-0">職務経歴は未登録です。</p>

        )}

        <FormRowActions

          onAdd={() => updateCareers([{ ...EMPTY_CAREER }, ...form.careers])}

          addLabel="経歴を追加"

        />

      </SectionCard>

    </>

  );

}

