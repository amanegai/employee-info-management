import { useEffect, useMemo, useState } from 'react';
import {
  invalidateClientPickerCache,
  loadClientPickerClients,
  sortClients,
} from '../utils/clientPickerData';

export function invalidateClientNameSelectCache() {
  invalidateClientPickerCache();
}

function formatClientLabel(client, showClientCode = true) {
  if (showClientCode && client.clientCode) {
    return `${client.clientCode} ${client.name}`;
  }
  return client.name;
}

export default function ClientNameSelect({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = '取引先を選択',
  showClientCode = true,
}) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const legacyValue =
    value && !sortedClients.some((client) => client.name === value) ? value : '';

  const useManualInput = !loading && (Boolean(error) || sortedClients.length === 0);

  const selectClass = ['form-select', className].filter(Boolean).join(' ');
  const inputClass = ['form-control', className].filter(Boolean).join(' ');

  if (loading) {
    return (
      <select id={id} className={selectClass} disabled aria-busy="true">
        <option value="">読込中…</option>
      </select>
    );
  }

  if (useManualInput) {
    return (
      <>
        <input
          id={id}
          type="text"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder="取引先名を入力"
        />
        {error ? <div className="form-text text-danger">{error}</div> : null}
        {!error ? (
          <div className="form-text text-muted">取引先マスタ未登録のため、直接入力できます。</div>
        ) : null}
      </>
    );
  }

  return (
    <select
      id={id}
      className={selectClass}
      value={legacyValue || value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {legacyValue ? (
        <option value={legacyValue}>{legacyValue}（マスタ未登録）</option>
      ) : null}
      {sortedClients.map((client) => (
        <option key={client.id} value={client.name}>
          {formatClientLabel(client, showClientCode)}
        </option>
      ))}
    </select>
  );
}
