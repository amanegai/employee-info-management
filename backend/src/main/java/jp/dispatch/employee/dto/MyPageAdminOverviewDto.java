package jp.dispatch.employee.dto;

import java.util.List;

/** 管理者 MyPage 用の運用概要 */
public record MyPageAdminOverviewDto(
        long activeCount,
        long workingCount,
        long standbyCount,
        long endingThisMonthCount,
        List<CompanySummaryDto> companies,
        int cancelFollowupOpenCount,
        int bpHelpOpenCount,
        int statusSuggestionPendingCount,
        int notificationUnreadCount
) {
}
