import SearchFieldLabel from './SearchFieldLabel';
import { projectStatusLabel } from '../utils/projectWorkflow';

export default function ProjectSearchForm({ filters, statuses, expanded, onToggle, onChange }) {
  function updateFilters(patch) {
    onChange({ ...filters, ...patch });
  }

  return (
    <section className="search-section" aria-label="検索条件">
      <button
        type="button"
        className="search-section-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="project-search-form-panel"
      >
        <span className="h6 text-muted mb-0">検索条件</span>
        <span className="search-toggle-icon" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div id="project-search-form-panel" className="search-form-panel mt-2">
          <div className="search-form-grid">
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="projectSearchKeyword" icon="bi-briefcase">
                取引先 / 案件名
              </SearchFieldLabel>
              <input
                id="projectSearchKeyword"
                type="search"
                className="form-control form-control-sm"
                placeholder="例: 株式会社ABC / Java開発"
                value={filters.keyword}
                onChange={(e) => updateFilters({ keyword: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="projectSearchStatus" icon="bi-flag">
                ステータス
              </SearchFieldLabel>
              <select
                id="projectSearchStatus"
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => updateFilters({ status: e.target.value })}
              >
                <option value="">すべて</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {projectStatusLabel(status)}
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
