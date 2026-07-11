package jp.dispatch.employee.model;

import java.util.List;
import java.util.Map;

/**
 * 評価項目（S/A/B/C/D）から総合評価（S1〜D5）を算出する。
 * <p>
 * アルゴリズム:
 * 1. 各ランクを数値化（S=5, A=4, B=3, C=2, D=1）
 * 2. カテゴリごとに項目平均を算出
 * 3. カテゴリ平均の算術平均を総合スコアとする（カテゴリ均等な重み付け）
 * 4. スコア 1.0〜5.0 を 25 段階（D1〜S5）に線形マッピング
 */
public final class EvaluationCalculator {

    private static final Map<String, Integer> RANK_SCORE = Map.of(
            "S", 5,
            "A", 4,
            "B", 3,
            "C", 2,
            "D", 1
    );

    private static final String[] GRADES = {"D", "C", "B", "A", "S"};

    private EvaluationCalculator() {
    }

    public static int rankToScore(String rankGrade) {
        if (rankGrade == null || rankGrade.isBlank()) {
            return 0;
        }
        String letter = rankGrade.trim().substring(0, 1).toUpperCase();
        return RANK_SCORE.getOrDefault(letter, 0);
    }

    public record CategoryScore(String categoryCode, double averageScore, int itemCount) {
    }

    public record CalculationResult(
            String evaluation,
            double averageScore,
            int totalItemCount,
            int categoryCount,
            List<CategoryScore> categoryScores
    ) {
    }

    /**
     * @param categoryRanks カテゴリコード → ランク文字列リスト
     */
    public static CalculationResult calculate(Map<String, List<String>> categoryRanks) {
        if (categoryRanks == null || categoryRanks.isEmpty()) {
            return null;
        }

        var categoryScores = new java.util.ArrayList<CategoryScore>();
        int totalItems = 0;

        for (var entry : categoryRanks.entrySet()) {
            var ranks = entry.getValue();
            if (ranks == null || ranks.isEmpty()) {
                continue;
            }
            double sum = 0;
            int valid = 0;
            for (String rank : ranks) {
                int score = rankToScore(rank);
                if (score > 0) {
                    sum += score;
                    valid++;
                }
            }
            if (valid == 0) {
                continue;
            }
            double avg = sum / valid;
            categoryScores.add(new CategoryScore(entry.getKey(), avg, valid));
            totalItems += valid;
        }

        if (categoryScores.isEmpty()) {
            return null;
        }

        double overallAvg = categoryScores.stream()
                .mapToDouble(CategoryScore::averageScore)
                .average()
                .orElse(0);

        String evaluation = scoreToEvaluation(overallAvg);
        return new CalculationResult(
                evaluation,
                overallAvg,
                totalItems,
                categoryScores.size(),
                categoryScores
        );
    }

    /** スコア 1.0〜5.0 → D1〜S5（25段階線形マッピング） */
    public static String scoreToEvaluation(double score) {
        double clamped = Math.max(1.0, Math.min(5.0, score));
        int index = (int) Math.round((clamped - 1.0) / 4.0 * 24.0);
        index = Math.max(0, Math.min(24, index));
        int gradeIdx = index / 5;
        int level = index % 5 + 1;
        return GRADES[gradeIdx] + level;
    }

    public static String rankLabelFor(String grade) {
        return switch (grade) {
            case "S" -> "（卓越した成果）";
            case "A" -> "（高い成果）";
            case "B" -> "（必要十分）";
            case "C" -> "（改善余地）";
            case "D" -> "（大幅な改善が必要）";
            default -> "";
        };
    }

    public record ParsedEvaluation(String grade, int level, String full, String rankLabel) {
        public static ParsedEvaluation from(String evaluation) {
            if (evaluation == null || evaluation.length() < 2) {
                return null;
            }
            String grade = evaluation.substring(0, 1).toUpperCase();
            char levelChar = evaluation.charAt(1);
            if (levelChar < '1' || levelChar > '5') {
                return null;
            }
            int level = levelChar - '0';
            return new ParsedEvaluation(grade, level, grade + level, rankLabelFor(grade));
        }
    }
}
