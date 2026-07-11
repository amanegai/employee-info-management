package jp.dispatch.employee.service;

import jakarta.servlet.http.HttpServletRequest;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AuditLogDto;
import jp.dispatch.employee.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AuditLogService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final AuditLogRepository repository;
    private final SecurityService securityService;

    public AuditLogService(AuditLogRepository repository, SecurityService securityService) {
        this.repository = repository;
        this.securityService = securityService;
    }

    public void log(String action, String entityType, String entityId, String detail) {
        AppUserDetails user = securityService.currentUser();
        logAs(
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : "system",
                action,
                entityType,
                entityId,
                detail
        );
    }

    public void logAs(Long userId, String username, String action, String entityType, String entityId, String detail) {
        repository.insert(
                userId,
                username != null ? username : "system",
                action,
                entityType,
                entityId,
                detail,
                resolveClientIp(),
                LocalDateTime.now(ZONE).format(TIMESTAMP)
        );
    }

    public List<AuditLogDto> listRecent(int limit, String action) {
        if (!securityService.canManageUsers()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "監査ログの閲覧権限がありません"
            );
        }
        return repository.findRecent(limit, action);
    }

    private static String resolveClientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return null;
    }
}
