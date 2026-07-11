package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ClientContactDto;
import jp.dispatch.employee.dto.ClientDetailDto;
import jp.dispatch.employee.dto.ClientDto;
import jp.dispatch.employee.dto.ClientInternalContactCandidateDto;
import jp.dispatch.employee.dto.ClientInternalContactDto;
import jp.dispatch.employee.dto.ClientSaveRequest;
import jp.dispatch.employee.dto.ClientSummaryDto;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.auth.DataScopeService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ClientService {

    public static final List<String> CONTRACT_STATUSES = List.of("契約中", "商談中", "取引停止", "新規");
    public static final List<String> CLIENT_RANKS = List.of("S", "A", "B", "C", "D");
    public static final List<String> CONTRACT_TYPES = List.of("派遣", "請負", "準委任", "業務委託");

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final ClientRepository repository;
    private final DispatchProjectRepository projectRepository;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;
    private final DataScopeService dataScopeService;

    public ClientService(
            ClientRepository repository,
            DispatchProjectRepository projectRepository,
            SecurityService securityService,
            AuditLogService auditLogService,
            DataScopeService dataScopeService
    ) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
        this.dataScopeService = dataScopeService;
    }

    public ClientSummaryDto summary() {
        requireViewPermission();
        return repository.summary();
    }

    public List<String> contractStatuses() {
        requireViewPermission();
        return CONTRACT_STATUSES;
    }

    public List<String> clientRanks() {
        requireViewPermission();
        return CLIENT_RANKS;
    }

    public List<String> contractTypes() {
        requireViewPermission();
        return CONTRACT_TYPES;
    }

    public List<ClientInternalContactCandidateDto> eligibleInternalContacts() {
        requireViewPermission();
        return repository.findEligibleInternalContacts(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public List<ClientDto> search(String keyword, String name, String location, String contractStatus) {
        requireViewPermission();
        return repository.search(keyword, name, location, contractStatus);
    }

    public ClientDetailDto getById(long id) {
        requireViewPermission();
        return repository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "取引先が見つかりません"));
    }

    public List<DispatchProjectDto> listRelatedProjects(long id) {
        requireViewPermission();
        if (!securityService.canViewProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "案件機能の閲覧権限がありません");
        }
        ClientDetailDto client = getById(id);
        return projectRepository.findByClient(id, client.name());
    }

    @Transactional
    public ClientDetailDto create(ClientSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);

        String now = now();
        String clientCode = repository.nextClientCode();
        long id = repository.insert(clientCode, request, resolveLocation(request), now, now);
        saveContacts(id, request);

        auditLogService.log(AuditAction.CLIENT_CREATE, "dispatch_client", String.valueOf(id), request.name());
        return getById(id);
    }

    @Transactional
    public ClientDetailDto update(long id, ClientSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);
        if (!repository.update(id, request, resolveLocation(request), now())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "取引先が見つかりません");
        }
        repository.deleteClientContacts(id);
        repository.deleteInternalContacts(id);
        saveContacts(id, request);

        auditLogService.log(AuditAction.CLIENT_UPDATE, "dispatch_client", String.valueOf(id), request.name());
        return getById(id);
    }

    @Transactional
    public void delete(long id) {
        requireWritePermission();
        ClientDetailDto existing = getById(id);
        String now = now();
        if (!repository.markDeleted(id, now)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "取引先が見つかりません");
        }
        auditLogService.log(AuditAction.CLIENT_DELETE, "dispatch_client", String.valueOf(id), existing.name());
    }

    private void saveContacts(long clientId, ClientSaveRequest request) {
        if (request.clientContacts() != null) {
            int order = 0;
            for (ClientContactDto contact : request.clientContacts()) {
                if (contact == null || isBlank(contact.contactName())) {
                    continue;
                }
                repository.insertClientContact(
                        clientId,
                        contact.contactName().trim(),
                        normalizeOptional(contact.department()),
                        normalizeOptional(contact.position()),
                        normalizeOptional(contact.projectName()),
                        normalizeOptional(contact.phone()),
                        normalizeOptional(contact.email1()),
                        normalizeOptional(contact.email2()),
                        normalizeOptional(contact.email3()),
                        normalizeOptional(contact.responsibility()),
                        normalizeOptional(contact.notes()),
                        order++
                );
            }
        }
        if (request.internalContacts() != null) {
            int order = 0;
            for (ClientInternalContactDto contact : request.internalContacts()) {
                if (contact == null || isBlank(contact.contactName())) {
                    continue;
                }
                Long employeeId = contact.employeeId();
                if (employeeId != null && !repository.employeeExists(employeeId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "紐づけ社員が見つかりません");
                }
                repository.insertInternalContact(
                        clientId,
                        contact.contactName().trim(),
                        employeeId,
                        normalizeOptional(contact.department()),
                        normalizeOptional(contact.position()),
                        normalizeOptional(contact.phone()),
                        normalizeOptional(contact.email()),
                        normalizeOptional(contact.clientDepartment()),
                        normalizeOptional(contact.responsibility()),
                        normalizeOptional(contact.notes()),
                        order++
                );
            }
        }
    }

    private void validateSaveRequest(ClientSaveRequest request) {
        if (request == null || isBlank(request.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名は必須です");
        }
        String status = normalizeStatus(request.contractStatus());
        if (!CONTRACT_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "契約状況が不正です");
        }
        if (request.clientRank() != null && !request.clientRank().isBlank()
                && !CLIENT_RANKS.contains(request.clientRank().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "重要度が不正です");
        }
        if (request.contractType() != null && !request.contractType().isBlank()
                && !CONTRACT_TYPES.contains(request.contractType().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "契約形態が不正です");
        }
    }

    private String resolveLocation(ClientSaveRequest request) {
        if (request.location() != null && !request.location().isBlank()) {
            return request.location().trim();
        }
        StringBuilder sb = new StringBuilder();
        if (request.postalCode() != null && !request.postalCode().isBlank()) {
            sb.append("〒").append(request.postalCode().trim());
        }
        if (request.address() != null && !request.address().isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(request.address().trim());
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "商談中";
        }
        return status.trim();
    }

    private static String normalizeRequired(String value, String label) {
        if (isBlank(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "は必須です");
        }
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String now() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }

    private void requireViewPermission() {
        if (!securityService.canViewClientEvents()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先情報の閲覧権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteClientEvents()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先情報の編集権限がありません");
        }
    }
}
