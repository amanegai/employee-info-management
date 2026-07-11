package jp.dispatch.employee.dto;

import java.util.List;

public record ClientSaveRequest(
        String name,
        String location,
        String postalCode,
        String address,
        String phone,
        String fax,
        String companyUrl,
        String industry,
        String representativeName,
        String capital,
        String employeeCount,
        String establishedDate,
        String tradeStartDate,
        String contractType,
        String contractRenewalDate,
        String contractExpiryDate,
        String paymentTerms,
        String paymentMethod,
        String primaryInternalContact,
        String invoiceDeliveryAddress,
        String accountingContact,
        String accountingContactName,
        String accountingContactDepartment,
        String accountingContactPhone,
        String accountingContactEmail,
        String corporateNumber,
        String creditInfo,
        String creditLimit,
        String clientRank,
        String contractStatus,
        String notes,
        List<ClientContactDto> clientContacts,
        List<ClientInternalContactDto> internalContacts
) {
}
