package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.PaidLeaveBalanceDto;
import jp.dispatch.employee.model.EmployeeCodeRules;
import jp.dispatch.employee.paidleave.PaidLeaveExpiration;
import jp.dispatch.employee.paidleave.PaidLeaveGrantCalculator;
import jp.dispatch.employee.paidleave.PaidLeaveGrantCalculator.GrantInfo;
import jp.dispatch.employee.repository.PaidLeaveBalanceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * 有給残台帳。対象は正社員のみ。稼働状況が「退職」の場合は台帳を保持しない（退職予定は保持）。
 * 上線時は前年度=0・今年度=基準日到達分の付与日数。
 * 新付与到来時は旧前年度を消滅（付与から2年）、今年度残を前年度へ繰越し、今年度に新付与を載せる。
 * 日次／参照時にも付与日から2年経過分を消滅する。
 */
@Service
public class PaidLeaveBalanceService {

    private static final Logger log = LoggerFactory.getLogger(PaidLeaveBalanceService.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final PaidLeaveBalanceRepository repository;

    public PaidLeaveBalanceService(PaidLeaveBalanceRepository repository) {
        this.repository = repository;
    }

    public static boolean isEligibleEmployeeType(String employeeType) {
        return EmployeeCodeRules.TYPE_SEISHAIN.equals(employeeType);
    }

    /** 退職済みは有給台帳対象外。退職予定は対象。 */
    public static boolean isResignedWorkStatus(String workStatus) {
        return PaidLeaveBalanceRepository.RESIGNED_WORK_STATUS.equals(workStatus);
    }

    /** MyPage 等：残高を取得。非対象（非正社員・退職）は台帳削除のうえ empty。 */
    @Transactional
    public Optional<PaidLeaveBalanceDto> ensureBalance(long employeeId) {
        return ensureBalance(employeeId, LocalDate.now(ZONE));
    }

    @Transactional
    public Optional<PaidLeaveBalanceDto> ensureBalance(long employeeId, LocalDate asOf) {
        if (!isEligible(employeeId)) {
            repository.deleteByEmployeeId(employeeId);
            return Optional.empty();
        }

        LocalDate hireDate = repository.findHireDate(employeeId)
                .map(this::parseHireDate)
                .orElse(null);
        Optional<PaidLeaveBalanceDto> existing = repository.findByEmployeeId(employeeId);

        if (hireDate == null) {
            return persistIfChanged(existing.orElse(null), PaidLeaveExpiration.apply(existing.orElse(null), asOf));
        }

        Optional<GrantInfo> latest = PaidLeaveGrantCalculator.latestGrant(hireDate, asOf);

        if (existing.isEmpty()) {
            PaidLeaveBalanceDto seeded = seedGoLive(employeeId, latest.orElse(null));
            repository.upsert(seeded);
            return Optional.of(seeded);
        }

        PaidLeaveBalanceDto balance = PaidLeaveExpiration.apply(existing.get(), asOf);

        if (latest.isEmpty()) {
            return persistIfChanged(existing.get(), balance);
        }

        GrantInfo grant = latest.get();
        if (balance.currentGrantDate() != null && !grant.grantDate().isAfter(balance.currentGrantDate())) {
            return persistIfChanged(existing.get(), balance);
        }

        // 新付与到来：
        // - 旧前年度は付与から2年経過のため消滅済み（apply 済み、または繰越で破棄）
        // - 旧今年度残 → 新前年度
        // - 新付与日数 → 新今年度
        int carryToPrevious = Math.max(0, balance.currentYearRemaining());
        if (PaidLeaveExpiration.isExpired(balance.currentGrantDate(), asOf)) {
            carryToPrevious = 0;
        }
        PaidLeaveBalanceDto rolled = new PaidLeaveBalanceDto(
                employeeId,
                grant.grantDays(),
                carryToPrevious,
                grant.grantDate(),
                balance.currentGrantDate(),
                grant.grantDays(),
                balance.currentGrantDays(),
                "GRANT_ROLLOVER"
        );
        // 繰越直後にも時効を適用（新前年度の付与日が既に2年超の異常ケース用）
        rolled = PaidLeaveExpiration.apply(rolled, asOf);
        repository.upsert(rolled);
        return Optional.of(rolled);
    }

    /**
     * 入社日・社員種別変更・新規登録・退職から復帰時。
     * 非対象は台帳削除。対象は上線ルールで再初期化（前年度0 / 今年度=算出付与）。
     */
    @Transactional
    public void reinitializeFromHireDate(long employeeId) {
        if (!isEligible(employeeId)) {
            repository.deleteByEmployeeId(employeeId);
            return;
        }
        LocalDate asOf = LocalDate.now(ZONE);
        LocalDate hireDate = repository.findHireDate(employeeId)
                .map(this::parseHireDate)
                .orElse(null);
        if (hireDate == null) {
            repository.deleteByEmployeeId(employeeId);
            return;
        }
        GrantInfo latest = PaidLeaveGrantCalculator.latestGrant(hireDate, asOf).orElse(null);
        repository.upsert(seedGoLive(employeeId, latest));
    }

    /** 稼働状況が退職になったとき台帳を削除する。 */
    @Transactional
    public void clearBalanceOnResignation(long employeeId) {
        repository.deleteByEmployeeId(employeeId);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedMissingOnStartup() {
        removeIneligibleBalances();
        seedMissingBalances();
        refreshEligibleBalances();
    }

    @Scheduled(cron = "0 40 1 * * *", zone = "Asia/Tokyo")
    public void dailyGrantCheck() {
        removeIneligibleBalances();
        seedMissingBalances();
        refreshEligibleBalances();
    }

    @Transactional
    public void refreshEligibleBalances() {
        LocalDate asOf = LocalDate.now(ZONE);
        int refreshed = 0;
        for (Long employeeId : repository.findEligibleEmployeeIdsWithHireDate()) {
            try {
                ensureBalance(employeeId, asOf);
                refreshed++;
            } catch (Exception e) {
                log.warn("有給残高の更新に失敗しました employeeId={}", employeeId, e);
            }
        }
        log.info("有給残高の更新を完了しました: {} 件（付与繰越・2年消滅含む）", refreshed);
    }

    @Transactional
    public void seedMissingBalances() {
        List<Long> missing = repository.findEmployeeIdsMissingBalance();
        if (missing.isEmpty()) {
            return;
        }
        LocalDate asOf = LocalDate.now(ZONE);
        int seeded = 0;
        for (Long employeeId : missing) {
            try {
                ensureBalance(employeeId, asOf);
                seeded++;
            } catch (Exception e) {
                log.warn("有給残高の初期化に失敗しました employeeId={}", employeeId, e);
            }
        }
        log.info("有給残高を初期化しました: {} / {} 件", seeded, missing.size());
    }

    @Transactional
    public void removeIneligibleBalances() {
        List<Long> ineligible = repository.findIneligibleBalanceEmployeeIds();
        if (ineligible.isEmpty()) {
            return;
        }
        for (Long employeeId : ineligible) {
            repository.deleteByEmployeeId(employeeId);
        }
        log.info("有給対象外（非正社員または退職）の台帳を削除しました: {} 件", ineligible.size());
    }

    private Optional<PaidLeaveBalanceDto> persistIfChanged(
            PaidLeaveBalanceDto before,
            PaidLeaveBalanceDto after
    ) {
        if (after == null) {
            return Optional.empty();
        }
        if (before == null || before != after) {
            repository.upsert(after);
        }
        return Optional.of(after);
    }

    private boolean isEligible(long employeeId) {
        Optional<String> type = repository.findEmployeeType(employeeId);
        if (type.isEmpty() || !isEligibleEmployeeType(type.get())) {
            return false;
        }
        return repository.findWorkStatus(employeeId)
                .map(status -> !isResignedWorkStatus(status))
                .orElse(true);
    }

    private static PaidLeaveBalanceDto seedGoLive(long employeeId, GrantInfo latest) {
        if (latest == null) {
            return new PaidLeaveBalanceDto(
                    employeeId, 0, 0, null, null, 0, 0, "GO_LIVE"
            );
        }
        // 上線合意：前年度残=0、今年度残=今年度付与日数
        return new PaidLeaveBalanceDto(
                employeeId,
                latest.grantDays(),
                0,
                latest.grantDate(),
                null,
                latest.grantDays(),
                0,
                "GO_LIVE"
        );
    }

    private LocalDate parseHireDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String text = raw.trim().replace('/', '-');
        try {
            if (text.length() >= 10) {
                return LocalDate.parse(text.substring(0, 10));
            }
            if (text.length() >= 7) {
                return LocalDate.parse(text.substring(0, 7) + "-01");
            }
        } catch (Exception ignored) {
            log.warn("入社日の解析に失敗しました: {}", raw);
        }
        return null;
    }
}
