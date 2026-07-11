package jp.dispatch.employee.service;

import jp.dispatch.employee.repository.ClientEventRepository;
import jp.dispatch.employee.repository.ClientEventRepository.ParticipantEmailRow;
import jp.dispatch.employee.repository.ClientEventRepository.ReminderTargetEventRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Service
public class ClientEventReminderService {

    private static final Logger log = LoggerFactory.getLogger(ClientEventReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ClientEventRepository repository;
    private final MailDeliveryService mailDeliveryService;

    @Value("${app.client-event.reminder.enabled:false}")
    private boolean reminderEnabled;

    @Value("${app.client-event.reminder.days-before:1,3}")
    private String daysBeforeConfig;

    public ClientEventReminderService(
            ClientEventRepository repository,
            MailDeliveryService mailDeliveryService
    ) {
        this.repository = repository;
        this.mailDeliveryService = mailDeliveryService;
    }

    @Scheduled(cron = "${app.client-event.reminder-cron:0 0 8 * * *}", zone = "Asia/Tokyo")
    public void scheduledReminders() {
        runReminders("scheduled");
    }

    public ReminderResult runReminders(String trigger) {
        if (!reminderEnabled) {
            log.debug("[{}] イベントリマインドは無効です", trigger);
            return new ReminderResult(0, 0, 0, 0);
        }

        List<Integer> daysBeforeList = parseDaysBefore(daysBeforeConfig);
        if (daysBeforeList.isEmpty()) {
            log.warn("[{}] リマインド日数が未設定です", trigger);
            return new ReminderResult(0, 0, 0, 0);
        }

        String sentAt = LocalDateTime.now(ZONE).format(TIMESTAMP);
        int eventsChecked = 0;
        int emailsSent = 0;
        int emailsSkipped = 0;
        int emailsFailed = 0;

        for (int daysBefore : daysBeforeList) {
            String targetDate = LocalDate.now(ZONE).plusDays(daysBefore).toString();
            List<ReminderTargetEventRow> events = repository.findReminderTargetEvents(targetDate);
            eventsChecked += events.size();

            for (ReminderTargetEventRow event : events) {
                List<ParticipantEmailRow> participants = repository.findParticipantEmails(event.id());
                if (participants.isEmpty()) {
                    log.info(
                            "[{}] 参加者なし eventId={} event={} date={}",
                            trigger,
                            event.id(),
                            event.eventName(),
                            event.eventDate()
                    );
                    continue;
                }

                for (ParticipantEmailRow participant : participants) {
                    if (repository.isReminderSent(
                            event.id(),
                            participant.employeeId(),
                            daysBefore,
                            event.eventDate()
                    )) {
                        continue;
                    }

                    String email = participant.email();
                    if (email == null || email.isBlank()) {
                        emailsSkipped++;
                        log.warn(
                                "[{}] メール未登録 employeeId={} name={} eventId={}",
                                trigger,
                                participant.employeeId(),
                                participant.name(),
                                event.id()
                        );
                        continue;
                    }

                    String subject = buildSubject(event, daysBefore);
                    String body = buildBody(participant.name(), event, daysBefore);
                    boolean sent = mailDeliveryService.send(email, subject, body);
                    if (sent) {
                        repository.markReminderSent(
                                event.id(),
                                participant.employeeId(),
                                daysBefore,
                                event.eventDate(),
                                sentAt
                        );
                        emailsSent++;
                    } else if (mailDeliveryService.isConfigured()) {
                        emailsFailed++;
                    } else {
                        emailsSkipped++;
                    }
                }
            }
        }

        if (emailsSent > 0 || emailsSkipped > 0 || emailsFailed > 0) {
            log.info(
                    "[{}] イベントリマインド完了 events={} sent={} skipped={} failed={}",
                    trigger,
                    eventsChecked,
                    emailsSent,
                    emailsSkipped,
                    emailsFailed
            );
        }

        return new ReminderResult(eventsChecked, emailsSent, emailsSkipped, emailsFailed);
    }

    private List<Integer> parseDaysBefore(String config) {
        if (config == null || config.isBlank()) {
            return List.of();
        }
        return Arrays.stream(config.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> {
                    try {
                        return Integer.parseInt(value);
                    } catch (NumberFormatException ex) {
                        return -1;
                    }
                })
                .filter(value -> value > 0)
                .distinct()
                .sorted()
                .toList();
    }

    private String buildSubject(ReminderTargetEventRow event, int daysBefore) {
        return "【イベントリマインド】" + event.eventName() + "（あと" + daysBefore + "日）";
    }

    private String buildBody(String participantName, ReminderTargetEventRow event, int daysBefore) {
        StringBuilder body = new StringBuilder();
        body.append(participantName).append(" 様\n\n");
        body.append("以下のイベントの開催日が近づいています（あと").append(daysBefore).append("日）。\n\n");
        body.append("取引先：").append(event.clientName()).append('\n');
        body.append("イベント名：").append(event.eventName()).append('\n');
        body.append("種別：").append(event.eventType()).append('\n');
        body.append("状態：").append(event.eventStatus()).append('\n');
        body.append("開催日：").append(event.eventDate()).append('\n');
        body.append("時間：").append(blankToDash(event.eventTime())).append('\n');
        body.append("場所：").append(blankToDash(event.location())).append('\n');
        if (event.notes() != null && !event.notes().isBlank()) {
            body.append("\n備考：\n").append(event.notes().trim()).append('\n');
        }
        body.append("\n---\n社員情報管理システム");
        return body.toString();
    }

    private static String blankToDash(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }

    public record ReminderResult(int eventsChecked, int emailsSent, int emailsSkipped, int emailsFailed) {
    }
}
