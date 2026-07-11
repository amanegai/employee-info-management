import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import ListSectionBar from '../components/ListSectionBar';
import ClientFormMainFields from '../components/client/ClientFormMainFields';
import {
  ClientFormClientContactsSection,
  ClientFormInternalContactsSection,
  EMPTY_CLIENT_CONTACT,
  EMPTY_INTERNAL_CONTACT,
  selectInternalContactEmployee,
} from '../components/client/ClientFormContactEditors';
import { invalidateClientNameSelectCache } from '../components/ClientNameSelect';
import { buildAccountingPayload, resolveAccountingFields } from '../utils/clientAccounting';
import { useAppMessage } from '../context/MessageContext';

const EMPTY_FORM = {
  name: '',
  postalCode: '',
  address: '',
  phone: '',
  fax: '',
  companyUrl: '',
  industry: '',
  representativeName: '',
  capital: '',
  employeeCount: '',
  establishedDate: '',
  tradeStartDate: '',
  contractType: '',
  contractRenewalDate: '',
  contractExpiryDate: '',
  paymentTerms: '',
  paymentMethod: '',
  primaryInternalContact: '',
  invoiceDeliveryAddress: '',
  accountingContactName: '',
  accountingContactDepartment: '',
  accountingContactPhone: '',
  accountingContactEmail: '',
  corporateNumber: '',
  creditInfo: '',
  creditLimit: '',
  clientRank: '',
  contractStatus: '商談中',
  notes: '',
  clientContacts: [],
  internalContacts: [],
};

function clientToForm(client) {
  const accounting = resolveAccountingFields(client);
  return {
    name: client.name || '',
    postalCode: client.postalCode || '',
    address: client.address || '',
    phone: client.phone || '',
    fax: client.fax || '',
    companyUrl: client.companyUrl || '',
    industry: client.industry || '',
    representativeName: client.representativeName || '',
    capital: client.capital || '',
    employeeCount: client.employeeCount || '',
    establishedDate: client.establishedDate || '',
    tradeStartDate: client.tradeStartDate || '',
    contractType: client.contractType || '',
    contractRenewalDate: client.contractRenewalDate || '',
    contractExpiryDate: client.contractExpiryDate || '',
    paymentTerms: client.paymentTerms || '',
    paymentMethod: client.paymentMethod || '',
    primaryInternalContact: client.primaryInternalContact || '',
    invoiceDeliveryAddress: client.invoiceDeliveryAddress || '',
    accountingContactName: accounting.name,
    accountingContactDepartment: accounting.department,
    accountingContactPhone: accounting.phone,
    accountingContactEmail: accounting.email,
    corporateNumber: client.corporateNumber || '',
    creditInfo: client.creditInfo || '',
    creditLimit: client.creditLimit || '',
    clientRank: client.clientRank || '',
    contractStatus: client.contractStatus || '商談中',
    notes: client.notes || '',
    clientContacts: (client.clientContacts || []).map((row) => ({
      contactName: row.contactName || '',
      department: row.department || '',
      position: row.position || '',
      projectName: row.projectName || '',
      phone: row.phone || '',
      email1: row.email1 || '',
      email2: row.email2 || '',
      email3: row.email3 || '',
      responsibility: row.responsibility || '',
      notes: row.notes || '',
    })),
    internalContacts: (client.internalContacts || []).map((row) => ({
      employeeId: row.employeeId != null ? String(row.employeeId) : '',
      contactName: row.contactName || '',
      department: row.department || '',
      position: row.position || '',
      phone: row.phone || '',
      email: row.email || '',
      clientDepartment: row.clientDepartment || '',
      responsibility: row.responsibility || '',
      notes: row.notes || '',
    })),
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    postalCode: form.postalCode.trim() || null,
    address: form.address.trim() || null,
    phone: form.phone.trim() || null,
    fax: form.fax.trim() || null,
    companyUrl: form.companyUrl.trim() || null,
    industry: form.industry.trim() || null,
    representativeName: form.representativeName.trim() || null,
    capital: form.capital.trim() || null,
    employeeCount: form.employeeCount.trim() || null,
    establishedDate: form.establishedDate || null,
    tradeStartDate: form.tradeStartDate || null,
    contractType: form.contractType || null,
    contractRenewalDate: form.contractRenewalDate || null,
    contractExpiryDate: form.contractExpiryDate || null,
    paymentTerms: form.paymentTerms.trim() || null,
    paymentMethod: form.paymentMethod.trim() || null,
    primaryInternalContact: form.primaryInternalContact.trim() || null,
    invoiceDeliveryAddress: form.invoiceDeliveryAddress.trim() || null,
    ...buildAccountingPayload(form),
    corporateNumber: form.corporateNumber.trim() || null,
    creditInfo: form.creditInfo.trim() || null,
    creditLimit: form.creditLimit.trim() || null,
    clientRank: form.clientRank || null,
    contractStatus: form.contractStatus,
    notes: form.notes.trim() || null,
    clientContacts: form.clientContacts
      .filter((row) => row.contactName.trim())
      .map((row, index) => ({
        contactName: row.contactName.trim(),
        department: row.department.trim() || null,
        position: row.position.trim() || null,
        projectName: row.projectName.trim() || null,
        phone: row.phone.trim() || null,
        email1: row.email1.trim() || null,
        email2: row.email2.trim() || null,
        email3: row.email3.trim() || null,
        responsibility: row.responsibility.trim() || null,
        notes: row.notes.trim() || null,
        sortOrder: index,
      })),
    internalContacts: form.internalContacts
      .filter((row) => row.contactName.trim())
      .map((row, index) => ({
        employeeId: row.employeeId ? Number(row.employeeId) : null,
        contactName: row.contactName.trim(),
        department: row.department.trim() || null,
        position: row.position.trim() || null,
        phone: row.phone.trim() || null,
        email: row.email.trim() || null,
        clientDepartment: row.clientDepartment.trim() || null,
        responsibility: row.responsibility.trim() || null,
        notes: row.notes.trim() || null,
        sortOrder: index,
      })),
  };
}

