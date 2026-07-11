import { useEffect, useMemo } from 'react';
import { filterTabsByRole } from '../../auth';
import { useAuth } from '../../context/AuthContext';
import { DETAIL_TABS } from '../../utils';

export default function DetailTabs({ activeTab, onChange }) {
  const { user } = useAuth();
  const tabs = useMemo(() => filterTabsByRole(DETAIL_TABS, user), [user]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      onChange(tabs[0]?.id || 'basic');
    }
  }, [activeTab, tabs, onChange]);
  return (
    <ul className="nav detail-tabs mb-0" data-guide="detail-tabs">
      {tabs.map((tab) => (
        <li key={tab.id} className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === tab.id ? 'active' : ''} ${tab.salary ? 'text-danger' : ''}`}
            data-guide={tab.id === 'projects' ? 'detail-tab-projects' : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
