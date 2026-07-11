package jp.dispatch.employee.model;

import java.util.List;

public record EvaluationCategoryMeta(String code, String label, String headerColor, String icon) {

    public static final List<EvaluationCategoryMeta> ALL = List.of(
            new EvaluationCategoryMeta("BASIC", "基本業務能力", "#0d6efd", "bi-list-check"),
            new EvaluationCategoryMeta("TECH", "技術スキル", "#198754", "bi-pc-display"),
            new EvaluationCategoryMeta("COMM", "コミュニケーション", "#fd7e14", "bi-chat-dots"),
            new EvaluationCategoryMeta("PROJECT", "プロジェクト遂行力", "#6f42c1", "bi-diagram-3"),
            new EvaluationCategoryMeta("COMPLIANCE", "勤怠・コンプライアンス", "#dc3545", "bi-person-check"),
            new EvaluationCategoryMeta("CUSTOMER", "顧客評価", "#0a4a7a", "bi-people-fill"),
            new EvaluationCategoryMeta("LEARNING", "学習・成長", "#0dcaf0", "bi-mortarboard")
    );

    public static EvaluationCategoryMeta find(String code) {
        return ALL.stream()
                .filter(c -> c.code().equals(code))
                .findFirst()
                .orElse(new EvaluationCategoryMeta(code, code, "#6c757d", "bi-circle"));
    }
}
