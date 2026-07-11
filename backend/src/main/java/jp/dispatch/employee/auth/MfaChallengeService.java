package jp.dispatch.employee.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MfaChallengeService {

    private static final long CHALLENGE_TTL_SECONDS = 300;

    public enum ChallengeType {
        VERIFY,
        SETUP
    }

    public record MfaChallenge(long userId, String username, ChallengeType type, Instant expiresAt) {
    }

    private record PendingSetup(String secret, long userId, Instant expiresAt) {
    }

    private final Map<String, MfaChallenge> challenges = new ConcurrentHashMap<>();
    private final Map<String, PendingSetup> pendingSetupsByToken = new ConcurrentHashMap<>();
    private final Map<Long, PendingSetup> pendingSetupsByUserId = new ConcurrentHashMap<>();

    public String createVerifyChallenge(long userId, String username) {
        return createChallenge(userId, username, ChallengeType.VERIFY);
    }

    public String createSetupChallenge(long userId, String username) {
        return createChallenge(userId, username, ChallengeType.SETUP);
    }

    public MfaChallenge requireChallenge(String token, ChallengeType expectedType) {
        MfaChallenge challenge = challenges.get(token);
        if (challenge == null || challenge.expiresAt().isBefore(Instant.now())) {
            challenges.remove(token);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証の有効期限が切れました。再度ログインしてください");
        }
        if (challenge.type() != expectedType) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "認証手順が不正です");
        }
        return challenge;
    }

    public void storePendingSetupForChallenge(String challengeToken, long userId, String secret) {
        Instant expiresAt = Instant.now().plusSeconds(CHALLENGE_TTL_SECONDS);
        pendingSetupsByToken.put(challengeToken, new PendingSetup(secret, userId, expiresAt));
    }

    public String getOrCreatePendingSecretForChallenge(String challengeToken, long userId, java.util.function.Supplier<String> secretSupplier) {
        PendingSetup pending = pendingSetupsByToken.get(challengeToken);
        if (pending != null && pending.expiresAt().isAfter(Instant.now()) && pending.userId() == userId) {
            return pending.secret();
        }
        String secret = secretSupplier.get();
        storePendingSetupForChallenge(challengeToken, userId, secret);
        return secret;
    }

    public String getOrCreatePendingSecretForUser(long userId, java.util.function.Supplier<String> secretSupplier) {
        PendingSetup pending = pendingSetupsByUserId.get(userId);
        if (pending != null && pending.expiresAt().isAfter(Instant.now()) && pending.userId() == userId) {
            return pending.secret();
        }
        String secret = secretSupplier.get();
        storePendingSetupForUser(userId, secret);
        return secret;
    }

    public void storePendingSetupForUser(long userId, String secret) {
        Instant expiresAt = Instant.now().plusSeconds(CHALLENGE_TTL_SECONDS);
        pendingSetupsByUserId.put(userId, new PendingSetup(secret, userId, expiresAt));
    }

    public String requirePendingSecretForChallenge(String challengeToken, long userId) {
        PendingSetup pending = pendingSetupsByToken.get(challengeToken);
        if (pending == null || pending.expiresAt().isBefore(Instant.now()) || pending.userId() != userId) {
            pendingSetupsByToken.remove(challengeToken);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証の設定が無効です。最初からやり直してください");
        }
        return pending.secret();
    }

    public String requirePendingSecretForUser(long userId) {
        PendingSetup pending = pendingSetupsByUserId.get(userId);
        if (pending == null || pending.expiresAt().isBefore(Instant.now()) || pending.userId() != userId) {
            pendingSetupsByUserId.remove(userId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証の設定が無効です。最初からやり直してください");
        }
        return pending.secret();
    }

    public void clearChallenge(String token) {
        challenges.remove(token);
        pendingSetupsByToken.remove(token);
    }

    public void clearPendingSetupForUser(long userId) {
        pendingSetupsByUserId.remove(userId);
    }

    public Optional<MfaChallenge> findChallenge(String token) {
        MfaChallenge challenge = challenges.get(token);
        if (challenge == null || challenge.expiresAt().isBefore(Instant.now())) {
            challenges.remove(token);
            return Optional.empty();
        }
        return Optional.of(challenge);
    }

    private String createChallenge(long userId, String username, ChallengeType type) {
        String token = UUID.randomUUID().toString();
        challenges.put(token, new MfaChallenge(userId, username, type, Instant.now().plusSeconds(CHALLENGE_TTL_SECONDS)));
        return token;
    }
}
