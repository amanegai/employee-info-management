import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ClientStatusBadge, { ClientRankBadge } from '../components/ClientStatusBadge';
import ListSectionBar from '../components/ListSectionBar';
import {
  AccountingContactFields,
  ClientSideContactCards,
  InternalContactCards,
} from '../components/client/ClientDetailContactSections';
import ClientRelatedProjectsSection from '../components/client/ClientRelatedProjectsSection';
import { canWriteClientEvents, canViewProjectFeatures } from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';

function formatDate(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 10).replace(/-/g, '/');
}

function formatAddress(client) {
  const parts = [];
  if (client.postalCode) parts.push(`〒${client.postalCode}`);
  if (client.address) parts.push(client.address);
  if (parts.length) return parts.join(' ');
  return client.location || '';
}

function InfoField({ label, value, wide, children, className = '' }) {
  const display = children ?? value;
  const empty = display == null || display === '' || display === '—';
  return (
    <div className={`client-detail-info-field${wide ? ' is-wide' : ''}${className ? ` ${className}` : ''}`}>
      <div className="client-detail-info-label">{label}</div>
      <div className={`client-detail-info-value${empty ? ' is-empty' : ''}`}>
        {empty ? '—' : display}
      </div>
    </div>
  );
}

function SubsectionTitle({ icon, children }) {
  return (
    <div className="client-detail-subsection-title">
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteClientEvents(user);
  const [client, setClient] = useState(null);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const canViewProjects = canViewProjectFeatures(user);
  const loadClient = useCallback(async () => {
    setLoading(true);
    setProjectsLoading(canViewProjects);
    try {
      const clientData = await api.getClient(id);
      setClient(clientData);
      if (canViewProjects) {
        try {
          const projects = await api.getClientProjects(id);
          setRelatedProjects(projects);
        } catch {
          setRelatedProjects([]);
        }
      } else {
        setRelatedProjects([]);
      }
    } catch (e) {
      showMessage(e.message, 'danger');
      setClient(null);
      setRelatedProjects([]);
    } finally {
      setLoading(false);
      setProjectsLoading(false);
    }
  }, [id, showMessage, canViewProjects]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center client-detail-page">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0 text-muted">読み込み中…</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container-fluid py-5 client-detail-page client-management-page">
        <div className="page-state-panel">
          <p className="mb-3">取引先が見つかりません</p>
          <Link to="/clients" className="btn btn-outline-secondary app-btn client-section-action-btn">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const displayAddress = formatAddress(client);
  const detailBackState = {
    from: `/clients/${client.id}`,
    fromLabel: '取引先詳細',
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 client-detail-page list-page client-management-page">
      <PageHeader
        guideId="client-detail"
        icon="bi-building"
        title="取引先管理詳細"
        lead="取引先の基本情報・関連案件・取引条件・担当者情報"
        className="mb-4"
      >
        {canEdit && (
          <Link to={`/clients/${client.id}/edit`} className="btn btn-primary app-btn">
            <i className="bi bi-pencil" aria-hidden="true" />
            編集
          </Link>
        )}
        <button type="button" className="btn btn-outline-secondary app-btn" onClick={() => navigate('/clients')}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          一覧に戻る
        </button>
      </PageHeader>

      <section className="table-section list-section-panel">
        <ListSectionBar icon="bi-building" title="取引先基本情報" hideCount />
        <div className="list-section-body list-section-body-padded">
          <div className="client-detail-hero">
            <div className="client-detail-hero-main">
              <div className="client-detail-hero-name">{client.name}</div>
              {displayAddress && (
                <div className="client-detail-hero-meta">
                  <i className="bi bi-geo-alt" aria-hidden="true" />
                  {displayAddress}
                </div>
              )}
            </div>
            <div className="client-detail-hero-status-panel">
              <div className="client-detail-status-card">
                <span className="client-detail-status-card-label">重要度</span>
                <div className="client-detail-status-card-value">
                  <ClientRankBadge rank={client.clientRank} />
                </div>
              </div>
              <div className="client-detail-status-card">
                <span className="client-detail-status-card-label">契約状況</span>
                <div className="client-detail-status-card-value">
                  <ClientStatusBadge status={client.contractStatus} />
                </div>
              </div>
              <div className="client-detail-status-card client-detail-status-card--metric">
                <span className="client-detail-status-card-label">関連案件数</span>
                <div className="client-detail-status-card-value">
                  <span className="client-detail-metric-value">{client.relatedProjectCount ?? 0}</span>
                  <span className="client-detail-metric-unit">件</span>
                </div>
              </div>
            </div>
          </div>

          <div className="client-detail-dual-panels">
            <section className="client-detail-section-panel client-detail-section-panel--company">
              <h3 className="client-detail-section-heading">
                <i className="bi bi-info-circle" aria-hidden="true" />
                会社情報
              </h3>
              <div className="client-detail-section-body">
                <div className="client-detail-subsection">
                  <SubsectionTitle icon="bi-geo-alt">所在地・連絡先</SubsectionTitle>
                  <div className="client-detail-address-card">
                    <div className="client-detail-address-lines">
                      {client.postalCode && (
                        <div className="client-detail-address-line">
                          <span className="client-detail-address-tag">郵便番号</span>
                          <span>〒{client.postalCode}</span>
                        </div>
                      )}
                      <div className="client-detail-address-line">
                        <span className="client-detail-address-tag">住所</span>
                        <span className={client.address ? '' : 'text-muted'}>
                          {client.address || displayAddress || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="client-detail-contact-chips">
                      <div className="client-detail-contact-chip">
                        <i className="bi bi-telephone" aria-hidden="true" />
                        <div>
                          <span className="client-detail-chip-label">代表電話</span>
                          <span>{client.phone || '—'}</span>
                        </div>
                      </div>
                      <div className="client-detail-contact-chip">
                        <i className="bi bi-printer" aria-hidden="true" />
                        <div>
                          <span className="client-detail-chip-label">FAX</span>
                          <span>{client.fax || '—'}</span>
                        </div>
                      </div>
                      <div className="client-detail-contact-chip client-detail-contact-chip--wide">
                        <i className="bi bi-link-45deg" aria-hidden="true" />
                        <div>
                          <span className="client-detail-chip-label">会社URL</span>
                          {client.companyUrl ? (
                            <a href={client.companyUrl} target="_blank" rel="noreferrer noopener">
                              {client.companyUrl}
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="client-detail-subsection">
                  <SubsectionTitle icon="bi-building">企業概要</SubsectionTitle>
                  <div className="client-detail-info-grid client-detail-info-grid--profile">
                    <InfoField label="業種" value={client.industry} />
                    <InfoField label="代表者名" value={client.representativeName} />
                    <InfoField label="資本金" value={client.capital} />
                    <InfoField label="従業員数" value={client.employeeCount} />
                    <InfoField label="設立日" value={formatDate(client.establishedDate)} />
                    {client.corporateNumber && (
                      <InfoField label="法人番号" value={client.corporateNumber} />
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="client-detail-section-panel client-detail-section-panel--billing">
              <h3 className="client-detail-section-heading">
                <i className="bi bi-receipt" aria-hidden="true" />
                請求・与信
              </h3>
              <div className="client-detail-section-body">
                <div className="client-detail-subsection">
                  <SubsectionTitle icon="bi-envelope-paper">請求関連</SubsectionTitle>
                  <div className="client-detail-highlight-block client-detail-highlight-block--invoice">
                    <div className="client-detail-highlight-label">請求書送付先</div>
                    <div className="client-detail-highlight-value">
                      {client.invoiceDeliveryAddress || '—'}
                    </div>
                  </div>
                  <div className="client-detail-subsection client-detail-subsection--tight">
                    <SubsectionTitle icon="bi-person-vcard">経理担当者</SubsectionTitle>
                    <AccountingContactFields client={client} />
                  </div>
                </div>

                <div className="client-detail-subsection">
                  <SubsectionTitle icon="bi-shield-check">与信情報</SubsectionTitle>
                  <div className="client-detail-credit-metrics">
                    <div className="client-detail-credit-metric">
                      <span className="client-detail-credit-metric-label">取引上限</span>
                      <span className={`client-detail-credit-metric-value${client.creditLimit ? '' : ' is-empty'}`}>
                        {client.creditLimit || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="client-detail-highlight-block client-detail-highlight-block--credit">
                    <div className="client-detail-highlight-label">与信メモ</div>
                    <div className={`client-detail-highlight-value${client.creditInfo ? '' : ' is-empty'}`}>
                      {client.creditInfo || '与信情報は未登録です。'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="client-detail-info-group">
            <h3 className="client-detail-info-group-title">
              <i className="bi bi-cash-stack" aria-hidden="true" />
              取引条件
            </h3>
            <div className="client-detail-info-grid">
              <InfoField label="契約形態" value={client.contractType} />
              <InfoField label="取引開始日" value={formatDate(client.tradeStartDate)} />
              <InfoField label="契約更新日" value={formatDate(client.contractRenewalDate)} />
              <InfoField label="契約満了日" value={formatDate(client.contractExpiryDate)} />
              <InfoField label="支払サイト" value={client.paymentTerms} />
              <InfoField label="支払方法" value={client.paymentMethod} />
              <InfoField label="自社主担当" value={client.primaryInternalContact} />
            </div>
          </div>

          <div className="client-detail-info-group">
            <h3 className="client-detail-info-group-title">
              <i className="bi bi-clock-history" aria-hidden="true" />
              登録情報
            </h3>
            <div className="client-detail-info-grid">
              <InfoField label="登録日" value={formatDate(client.createdAt)} />
              <InfoField label="最終更新日" value={formatDate(client.updatedAt)} />
            </div>
          </div>

          <div className="client-detail-notes-block">
            <div className="client-detail-info-group-title mb-2">
              <i className="bi bi-journal-text" aria-hidden="true" />
              備考
            </div>
            {client.notes ? (
              <p className="client-detail-notes mb-0">{client.notes}</p>
            ) : (
              <p className="client-detail-notes-empty mb-0">備考は未登録です。</p>
            )}
          </div>
        </div>
      </section>

      {canViewProjects && (
        <ClientRelatedProjectsSection
          projects={relatedProjects}
          loading={projectsLoading}
          clientId={client.id}
          backState={detailBackState}
        />
      )}

      <section className="table-section list-section-panel client-detail-contact-panel client-detail-contact-panel--client mt-3">
        <ListSectionBar
          icon="bi-people"
          title="取引先側案件担当者"
          count={client.clientContacts?.length ?? 0}
          hideCount={!client.clientContacts?.length}
        />
        <div className="list-section-body list-section-body-padded">
          <ClientSideContactCards contacts={client.clientContacts} backState={detailBackState} />
        </div>
      </section>

      <section className="table-section list-section-panel client-detail-contact-panel client-detail-contact-panel--internal mt-3">
        <ListSectionBar
          icon="bi-person-badge"
          title="自社担当者情報"
          count={client.internalContacts?.length ?? 0}
          hideCount={!client.internalContacts?.length}
        />
        <div className="list-section-body list-section-body-padded">
          <InternalContactCards contacts={client.internalContacts} backState={detailBackState} />
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
