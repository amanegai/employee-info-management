package jp.dispatch.employee.model;

import java.util.List;

public final class TechnicalSkillLevel {

    private TechnicalSkillLevel() {
    }

    public static List<String> levelsAtOrAbove(String minLevel) {
        if (minLevel == null || minLevel.isBlank()) {
            return null;
        }
        return switch (minLevel.trim()) {
            case "◎" -> List.of("◎");
            case "〇", "○", "◯" -> List.of("◎", "〇", "○", "◯");
            case "△" -> List.of("◎", "〇", "○", "◯", "△");
            default -> null;
        };
    }
}
