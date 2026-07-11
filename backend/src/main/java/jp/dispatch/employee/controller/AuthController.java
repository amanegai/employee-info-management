package jp.dispatch.employee.controller;

import jakarta.servlet.http.HttpServletRequest;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.dto.LoginRequest;
import jp.dispatch.employee.dto.LoginResponseDto;
import jp.dispatch.employee.dto.MfaRecoveryCodesResponse;
import jp.dispatch.employee.dto.MfaRecoveryRegenerateRequest;
import jp.dispatch.employee.dto.MfaSetupBeginRequest;
import jp.dispatch.employee.dto.MfaSetupBeginResponse;
import jp.dispatch.employee.dto.MfaSetupConfirmRequest;
import jp.dispatch.employee.dto.MfaSetupConfirmResponse;
import jp.dispatch.employee.dto.MfaVerifyRequest;
import jp.dispatch.employee.dto.UserDto;
import jp.dispatch.employee.service.AuthMfaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthMfaService authMfaService;

    public AuthController(AuthMfaService authMfaService) {
        this.authMfaService = authMfaService;
    }

    @PostMapping("/login")
    public LoginResponseDto login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authMfaService.login(request.username(), request.password(), httpRequest);
    }

    @PostMapping("/mfa/verify")
    public UserDto verifyMfa(@RequestBody MfaVerifyRequest request, HttpServletRequest httpRequest) {
        return authMfaService.verifyLoginChallenge(request.challengeToken(), request.code(), httpRequest);
    }

    @PostMapping("/mfa/setup/begin")
    public MfaSetupBeginResponse beginMfaSetup(@RequestBody(required = false) MfaSetupBeginRequest request) {
        String challengeToken = request != null ? request.challengeToken() : null;
        return authMfaService.beginSetup(challengeToken);
    }

    @PostMapping("/mfa/setup/confirm")
    public MfaSetupConfirmResponse confirmMfaSetup(
            @RequestBody MfaSetupConfirmRequest request,
            HttpServletRequest httpRequest
    ) {
        return authMfaService.confirmSetup(request.challengeToken(), request.code(), httpRequest);
    }

    @PostMapping("/mfa/recovery/regenerate")
    public MfaRecoveryCodesResponse regenerateRecoveryCodes(@RequestBody MfaRecoveryRegenerateRequest request) {
        return authMfaService.regenerateRecoveryCodes(request.code());
    }

    @PostMapping("/mfa/disable")
    public UserDto disableMfa() {
        authMfaService.disableForCurrentUser();
        return authMfaService.loadCurrentUserDto();
    }

    @GetMapping("/me")
    public UserDto me() {
        return authMfaService.loadCurrentUserDto();
    }
}
