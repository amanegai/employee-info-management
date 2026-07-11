import { Link } from 'react-router-dom';
import { resolveAccountingFields } from '../../utils/clientAccounting';

function EmailList({ emails }) {
  const items = emails.filter(Boolean);
  if (!items.length) {
    return <span className="text-muted">—</span>;
  }
  return (
    <ul className="client-detail-email-list mb-0">
      {items.map((email) => (
        <li key={email}>
          <a href={`mailto:${email}`}>{email}</a>
        </li>
      ))}
    </ul>
  );
}

function ContactMetaItem({ icon, label, children, wide }) {
  return (
    <div className={`client-detail-contact-card-item${wide ? ' is-wide' : ''}`}>
      <span className="client-detail-contact-card-item-label">
        <i className={`bi ${icon}`} aria-hidden="true" />
        {label}
      </span>
      <div className="client-detail-contact-card-item-value">{children}</div>
    </div>
  );
}

export function ClientSideContactCards({ contacts, backState }) {
  if (!contacts?.length) {
    return <p className="client-detail-contact-empty mb-0">担当者情報がありません</p>;
  }

  return (
    <div className="client-detail-contact-cards">
      {contacts.map((row) => (
        <article
          key={row.id ?? `${row.contactName}-${row.phone}`}
          className="client-detail-contact-card client-detail-contact-card--client"
        >
          <header className="client-detail-contact-card-header">
            <div>
              <div className="client-detail-contact-card-name">{row.contactName}</div>
              <div className="client-detail-contact-card-subtitle">
                {[row.department, row.position].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            {row.projectName && (
              <div className="client-detail-contact-card-project">
                {row.projectId ? (
                  <Link
                    to={`/projects/${row.projectId}`}
                    state={backState}
                    className="client-detail-entity-link client-detail-entity-link--project"
                  >
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    <span>{row.projectName}</span>
                    <i className="bi bi-box-arrow-up-right client-detail-entity-link-icon" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="client-detail-contact-card-project-static">
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    {row.projectName}
                  </span>
                )}
              </div>
            )}
          </header>

          <div className="client-detail-contact-card-grid">
            <ContactMetaItem icon="bi-telephone" label="電話">
              {row.phone || <span className="text-muted">—</span>}
            </ContactMetaItem>
            <ContactMetaItem icon="bi-envelope" label="メール" wide>
              <EmailList emails={[row.email1, row.email2, row.email3]} />
            </ContactMetaItem>
            <ContactMetaItem icon="bi-clipboard-check" label="担当内容" wide>
              {row.responsibility || <span className="text-muted">—</span>}
            </ContactMetaItem>
            {row.notes && (
              <ContactMetaItem icon="bi-journal-text" label="備考" wide>
                {row.notes}
              </ContactMetaItem>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function InternalContactCards({ contacts, backState }) {
  if (!contacts?.length) {
    return <p className="client-detail-contact-empty mb-0">自社担当者情報がありません</p>;
  }

  return (
    <div className="client-detail-contact-cards client-detail-contact-cards--internal">
      {contacts.map((row) => (
        <article
          key={row.id ?? `${row.contactName}-${row.email}`}
          className="client-detail-contact-card client-detail-contact-card--internal"
        >
          <header className="client-detail-contact-card-header">
            <div>
              <div className="client-detail-contact-card-name">
                {row.employeeId ? (
                  <Link
                    to={`/employees/${row.employeeId}`}
                    state={backState}
                    className="client-detail-entity-link client-detail-entity-link--employee"
                  >
                    {row.contactName}
                    <i className="bi bi-box-arrow-up-right client-detail-entity-link-icon" aria-hidden="true" />
                  </Link>
                ) : (
                  row.contactName
                )}
              </div>
              <div className="client-detail-contact-card-subtitle">
                {[row.department, row.position].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
          </header>

          <div className="client-detail-contact-card-grid">
            <ContactMetaItem icon="bi-telephone" label="電話">
              {row.phone || <span className="text-muted">—</span>}
            </ContactMetaItem>
            <ContactMetaItem icon="bi-envelope" label="メール">
              {row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : <span className="text-muted">—</span>}
            </ContactMetaItem>
            <ContactMetaItem icon="bi-building" label="取引先担当部署">
              {row.clientDepartment || <span className="text-muted">—</span>}
            </ContactMetaItem>
            <ContactMetaItem icon="bi-clipboard-check" label="担当内容" wide>
              {row.responsibility || <span className="text-muted">—</span>}
            </ContactMetaItem>
            {row.notes && (
              <ContactMetaItem icon="bi-journal-text" label="備考" wide>
                {row.notes}
              </ContactMetaItem>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function AccountingContactFields({ client }) {
  const fields = resolveAccountingFields(client);

  return (
    <div className="client-detail-accounting-grid">
      <div className="client-detail-accounting-item">
        <span className="client-detail-accounting-label">担当者名</span>
        <span className={fields.name ? 'client-detail-accounting-value' : 'client-detail-accounting-value is-empty'}>
          {fields.name || '—'}
        </span>
      </div>
      <div className="client-detail-accounting-item">
        <span className="client-detail-accounting-label">所属</span>
        <span className={fields.department ? 'client-detail-accounting-value' : 'client-detail-accounting-value is-empty'}>
          {fields.department || '—'}
        </span>
      </div>
      <div className="client-detail-accounting-item">
        <span className="client-detail-accounting-label">電話</span>
        <span className={fields.phone ? 'client-detail-accounting-value' : 'client-detail-accounting-value is-empty'}>
          {fields.phone || '—'}
        </span>
      </div>
      <div className="client-detail-accounting-item client-detail-accounting-item--wide">
        <span className="client-detail-accounting-label">メール</span>
        <span className={fields.email ? 'client-detail-accounting-value' : 'client-detail-accounting-value is-empty'}>
          {fields.email ? (
            <a href={`mailto:${fields.email}`}>{fields.email}</a>
          ) : (
            '—'
          )}
        </span>
      </div>
    </div>
  );
}
