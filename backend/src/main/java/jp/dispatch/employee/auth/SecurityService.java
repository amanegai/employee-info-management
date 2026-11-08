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

    /** 業務系ロール（一般社員のみのアカウントを除く） */
    public boolean hasOperationalRole() {
        return hasAnyRole(
                AuthRoles.ADMIN,
                AuthRoles.HR,
                AuthRoles.DIVISION_HEAD,
                AuthRoles.DEPT_HEAD,
                AuthRoles.SALES_HEAD
        );
    }

    /** 案件・配属の閲覧（人事・一般社員は対象外） */
    public boolean canViewProjectFeatures() {
        return hasOperationalRole() && !hasRole(AuthRoles.HR);
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

    /** 社員一覧・詳細などディレクトリ閲覧（業務ロール） */
    public boolean canViewEmployeeDirectory() {
        return hasOperationalRole();
    }

    /** ファイル管理の閲覧（業務ロール） */
    public boolean canViewFiles() {
        return hasOperationalRole();
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

    /** マスタ一括登録・出力（管理者のみ） */
    public boolean canManageMasterData() {
        return hasRole(AuthRoles.ADMIN);
    }

    /** 所属部門・役職・役割の変更（管理者・人事のみ。種別ごとの可否は業務ルール側で判定） */
    public boolean canChangeEmployeeDepartmentAndRole() {
        return hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR);
    }

    /** 退社日の編集、および退職予定/退職ステータスの操作（管理者・人事） */
    public boolean canEditResignationDate() {
        return hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR);
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
        return canManageHrOps();
    }

    public boolean canManageHrOps() {
        return hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR);
    }

    /** 会議室予約の閲覧（業務ロール） */
    public boolean canViewMeetingRooms() {
        return hasOperationalRole();
    }

    /** 会議室予約の作成・変更（業務ロール） */
    public boolean canWriteMeetingRoomReservations() {
        return hasOperationalRole();
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
