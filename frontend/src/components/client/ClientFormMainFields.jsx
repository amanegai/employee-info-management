function SubsectionTitle({ icon, children }) {
  return (
    <div className="client-detail-subsection-title">
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </div>
  );
}

function FormField({ id, label, required, children, className = '' }) {
  return (
    <div className={`client-form-field ${className}`.trim()}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function ClientFormMainFields({ form, updateField, ranks, statuses, contractTypes }) {
  return (
    <>
      <div className="client-detail-hero">
        <div className="client-detail-hero-main">
          <FormField id="clientName" label="取引先名" required className="client-form-hero-name-field">
            <input
              id="clientName"
              className="form-control client-form-hero-name-input"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              placeholder="取引先名を入力"
            />
          </FormField>
          {(form.postalCode || form.address) && (
            <div className="client-detail-hero-meta">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              {[form.postalCode && `〒${form.postalCode}`, form.address].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
        <div className="client-detail-hero-status-panel">
          <div className="client-detail-status-card">
            <span className="client-detail-status-card-label">重要度</span>
            <div className="client-detail-status-card-value">
              <select
                id="clientRank"
                className="form-select form-select-sm"
                value={form.clientRank}
                onChange={(e) => updateField('clientRank', e.target.value)}
                aria-label="重要度"
              >
                <option value="">未設定</option>
                {ranks.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="client-detail-status-card">
            <span className="client-detail-status-card-label">契約状況</span>
            <div className="client-detail-status-card-value">
              <select
                id="clientContractStatus"
                className="form-select form-select-sm"
                value={form.contractStatus}
                onChange={(e) => updateField('contractStatus', e.target.value)}
                aria-label="契約状況"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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
                <div className="client-form-field-grid client-form-field-grid--3 mb-3">
                  <FormField id="clientPostalCode" label="郵便番号">
                    <input
                      id="clientPostalCode"
                      className="form-control"
                      value={form.postalCode}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      placeholder="例：100-0001"
                    />
                  </FormField>
                  <FormField id="clientAddress" label="住所" className="client-form-field--wide">
                    <input
                      id="clientAddress"
                      className="form-control"
                      value={form.address}
                      onChange={(e) => updateField('address', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="client-form-field-grid client-form-field-grid--3">
                  <FormField id="clientPhone" label="代表電話">
                    <input
                      id="clientPhone"
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  </FormField>
                  <FormField id="clientFax" label="FAX">
                    <input
                      id="clientFax"
                      className="form-control"
                      value={form.fax}
                      onChange={(e) => updateField('fax', e.target.value)}
                    />
                  </FormField>
                  <FormField id="clientCompanyUrl" label="会社URL">
                    <input
                      id="clientCompanyUrl"
                      type="url"
                      className="form-control"
                      value={form.companyUrl}
                      onChange={(e) => updateField('companyUrl', e.target.value)}
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="client-detail-subsection">
              <SubsectionTitle icon="bi-building">企業概要</SubsectionTitle>
              <div className="client-form-field-grid">
                <FormField id="clientIndustry" label="業種">
                  <input
                    id="clientIndustry"
                    className="form-control"
                    value={form.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                  />
                </FormField>
                <FormField id="clientRepresentative" label="代表者名">
                  <input
                    id="clientRepresentative"
                    className="form-control"
                    value={form.representativeName}
                    onChange={(e) => updateField('representativeName', e.target.value)}
                  />
                </FormField>
                <FormField id="clientCapital" label="資本金">
                  <input
                    id="clientCapital"
                    className="form-control"
                    value={form.capital}
                    onChange={(e) => updateField('capital', e.target.value)}
                    placeholder="例：3,000万円"
                  />
                </FormField>
                <FormField id="clientEmployeeCount" label="従業員数">
                  <input
                    id="clientEmployeeCount"
                    className="form-control"
                    value={form.employeeCount}
                    onChange={(e) => updateField('employeeCount', e.target.value)}
                  />
                </FormField>
                <FormField id="clientEstablishedDate" label="設立日">
                  <input
                    id="clientEstablishedDate"
                    type="date"
                    className="form-control"
                    value={form.establishedDate}
                    onChange={(e) => updateField('establishedDate', e.target.value)}
                  />
                </FormField>
                <FormField id="clientCorporateNumber" label="法人番号">
                  <input
                    id="clientCorporateNumber"
                    className="form-control"
                    value={form.corporateNumber}
                    onChange={(e) => updateField('corporateNumber', e.target.value)}
                    placeholder="例：1234567890123"
                  />
                </FormField>
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
              <FormField id="clientInvoiceDeliveryAddress" label="請求書送付先" className="mb-3">
                <input
                  id="clientInvoiceDeliveryAddress"
                  className="form-control"
                  value={form.invoiceDeliveryAddress}
                  onChange={(e) => updateField('invoiceDeliveryAddress', e.target.value)}
                />
              </FormField>
              <div className="client-detail-subsection client-detail-subsection--tight">
                <SubsectionTitle icon="bi-person-vcard">経理担当者</SubsectionTitle>
                <div className="client-form-field-grid">
                  <FormField id="clientAccountingContactName" label="担当者名">
                    <input
                      id="clientAccountingContactName"
                      className="form-control"
                      value={form.accountingContactName}
                      onChange={(e) => updateField('accountingContactName', e.target.value)}
                    />
                  </FormField>
                  <FormField id="clientAccountingContactDepartment" label="所属">
                    <input
                      id="clientAccountingContactDepartment"
                      className="form-control"
                      value={form.accountingContactDepartment}
                      onChange={(e) => updateField('accountingContactDepartment', e.target.value)}
                    />
                  </FormField>
                  <FormField id="clientAccountingContactPhone" label="電話">
                    <input
                      id="clientAccountingContactPhone"
                      className="form-control"
                      value={form.accountingContactPhone}
                      onChange={(e) => updateField('accountingContactPhone', e.target.value)}
                    />
                  </FormField>
                  <FormField id="clientAccountingContactEmail" label="メール">
                    <input
                      id="clientAccountingContactEmail"
                      type="email"
                      className="form-control"
                      value={form.accountingContactEmail}
                      onChange={(e) => updateField('accountingContactEmail', e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="client-detail-subsection">
              <SubsectionTitle icon="bi-shield-check">与信情報</SubsectionTitle>
              <FormField id="clientCreditLimit" label="取引上限" className="mb-3">
                <input
                  id="clientCreditLimit"
                  className="form-control"
                  value={form.creditLimit}
                  onChange={(e) => updateField('creditLimit', e.target.value)}
                  placeholder="例：500万円"
                />
              </FormField>
              <FormField id="clientCreditInfo" label="与信メモ">
                <textarea
                  id="clientCreditInfo"
                  className="form-control"
                  rows={3}
                  value={form.creditInfo}
                  onChange={(e) => updateField('creditInfo', e.target.value)}
                  placeholder="与信情報・審査メモなど"
                />
              </FormField>
            </div>
          </div>
        </section>
      </div>

      <div className="client-detail-info-group">
        <h3 className="client-detail-info-group-title">
          <i className="bi bi-cash-stack" aria-hidden="true" />
          取引条件
        </h3>
        <div className="client-form-field-grid">
          <FormField id="clientContractType" label="契約形態">
            <select
              id="clientContractType"
              className="form-select"
              value={form.contractType}
              onChange={(e) => updateField('contractType', e.target.value)}
            >
              <option value="">未設定</option>
              {contractTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="clientTradeStartDate" label="取引開始日">
            <input
              id="clientTradeStartDate"
              type="date"
              className="form-control"
              value={form.tradeStartDate}
              onChange={(e) => updateField('tradeStartDate', e.target.value)}
            />
          </FormField>
          <FormField id="clientContractRenewalDate" label="契約更新日">
            <input
              id="clientContractRenewalDate"
              type="date"
              className="form-control"
              value={form.contractRenewalDate}
              onChange={(e) => updateField('contractRenewalDate', e.target.value)}
            />
          </FormField>
          <FormField id="clientContractExpiryDate" label="契約満了日">
            <input
              id="clientContractExpiryDate"
              type="date"
              className="form-control"
              value={form.contractExpiryDate}
              onChange={(e) => updateField('contractExpiryDate', e.target.value)}
            />
          </FormField>
          <FormField id="clientPaymentTerms" label="支払サイト">
            <input
              id="clientPaymentTerms"
              className="form-control"
              value={form.paymentTerms}
              onChange={(e) => updateField('paymentTerms', e.target.value)}
            />
          </FormField>
          <FormField id="clientPaymentMethod" label="支払方法">
            <input
              id="clientPaymentMethod"
              className="form-control"
              value={form.paymentMethod}
              onChange={(e) => updateField('paymentMethod', e.target.value)}
            />
          </FormField>
          <FormField id="clientPrimaryInternalContact" label="自社主担当">
            <input
              id="clientPrimaryInternalContact"
              className="form-control"
              value={form.primaryInternalContact}
              onChange={(e) => updateField('primaryInternalContact', e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className="client-detail-notes-block">
        <div className="client-detail-info-group-title mb-2">
          <i className="bi bi-journal-text" aria-hidden="true" />
          備考
        </div>
        <textarea
          id="clientNotes"
          className="form-control"
          rows={4}
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="社内メモ・連絡事項など"
        />
      </div>
    </>
  );
}
