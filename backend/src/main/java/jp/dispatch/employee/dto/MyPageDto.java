package jp.dispatch.employee.dto;

import java.util.List;

/** ログインユーザーの MyPage 表示用 */
public record MyPageDto(
        String username,
        String displayName,
        List<String> roles,
        boolean employeeLinked,
        Long employeeId,
        String employeeCode,
        String name,
        String nameKana,
        String departmentName,
        String affiliationCompany,
        String position,
        String employeeType,
        String workStatus,
        String photoUrl,
        String email,
        String phone,
        String nearestStation,
        /**
         * 有給対象か。連携なしは null。
         * true=正社員・契約社員、false=個人事業主等（表示は「対象外」）
         */
        Boolean paidLeaveEligible,
        /** 今年度有給残。未初期化・対象外・未連携時は null */
        Integer paidLeaveCurrentYearRemaining,
        /** 前年度有給残（繰越）。未初期化・対象外・未連携時は null */
        Integer paidLeavePreviousYearRemaining,
        /** 合計残（互換・表示用）。未初期化・対象外・未連携時は null */
        Integer paidLeaveRemaining,
        /** 管理者のみ。一般ユーザーは null */
        MyPageAdminOverviewDto adminOverview
) {
}
