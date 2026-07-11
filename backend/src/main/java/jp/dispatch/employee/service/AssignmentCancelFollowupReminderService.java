package jp.dispatch.employee.service;

import jp.dispatch.employee.repository.AssignmentCancelFollowupRepository;
import jp.dispatch.employee.repository.AssignmentCancelFollowupRepository.OverdueFollowupRow;
import jp.dispatch.employee.repository.AuthUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class AssignmentCancelFollowupReminderService {

    private static final Logger log = LoggerFactory.getLogger(AssignmentCancelFollowupReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final AssignmentCancelFollowupRepository followupRepository;
    private final AuthUserRepository authUserRepository;
    private final MailDeliveryService mailDeliveryService;

    @Value("${app.project.cancel-followup-email-enabled:false}")
    private boolean emailEnabled;

    public AssignmentCancelFollowupReminderService(
            AssignmentCancelFollowupRepository followupRepository,
            AuthUserRepository authUserRepository,
            MailDeliveryService mailDeliveryService
    ) {
        this.followupRepository = followupRepository;
        this.authUserRepository = authUserRepository;
        this.mailDeliveryService = mailDeliveryService;
    }

    @Scheduled(cron = "${app.project.cancel-followup-reminder-cron:0 0 9 * * *}", zone = "Asia/Tokyo")
    public void scheduledReminders() {
        runReminders("scheduled");
    }

    public ReminderResult runReminders(String trigger) {
        if (!emailEnabled) {
            log.debug("[{}] 配属取消フォローメールは無効です", trigger);
            return new ReminderResult(0, 0, 0);
        }

        String today = LocalDate.now(ZONE).toString();
        List<OverdueFollowupRow> overdueItems = followupRepository.findOverdueOpen(today);
        if (overdueItems.isEmpty()) {
            return new ReminderResult(0, 0, 0);
        }

        List<String> adminEmails = authUserRepository.findAdminEmails();
        int emailsSent = 0;
        int emailsSkipped = 0;
        int emailsFailed = 0;

        for (OverdueFollowupRow item : overdueItems) {
            Set<String> recipients = new LinkedHashSet<>(adminEmails);
            if (item.assignedTo() != null) {
                authUserRepository.findEmailById(item.assignedTo()).ifPresent(recipients::add);
            }
            if (recipients.isEmpty()) {
                emailsSkipped++;
                log.warn(
                        "[{}] 配属取消フォロー超期: 送信先なし followupId={} employee={}",
                        trigger,
                        item.id(),
                        item.employeeName()
                );
                continue;
            }

            String subject = buildSubject(item);
            String body = buildBody(item);
            for (String email : recipients) {
                boolean sent = mailDeliveryService.send(email, subject, body);
                if (sent) {
                    emailsSent++;
                } else if (mailDeliveryService.isConfigured()) {
                    emailsFailed++;
                } else {
                    emailsSkipped++;
                }
            }
        }

        if (emailsSent > 0 || emailsSkipped > 0 || emailsFailed > 0) {
            log.info(
                    "[{}] 配属取消フォロー超期通知 tasks={} sent={} skipped={} failed={}",
                    trigger,
                    overdueItems.size(),
                    emailsSent,
                    emailsSkipped,
                    emailsFailed
            );
        }

        return new ReminderResult(overdueItems.size(), emailsSent, emailsFailed);
    }

    private String buildSubject(OverdueFollowupRow item) {
        return "【配属取消フォロー超期】" + item.employeeName() + " — 再提案の確認";
    }

    private String buildBody(OverdueFollowupRow item) {
        StringBuilder body = new StringBuilder();
        body.append("配属取消フォロータスクの期限を超過しています。\n\n");
        body.append("社員：").append(item.employeeName()).append('\n');
        body.append("案件：").append(blankToDash(item.projectName())).append('\n');
        body.append("取引先：").append(blankToDash(item.clientName())).append('\n');
        body.append("期限：").append(item.dueDate()).append('\n');
        if (item.notes() != null && !item.notes().isBlank()) {
            body.append("\n内容：\n").append(item.notes().trim()).append('\n');
        }
        body.append("\n他案件への再提案・マッチングの実施状況を確認してください。\n");
        body.append("\n---\n社員情報管理システム");
        return body.toString();
    }

    private static String blankToDash(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }

    public record ReminderResult(int tasksChecked, int emailsSent, int emailsFailed) {
    }
}
