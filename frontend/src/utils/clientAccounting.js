function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

/** legacy 1行テキストから分解 */
export function parseLegacyAccountingContact(text) {
  if (!hasValue(text)) {
    return { name: '', department: '', phone: '', email: '' };
  }
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?)（(.+)）$/);
  if (!match) {
    return { name: trimmed, department: '', phone: '', email: '' };
  }
  const parts = match[2].split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  const email = parts.find((part) => part.includes('@')) || '';
  const phone = parts.find((part) => /^[\d\-+()]+$/.test(part.replace(/\s/g, ''))) || '';
  const department = parts.find((part) => part !== email && part !== phone) || '';
  return {
    name: match[1].trim(),
    department,
    phone,
    email,
  };
}

export function resolveAccountingFields(client) {
  if (!client) {
    return { name: '', department: '', phone: '', email: '' };
  }
  const structured = {
    name: client.accountingContactName || '',
    department: client.accountingContactDepartment || '',
    phone: client.accountingContactPhone || '',
    email: client.accountingContactEmail || '',
  };
  if (Object.values(structured).some(hasValue)) {
    return structured;
  }
  return parseLegacyAccountingContact(client.accountingContact);
}

export function buildAccountingPayload(form) {
  const name = form.accountingContactName?.trim() || '';
  const department = form.accountingContactDepartment?.trim() || '';
  const phone = form.accountingContactPhone?.trim() || '';
  const email = form.accountingContactEmail?.trim() || '';
  return {
    accountingContactName: name || null,
    accountingContactDepartment: department || null,
    accountingContactPhone: phone || null,
    accountingContactEmail: email || null,
    accountingContact: null,
  };
}
