package jp.dispatch.employee.config;

import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.repository.AuthUserRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 開発・検証用の一般社員アカウント（MyPage のみ）。
 * 本番では {@code app.auth.seed-demo-users=true} のときのみ有効。
 */
@Component
@Order(3)
@ConditionalOnProperty(name = "app.auth.seed-demo-users", havingValue = "true")
public class AuthEmployeeUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AuthEmployeeUserInitializer.class);

    private static final String USERNAME = "employee";
    private static final String RAW_PASSWORD = "emp123";

    private final AuthUserRepository authUserRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthEmployeeUserInitializer(
            AuthUserRepository authUserRepository,
            EmployeeRepository employeeRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authUserRepository = authUserRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (authUserRepository.existsByUsername(USERNAME)) {
            return;
        }
        Long employeeId = employeeRepository.search(
                        null, null, null, null, null, null, null, null, null, null, null, null, null
                ).stream()
                .map(EmployeeDto::id)
                .filter(id -> !authUserRepository.isEmployeeLinkedToOtherUser(id, null))
                .findFirst()
                .orElse(null);
        try {
            authUserRepository.createUser(
                    USERNAME,
                    passwordEncoder.encode(RAW_PASSWORD),
                    "一般社員(テスト)",
                    null,
                    null,
                    AffiliationCompanies.BITCROSS,
                    employeeId,
                    List.of(AuthRoles.EMPLOYEE)
            );
        } catch (DuplicateKeyException ex) {
            // 既存連携社員への衝突など。起動を止めない。
            log.warn("デモユーザー '{}' の作成をスキップしました: {}", USERNAME, ex.getMostSpecificCause().getMessage());
        }
    }
}
