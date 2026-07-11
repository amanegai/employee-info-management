package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.ClientContactDto;
import jp.dispatch.employee.dto.ClientDetailDto;
import jp.dispatch.employee.dto.ClientDto;
import jp.dispatch.employee.dto.ClientInternalContactCandidateDto;
import jp.dispatch.employee.dto.ClientInternalContactDto;
import jp.dispatch.employee.dto.ClientSaveRequest;
import jp.dispatch.employee.dto.ClientSummaryDto;
import jp.dispatch.employee.model.MasterData;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ClientRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public ClientRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public ClientSummaryDto summary() {
        var rows = jdbc.query(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN contract_status = '契約中' THEN 1 ELSE 0 END), 0) AS active_contract,
                    COALESCE(SUM(CASE WHEN contract_status = '商談中' THEN 1 ELSE 0 END), 0) AS negotiating,
                    COALESCE(SUM(CASE WHEN contract_status = '取引停止' THEN 1 ELSE 0 END), 0) AS suspended,
                    COALESCE(SUM(CASE WHEN contract_status = '新規' THEN 1 ELSE 0 END), 0) AS new_count
                FROM dispatch_client
                WHERE deleted_at IS NULL
                """,
                (rs, rowNum) -> new ClientSummaryDto(
                        rs.getInt("active_contract"),
                        rs.getInt("negotiating"),
                        rs.getInt("suspended"),
                        rs.getInt("new_count")
                )
        );
        return rows.isEmpty() ? new ClientSummaryDto(0, 0, 0, 0) : rows.getFirst();
    }

    public List<ClientDto> search(String keyword, String name, String location, String contractStatus) {
        var sql = new StringBuilder(
                """
                SELECT c.id, c.client_code, c.name, c.location, c.client_rank, c.industry,
                       c.contract_status, c.updated_at,
                       (
                           SELECT ic.contact_name
                           FROM dispatch_client_internal_contact ic
                           WHERE ic.client_id = c.id
                           ORDER BY ic.sort_order, ic.id
                           LIMIT 1
                       ) AS primary_contact_name,
                       (
                           SELECT COUNT(*)::int
                           FROM dispatch_project p
                           WHERE LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
                       ) AS related_project_count
                FROM dispatch_client c
                WHERE c.deleted_at IS NULL
                """
        );
        var params = new ArrayList<Object>();
        appendSearchFilters(sql, params, keyword, name, location, contractStatus);
        sql.append(" ORDER BY c.updated_at DESC, c.id DESC");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new ClientDto(
                        rs.getLong("id"),
                        rs.getString("client_code"),
                        rs.getString("name"),
                        rs.getString("location"),
                        rs.getString("primary_contact_name"),
                        rs.getString("client_rank"),
                        rs.getString("industry"),
                        rs.getString("contract_status"),
                        rs.getInt("related_project_count"),
                        rs.getString("updated_at")
                ),
                params.toArray()
        );
    }

    private void appendSearchFilters(
            StringBuilder sql,
            ArrayList<Object> params,
            String keyword,
            String name,
            String location,
            String contractStatus
    ) {
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append("""
                     AND (
                    """);
            sql.append(dialect.likeIgnoreCase("c.name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("c.location"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("c.client_code"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("COALESCE(c.notes, '')"));
            sql.append("""
                     )
                    """);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (name != null && !name.isBlank()) {
            sql.append(" AND ");
            sql.append(dialect.likeIgnoreCase("c.name"));
            params.add("%" + name.trim() + "%");
        }
        if (location != null && !location.isBlank()) {
            sql.append(" AND ");
            sql.append(dialect.likeIgnoreCase("c.location"));
            params.add("%" + location.trim() + "%");
        }
        if (contractStatus != null && !contractStatus.isBlank()) {
            sql.append(" AND c.contract_status = ?");
            params.add(contractStatus.trim());
        }
    }

    public Optional<ClientDetailDto> findDetailById(long id) {
        var rows = jdbc.query(
                """
                SELECT c.id, c.client_code, c.name, c.location, c.postal_code, c.address, c.phone, c.fax,
                       c.company_url, c.industry, c.representative_name, c.capital, c.employee_count,
                       c.established_date, c.trade_start_date, c.contract_type, c.contract_renewal_date,
                       c.contract_expiry_date, c.payment_terms, c.payment_method, c.primary_internal_contact,
                       c.invoice_delivery_address, c.accounting_contact,
                       c.accounting_contact_name, c.accounting_contact_department,
                       c.accounting_contact_phone, c.accounting_contact_email,
                       c.corporate_number, c.credit_info,
                       c.credit_limit, c.client_rank, c.contract_status, c.notes, c.created_at, c.updated_at,
                       (
                           SELECT COUNT(*)::int
                           FROM dispatch_project p
                           WHERE LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
                       ) AS related_project_count
                FROM dispatch_client c
                WHERE c.id = ? AND c.deleted_at IS NULL
                """,
                (rs, rowNum) -> mapDetailRow(rs),
                id
        );
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        ClientDetailDto base = rows.getFirst();
        return Optional.of(new ClientDetailDto(
                base.id(),
                base.clientCode(),
                base.name(),
                base.location(),
                base.postalCode(),
                base.address(),
                base.phone(),
                base.fax(),
                base.companyUrl(),
                base.industry(),
                base.representativeName(),
                base.capital(),
                base.employeeCount(),
                base.establishedDate(),
                base.tradeStartDate(),
                base.contractType(),
                base.contractRenewalDate(),
                base.contractExpiryDate(),
                base.paymentTerms(),
                base.paymentMethod(),
                base.primaryInternalContact(),
                base.invoiceDeliveryAddress(),
                base.accountingContact(),
                base.accountingContactName(),
                base.accountingContactDepartment(),
                base.accountingContactPhone(),
                base.accountingContactEmail(),
                base.corporateNumber(),
                base.creditInfo(),
                base.creditLimit(),
                base.clientRank(),
                base.contractStatus(),
                base.notes(),
                base.createdAt(),
                base.updatedAt(),
                base.relatedProjectCount(),
                findClientContacts(id),
                findInternalContacts(id)
        ));
    }

    private ClientDetailDto mapDetailRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ClientDetailDto(
                rs.getLong("id"),
                rs.getString("client_code"),
                rs.getString("name"),
                rs.getString("location"),
                rs.getString("postal_code"),
                rs.getString("address"),
                rs.getString("phone"),
                rs.getString("fax"),
                rs.getString("company_url"),
                rs.getString("industry"),
                rs.getString("representative_name"),
                rs.getString("capital"),
                rs.getString("employee_count"),
                rs.getString("established_date"),
                rs.getString("trade_start_date"),
                rs.getString("contract_type"),
                rs.getString("contract_renewal_date"),
                rs.getString("contract_expiry_date"),
                rs.getString("payment_terms"),
                rs.getString("payment_method"),
                rs.getString("primary_internal_contact"),
                rs.getString("invoice_delivery_address"),
                rs.getString("accounting_contact"),
                rs.getString("accounting_contact_name"),
                rs.getString("accounting_contact_department"),
                rs.getString("accounting_contact_phone"),
                rs.getString("accounting_contact_email"),
                rs.getString("corporate_number"),
                rs.getString("credit_info"),
                rs.getString("credit_limit"),
                rs.getString("client_rank"),
                rs.getString("contract_status"),
                rs.getString("notes"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                rs.getInt("related_project_count"),
                List.of(),
                List.of()
        );
    }

    public List<ClientContactDto> findClientContacts(long clientId) {
        return jdbc.query(
                """
                SELECT cc.id, cc.contact_name, cc.department, cc.position, cc.project_name,
                       cc.phone, cc.email1, cc.email2, cc.email3, cc.responsibility, cc.notes, cc.sort_order,
                       (
                           SELECT p.id
                           FROM dispatch_project p
                           JOIN dispatch_client c ON c.id = cc.client_id
                           WHERE LOWER(TRIM(p.project_name)) = LOWER(TRIM(cc.project_name))
                             AND LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
                           ORDER BY p.id
                           LIMIT 1
                       ) AS project_id
                FROM dispatch_client_contact cc
                WHERE cc.client_id = ?
                ORDER BY cc.sort_order, cc.id
                """,
                (rs, rowNum) -> new ClientContactDto(
                        rs.getLong("id"),
                        rs.getString("contact_name"),
                        rs.getString("department"),
                        rs.getString("position"),
                        rs.getString("project_name"),
                        rs.getObject("project_id") != null ? rs.getLong("project_id") : null,
                        rs.getString("phone"),
                        rs.getString("email1"),
                        rs.getString("email2"),
                        rs.getString("email3"),
                        rs.getString("responsibility"),
                        rs.getString("notes"),
                        rs.getInt("sort_order")
                ),
                clientId
        );
    }

    public List<ClientInternalContactCandidateDto> findEligibleInternalContacts(List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, d.name AS department_name, e.position,
                       ep.phone, ep.email
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                WHERE e.work_status != '退職'
                """);
        MasterData.appendEligibleInternalContactCondition(sql);
        var params = new ArrayList<Object>();
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append(" ORDER BY e.employee_code");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new ClientInternalContactCandidateDto(
                        rs.getLong("id"),
                        rs.getString("employee_code"),
                        rs.getString("name"),
                        rs.getString("department_name"),
                        rs.getString("position"),
                        rs.getString("phone"),
                        rs.getString("email")
                ),
                params.toArray()
        );
    }

    public List<ClientInternalContactDto> findInternalContacts(long clientId) {
        return jdbc.query(
                """
                SELECT ic.id, ic.contact_name, ic.employee_id, ic.department, ic.position, ic.phone, ic.email,
                       ic.client_department, ic.responsibility, ic.notes, ic.sort_order
                FROM dispatch_client_internal_contact ic
                WHERE ic.client_id = ?
                ORDER BY ic.sort_order, ic.id
                """,
                (rs, rowNum) -> new ClientInternalContactDto(
                        rs.getLong("id"),
                        rs.getString("contact_name"),
                        rs.getObject("employee_id") != null ? rs.getLong("employee_id") : null,
                        rs.getString("department"),
                        rs.getString("position"),
                        rs.getString("phone"),
                        rs.getString("email"),
                        rs.getString("client_department"),
                        rs.getString("responsibility"),
                        rs.getString("notes"),
                        rs.getInt("sort_order")
                ),
                clientId
        );
    }

    public String nextClientCode() {
        Integer maxNum = jdbc.queryForObject(
                """
                SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 2) AS INTEGER)), 0)
                FROM dispatch_client
                WHERE client_code ~ '^C[0-9]+$'
                """,
                Integer.class
        );
        int next = (maxNum != null ? maxNum : 0) + 1;
        return "C" + String.format("%03d", next);
    }

    public long insert(
            String clientCode,
            ClientSaveRequest request,
            String location,
            String createdAt,
            String updatedAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    """
                    INSERT INTO dispatch_client (
                        client_code, name, location, postal_code, address, phone, fax, company_url,
                        industry, representative_name, capital, employee_count, established_date,
                        trade_start_date, contract_type, contract_renewal_date, contract_expiry_date,
                        payment_terms, payment_method, primary_internal_contact, invoice_delivery_address,
                        accounting_contact, accounting_contact_name, accounting_contact_department,
                        accounting_contact_phone, accounting_contact_email,
                        corporate_number, credit_info, credit_limit,
                        client_rank, contract_status, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            int i = 1;
            ps.setString(i++, clientCode);
            ps.setString(i++, request.name().trim());
            ps.setString(i++, location);
            ps.setString(i++, trimToNull(request.postalCode()));
            ps.setString(i++, trimToNull(request.address()));
            ps.setString(i++, trimToNull(request.phone()));
            ps.setString(i++, trimToNull(request.fax()));
            ps.setString(i++, trimToNull(request.companyUrl()));
            ps.setString(i++, trimToNull(request.industry()));
            ps.setString(i++, trimToNull(request.representativeName()));
            ps.setString(i++, trimToNull(request.capital()));
            ps.setString(i++, trimToNull(request.employeeCount()));
            ps.setString(i++, trimToNull(request.establishedDate()));
            ps.setString(i++, trimToNull(request.tradeStartDate()));
            ps.setString(i++, trimToNull(request.contractType()));
            ps.setString(i++, trimToNull(request.contractRenewalDate()));
            ps.setString(i++, trimToNull(request.contractExpiryDate()));
            ps.setString(i++, trimToNull(request.paymentTerms()));
            ps.setString(i++, trimToNull(request.paymentMethod()));
            ps.setString(i++, trimToNull(request.primaryInternalContact()));
            ps.setString(i++, trimToNull(request.invoiceDeliveryAddress()));
            ps.setString(i++, resolveAccountingContactSummary(request));
            ps.setString(i++, trimToNull(request.accountingContactName()));
            ps.setString(i++, trimToNull(request.accountingContactDepartment()));
            ps.setString(i++, trimToNull(request.accountingContactPhone()));
            ps.setString(i++, trimToNull(request.accountingContactEmail()));
            ps.setString(i++, trimToNull(request.corporateNumber()));
            ps.setString(i++, trimToNull(request.creditInfo()));
            ps.setString(i++, trimToNull(request.creditLimit()));
            ps.setString(i++, trimToNull(request.clientRank()));
            ps.setString(i++, request.contractStatus() != null && !request.contractStatus().isBlank()
                    ? request.contractStatus().trim() : "商談中");
            ps.setString(i++, trimToNull(request.notes()));
            ps.setString(i++, createdAt);
            ps.setString(i, updatedAt);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "取引先の登録に失敗しました");
    }

    public boolean update(long id, ClientSaveRequest request, String location, String updatedAt) {
        int updated = jdbc.update(
                """
                UPDATE dispatch_client SET
                    name = ?, location = ?, postal_code = ?, address = ?, phone = ?, fax = ?, company_url = ?,
                    industry = ?, representative_name = ?, capital = ?, employee_count = ?, established_date = ?,
                    trade_start_date = ?, contract_type = ?, contract_renewal_date = ?, contract_expiry_date = ?,
                    payment_terms = ?, payment_method = ?, primary_internal_contact = ?,
                    invoice_delivery_address = ?, accounting_contact = ?,
                    accounting_contact_name = ?, accounting_contact_department = ?,
                    accounting_contact_phone = ?, accounting_contact_email = ?,
                    corporate_number = ?,
                    credit_info = ?, credit_limit = ?, client_rank = ?, contract_status = ?, notes = ?,
                    updated_at = ?
                WHERE id = ? AND deleted_at IS NULL
                """,
                request.name().trim(),
                location,
                trimToNull(request.postalCode()),
                trimToNull(request.address()),
                trimToNull(request.phone()),
                trimToNull(request.fax()),
                trimToNull(request.companyUrl()),
                trimToNull(request.industry()),
                trimToNull(request.representativeName()),
                trimToNull(request.capital()),
                trimToNull(request.employeeCount()),
                trimToNull(request.establishedDate()),
                trimToNull(request.tradeStartDate()),
                trimToNull(request.contractType()),
                trimToNull(request.contractRenewalDate()),
                trimToNull(request.contractExpiryDate()),
                trimToNull(request.paymentTerms()),
                trimToNull(request.paymentMethod()),
                trimToNull(request.primaryInternalContact()),
                trimToNull(request.invoiceDeliveryAddress()),
                resolveAccountingContactSummary(request),
                trimToNull(request.accountingContactName()),
                trimToNull(request.accountingContactDepartment()),
                trimToNull(request.accountingContactPhone()),
                trimToNull(request.accountingContactEmail()),
                trimToNull(request.corporateNumber()),
                trimToNull(request.creditInfo()),
                trimToNull(request.creditLimit()),
                trimToNull(request.clientRank()),
                request.contractStatus() != null && !request.contractStatus().isBlank()
                        ? request.contractStatus().trim() : "商談中",
                trimToNull(request.notes()),
                updatedAt,
                id
        );
        return updated > 0;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String resolveAccountingContactSummary(ClientSaveRequest request) {
        String name = trimToNull(request.accountingContactName());
        String department = trimToNull(request.accountingContactDepartment());
        String phone = trimToNull(request.accountingContactPhone());
        String email = trimToNull(request.accountingContactEmail());
        if (name == null && department == null && phone == null && email == null) {
            return trimToNull(request.accountingContact());
        }
        var parts = new java.util.ArrayList<String>();
        if (department != null) {
            parts.add(department);
        }
        if (phone != null) {
            parts.add(phone);
        }
        if (email != null) {
            parts.add(email);
        }
        if (parts.isEmpty()) {
            return name;
        }
        return name + "（" + String.join(" / ", parts) + "）";
    }

    public boolean markDeleted(long id, String deletedAt) {
        int updated = jdbc.update(
                """
                UPDATE dispatch_client SET deleted_at = ?, updated_at = ?
                WHERE id = ? AND deleted_at IS NULL
                """,
                deletedAt,
                deletedAt,
                id
        );
        return updated > 0;
    }

    public void deleteClientContacts(long clientId) {
        jdbc.update("DELETE FROM dispatch_client_contact WHERE client_id = ?", clientId);
    }

    public void deleteInternalContacts(long clientId) {
        jdbc.update("DELETE FROM dispatch_client_internal_contact WHERE client_id = ?", clientId);
    }

    public void insertClientContact(
            long clientId,
            String contactName,
            String department,
            String position,
            String projectName,
            String phone,
            String email1,
            String email2,
            String email3,
            String responsibility,
            String notes,
            int sortOrder
    ) {
        jdbc.update(
                """
                INSERT INTO dispatch_client_contact (
                    client_id, contact_name, department, position, project_name, phone,
                    email1, email2, email3, responsibility, notes, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                clientId,
                contactName,
                department,
                position,
                projectName,
                phone,
                email1,
                email2,
                email3,
                responsibility,
                notes,
                sortOrder
        );
    }

    public void insertInternalContact(
            long clientId,
            String contactName,
            Long employeeId,
            String department,
            String position,
            String phone,
            String email,
            String clientDepartment,
            String responsibility,
            String notes,
            int sortOrder
    ) {
        jdbc.update(
                """
                INSERT INTO dispatch_client_internal_contact (
                    client_id, contact_name, employee_id, department, position, phone, email,
                    client_department, responsibility, notes, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                clientId,
                contactName,
                employeeId,
                department,
                position,
                phone,
                email,
                clientDepartment,
                responsibility,
                notes,
                sortOrder
        );
    }

    public boolean employeeExists(long employeeId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM employee WHERE id = ? AND work_status != '退職'",
                Long.class,
                employeeId
        );
        return count != null && count > 0;
    }

    public boolean activeClientExists(long clientId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM dispatch_client WHERE id = ? AND deleted_at IS NULL",
                Long.class,
                clientId
        );
        return count != null && count > 0;
    }

    public Optional<String> findActiveClientName(long clientId) {
        var rows = jdbc.query(
                "SELECT name FROM dispatch_client WHERE id = ? AND deleted_at IS NULL",
                (rs, rowNum) -> rs.getString("name"),
                clientId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }
}
