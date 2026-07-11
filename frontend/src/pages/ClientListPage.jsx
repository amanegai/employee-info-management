import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ClientSearchForm from '../components/ClientSearchForm';
import ClientStatusBadge, { ClientRankBadge } from '../components/ClientStatusBadge';
import ClientSummaryCards from '../components/ClientSummaryCards';
import { invalidateClientNameSelectCache } from '../components/ClientNameSelect';
import ListSectionBar from '../components/ListSectionBar';
import { canWriteClientEvents } from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FILTERS = {
  name: '',
  location: '',
  contractStatus: '',
};

const SEARCH_DEBOUNCE_MS = 300;

function formatDate(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 10).replace(/-/g, '/');
}

export default function ClientListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteClientEvents(user);

  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const skipSearchEffectRef = useRef(true);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await api.getClientSummary());
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSummaryLoading(false);
    }
  }, [showMessage]);

  const loadClients = useCallback(
    async (searchFilters) => {
      setLoading(true);
      try {
        const params = {};
        if (searchFilters.name?.trim()) params.name = searchFilters.name.trim();
        if (searchFilters.location?.trim()) params.location = searchFilters.location.trim();
        if (searchFilters.contractStatus) params.contractStatus = searchFilters.contractStatus;
        setClients(await api.searchClients(params));
      } catch (e) {
        showMessage(e.message, 'danger');
        setClients([]);
      } finally {
        setLoading(false);
      }
    },
    [showMessage]
  );

  useEffect(() => {
    (async () => {
      try {
        setStatuses(await api.getClientContractStatuses());
        await Promise.all([loadSummary(), loadClients(EMPTY_FILTERS)]);
      } catch (e) {
        showMessage(e.message, 'danger');
      }
    })();
  }, [loadClients, loadSummary, showMessage]);

  useEffect(() => {
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadClients(filters);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters, loadClients]);

  function handleSummaryFilter(status) {
    skipSearchEffectRef.current = true;
    const next = { ...EMPTY_FILTERS, contractStatus: status };
    setFilters(next);
    loadClients(next);
  }

  async function handleDelete(client) {
    if (!window.confirm(`「${client.name}」を削除しますか？`)) return;
    setDeletingId(client.id);
    try {
      await api.deleteClient(client.id);
      invalidateClientNameSelectCache();
      showMessage(`「${client.name}」を削除しました`, 'success');
      skipSearchEffectRef.current = true;
      await Promise.all([loadSummary(), loadClients(filters)]);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  }

  const colSpan = canEdit ? 9 : 8;

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page client-management-page">
      <PageHeader
        guideId="client-list"
        icon="bi-building"
        title="取引先管理一覧"
        lead="顧客・取引先の基本情報と契約状況"
      >
        {canEdit && (
          <Link to="/clients/new" className="btn btn-primary app-btn">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            新規追加
          </Link>
        )}
      </PageHeader>

      <ClientSummaryCards
        summary={summary}
        loading={summaryLoading}
        activeStatus={filters.contractStatus}
        onFilterClick={handleSummaryFilter}
      />

      <ClientSearchForm
        filters={filters}
        statuses={statuses}
        expanded={searchExpanded}
        onToggle={() => setSearchExpanded((v) => !v)}
        onChange={setFilters}
      />

      <section className="table-section list-section-panel" aria-label="取引先一覧" data-guide="client-list-table">
        <ListSectionBar icon="bi-building" title="取引先一覧" count={clients.length} hideCount={loading} />
        <div className="list-section-body p-0">
          <div className="client-list-table-wrap">
            <table
              className={`table table-hover align-middle mb-0 client-list-table${canEdit ? '' : ' client-list-table--eight-cols'}`}
            >
              <colgroup>
                <col className="client-list-col-name" />
                <col className="client-list-col-location" />
                <col className="client-list-col-contact" />
                <col className="client-list-col-rank" />
                <col className="client-list-col-industry" />
                <col className="client-list-col-status" />
                <col className="client-list-col-projects" />
                <col className="client-list-col-date" />
                {canEdit && <col className="client-list-col-action" />}
              </colgroup>
              <thead className="table-light">
                <tr>
                  <th className="client-list-th-text">取引先名</th>
                  <th className="client-list-th-meta">所在地</th>
                  <th className="client-list-th-meta">担当者</th>
                  <th className="client-list-th-meta">重要度</th>
                  <th className="client-list-th-meta">業種</th>
                  <th className="client-list-th-meta">契約状況</th>
                  <th className="client-list-th-meta">関連案件数</th>
                  <th className="client-list-th-date">最終更新</th>
                  {canEdit && <th className="client-list-th-action">操作</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={colSpan} className="text-center text-muted py-4">
                      読み込み中…
                    </td>
                  </tr>
                )}
                {!loading && clients.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="text-center text-muted py-4">
                      該当する取引先がありません
                    </td>
                  </tr>
                )}
                {!loading &&
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className="client-list-row-clickable"
                      onClick={() => navigate(`/clients/${client.id}`)}
                      title="クリックで詳細を表示"
                    >
                      <td className="client-list-cell-text client-list-cell-name">{client.name}</td>
                      <td className="client-list-cell-meta client-list-cell-location">
                        {client.location || '—'}
                      </td>
                      <td className="client-list-cell-meta">
                        {client.primaryContactName || '—'}
                      </td>
                      <td className="client-list-cell-meta">
                        <ClientRankBadge rank={client.clientRank} compact />
                      </td>
                      <td className="client-list-cell-meta">
                        {client.industry || '—'}
                      </td>
                      <td className="client-list-cell-meta">
                        <ClientStatusBadge status={client.contractStatus} />
                      </td>
                      <td className="client-list-cell-projects">
                        {client.relatedProjectCount ?? 0}
                        <span className="client-list-projects-unit">件</span>
                      </td>
                      <td className="client-list-cell-date">
                        {formatDate(client.updatedAt)}
                      </td>
                      {canEdit && (
                        <td className="client-list-cell-action" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-outline-danger app-btn client-section-action-btn"
                            onClick={() => handleDelete(client)}
                            disabled={deletingId === client.id}
                          >
                            {deletingId === client.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            ) : (
                              <>
                                <i className="bi bi-trash" aria-hidden="true" />
                                削除
                              </>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
