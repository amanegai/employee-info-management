package jp.dispatch.employee.config;

import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.repository.AuthUserRepository;
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
 * 開発・検証用の部門スコープアカウント。
 * 本番では {@code app.auth.seed-demo-users=true} のときのみ有効。
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.auth.seed-demo-users", havingValue = "true")
public class AuthScopeUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AuthScopeUserInitializer.class);

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthScopeUserInitializer(AuthUserRepository authUserRepository, PasswordEncoder passwordEncoder) {
        this.authUserRepository = authUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        createIfAbsent(
                "div1",
                "div123",
                "事業一部長",
                1L,
                List.of(AuthRoles.DIVISION_HEAD)
        );
        createIfAbsent(
                "dept1",
                "dept123",
                "開発一部長",
                2L,
                List.of(AuthRoles.DEPT_HEAD)
        );
        createIfAbsent(
                "sales",
                "sales123",
                "営業",
                9L,
                List.of(AuthRoles.SALES_HEAD)
        );
    }

    private void createIfAbsent(
            String username,
            String rawPassword,
            String displayName,
            Long departmentId,
            List<String> roles
    ) {
        if (authUserRepository.existsByUsername(username)) {
            return;
        }
        try {
            authUserRepository.createUser(
                    username,
                    passwordEncoder.encode(rawPassword),
                    displayName,
                    null,
                    departmentId,
                    AffiliationCompanies.BITCROSS,
                    null,
                    roles
            );
        } catch (DuplicateKeyException ex) {
            log.warn("デモユーザー '{}' の作成をスキップしました: {}", username, ex.getMostSpecificCause().getMessage());
        }
    }
}
