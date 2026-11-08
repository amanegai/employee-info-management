import { useMemo } from 'react';
import { TECHNICAL_SKILL_TEMPLATE } from '../constants/technicalSkillTemplate';
import SearchFieldLabel from './SearchFieldLabel';
import { TECHNICAL_SKILL_MARK_OPTIONS } from '../utils';
import { AFFILIATION_COMPANIES, departmentOptionLabel } from '../utils/employeeCode';

export default function SearchForm({
  filters,
  departments,
  affiliationCompanies = AFFILIATION_COMPANIES,
  employeeTypes = [],
  workStatuses = [],
  scopeRestricted = false,
  expanded,
  onToggle,
  onChange,
}) {
  const technicalItems = useMemo(() => {
    if (!filters.technicalCategory) return [];
    const group = TECHNICAL_SKILL_TEMPLATE.find((g) => g.category === filters.technicalCategory);
    return group?.items ?? [];
  }, [filters.technicalCategory]);

  function updateFilters(patch) {
    onChange({ ...filters, ...patch });
  }

  function handleCategoryChange(category) {
    updateFilters({
      technicalCategory: category,
      technicalItem: '',
    });
  }

  return (
    <section className="search-section" aria-label="検索条件">
      <button
        type="button"
        className="search-section-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="search-form-panel"
      >
        <span className="h6 text-muted mb-0">検索条件</span>
        <span className="search-toggle-icon" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div id="search-form-panel" className="search-form-panel mt-2">
          {scopeRestricted && (
            <p className="search-scope-hint text-muted small mb-0">
              検索結果はご自身の管轄部門内の社員に限定されます。
            </p>
          )}
          <div className="search-form-grid">
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchKeyword" icon="bi-person">
                社員名 / 社員ID
              </SearchFieldLabel>
              <input
                id="searchKeyword"
                type="search"
                className="form-control form-control-sm"
                placeholder="例: 山田 / btcS00001"
                value={filters.keyword}
                onChange={(e) => updateFilters({ keyword: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchCompany" icon="bi-building">
                所属会社
              </SearchFieldLabel>
              <select
                id="searchCompany"
                className="form-select form-select-sm"
                value={filters.affiliationCompany}
                onChange={(e) => updateFilters({ affiliationCompany: e.target.value })}
              >
                <option value="">すべて</option>
                {affiliationCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchDept" icon="bi-diagram-3">
                所属部門
              </SearchFieldLabel>
              <select
                id="searchDept"
                className="form-select form-select-sm"
                value={filters.departmentId}
                onChange={(e) => updateFilters({ departmentId: e.target.value })}
              >
                <option value="">{scopeRestricted ? '管轄内すべて' : 'すべて'}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {departmentOptionLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchEmployeeType" icon="bi-person-badge">
                社員種別
              </SearchFieldLabel>
              <select
                id="searchEmployeeType"
                className="form-select form-select-sm"
                value={filters.employeeType}
                onChange={(e) => updateFilters({ employeeType: e.target.value })}
              >
                <option value="">すべて</option>
                {employeeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchWorkStatus" icon="bi-activity">
                稼働状況
              </SearchFieldLabel>
              <select
                id="searchWorkStatus"
                className="form-select form-select-sm"
                value={filters.workStatus}
                onChange={(e) => updateFilters({ workStatus: e.target.value })}
              >
                <option value="">すべて</option>
                {workStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchSkillKeyword" icon="bi-tools">
                スキル・技術キーワード
              </SearchFieldLabel>
              <input
                id="searchSkillKeyword"
                type="search"
                className="form-control form-control-sm"
                placeholder="例: Java / AWS / API"
                value={filters.skillKeyword}
                onChange={(e) => updateFilters({ skillKeyword: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchTechCategory" icon="bi-grid-3x3-gap">
                技術カテゴリ
              </SearchFieldLabel>
              <select
                id="searchTechCategory"
                className="form-select form-select-sm"
                value={filters.technicalCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">指定なし</option>
                {TECHNICAL_SKILL_TEMPLATE.map((group) => (
                  <option key={group.category} value={group.category}>
                    {group.category}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchTechItem" icon="bi-code-slash">
                技術項目
              </SearchFieldLabel>
              <select
                id="searchTechItem"
                className="form-select form-select-sm"
                value={filters.technicalItem}
                onChange={(e) => updateFilters({ technicalItem: e.target.value })}
                disabled={!filters.technicalCategory}
              >
                <option value="">すべて</option>
                {technicalItems.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="searchTechMinLevel" icon="bi-bar-chart-steps">
                最低レベル
              </SearchFieldLabel>
              <select
                id="searchTechMinLevel"
                className="form-select form-select-sm"
                value={filters.technicalMinLevel}
                onChange={(e) => updateFilters({ technicalMinLevel: e.target.value })}
                disabled={!filters.technicalCategory}
              >
                <option value="">指定なし</option>
                {[...TECHNICAL_SKILL_MARK_OPTIONS].reverse().map((level) => (
                  <option key={level} value={level}>
                    {level} 以上
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
