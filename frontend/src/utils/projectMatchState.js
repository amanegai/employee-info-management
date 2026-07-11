const PROJECT_MATCH_SESSION_KEY = 'projectMatchState';

export function clearProjectMatchStorage() {
  sessionStorage.removeItem(PROJECT_MATCH_SESSION_KEY);
}

export function readInitialMatchState(locationState) {
  const saved = locationState?.matchState;
  return {
    projectText: saved?.projectText ?? '',
    parsed: saved?.parsed ?? null,
    results: Array.isArray(saved?.results) ? saved.results : [],
    searched: Boolean(saved?.searched),
    selectedProjectId: saved?.selectedProjectId ?? '',
  };
}

export function buildProjectMatchState({ projectText, parsed, results, searched, selectedProjectId }) {
  return { projectText, parsed, results, searched, selectedProjectId };
}
