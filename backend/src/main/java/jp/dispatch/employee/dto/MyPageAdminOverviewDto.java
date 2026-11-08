package jp.dispatch.employee.dto;

/** 管理者 MyPage 用の運用概要 */
public record MyPageAdminOverviewDto(
        long activeCount,
        long workingCount,
        long standbyCount,
        long endingThisMonthCount,
        int cancelFollowupOpenCount,
        int bpHelpOpenCount,
        int statusSuggestionPendingCount,
        int notificationUnreadCount
) {
}
