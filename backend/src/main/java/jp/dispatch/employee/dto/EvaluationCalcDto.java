package jp.dispatch.employee.dto;

import java.util.List;

public record EvaluationCalcDto(
        String evaluation,
        double averageScore,
        int totalItemCount,
        int categoryCount,
        String rankLabel,
        List<CategoryScoreDto> categoryScores
) {
    public record CategoryScoreDto(
            String categoryCode,
            String categoryLabel,
            double averageScore,
            int itemCount,
            String categoryEvaluation
    ) {
    }
}
