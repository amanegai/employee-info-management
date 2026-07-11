package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.HrOpsClientActiveEmployeeDto;
import jp.dispatch.employee.dto.HrOpsClientMailSendRequest;
import jp.dispatch.employee.dto.HrOpsClientMailSendResult;
import jp.dispatch.employee.dto.HrOpsClientMailStatusDto;
import jp.dispatch.employee.dto.ClientDetailDto;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class HrOpsClientMailService {

    private final MailDeliveryService mailDeliveryService;
    private final FileAttachmentService fileAttachmentService;
    private final ClientRepository clientRepository;
    private final EmployeeProjectAssignmentRepository assignmentRepository;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    public HrOpsClientMailService(
            MailDeliveryService mailDeliveryService,
            FileAttachmentService fileAttachmentService,
            ClientRepository clientRepository,
            EmployeeProjectAssignmentRepository assignmentRepository,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.mailDeliveryService = mailDeliveryService;
        this.fileAttachmentService = fileAttachmentService;
        this.clientRepository = clientRepository;
        this.assignmentRepository = assignmentRepository;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    public List<HrOpsClientActiveEmployeeDto> listActiveEmployees(long clientId) {
        requireManageHrOps();
        ClientDetailDto client = clientRepository.findDetailById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "取引先が見つかりません"));
        return assignmentRepository.findActiveEmployeesByClientName(client.name());
    }

    public HrOpsClientMailStatusDto mailStatus() {
        requireManageHrOps();
        return new HrOpsClientMailStatusDto(
                mailDeliveryService.isConfigured(),
                mailDeliveryService.configuredFromAddress()
        );
    }

    public HrOpsClientMailSendResult send(HrOpsClientMailSendRequest request) {
        requireManageHrOps();
        validateRequest(request);

        if (!mailDeliveryService.isConfigured()) {
            return new HrOpsClientMailSendResult(
                    false,
                    false,
                    mailDeliveryService.configuredFromAddress(),
                    "メール送信が未設定です。SMTP 設定（app.mail.enabled 等）を確認してください。"
            );
        }

        String clientName = resolveClientName(request.clientId());
        boolean sent;
        String attachmentName = null;

        if (request.fileId() != null) {
            FileAttachmentService.DownloadPayload payload = fileAttachmentService.download(request.fileId());
            attachmentName = payload.originalName();
            sent = mailDeliveryService.sendWithAttachment(
                    request.recipientEmail(),
                    request.subject().trim(),
                    request.body(),
                    payload.originalName(),
                    payload.resource(),
                    payload.contentType()
            );
        } else {
            sent = mailDeliveryService.send(
                    request.recipientEmail(),
                    request.subject().trim(),
                    request.body()
            );
        }

        if (!sent) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "メール送信に失敗しました");
        }

        String detail = clientName != null
                ? clientName + " / " + request.recipientEmail()
                : request.recipientEmail();
        if (attachmentName != null) {
            detail += " / 添付:" + attachmentName;
        }
        auditLogService.log(
                AuditAction.HR_OPS_CLIENT_MAIL,
                "hr_ops_client_mail",
                request.clientId() != null ? String.valueOf(request.clientId()) : null,
                detail
        );

        return new HrOpsClientMailSendResult(
                true,
                true,
                mailDeliveryService.configuredFromAddress(),
                "メールを送信しました"
        );
    }

    private void validateRequest(HrOpsClientMailSendRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが不正です");
        }
        if (request.recipientEmail() == null || request.recipientEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "送付先メールアドレスを指定してください");
        }
        if (request.subject() == null || request.subject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "件名を入力してください");
        }
        if (request.body() == null || request.body().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "本文を入力してください");
        }
    }

    private String resolveClientName(Long clientId) {
        if (clientId == null) {
            return null;
        }
        return clientRepository.findDetailById(clientId)
                .map(ClientDetailDto::name)
                .orElse(null);
    }

    private void requireManageHrOps() {
        if (!securityService.canManageHrOps()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "人事業務の操作権限がありません");
        }
    }
}
