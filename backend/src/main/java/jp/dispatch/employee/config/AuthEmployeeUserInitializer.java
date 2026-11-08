package jp.dispatch.employee.config;

import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.repository.AuthUserRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 開発・検証用の一般社員アカウント（MyPage のみ）。
 * 既存 DB に社員がいれば先頭1件へ連携する。
 */
@Component
@Order(3)
public class AuthEmployeeUserInitializer implements ApplicationRunner {

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
                .findFirst()
                .map(emp -> emp.id())
                .orElse(null);
        authUserRepository.createUser(
                USERNAME,
                passwordEncoder.encode(RAW_PASSWORD),
                "一般社員(テスト)",
                null,
                null,
                employeeId,
                List.of(AuthRoles.EMPLOYEE)
        );
    }
}
