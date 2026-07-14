import SectionCard from '../SectionCard';
import LanguageLegendNotes from '../../LanguageLegendNotes';
import { formatJapaneseDate, formatYearsInJapan, workStatusClass, EMPTY_DISPLAY, endDateFieldLabel, assignmentRoleLabel } from '../../../utils';

function isEmptyValue(value) {
  return value == null || value === '' || value === '—' || value === EMPTY_DISPLAY;
}

function InfoCell({ label, value }) {
  const empty = isEmptyValue(value);
  return (
    <div className="detail-info-cell">
      <div className="detail-info-label">{label}</div>
      <div className={`detail-info-value${empty ? ' is-empty' : ''}`}>
        {empty ? EMPTY_DISPLAY : value}
      </div>
    </div>
  );
}

function LangCell({ value }) {
  const empty = isEmptyValue(value);
  return (
    <td className={`text-center${empty ? ' is-empty' : ''}`}>{empty ? EMPTY_DISPLAY : value}</td>
  );
}
export default function BasicTab({ employee }) {
  const p = employee.personal;
  const showEndDate = employee.endDate && ['退職予定', '案件終了間近', '退職', '休業'].includes(employee.workStatus);
  const endDateLabel = endDateFieldLabel(employee.workStatus);

  return (
    <>
      <div className="detail-summary-card mb-3" data-guide="employee-detail-summary">
        <div className="detail-summary-hero">
          <div className="detail-summary-hero-text">
            <h2 className="detail-employee-name">{employee.name}</h2>
            {p?.furigana && <div className="detail-employee-kana">{p.furigana}</div>}
          </div>
          {employee.workStatus && (
            <span className={`badge status-badge detail-summary-status ${workStatusClass(employee.workStatus)}`}>
              {employee.workStatus}
            </span>
          )}
        </div>
        <div className="detail-summary-body">
          <div className="row g-4 align-items-start">
            <div className="col">
              <div className="row g-3 detail-summary-fields">
                <div className="col-md-4">
                  <InfoCell label="社員種別" value={employee.employeeType} />
                </div>
                <div className="col-md-4">
                  <InfoCell label="所属部門" value={employee.departmentName} />
                </div>
                <div className="col-md-4">
                  <InfoCell label="役職" value={employee.position} />
                </div>
                <div className="col-md-4">
                  <InfoCell label="役割" value={assignmentRoleLabel(employee.assignmentRole)} />
                </div>
                {showEndDate && (
                  <div className="col-md-4">
                    <InfoCell label={endDateLabel} value={formatJapaneseDate(employee.endDate)} />
                  </div>
                )}
              </div>
            </div>
            <div className="col-auto">
              <div className="detail-photo-box">
                {p?.photoUrl ? (
                  <img src={p.photoUrl} alt="社員写真" className="detail-photo-img" />
                ) : (
                  <div className="detail-photo-placeholder">
                    <i className="bi bi-person-bounding-box" />
                    <span>社員写真</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionCard title="個人情報" icon="bi-person-vcard" variant="teal">
        {p ? (
          <>
            <h6 className="detail-form-subsection-title">基本</h6>
            <div className="row g-3 detail-personal-fields mb-3">
              <div className="col-md-4">
                <InfoCell label="フリガナ" value={p.furigana} />
              </div>
              <div className="col-md-4">
                <InfoCell label="性別" value={p.gender} />
              </div>
              <div className="col-md-4">
                <InfoCell label="生年月日" value={formatJapaneseDate(p.birthDate)} />
              </div>
              <div className="col-md-4">
                <InfoCell label="年齢" value={p.age != null ? `${p.age}歳` : ''} />
              </div>
              <div className="col-md-4">
                <InfoCell label="国籍" value={p.nationality} />
              </div>
              {p.nationalityId && p.nationalityIsJapan === false && (
                <>
                  <div className="col-md-4">
                    <InfoCell label="在留資格" value={p.residenceStatus} />
                  </div>
                  <div className="col-md-4">
                    <InfoCell label="在留カード番号" value={p.residenceCardNumber} />
                  </div>
                  <div className="col-md-4">
                    <InfoCell
                      label="在留カード有効期限"
                      value={formatJapaneseDate(p.residenceCardExpiry)}
                    />
                  </div>
                </>
              )}
              <div className="col-md-4">
                <InfoCell label="結婚" value={p.maritalStatus} />
              </div>
              <div className="col-md-4">
                <InfoCell label="最寄駅" value={p.nearestStation} />
              </div>
              <div className="col-md-4">
                <InfoCell
                  label="IT業界経験年数"
                  value={p.itIndustryYears != null ? `${p.itIndustryYears}年` : ''}
                />
              </div>
              <div className="col-md-4">
                <InfoCell label="来日年月" value={formatJapaneseDate(p.japanArrivalDate)} />
              </div>
              <div className="col-md-4">
                <InfoCell label="日本滞在年数" value={formatYearsInJapan(p.japanArrivalDate)} />
              </div>
              <div className="col-md-4">
                <InfoCell label="電話番号" value={p.phone} />
              </div>
              <div className="col-md-4">
                <InfoCell label="メール" value={p.email} />
              </div>
              <div className="col-md-4">
                <InfoCell label="住所" value={p.address} />
              </div>
            </div>

            <h6 className="detail-form-subsection-title">最終学歴</h6>
            <div className="row g-3 detail-personal-fields mb-3">
              <div className="col-md-4">
                <InfoCell label="学位" value={p.educationDegree} />
              </div>
              <div className="col-md-4">
                <InfoCell label="学校名" value={p.schoolName} />
              </div>
              <div className="col-md-4">
                <InfoCell label="専攻学科" value={p.major} />
              </div>
            </div>

            <h6 className="detail-form-subsection-title">語学</h6>
            <div className="table-responsive mb-3">
              <table className="table table-bordered table-sm detail-language-table mb-0">
                <thead>
                  <tr>
                    <th>言語種別</th>
                    <th>会話レベル</th>
                    <th>仕様書解読</th>
                    <th>仕様書作成</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>日本語</td>
                    <LangCell value={p.japaneseLevel} />
                    <LangCell value={p.japaneseReading} />
                    <LangCell value={p.japaneseWriting} />
                  </tr>
                  <tr>
                    <td>英語</td>
                    <LangCell value={p.englishLevel} />
                    <LangCell value={p.englishReading} />
                    <LangCell value={p.englishWriting} />
                  </tr>
                </tbody>
              </table>
            </div>
            <LanguageLegendNotes className="mb-3" />

            <h6 className="detail-form-subsection-title">得意分野・自己PR</h6>
            <div className="row g-3 detail-personal-fields">
              <div className="col-md-6">
                <InfoCell label="開発技術" value={p.specialtyDev} />
              </div>
              <div className="col-md-6">
                <InfoCell label="業務知識" value={p.specialtyBusiness} />
              </div>
              <div className="col-12">
                <InfoCell label="自己PR" value={p.selfPr} />
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted mb-0">個人情報は未登録です。</p>
        )}
      </SectionCard>
    </>
  );
}
