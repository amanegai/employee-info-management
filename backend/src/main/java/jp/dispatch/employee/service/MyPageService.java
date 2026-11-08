package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.EmployeeDetailDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.PersonalDto;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.dto.MyPageAdminOverviewDto;
import jp.dispatch.employee.dto.MyPageDto;
import jp.dispatch.employee.dto.PaidLeaveBalanceDto;
import jp.dispatch.employee.dto.SummaryDto;
import jp.dispatch.employee.repository.AppNotificationRepository;
import jp.dispatch.employee.repository.AssignmentCancelFollowupRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.EmployeeStatusSuggestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MyPageService {

    private final SecurityService securityService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDetailRepository employeeDetailRepository;
    private final AssignmentCancelFollowupRepository cancelFollowupRepository;
    private final DispatchProjectRepository projectRepository;
    private final EmployeeStatusSuggestionRepository statusSuggestionRepository;
    private final AppNotificationRepository notificationRepository;
    private final PaidLeaveBalanceService paidLeaveBalanceService;

    public MyPageService(
            SecurityService securityService,
            EmployeeRepository employeeRepository,
            EmployeeDetailRepository employeeDetailRepository,
            AssignmentCancelFollowupRepository cancelFollowupRepository,
            DispatchProjectRepository projectRepository,
            EmployeeStatusSuggestionRepository statusSuggestionRepository,
            AppNotificationRepository notificationRepository,
            PaidLeaveBalanceService paidLeaveBalanceService
    ) {
        this.securityService = securityService;
        this.employeeRepository = employeeRepository;
        this.employeeDetailRepository = employeeDetailRepository;
        this.cancelFollowupRepository = cancelFollowupRepository;
        this.projectRepository = projectRepository;
        this.statusSuggestionRepository = statusSuggestionRepository;
        this.notificationRepository = notificationRepository;
        this.paidLeaveBalanceService = paidLeaveBalanceService;
    }

    public MyPageDto getCurrent() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }

        MyPageAdminOverviewDto adminOverview = securityService.hasRole(AuthRoles.ADMIN)
                ? buildAdminOverview(user.getId())
                : null;

        Long employeeId = user.getEmployeeId();
        if (employeeId == null) {
            return new MyPageDto(
                    user.getUsername(),
                    user.getDisplayName(),
                    user.getRoles(),
                    false,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    adminOverview
            );
        }

        EmployeeDto employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "連携されている社員情報が見つかりません"
                ));
        EmployeeDetailDto detail = employeeDetailRepository.findDetail(employeeId).orElse(null);
        PersonalDto personal = detail != null ? detail.personal() : null;
        PaidLeaveBalanceDto paidLeave = paidLeaveBalanceService.ensureBalance(employeeId).orElse(null);
        Integer currentYear = paidLeave != null ? paidLeave.currentYearRemaining() : null;
        Integer previousYear = paidLeave != null ? paidLeave.previousYearRemaining() : null;
        Integer paidLeaveRemaining = paidLeave != null ? paidLeave.totalRemaining() : null;

        return new MyPageDto(
                user.getUsername(),
                user.getDisplayName(),
                user.getRoles(),
                true,
                employee.id(),
                employee.employeeCode(),
                employee.name(),
                employee.nameKana() != null && !employee.nameKana().isBlank()
                        ? employee.nameKana()
                        : (personal != null ? personal.furigana() : null),
                employee.departmentName(),
                employee.affiliationCompany(),
                employee.position(),
                employee.employeeType(),
                employee.workStatus(),
                personal != null ? personal.photoUrl() : null,
                personal != null ? personal.email() : null,
                personal != null ? personal.phone() : null,
                personal != null ? personal.nearestStation() : null,
                currentYear,
                previousYear,
                paidLeaveRemaining,
                adminOverview
        );
    }

    private MyPageAdminOverviewDto buildAdminOverview(long userId) {
        SummaryDto summary = employeeRepository.fetchSummary(null);
        int cancelFollowupOpenCount = cancelFollowupRepository.countOpenVisible(userId, true);
        int bpHelpOpenCount = projectRepository.countOpenBpHelpRequests();
        int statusSuggestionPendingCount = statusSuggestionRepository.findByStatus("PENDING").size();
        int notificationUnreadCount = notificationRepository.countUnread(userId);
        return new MyPageAdminOverviewDto(
                summary.activeCount(),
                summary.workingCount(),
                summary.standbyCount(),
                summary.endingThisMonthCount(),
                cancelFollowupOpenCount,
                bpHelpOpenCount,
                statusSuggestionPendingCount,
                notificationUnreadCount
        );
    }
}
