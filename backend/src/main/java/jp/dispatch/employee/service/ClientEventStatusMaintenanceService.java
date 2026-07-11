package jp.dispatch.employee.service;

import jp.dispatch.employee.repository.ClientEventRepository;
import jp.dispatch.employee.repository.ClientEventRepository.PostponedEventReviewRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ClientEventStatusMaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(ClientEventStatusMaintenanceService.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ClientEventRepository repository;

    public ClientEventStatusMaintenanceService(ClientEventRepository repository) {
        this.repository = repository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        runMaintenance("startup");
    }

    @Scheduled(cron = "${app.client-event.status-maintenance-cron:0 0 1 * * *}", zone = "Asia/Tokyo")
    public void scheduledMaintenance() {
        runMaintenance("scheduled");
    }

    public MaintenanceResult runMaintenance(String trigger) {
        String today = LocalDate.now(ZONE).toString();
        String timestamp = LocalDateTime.now(ZONE).format(TIMESTAMP);

        int legacyUpdated = repository.completeLegacyPastEvents(today, timestamp);
        int completedCount = repository.completePastScheduledEvents(today, timestamp);
        List<PostponedEventReviewRow> overduePostponed = repository.findPostponedEventsWithPastDate(today);

        if (legacyUpdated > 0) {
            log.info("[{}] 旧データの状態補完 {} 件", trigger, legacyUpdated);
        }
        if (completedCount > 0) {
            log.info("[{}] 予定→実施済 自動更新 {} 件", trigger, completedCount);
        }
        if (!overduePostponed.isEmpty()) {
            log.warn("[{}] 延期イベント要確認 {} 件（開催日が過去のまま）", trigger, overduePostponed.size());
            for (PostponedEventReviewRow event : overduePostponed) {
                log.warn(
                        "[{}] 延期要確認 id={} client={} event={} eventDate={} notes={}",
                        trigger,
                        event.id(),
                        event.clientName(),
                        event.eventName(),
                        event.eventDate(),
                        event.notes() == null || event.notes().isBlank() ? "なし" : "あり"
                );
            }
        }

        return new MaintenanceResult(legacyUpdated + completedCount, overduePostponed.size());
    }

    public record MaintenanceResult(int completedUpdates, int overduePostponedCount) {
    }
}
