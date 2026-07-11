import { Link } from 'react-router-dom';
import ListSectionBar from '../ListSectionBar';
import { applyEmployeeToInternalContactRow } from '../../utils/clientInternalContact';
import InternalContactEmployeePicker from './InternalContactEmployeePicker';

export const EMPTY_CLIENT_CONTACT = {
  contactName: '',
  department: '',
  position: '',
  projectName: '',
  phone: '',
  email1: '',
  email2: '',
  email3: '',
  responsibility: '',
  notes: '',
};

export const EMPTY_INTERNAL_CONTACT = {
  employeeId: '',
  contactName: '',
  department: '',
  position: '',
  phone: '',
  email: '',
  clientDepartment: '',
  responsibility: '',
  notes: '',
};

function ContactFormField({ id, label, icon, required, wide, children }) {
  return (
    <div className={`client-form-contact-field${wide ? ' is-wide' : ''}`}>
      <label className="client-form-contact-field-label" htmlFor={id}>
        {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
        <span>{label}</span>
        {required && <span className="client-form-contact-required" aria-hidden="true">*</span>}
      </label>
      {children}
    </div>
  );
}

function ContactGroup({ title, children }) {
  return (
    <div className="client-form-contact-group">
      <h4 className="client-form-contact-group-title">{title}</h4>
      <div className="client-form-contact-group-grid">{children}</div>
    </div>
  );
}

function ContactEmptyState({ variant, message, onAdd }) {
  const icon = variant === 'internal' ? 'bi-person-badge' : 'bi-people';
  return (
    <div className={`client-form-contact-empty client-form-contact-empty--${variant}`}>
      <div className="client-form-contact-empty-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <p className="client-form-contact-empty-text">{message}</p>
      <button type="button" className="btn btn-primary app-btn client-form-contact-empty-btn" onClick={onAdd}>
        <i className="bi bi-plus-lg" aria-hidden="true" />
        担当者を追加
      </button>
    </div>
  );
}

function ClientContactCard({ row, index, onUpdate, onRemove }) {
  const displayName = row.contactName?.trim() || `担当者 ${index + 1}`;
  const subtitle = [row.department, row.position].filter(Boolean).join(' · ');

  return (
    <article className="client-form-contact-card client-form-contact-card--client">
      <header className="client-form-contact-card-header">
        <div className="client-form-contact-card-heading">
          <span className="client-form-contact-card-index" aria-hidden="true">
            {index + 1}
          </span>
          <div className="client-form-contact-card-titles">
            <span className="client-form-contact-card-preview">{displayName}</span>
            {subtitle ? <span className="client-form-contact-card-preview-sub">{subtitle}</span> : null}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm client-form-contact-remove-btn"
          onClick={() => onRemove(index)}
          aria-label={`${displayName}を削除`}
        >
          <i className="bi bi-trash3" aria-hidden="true" />
          <span>削除</span>
        </button>
      </header>

      <div className="client-form-contact-card-body">
        <ContactGroup title="基本情報">
          <ContactFormField id={`cc-name-${index}`} label="担当者名" icon="bi-person" required>
            <input
              id={`cc-name-${index}`}
              className="form-control"
              value={row.contactName}
              onChange={(e) => onUpdate(index, 'contactName', e.target.value)}
              placeholder="例：山田 太郎"
            />
          </ContactFormField>
          <ContactFormField id={`cc-dept-${index}`} label="所属部署" icon="bi-building">
            <input
              id={`cc-dept-${index}`}
              className="form-control"
              value={row.department}
              onChange={(e) => onUpdate(index, 'department', e.target.value)}
              placeholder="例：情報システム部"
            />
          </ContactFormField>
          <ContactFormField id={`cc-pos-${index}`} label="役職" icon="bi-award">
            <input
              id={`cc-pos-${index}`}
              className="form-control"
              value={row.position}
              onChange={(e) => onUpdate(index, 'position', e.target.value)}
              placeholder="例：課長"
            />
          </ContactFormField>
          <ContactFormField id={`cc-proj-${index}`} label="案件名" icon="bi-briefcase" wide>
            <input
              id={`cc-proj-${index}`}
              className="form-control"
              value={row.projectName}
              onChange={(e) => onUpdate(index, 'projectName', e.target.value)}
              placeholder="例：基幹システム更改"
            />
          </ContactFormField>
        </ContactGroup>

        <ContactGroup title="連絡先">
          <ContactFormField id={`cc-phone-${index}`} label="電話番号" icon="bi-telephone">
            <input
              id={`cc-phone-${index}`}
              className="form-control"
              type="tel"
              value={row.phone}
              onChange={(e) => onUpdate(index, 'phone', e.target.value)}
              placeholder="03-1234-5678"
            />
          </ContactFormField>
          <ContactFormField id={`cc-mail1-${index}`} label="メール 1" icon="bi-envelope">
            <input
              id={`cc-mail1-${index}`}
              className="form-control"
              type="email"
              value={row.email1}
              onChange={(e) => onUpdate(index, 'email1', e.target.value)}
              placeholder="name@example.com"
            />
          </ContactFormField>
          <ContactFormField id={`cc-mail2-${index}`} label="メール 2" icon="bi-envelope-at">
            <input
              id={`cc-mail2-${index}`}
              className="form-control"
              type="email"
              value={row.email2}
              onChange={(e) => onUpdate(index, 'email2', e.target.value)}
              placeholder="任意"
            />
          </ContactFormField>
          <ContactFormField id={`cc-mail3-${index}`} label="メール 3" icon="bi-envelope-open">
            <input
              id={`cc-mail3-${index}`}
              className="form-control"
              type="email"
              value={row.email3}
              onChange={(e) => onUpdate(index, 'email3', e.target.value)}
              placeholder="任意"
            />
          </ContactFormField>
        </ContactGroup>

        <ContactGroup title="業務メモ">
          <ContactFormField id={`cc-resp-${index}`} label="担当内容" icon="bi-clipboard-check" wide>
            <input
              id={`cc-resp-${index}`}
              className="form-control"
              value={row.responsibility}
              onChange={(e) => onUpdate(index, 'responsibility', e.target.value)}
              placeholder="例：見積・契約窓口"
            />
          </ContactFormField>
          <ContactFormField id={`cc-notes-${index}`} label="備考" icon="bi-journal-text" wide>
            <textarea
              id={`cc-notes-${index}`}
              className="form-control client-form-contact-textarea"
              rows={2}
              value={row.notes}
              onChange={(e) => onUpdate(index, 'notes', e.target.value)}
              placeholder="連絡の注意点など"
            />
          </ContactFormField>
        </ContactGroup>
      </div>
    </article>
  );
}

function InternalContactCard({
  row,
  index,
  employees,
  reservedEmployeeIds,
  onUpdate,
  onEmployeeSelect,
  onRemove,
}) {
  const linkedFromMaster = Boolean(row.employeeId);
  const linkedEmployee = employees.find((e) => String(e.id) === String(row.employeeId));
  const displayName =
    row.contactName?.trim() || linkedEmployee?.name || `担当者 ${index + 1}`;
  const subtitle = [row.department, row.position].filter(Boolean).join(' · ');
  const masterFieldClass = linkedFromMaster
    ? 'form-control client-form-contact-input--linked'
    : 'form-control';

  return (
    <article className="client-form-contact-card client-form-contact-card--internal">
      <header className="client-form-contact-card-header">
        <div className="client-form-contact-card-heading">
          <span className="client-form-contact-card-index" aria-hidden="true">
            {index + 1}
          </span>
          <div className="client-form-contact-card-titles">
            <span className="client-form-contact-card-preview">
              {displayName}
              {row.employeeId ? (
                <span className="client-form-contact-linked-badge">
                  <i className="bi bi-link-45deg" aria-hidden="true" />
                  社員連携
                </span>
              ) : null}
            </span>
            {subtitle ? <span className="client-form-contact-card-preview-sub">{subtitle}</span> : null}
            {row.employeeId ? (
              <Link
                to={`/employees/${row.employeeId}`}
                className="client-form-contact-employee-link small"
                target="_blank"
                rel="noopener noreferrer"
              >
                社員詳細を開く
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm client-form-contact-remove-btn"
          onClick={() => onRemove(index)}
          aria-label={`${displayName}を削除`}
        >
          <i className="bi bi-trash3" aria-hidden="true" />
          <span>削除</span>
        </button>
      </header>

      <div className="client-form-contact-card-body">
        <ContactGroup title="社員マスタ連携">
          <div className="client-form-contact-field is-wide">
            <span className="client-form-contact-field-label" id={`ic-emp-label-${index}`}>
              <i className="bi bi-person-badge" aria-hidden="true" />
              <span>社員から選択</span>
            </span>
            <InternalContactEmployeePicker
              employees={employees}
              value={row.employeeId || ''}
              reservedEmployeeIds={reservedEmployeeIds}
              onSelect={(employeeId) => onEmployeeSelect(index, employeeId)}
            />
          </div>
        </ContactGroup>

        {linkedFromMaster ? (
          <p className="client-form-contact-linked-hint">
            <i className="bi bi-info-circle" aria-hidden="true" />
            社員マスタから反映した氏名・所属・連絡先は編集できません。変更する場合は社員情報を更新するか、「手入力」を選び直してください。
          </p>
        ) : null}

        <ContactGroup title="基本情報">
          <ContactFormField id={`ic-name-${index}`} label="担当者名" icon="bi-person" required>
            <input
              id={`ic-name-${index}`}
              className={masterFieldClass}
              value={row.contactName}
              onChange={(e) => onUpdate(index, 'contactName', e.target.value)}
              placeholder="例：佐藤 花子"
              readOnly={linkedFromMaster}
              aria-readonly={linkedFromMaster}
            />
          </ContactFormField>
          <ContactFormField id={`ic-dept-${index}`} label="所属部門" icon="bi-diagram-3">
            <input
              id={`ic-dept-${index}`}
              className={masterFieldClass}
              value={row.department}
              onChange={(e) => onUpdate(index, 'department', e.target.value)}
              placeholder="例：営業部"
              readOnly={linkedFromMaster}
              aria-readonly={linkedFromMaster}
            />
          </ContactFormField>
          <ContactFormField id={`ic-pos-${index}`} label="役職" icon="bi-award">
            <input
              id={`ic-pos-${index}`}
              className={masterFieldClass}
              value={row.position}
              onChange={(e) => onUpdate(index, 'position', e.target.value)}
              placeholder="例：マネージャー"
              readOnly={linkedFromMaster}
              aria-readonly={linkedFromMaster}
            />
          </ContactFormField>
          <ContactFormField id={`ic-cdept-${index}`} label="取引先担当部署" icon="bi-building" wide>
            <input
              id={`ic-cdept-${index}`}
              className="form-control"
              value={row.clientDepartment}
              onChange={(e) => onUpdate(index, 'clientDepartment', e.target.value)}
              placeholder="取引先側で担当している部署"
            />
          </ContactFormField>
        </ContactGroup>

        <ContactGroup title="連絡先">
          <ContactFormField id={`ic-phone-${index}`} label="電話番号" icon="bi-telephone">
            <input
              id={`ic-phone-${index}`}
              className={masterFieldClass}
              type="tel"
              value={row.phone}
              onChange={(e) => onUpdate(index, 'phone', e.target.value)}
              placeholder="内線・携帯など"
              readOnly={linkedFromMaster}
              aria-readonly={linkedFromMaster}
            />
          </ContactFormField>
          <ContactFormField id={`ic-mail-${index}`} label="メール" icon="bi-envelope" wide>
            <input
              id={`ic-mail-${index}`}
              className={masterFieldClass}
              type="email"
              value={row.email}
              onChange={(e) => onUpdate(index, 'email', e.target.value)}
              placeholder="name@company.co.jp"
              readOnly={linkedFromMaster}
              aria-readonly={linkedFromMaster}
            />
          </ContactFormField>
        </ContactGroup>

        <ContactGroup title="業務メモ">
          <ContactFormField id={`ic-resp-${index}`} label="担当内容" icon="bi-clipboard-check" wide>
            <input
              id={`ic-resp-${index}`}
              className="form-control"
              value={row.responsibility}
              onChange={(e) => onUpdate(index, 'responsibility', e.target.value)}
              placeholder="例：アカウント管理・提案"
            />
          </ContactFormField>
          <ContactFormField id={`ic-notes-${index}`} label="備考" icon="bi-journal-text" wide>
            <textarea
              id={`ic-notes-${index}`}
              className="form-control client-form-contact-textarea"
              rows={2}
              value={row.notes}
              onChange={(e) => onUpdate(index, 'notes', e.target.value)}
              placeholder="連絡の注意点など"
            />
          </ContactFormField>
        </ContactGroup>
      </div>
    </article>
  );
}

function ContactSectionShell({ variant, icon, title, count, onAdd, children }) {
  const panelClass =
    variant === 'internal'
      ? 'client-detail-contact-panel--internal'
      : 'client-detail-contact-panel--client';

  return (
    <section className={`table-section list-section-panel client-detail-contact-panel ${panelClass} mt-3`}>
      <ListSectionBar
        icon={icon}
        title={title}
        count={count}
        hideCount={!count}
        actions={
          <button
            type="button"
            className="btn btn-outline-light app-btn client-section-action-btn"
            onClick={onAdd}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            行を追加
          </button>
        }
      />
      <div className="list-section-body list-section-body-padded client-form-contacts">{children}</div>
    </section>
  );
}

export function ClientFormClientContactsSection({ contacts, onAdd, onUpdate, onRemove }) {
  return (
    <ContactSectionShell
      variant="client"
      icon="bi-people"
      title="取引先側案件担当者"
      count={contacts.length}
      onAdd={onAdd}
    >
      {contacts.length === 0 ? (
        <ContactEmptyState
          variant="client"
          message="取引先側の案件担当者が未登録です。下のボタンから追加できます。"
          onAdd={onAdd}
        />
      ) : (
        <div className="client-form-contact-cards">
          {contacts.map((row, index) => (
            <ClientContactCard
              key={`client-contact-${index}`}
              row={row}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </ContactSectionShell>
  );
}

export function ClientFormInternalContactsSection({
  contacts,
  employees,
  onAdd,
  onUpdate,
  onEmployeeSelect,
  onRemove,
}) {
  return (
    <ContactSectionShell
      variant="internal"
      icon="bi-person-badge"
      title="自社担当者情報"
      count={contacts.length}
      onAdd={onAdd}
    >
      {contacts.length === 0 ? (
        <ContactEmptyState
          variant="internal"
          message="自社担当者が未登録です。社員マスタから選ぶか、手入力で登録できます。"
          onAdd={onAdd}
        />
      ) : (
        <div className="client-form-contact-cards client-form-contact-cards--internal">
          {contacts.map((row, index) => {
            const reservedEmployeeIds = contacts
              .filter((_, i) => i !== index)
              .map((c) => c.employeeId)
              .filter(Boolean)
              .map(String);
            return (
              <InternalContactCard
                key={`internal-contact-${index}`}
                row={row}
                index={index}
                employees={employees}
                reservedEmployeeIds={reservedEmployeeIds}
                onUpdate={onUpdate}
                onEmployeeSelect={onEmployeeSelect}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      )}
    </ContactSectionShell>
  );
}

export function selectInternalContactEmployee(contacts, index, employeeId, employees) {
  const employee = employees.find((e) => String(e.id) === String(employeeId));
  return contacts.map((row, i) =>
    i === index ? applyEmployeeToInternalContactRow(row, employeeId ? employee : null) : row
  );
}
