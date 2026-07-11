package jp.dispatch.employee.model;



import java.util.List;

import java.util.Locale;

import java.util.Map;

import java.util.regex.Matcher;

import java.util.regex.Pattern;



public final class AssignmentRoleCodes {



    public static final List<String> ALL = List.of("PM", "PL", "SE", "PG");



    private static final Map<String, String> LABELS = Map.of(

            "PM", "プロジェクトマネージャー",

            "PL", "プロジェクトリーダー",

            "SE", "システムエンジニア",

            "PG", "プログラマ"

    );



    private static final Map<String, Integer> RANK = Map.of(

            "PG", 1,

            "SE", 2,

            "PL", 3,

            "PM", 4

    );



    private static final Pattern BRACKET_TOKEN = Pattern.compile("【([^】]+)】");



    private AssignmentRoleCodes() {

    }



    public static String normalize(String value) {

        if (value == null || value.isBlank()) {

            return null;

        }

        String trimmed = value.trim();

        Matcher bracketMatcher = BRACKET_TOKEN.matcher(trimmed);

        while (bracketMatcher.find()) {

            String code = normalizeCore(bracketMatcher.group(1));

            if (code != null) {

                return code;

            }

        }

        return normalizeCore(trimmed);

    }



    private static String normalizeCore(String value) {

        if (value == null || value.isBlank()) {

            return null;

        }

        String trimmed = value.trim().replaceAll("[【】\\[\\]]", "").trim();

        for (String code : ALL) {

            if (code.equalsIgnoreCase(trimmed)) {

                return code;

            }

        }

        String compact = trimmed.replaceAll("[\\s　]+", "");

        if (compact.contains("プロジェクトマネージャ") || compact.equalsIgnoreCase("PM")) {

            return "PM";

        }

        if (compact.contains("プロジェクトリーダ") || compact.contains("リーダー") || compact.equalsIgnoreCase("PL")) {

            return "PL";

        }

        if (compact.contains("システムエンジニア") || compact.equalsIgnoreCase("SE")) {

            return "SE";

        }

        if (compact.contains("プログラマ") || compact.equalsIgnoreCase("PG")) {

            return "PG";

        }

        return null;

    }



    public static int rank(String code) {

        if (code == null || code.isBlank()) {

            return 0;

        }

        return RANK.getOrDefault(code.toUpperCase(Locale.ROOT), 0);

    }



    /**

     * 案件役割に対し、社員の役割がマッチング対象か判定する。

     * PG→PG以上、SE→SE以上、PL/リーダー→PL以上、PM→PMのみ。

     */

    public static boolean isEmployeeEligibleForProjectRole(String projectRole, String employeeRole) {

        String required = normalize(projectRole);

        if (required == null) {

            return true;

        }

        String actual = normalize(employeeRole);

        if (actual == null) {

            return false;

        }

        int requiredRank = rank(required);

        int actualRank = rank(actual);

        if (requiredRank <= 0 || actualRank <= 0) {

            return false;

        }

        if ("PM".equals(required)) {

            return actualRank == requiredRank;

        }

        return actualRank >= requiredRank;

    }



    public static String label(String code) {

        if (code == null || code.isBlank()) {

            return null;

        }

        return LABELS.getOrDefault(code.toUpperCase(Locale.ROOT), code.trim());

    }

}


