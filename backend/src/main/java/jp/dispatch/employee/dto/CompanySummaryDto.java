package jp.dispatch.employee.dto;

/** 所属会社ごとの社員サマリー（一览カード1セット分） */
public record CompanySummaryDto(
        String affiliationCompany,
        boolean primary,
        long activeCount,
        long workingCount,
        long standbyCount,
        long endingThisMonthCount
) {
}
