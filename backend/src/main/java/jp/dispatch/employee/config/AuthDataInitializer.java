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
@Order(1)
public class AuthDataInitializer implements ApplicationRunner {

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthDataInitializer(AuthUserRepository authUserRepository, PasswordEncoder passwordEncoder) {
        this.authUserRepository = authUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (authUserRepository.countUsers() > 0) {
            return;
        }
        authUserRepository.createUser(
                "admin",
                passwordEncoder.encode("admin123"),
                "管理者",
                null,
                null,
                null,
                null,
                List.of(AuthRoles.ADMIN)
        );
        authUserRepository.createUser(
                "hr",
                passwordEncoder.encode("hr123"),
                "人事担当",
                null,
                null,
                AffiliationCompanies.BITCROSS,
                null,
                List.of(AuthRoles.HR)
        );
    }
}
