package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.BulkPayrollMailRequest;
import jp.dispatch.employee.dto.BulkPayrollMailResultDto;
import jp.dispatch.employee.dto.BulkPayrollMailResultDto.BulkPayrollMailItemResultDto;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.dto.FileAttachmentDto;
import jp.dispatch.employee.dto.HrOpsClientMailStatusDto;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.FileAttachmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class HrOpsPayrollMailService {

    private static final Pattern EMPLOYEE_ID_TAG = Pattern.compile("\\[emp:(\\d+)\\]");

    private static final String PAYROLL_MAIL_COMPANY = "Bitcross";
    private static final String PAYROLL_MAIL_SIGNATURE = """
            ************************************************************
            ビットクロス株式会社
            総務部　芦茜（ろ あかね）
            〒110-0003　東京都台東区根岸3丁目1-22 立花ビル台東根岸6F
            TEL：03-6206-0212
            FAX：03-6206-0466
            Personal Mail：xi.lu@bitcross.co.jp
            経理共用Mail：keiri@bitcross.co.jp
            ************************************************************""";

    private final MailDeliveryService mailDeliveryService;
    private final FileAttachmentService fileAttachmentService;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDetailRepository employeeDetailRepository;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    public HrOpsPayrollMailService(
            MailDeliveryService mailDeliveryService,
            FileAttachmentService fileAttachmentService,
            FileAttachmentRepository fileAttachmentRepository,
            EmployeeRepository employeeRepository,
            EmployeeDetailRepository employeeDetailRepository,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.mailDeliveryService = mailDeliveryService;
        this.fileAttachmentService = fileAttachmentService;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.employeeRepository = employeeRepository;
        this.employeeDetailRepository = employeeDetailRepository;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    public HrOpsClientMailStatusDto mailStatus() {
        requireManageHrOps();
        return new HrOpsClientMailStatusDto(
                mailDeliveryService.isConfigured(),
                mailDeliveryService.configuredFromAddress()
        );
    }

    public BulkPayrollMailResultDto sendBulk(BulkPayrollMailRequest request) {
        requireManageHrOps();
        requireViewSalary();
        validateRequest(request);

        boolean mailConfigured = mailDeliveryService.isConfigured();
        if (!mailConfigured) {
            return new BulkPayrollMailResultDto(
                    0,
                    0,
                    0,
                    false,
                    List.of()
            );
        }

        List<FileAttachmentDto> payrollFiles = fileAttachmentRepository.findPayrollByTargetMonth(request.targetMonth());
        var items = new ArrayList<BulkPayrollMailItemResultDto>();
        int sent = 0;
        int skipped = 0;
        int failed = 0;

        for (Long employeeId : request.employeeIds()) {
            if (employeeId == null) {
                continue;
            }
            EmployeeDto employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee == null) {
                items.add(new BulkPayrollMailItemResultDto(
                        employeeId,
                        null,
                        null,
                        "NOT_FOUND",
                        "社員が見つかりません"
                ));
                skipped++;
                continue;
            }

            Optional<String> emailOpt = employeeDetailRepository.findEmployeeEmail(employeeId);
            if (emailOpt.isEmpty()) {
                items.add(new BulkPayrollMailItemResultDto(
                        employeeId,
                        employee.employeeCode(),
                        employee.name(),
                        "SKIPPED",
                        "メールアドレスが未登録です"
                ));
                skipped++;
                continue;
            }

            Optional<FileAttachmentDto> payrollFile = findMatchingPayrollFile(
                    payrollFiles,
                    employeeId,
                    employee.employeeCode(),
                    employee.name()
            );
            if (payrollFile.isEmpty()) {
                items.add(new BulkPayrollMailItemResultDto(
                        employeeId,
                        employee.employeeCode(),
                        employee.name(),
                        "SKIPPED",
                        "対象月の給与明細ファイルが見つかりません"
                ));
                skipped++;
                continue;
            }

            try {
                FileAttachmentService.DownloadPayload payload = fileAttachmentService.download(payrollFile.get().id());
                String subject = buildPayrollMailSubject(request.targetMonth());
                String body = buildPayrollMailBody(employee.name(), request.extraMessage());
                boolean ok = mailDeliveryService.sendWithAttachment(
                        emailOpt.get(),
                        subject,
                        body,
                        payload.originalName(),
                        payload.resource(),
                        payload.contentType()
                );
                if (!ok) {
                    items.add(new BulkPayrollMailItemResultDto(
                            employeeId,
                            employee.employeeCode(),
                            employee.name(),
                            "FAILED",
                            "メール送信に失敗しました"
                    ));
                    failed++;
                    continue;
                }
                items.add(new BulkPayrollMailItemResultDto(
                        employeeId,
                        employee.employeeCode(),
                        employee.name(),
                        "SENT",
                        "送信しました"
                ));
                sent++;
            } catch (RuntimeException ex) {
                items.add(new BulkPayrollMailItemResultDto(
                        employeeId,
                        employee.employeeCode(),
                        employee.name(),
                        "FAILED",
                        ex.getMessage() != null ? ex.getMessage() : "メール送信に失敗しました"
                ));
                failed++;
            }
        }

        if (sent > 0) {
            auditLogService.log(
                    AuditAction.HR_OPS_PAYROLL_BULK_MAIL,
                    "payroll_bulk_mail",
                    request.targetMonth(),
                    "送信:" + sent + " / スキップ:" + skipped + " / 失敗:" + failed
            );
        }

        return new BulkPayrollMailResultDto(sent, skipped, failed, true, items);
    }

    static Optional<FileAttachmentDto> findMatchingPayrollFile(
            List<FileAttachmentDto> files,
            long employeeId,
            String employeeCode,
            String employeeName
    ) {
        return files.stream()
                .filter(file -> payrollFileMatchesEmployee(file, employeeId, employeeCode, employeeName))
                .findFirst();
    }

    static boolean payrollFileMatchesEmployee(
            FileAttachmentDto file,
            long employeeId,
            String employeeCode,
            String employeeName
    ) {
        if (file == null) {
            return false;
        }
        String description = file.description();
        if (description != null && !description.isBlank()) {
            Matcher matcher = EMPLOYEE_ID_TAG.matcher(description);
            if (matcher.find()) {
                try {
                    if (Long.parseLong(matcher.group(1)) == employeeId) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {
                    /* fall through */
                }
            }
            if (employeeCode != null && !employeeCode.isBlank() && description.contains(employeeCode.trim())) {
                return true;
            }
            if (employeeName != null && !employeeName.isBlank() && description.contains(employeeName.trim())) {
                return true;
            }
        }
        return payrollFileMatches(file.originalName(), employeeCode, employeeName);
    }

    static boolean payrollFileMatches(String fileName, String employeeCode, String employeeName) {
        if (fileName == null || fileName.isBlank()) {
            return false;
        }
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (employeeCode != null && !employeeCode.isBlank()
                && lower.contains(employeeCode.trim().toLowerCase(Locale.ROOT))) {
            return true;
        }
        return employeeName != null && !employeeName.isBlank() && fileName.contains(employeeName.trim());
    }

    static String buildPayrollMailSubject(String targetMonth) {
        String suffix = formatPayrollMailMonthSuffix(targetMonth);
        return suffix.isBlank()
                ? "【" + PAYROLL_MAIL_COMPANY + "：給与明細のご送付】"
                : "【" + PAYROLL_MAIL_COMPANY + "：給与明細のご送付】" + suffix;
    }

    static String formatPayrollMailMonthSuffix(String targetMonth) {
        if (targetMonth == null || !targetMonth.matches("\\d{4}-\\d{2}")) {
            return "";
        }
        String[] parts = targetMonth.split("-");
        return parts[0] + parts[1] + "月分";
    }

    static String buildPayrollMailBody(String employeeName, String extraMessage) {
        String name = employeeName != null && !employeeName.isBlank() ? employeeName.trim() : "（社員名）";
        var lines = new ArrayList<String>();
        lines.add(name + "さん");
        lines.add("");
        lines.add("お疲れさまです、経理担当です！");
        lines.add("");
        lines.add("今月の給与明細を添付でお送りします。");
        lines.add("もし内容に気になる点などありましたら、お気軽にご連絡ください。");
        lines.add("");
        lines.add("よろしくお願いします！");
        if (extraMessage != null && !extraMessage.isBlank()) {
            lines.add("");
            lines.add(extraMessage.trim());
        }
        lines.add("");
        lines.add(PAYROLL_MAIL_SIGNATURE);
        return String.join("\n", lines);
    }

    private void validateRequest(BulkPayrollMailRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが不正です");
        }
        if (request.targetMonth() == null || !request.targetMonth().matches("\\d{4}-\\d{2}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象月（YYYY-MM）を指定してください");
        }
        if (request.employeeIds() == null || request.employeeIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "送信対象の社員を選択してください");
        }
    }

    private void requireManageHrOps() {
        if (!securityService.canManageHrOps()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "人事業務の操作権限がありません");
        }
    }

    private void requireViewSalary() {
        if (!securityService.canViewSalary()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "給与情報の閲覧権限がありません");
        }
    }
}
