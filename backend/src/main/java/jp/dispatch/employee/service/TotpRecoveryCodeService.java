package jp.dispatch.employee.service;

import jp.dispatch.employee.repository.TotpRecoveryCodeRepository;
import jp.dispatch.employee.repository.TotpRecoveryCodeRepository.RecoveryCodeRow;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class TotpRecoveryCodeService {

    private static final int CODE_COUNT = 10;
    private static final String CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final TotpRecoveryCodeRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public TotpRecoveryCodeService(TotpRecoveryCodeRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public List<String> regenerate(long userId) {
        repository.deleteByUserId(userId);
        String now = LocalDateTime.now(ZONE).format(TIMESTAMP);
        List<String> codes = new ArrayList<>(CODE_COUNT);
        for (int i = 0; i < CODE_COUNT; i++) {
            String code = generateCode();
            codes.add(code);
            repository.insert(userId, passwordEncoder.encode(normalize(code)), now);
        }
        return codes;
    }

    public boolean tryConsume(long userId, String rawCode) {
        String normalized = normalize(rawCode);
        if (normalized.length() != 8) {
            return false;
        }
        for (RecoveryCodeRow row : repository.findUnusedByUserId(userId)) {
            if (passwordEncoder.matches(normalized, row.codeHash())) {
                repository.markUsed(row.id(), LocalDateTime.now(ZONE).format(TIMESTAMP));
                return true;
            }
        }
        return false;
    }

    public int countRemaining(long userId) {
        return repository.countUnused(userId);
    }

    public void deleteAll(long userId) {
        repository.deleteByUserId(userId);
    }

    public static boolean looksLikeRecoveryCode(String code) {
        if (code == null) {
            return false;
        }
        String normalized = normalize(code);
        return normalized.length() == 8 && normalized.chars().allMatch(TotpRecoveryCodeService::isRecoveryChar);
    }

    private static String normalize(String code) {
        return code.replace("-", "").replace(" ", "").trim().toUpperCase();
    }

    private static boolean isRecoveryChar(int ch) {
        return CHARSET.indexOf(ch) >= 0;
    }

    private String generateCode() {
        StringBuilder builder = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            builder.append(CHARSET.charAt(random.nextInt(CHARSET.length())));
        }
        return builder.substring(0, 4) + "-" + builder.substring(4);
    }
}
