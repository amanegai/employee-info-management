import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  filterClients,
  loadClientPickerClients,
  sortClients,
} from '../utils/clientPickerData';

function clientInitial(name) {
  const t = String(name ?? '').trim();
  return t ? t.charAt(0) : '?';
}

function ClientPickerTags({ client }) {
  return (
    <span className="client-name-picker-card-tags">
      {client.clientCode ? (
        <span className="client-name-picker-tag client-name-picker-tag--code">{client.clientCode}</span>
      ) : null}
      {client.contractStatus ? (
        <span className="client-name-picker-tag">{client.contractStatus}</span>
      ) : null}
      {client.clientRank ? (
        <span
          className="client-name-picker-tag client-name-picker-tag--rank"
          title={`重要度 ${client.clientRank}`}
        >
          {client.clientRank}
        </span>
      ) : null}
      {client.relatedProjectCount > 0 ? (
        <span className="client-name-picker-tag client-name-picker-tag--projects">
          案件 {client.relatedProjectCount}
        </span>
      ) : null}
    </span>
  );
}

/**
 * @param {object} props
 * @param {{ clientId?: string, clientName?: string }} props.value
 * @param {(next: { clientId: string, clientName: string }) => void} props.onChange
 */
export default function ClientNamePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  variant = 'default',
  layout = 'default',
  headerSlot = null,
  hideManualField = false,
  hideLinkedSummary = false,
  manualInputId = 'clientNameManualInput',
}) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await loadClientPickerClients();
        if (!cancelled) {
          setClients(list);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setClients([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedClients = useMemo(() => sortClients(clients), [clients]);
  const filteredClients = useMemo(
    () => filterClients(sortedClients, query),
    [sortedClients, query]
  );

  const linkedClient = sortedClients.find((c) => String(c.id) === String(value.clientId));
  const manualMode = !value.clientId;
  const legacyManualName =
    manualMode && value.clientName && !sortedClients.some((c) => c.name === value.clientName);

  function selectClient(client) {
    onChange({
      clientId: String(client.id),
      clientName: client.name || '',
    });
  }

  function selectManual() {
    if (!value.clientId) {
      return;
    }
    onChange({ clientId: '', clientName: '' });
  }

  if (loading) {
    return <p className="client-name-picker-loading mb-0">取引先を読み込み中…</p>;
  }

  if (error && sortedClients.length === 0) {
    return (
      <div className="client-name-picker-fallback">
        <input
          type="text"
          className="form-control"
          value={value.clientName || ''}
          onChange={(e) => onChange({ clientId: '', clientName: e.target.value })}
          placeholder="取引先名を入力"
          required={required}
          disabled={disabled}
        />
        <p className="client-form-contact-field-hint text-danger mb-0">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={[
        'client-name-picker',
        variant === 'wide' ? 'client-name-picker--wide' : '',
        layout === 'recordForm' ? 'client-name-picker--record-form' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {layout === 'recordForm' ? (
        <div className="client-name-picker-record-header">
          <div className="client-name-picker-record-header-main">
            <label className="client-event-form-label">
              <i className="bi bi-building" aria-hidden="true" />
              <span>取引先</span>
              {required && <span className="client-event-form-required">必須</span>}
            </label>
            <div className="client-name-picker-toolbar">
              <div className="client-name-picker-search">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="取引先名・コードで検索"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={disabled}
                  aria-label="取引先を検索"
                />
              </div>
              <span className="client-name-picker-count" aria-live="polite">
                {filteredClients.length} 件
              </span>
              {query ? (
                <button
                  type="button"
                  className="btn btn-link btn-sm client-name-picker-clear"
                  onClick={() => setQuery('')}
                  disabled={disabled}
                >
                  検索をクリア
                </button>
              ) : null}
            </div>
            <p className="client-form-contact-field-hint mb-0">
              マスタ登録済みの取引先を選ぶか、「手入力」で未登録名を直接入力できます。
            </p>
          </div>
          {headerSlot ? (
            <div className="client-name-picker-record-header-slot">{headerSlot}</div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="client-name-picker-toolbar">
            <div className="client-name-picker-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="取引先名・コードで検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={disabled}
                aria-label="取引先を検索"
              />
            </div>
            <span className="client-name-picker-count" aria-live="polite">
              {filteredClients.length} 件
            </span>
            {query ? (
              <button
                type="button"
                className="btn btn-link btn-sm client-name-picker-clear"
                onClick={() => setQuery('')}
                disabled={disabled}
              >
                検索をクリア
              </button>
            ) : null}
          </div>

          <p className="client-form-contact-field-hint mb-2">
            マスタ登録済みの取引先を選ぶか、「手入力」で未登録名を直接入力できます。一覧はスクロールで確認できます。
          </p>
        </>
      )}

      <div className="client-name-picker-grid" role="listbox" aria-label="取引先を選択">
        <button
          type="button"
          role="option"
          aria-selected={manualMode}
          disabled={disabled}
          className={`client-name-picker-card client-name-picker-card--manual${manualMode ? ' is-selected' : ''}`}
          onClick={selectManual}
        >
          <span className="client-name-picker-card-avatar" aria-hidden="true">
            <i className="bi bi-pencil-square" />
          </span>
          <span className="client-name-picker-card-body">
            <strong className="client-name-picker-card-name">手入力</strong>
            <span className="client-name-picker-card-tags">
              <span className="client-name-picker-tag">マスタ未連携</span>
            </span>
          </span>
          {manualMode ? (
            <i className="bi bi-check-circle-fill client-name-picker-card-check" aria-hidden="true" />
          ) : null}
        </button>

        {filteredClients.length === 0 ? (
          <p className="client-name-picker-empty">検索条件に一致する取引先がありません。</p>
        ) : (
          filteredClients.map((client) => {
            const selected = String(value.clientId) === String(client.id);

            return (
              <button
                key={client.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                className={`client-name-picker-card${selected ? ' is-selected' : ''}`}
                onClick={() => (selected ? selectManual() : selectClient(client))}
                title={client.name}
              >
                <span className="client-name-picker-card-avatar" aria-hidden="true">
                  {clientInitial(client.name)}
                </span>
                <span className="client-name-picker-card-body">
                  <strong className="client-name-picker-card-name">{client.name}</strong>
                  <ClientPickerTags client={client} />
                </span>
                {selected ? (
                  <i className="bi bi-check-circle-fill client-name-picker-card-check" aria-hidden="true" />
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {hideManualField && manualMode && legacyManualName ? (
        <p className="client-form-contact-field-hint mb-0">
          現在の名称はマスタ未登録です。上のカードから選ぶと取引先マスタと紐づけられます。
        </p>
      ) : null}

      {!hideManualField && manualMode ? (
        <div className="client-name-picker-manual-field">
          <label className="client-form-contact-field-label" htmlFor={manualInputId}>
            <i className="bi bi-building" aria-hidden="true" />
            <span>取引先名（手入力）</span>
            {required && <span className="client-form-contact-required" aria-hidden="true">*</span>}
          </label>
          <input
            id={manualInputId}
            type="text"
            className="form-control"
            value={value.clientName || ''}
            onChange={(e) => onChange({ clientId: '', clientName: e.target.value })}
            placeholder="取引先名を入力"
            required={required}
            disabled={disabled}
          />
          {legacyManualName ? (
            <p className="client-form-contact-field-hint mb-0">
              現在の名称はマスタ未登録です。上のカードから選ぶと取引先マスタと紐づけられます。
            </p>
          ) : null}
        </div>
      ) : !manualMode && !hideLinkedSummary ? (
        <div className="client-name-picker-linked-summary">
          <div className="client-name-picker-linked-main">
            <span className="client-form-contact-linked-badge">
              <i className="bi bi-link-45deg" aria-hidden="true" />
              マスタ連携
            </span>
            <strong>{linkedClient?.name || value.clientName}</strong>
            {linkedClient?.clientCode ? (
              <span className="text-muted small ms-1">({linkedClient.clientCode})</span>
            ) : null}
          </div>
          {value.clientId ? (
            <Link
              to={`/clients/${value.clientId}`}
              className="client-form-contact-employee-link small"
              target="_blank"
              rel="noopener noreferrer"
            >
              取引先詳細を開く
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
