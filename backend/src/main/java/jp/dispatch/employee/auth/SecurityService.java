package jp.dispatch.employee.auth;

import jakarta.servlet.http.HttpSession;
import jp.dispatch.employee.repository.AuthUserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class SecurityService {

    private final AuthUserRepository authUserRepository;

    public SecurityService(AuthUserRepository authUserRepository) {
        this.authUserRepository = authUserRepository;
    }
    public AppUserDetails currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserDetails user)) {
            return null;
        }
        return user;
    }

    public boolean isAuthenticated() {
        return currentUser() != null;
    }

    public boolean hasRole(String role) {
        AppUserDetails user = currentUser();
        return user != null && user.getRoles().contains(role);
    }

    public boolean hasAnyRole(String... roles) {
        AppUserDetails user = currentUser();
        if (user == null) {
            return false;
        }
        for (String role : roles) {
            if (user.getRoles().contains(role)) {
                return true;
            }
        }
        return false;
    }

    public boolean canViewSalary() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD,
                AuthRoles.SALES_HEAD
        );
    }

    /** 給与・人事情報の編集（営業は閲覧のみ） */
    public boolean canWriteSalary() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD
        );
    }

    /** 社員情報の登録・編集（案件・配属とは別） */
    public boolean canWrite() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD,
                AuthRoles.SALES_HEAD
        );
    }

    /** 案件・配属の閲覧（人事は対象外） */
    public boolean canViewProjectFeatures() {
        return isAuthenticated() && !hasRole(AuthRoles.HR);
    }

    /** 案件・配属・候補者の編集（人事は対象外） */
    public boolean canWriteProjectFeatures() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD,
                AuthRoles.SALES_HEAD
        );
    }

    /** ファイル管理の閲覧（全ログインユーザー） */
    public boolean canViewFiles() {
        return isAuthenticated();
    }

    /** ファイル管理の操作（アップロード・削除） */
    public boolean canWriteFiles() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD,
                AuthRoles.SALES_HEAD
        );
    }

    public boolean canDelete() {
        return hasRole(AuthRoles.ADMIN);
    }

    public boolean canManageUsers() {
        return hasRole(AuthRoles.ADMIN);
    }

    public boolean canViewClientEvents() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.SALES_HEAD,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD
        );
    }

    public boolean canWriteClientEvents() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.SALES_HEAD,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD
        );
    }

    public boolean canViewClientRecords() {
        return canViewClientEvents();
    }

    public boolean canWriteClientRecords() {
        return canWriteClientEvents();
    }

    public boolean canViewHrOps() {
        return isAuthenticated();
    }

    public boolean canManageHrOps() {
        return hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR);
    }

    /** 会議室予約の閲覧（全ログインユーザー） */
    public boolean canViewMeetingRooms() {
        return isAuthenticated();
    }

    /** 会議室予約の作成・変更（全ログインユーザー） */
    public boolean canWriteMeetingRoomReservations() {
        return isAuthenticated();
    }

    /** 会議室マスタの管理（管理者のみ） */
    public boolean canManageMeetingRooms() {
        return hasRole(AuthRoles.ADMIN);
    }

    /** ログインセッションを DB の最新ユーザー情報で更新する */
    public void refreshCurrentUser() {
        AppUserDetails current = currentUser();
        if (current == null) {
            return;
        }
        authUserRepository.findByUsername(current.getUsername()).ifPresent(updated -> {
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    updated,
                    updated.getPassword(),
                    updated.getAuthorities()
            );
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
                HttpSession session = attributes.getRequest().getSession(false);
                if (session != null) {
                    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
                }
            }
        });
    }
}
