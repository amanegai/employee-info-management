package jp.dispatch.employee.service;

import jakarta.servlet.http.HttpServletRequest;
import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.AuthMapper;
import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.auth.MfaChallengeService;
import jp.dispatch.employee.auth.MfaChallengeService.ChallengeType;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.auth.TotpService;
import jp.dispatch.employee.dto.LoginResponseDto;
import jp.dispatch.employee.dto.MfaRecoveryCodesResponse;
import jp.dispatch.employee.dto.MfaSetupBeginResponse;
import jp.dispatch.employee.dto.MfaSetupConfirmResponse;
import jp.dispatch.employee.dto.UserDto;
import jp.dispatch.employee.repository.AuthUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AuthMfaService {

    private final AuthenticationManager authenticationManager;
    private final AuthUserRepository authUserRepository;
    private final MfaChallengeService mfaChallengeService;
    private final TotpService totpService;
    private final TotpRecoveryCodeService recoveryCodeService;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    public AuthMfaService(
            AuthenticationManager authenticationManager,
            AuthUserRepository authUserRepository,
            MfaChallengeService mfaChallengeService,
            TotpService totpService,
            TotpRecoveryCodeService recoveryCodeService,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.authenticationManager = authenticationManager;
        this.authUserRepository = authUserRepository;
        this.mfaChallengeService = mfaChallengeService;
        this.totpService = totpService;
        this.recoveryCodeService = recoveryCodeService;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    public LoginResponseDto login(String username, String password, HttpServletRequest httpRequest) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ユーザー名とパスワードを入力してください");
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username.trim(), password)
            );
            AppUserDetails user = (AppUserDetails) authentication.getPrincipal();
            boolean isAdmin = user.getRoles().contains(AuthRoles.ADMIN);
            boolean totpEnabled = authUserRepository.isTotpEnabled(user.getId());

            if (isAdmin && !totpEnabled) {
                String token = mfaChallengeService.createSetupChallenge(user.getId(), user.getUsername());
                return LoginResponseDto.mfaSetupRequired(token, user.getUsername());
            }
            if (totpEnabled) {
                String token = mfaChallengeService.createVerifyChallenge(user.getId(), user.getUsername());
                return LoginResponseDto.mfaRequired(token, user.getUsername());
            }
            UserDto loggedIn = establishSession(user, httpRequest);
            auditLogService.logAs(user.getId(), user.getUsername(), AuditAction.LOGIN, "auth_user", String.valueOf(user.getId()), null);
            return LoginResponseDto.success(loggedIn);
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザー名またはパスワードが正しくありません");
        }
    }

    public UserDto verifyLoginChallenge(String challengeToken, String code, HttpServletRequest httpRequest) {
        var challenge = mfaChallengeService.requireChallenge(challengeToken, ChallengeType.VERIFY);
        boolean verified = false;
        boolean usedRecovery = false;

        if (TotpRecoveryCodeService.looksLikeRecoveryCode(code)) {
            verified = recoveryCodeService.tryConsume(challenge.userId(), code);
            usedRecovery = verified;
        } else {
            String secret = authUserRepository.findTotpSecret(challenge.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証が有効ではありません"));
            verified = totpService.verifyCode(secret, code);
        }

        if (!verified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません");
        }

        AppUserDetails user = authUserRepository.findByUsername(challenge.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));
        mfaChallengeService.clearChallenge(challengeToken);
        UserDto loggedIn = establishSession(user, httpRequest);
        auditLogService.logAs(
                user.getId(),
                user.getUsername(),
                usedRecovery ? AuditAction.MFA_RECOVERY_USED : AuditAction.MFA_VERIFY,
                "auth_user",
                String.valueOf(user.getId()),
                usedRecovery ? "recovery_code" : "totp"
        );
        return loggedIn;
    }

    public MfaSetupBeginResponse beginSetup(String challengeToken) {
        if (challengeToken != null && !challengeToken.isBlank()) {
            var challenge = mfaChallengeService.requireChallenge(challengeToken, ChallengeType.SETUP);
            String secret = mfaChallengeService.getOrCreatePendingSecretForChallenge(
                    challengeToken,
                    challenge.userId(),
                    totpService::generateSecret
            );
            return new MfaSetupBeginResponse(totpService.buildOtpAuthUri(challenge.username(), secret));
        }
        AppUserDetails current = requireAuthenticatedUser();
        if (authUserRepository.isTotpEnabled(current.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証は既に有効です");
        }
        String secret = mfaChallengeService.getOrCreatePendingSecretForUser(
                current.getId(),
                totpService::generateSecret
        );
        return new MfaSetupBeginResponse(totpService.buildOtpAuthUri(current.getUsername(), secret));
    }

    @Transactional
    public MfaSetupConfirmResponse confirmSetup(String challengeToken, String code, HttpServletRequest httpRequest) {
        AppUserDetails user;
        long userId;
        if (challengeToken != null && !challengeToken.isBlank()) {
            var challenge = mfaChallengeService.requireChallenge(challengeToken, ChallengeType.SETUP);
            userId = challenge.userId();
            String secret = mfaChallengeService.requirePendingSecretForChallenge(challengeToken, userId);
            if (!totpService.verifyCode(secret, code)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません");
            }
            authUserRepository.enableTotp(userId, secret);
            user = authUserRepository.findByUsername(challenge.username())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));
            mfaChallengeService.clearChallenge(challengeToken);
        } else {
            AppUserDetails current = requireAuthenticatedUser();
            if (authUserRepository.isTotpEnabled(current.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証は既に有効です");
            }
            userId = current.getId();
            String secret = mfaChallengeService.requirePendingSecretForUser(userId);
            if (!totpService.verifyCode(secret, code)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません");
            }
            authUserRepository.enableTotp(userId, secret);
            mfaChallengeService.clearPendingSetupForUser(userId);
            securityService.refreshCurrentUser();
            user = authUserRepository.findByUsername(current.getUsername())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));
        }

        List<String> recoveryCodes = recoveryCodeService.regenerate(userId);
        UserDto userDto = challengeToken != null && !challengeToken.isBlank()
                ? establishSession(user, httpRequest)
                : toUserDto(user);
        auditLogService.logAs(userId, user.getUsername(), AuditAction.MFA_ENABLE, "auth_user", String.valueOf(userId), null);
        return new MfaSetupConfirmResponse(userDto, recoveryCodes, recoveryCodes.size());
    }

    @Transactional
    public void disableForCurrentUser() {
        AppUserDetails current = requireAuthenticatedUser();
        if (current.getRoles().contains(AuthRoles.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "管理者は二段階認証を無効にできません");
        }
        if (!authUserRepository.isTotpEnabled(current.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証は有効ではありません");
        }
        authUserRepository.disableTotp(current.getId());
        recoveryCodeService.deleteAll(current.getId());
        securityService.refreshCurrentUser();
        auditLogService.log(AuditAction.MFA_DISABLE, "auth_user", String.valueOf(current.getId()), null);
    }

    @Transactional
    public MfaRecoveryCodesResponse regenerateRecoveryCodes(String totpCode) {
        AppUserDetails current = requireAuthenticatedUser();
        if (!authUserRepository.isTotpEnabled(current.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証が有効ではありません");
        }
        int remaining = recoveryCodeService.countRemaining(current.getId());
        if (remaining > 0) {
            String secret = authUserRepository.findTotpSecret(current.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証が有効ではありません"));
            if (totpCode == null || totpCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "認証コードを入力してください");
            }
            if (!totpService.verifyCode(secret, totpCode)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません");
            }
        } else if (totpCode != null && !totpCode.isBlank()) {
            String secret = authUserRepository.findTotpSecret(current.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "二段階認証が有効ではありません"));
            if (!totpService.verifyCode(secret, totpCode)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません");
            }
        }
        List<String> codes = recoveryCodeService.regenerate(current.getId());
        auditLogService.log(AuditAction.MFA_RECOVERY_REGENERATE, "auth_user", String.valueOf(current.getId()), null);
        return new MfaRecoveryCodesResponse(codes, codes.size());
    }

    public UserDto loadCurrentUserDto() {
        AppUserDetails current = requireAuthenticatedUser();
        return authUserRepository.findByUsername(current.getUsername())
                .map(this::toUserDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です"));
    }

    private UserDto establishSession(AppUserDetails user, HttpServletRequest httpRequest) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user,
                user.getPassword(),
                user.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        httpRequest.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                context
        );
        return toUserDto(user);
    }

    private UserDto toUserDto(AppUserDetails user) {
        boolean totpEnabled = authUserRepository.isTotpEnabled(user.getId());
        int remaining = totpEnabled ? recoveryCodeService.countRemaining(user.getId()) : 0;
        return AuthMapper.toUserDto(user, totpEnabled, remaining);
    }

    private AppUserDetails requireAuthenticatedUser() {
        AppUserDetails current = securityService.currentUser();
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return current;
    }
}
