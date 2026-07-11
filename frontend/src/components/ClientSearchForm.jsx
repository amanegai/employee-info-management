import SearchFieldLabel from './SearchFieldLabel';

export default function ClientSearchForm({ filters, statuses, expanded, onToggle, onChange }) {
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
        aria-controls="client-search-form-panel"
      >
        <span className="h6 text-muted mb-0">検索条件</span>
        <span className="search-toggle-icon" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div id="client-search-form-panel" className="search-form-panel mt-2">
          <div className="search-form-grid">
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="clientSearchName" icon="bi-building">
                取引先名
              </SearchFieldLabel>
              <input
                id="clientSearchName"
                type="search"
                className="form-control form-control-sm"
                placeholder="取引先名"
                value={filters.name}
                onChange={(e) => updateFilters({ name: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="clientSearchLocation" icon="bi-geo-alt">
                所在地
              </SearchFieldLabel>
              <input
                id="clientSearchLocation"
                type="search"
                className="form-control form-control-sm"
                placeholder="所在地"
                value={filters.location}
                onChange={(e) => updateFilters({ location: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="search-form-field">
              <SearchFieldLabel htmlFor="clientSearchStatus" icon="bi-file-earmark-text">
                契約状況
              </SearchFieldLabel>
              <select
                id="clientSearchStatus"
                className="form-select form-select-sm"
                value={filters.contractStatus}
                onChange={(e) => updateFilters({ contractStatus: e.target.value })}
              >
                <option value="">すべて</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
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
