package jp.dispatch.employee.dto;

import java.util.List;

/**
 * 社員一覧サマリー。
 * {@code companies} は閲覧可能な会社ごとに1セット。
 * 互換のため合計値も返す（単一会社時はそれと一致）。
 */
public record SummaryResponseDto(
        long activeCount,
        long workingCount,
        long standbyCount,
        long endingThisMonthCount,
        List<CompanySummaryDto> companies
) {
}
