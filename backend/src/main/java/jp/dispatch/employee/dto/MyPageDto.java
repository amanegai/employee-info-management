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
        /** 今年度有給残。未初期化・未連携時は null */
        Integer paidLeaveCurrentYearRemaining,
        /** 前年度有給残（繰越）。未初期化・未連携時は null */
        Integer paidLeavePreviousYearRemaining,
        /** 合計残（互換・表示用）。未初期化・未連携時は null */
        Integer paidLeaveRemaining,
        /** 管理者のみ。一般ユーザーは null */
        MyPageAdminOverviewDto adminOverview
) {
}