export default function ClientFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useAppMessage();
  const savingRef = useRef(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statuses, setStatuses] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    const [statusList, rankList, typeList, employeesResult] = await Promise.allSettled([
      api.getClientContractStatuses(),
      api.getClientRanks(),
      api.getClientContractTypes(),
      api.getClientEligibleInternalContacts(),
    ]);
    if (statusList.status === 'fulfilled') setStatuses(statusList.value);
    if (rankList.status === 'fulfilled') setRanks(rankList.value);
    if (typeList.status === 'fulfilled') setContractTypes(typeList.value);
    if (employeesResult.status === 'fulfilled') {
      setEligibleEmployees(employeesResult.value ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadMeta();
        if (mode === 'edit' && id) {
          setLoading(true);
          setForm(clientToForm(await api.getClient(id)));
        }
      } catch {
        /* handled on submit */
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadMeta, mode]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateContactList(listName, index, field, value) {
    setForm((prev) => ({
      ...prev,
      [listName]: prev[listName].map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }

  function addContactRow(listName, template) {
    setForm((prev) => ({ ...prev, [listName]: [...prev[listName], { ...template }] }));
  }

  function removeContactRow(listName, index) {
    setForm((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, i) => i !== index),
    }));
  }

  function handleInternalEmployeeSelect(index, employeeId) {
    setForm((prev) => ({
      ...prev,
      internalContacts: selectInternalContactEmployee(
        prev.internalContacts,
        index,
        employeeId,
        eligibleEmployees
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!form.name.trim()) {
      showMessage('取引先名は必須です', 'warning');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (mode === 'edit') {
        await api.updateClient(id, payload);
        invalidateClientNameSelectCache();
        showMessage('取引先情報を更新しました', 'success');
        navigate(`/clients/${id}`);
      } else {
        const created = await api.createClient(payload);
        invalidateClientNameSelectCache();
        showMessage('取引先を登録しました', 'success');
        navigate(`/clients/${created.id}`);
      }
    } catch (e) {
      showMessage(e.message || '保存に失敗しました', 'danger');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const title = mode === 'edit' ? '取引先編集' : '取引先新規登録';
  const cancelPath = mode === 'edit' ? `/clients/${id}` : '/clients';
  const submitLabel = saving ? '保存中…' : '保存';

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 client-form-page client-detail-page list-page client-management-page">
      <form className={saving ? 'is-saving' : ''} onSubmit={handleSubmit}>
        <header className="page-header d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div className="page-header-main">
            <div className="page-header-icon" aria-hidden="true">
              <i className="bi bi-building" />
            </div>
            <div>
              <div className="page-header-title-row">
                <h1 className="h3 mb-0">{title}</h1>
                <PageGuideHelpButton guideId="client-form" />
              </div>
              <p className="text-muted mb-0 small">取引先の基本情報・取引条件・担当者情報</p>
            </div>
          </div>
          <div className="page-header-actions d-flex flex-wrap gap-2">
            <Link to={cancelPath} className="btn btn-outline-secondary app-btn">
              <i className="bi bi-x-lg" aria-hidden="true" />
              キャンセル
            </Link>
            <button type="submit" className="btn btn-primary app-btn" disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </header>

        <fieldset disabled={saving}>
          <section className="table-section list-section-panel">
            <ListSectionBar icon="bi-building" title="取引先基本情報" hideCount />
            <div className="list-section-body list-section-body-padded">
              <ClientFormMainFields
                form={form}
                updateField={updateField}
                ranks={ranks}
                statuses={statuses}
                contractTypes={contractTypes}
              />
            </div>
          </section>

          <ClientFormClientContactsSection
            contacts={form.clientContacts}
            onAdd={() => addContactRow('clientContacts', EMPTY_CLIENT_CONTACT)}
            onUpdate={(index, field, value) => updateContactList('clientContacts', index, field, value)}
            onRemove={(index) => removeContactRow('clientContacts', index)}
          />

          <ClientFormInternalContactsSection
            contacts={form.internalContacts}
            employees={eligibleEmployees}
            onAdd={() => addContactRow('internalContacts', EMPTY_INTERNAL_CONTACT)}
            onUpdate={(index, field, value) => updateContactList('internalContacts', index, field, value)}
            onEmployeeSelect={handleInternalEmployeeSelect}
            onRemove={(index) => removeContactRow('internalContacts', index)}
          />
        </fieldset>
      </form>

      <AppFooter />
    </div>
  );
}
