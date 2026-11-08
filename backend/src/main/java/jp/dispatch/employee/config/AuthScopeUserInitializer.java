package jp.dispatch.employee.config;

import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.repository.AuthUserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(2)
public class AuthScopeUserInitializer implements ApplicationRunner {

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
    }
}
