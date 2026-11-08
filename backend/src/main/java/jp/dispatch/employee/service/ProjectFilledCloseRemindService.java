package jp.dispatch.employee.service;

import jp.dispatch.employee.model.NotificationTypes;
import jp.dispatch.employee.repository.AppNotificationRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository.FilledCloseRemindRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 案件が満員（FILLED）になったあと、担当者へ「終了にしてよいか」をリマインドする。
 * <ul>
 *   <li>初回：満員到達から {@code firstDelayBusinessDays} 営業日後</li>
 *   <li>再催：初回通知から {@code repeatDelayDays} 日後（合計最大 2 回）</li>
 *   <li>満員解除／終了・キャンセル等へ遷移したら通知を resolve しスケジュールをクリア</li>
 * </ul>
 */
@Service
public class ProjectFilledCloseRemindService {

    private static final Logger log = LoggerFactory.getLogger(ProjectFilledCloseRemindService.class);
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final int MAX_REMIND_COUNT = 2;

    private final DispatchProjectRepository projectRepository;
    private final AppNotificationRepository notificationRepository;
    private final int firstDelayBusinessDays;
    private final int repeatDelayDays;

    public ProjectFilledCloseRemindService(
            DispatchProjectRepository projectRepository,
            AppNotificationRepository notificationRepository,
            @Value("${app.project.filled-close-remind.first-delay-business-days:1}") int firstDelayBusinessDays,
            @Value("${app.project.filled-close-remind.repeat-delay-days:7}") int repeatDelayDays
    ) {
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
        this.firstDelayBusinessDays = Math.max(1, firstDelayBusinessDays);
        this.repeatDelayDays = Math.max(1, repeatDelayDays);
    }

    /**
     * 案件ステータス／人数変更のたびに呼ぶ。
     * FILLED ならスケジュール開始（未設定時のみ）、それ以外ならクリア＋通知消化。
     */
    @Transactional
    public void syncForProject(long projectId) {
        FilledCloseRemindRow row = projectRepository.findFilledCloseRemindById(projectId).orElse(null);
        if (row == null) {
            return;
        }
        String now = timestampNow();
        if ("FILLED".equals(row.status())) {
            if (row.filledReachedAt() == null || row.filledReachedAt().isBlank()) {
                String nextAt = formatTimestamp(plusBusinessDays(LocalDateTime.now(ZONE), firstDelayBusinessDays));
                projectRepository.updateFilledCloseRemindSchedule(projectId, now, 0, nextAt);
            }
            return;
        }
        clearScheduleAndResolve(projectId, now);
    }

    @Scheduled(cron = "${app.project.filled-close-remind.cron:0 15 9 * * *}", zone = "Asia/Tokyo")
    @Transactional
    public void processDueReminders() {
        String now = timestampNow();
        List<FilledCloseRemindRow> due = projectRepository.findDueFilledCloseReminders(now, MAX_REMIND_COUNT);
        if (due.isEmpty()) {
            return;
        }
        int sent = 0;
        for (FilledCloseRemindRow row : due) {
            if (sendReminder(row, now)) {
                sent++;
            }
        }
        if (sent > 0) {
            log.info("満員終了リマインドを {} 件送信しました", sent);
        }
    }

    private boolean sendReminder(FilledCloseRemindRow row, String now) {
        Long recipientId = row.ownerUserId() != null ? row.ownerUserId() : row.createdBy();
        if (recipientId == null) {
            log.warn("案件 id={} に担当者がいないため満員リマインドをスキップします", row.id());
            projectRepository.updateFilledCloseRemindSchedule(
                    row.id(),
                    row.filledReachedAt(),
                    MAX_REMIND_COUNT,
                    null
            );
            return false;
        }

        int nextCount = row.filledCloseRemindCount() + 1;
        boolean first = nextCount == 1;
        String title = first
                ? "満員案件の確認: " + nullToEmpty(row.projectName())
                : "【再通知】満員案件の確認: " + nullToEmpty(row.projectName());
        String body = buildBody(row, first);
        String linkPath = "/projects/" + row.id();

        // 同一案件の未消化リマインドがあれば先に resolve（再催時は新しい通知を積む）
        notificationRepository.resolveByProjectAndType(
                row.id(),
                NotificationTypes.PROJECT_FILLED_CLOSE_REMIND,
                now
        );
        notificationRepository.insert(
                recipientId,
                NotificationTypes.PROJECT_FILLED_CLOSE_REMIND,
                title,
                body,
                linkPath,
                row.id(),
                null,
                now
        );

        String nextAt = nextCount >= MAX_REMIND_COUNT
                ? null
                : formatTimestamp(LocalDateTime.now(ZONE).plusDays(repeatDelayDays));
        projectRepository.updateFilledCloseRemindSchedule(
                row.id(),
                row.filledReachedAt() != null && !row.filledReachedAt().isBlank() ? row.filledReachedAt() : now,
                nextCount,
                nextAt
        );
        return true;
    }

    private void clearScheduleAndResolve(long projectId, String now) {
        projectRepository.clearFilledCloseRemindSchedule(projectId);
        notificationRepository.resolveByProjectAndType(
                projectId,
                NotificationTypes.PROJECT_FILLED_CLOSE_REMIND,
                now
        );
    }

    private static String buildBody(FilledCloseRemindRow row, boolean first) {
        String client = row.clientName() != null && !row.clientName().isBlank()
                ? row.clientName()
                : "（取引先未設定）";
        String prefix = first
                ? "案件が満員になりました。"
                : "案件が満員のままです。";
        return prefix + client + " / 募集が完了していればステータスを「終了」に変更してください。";
    }

    static LocalDateTime plusBusinessDays(LocalDateTime from, int businessDays) {
        LocalDateTime cursor = from;
        int added = 0;
        while (added < businessDays) {
            cursor = cursor.plusDays(1);
            DayOfWeek day = cursor.getDayOfWeek();
            if (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY) {
                added++;
            }
        }
        return cursor;
    }

    private static String formatTimestamp(LocalDateTime value) {
        return value.format(TIMESTAMP);
    }

    private static String timestampNow() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
