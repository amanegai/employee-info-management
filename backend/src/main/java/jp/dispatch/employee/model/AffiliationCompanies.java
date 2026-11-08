package jp.dispatch.employee.model;

import java.util.List;

/** 所属会社マスタ（表示名固定） */
public final class AffiliationCompanies {

    public static final String BITCROSS = "ビットクロス";
    public static final String ALESIS = "アレシス";
    public static final String SHUWA = "衆和テクノロジー";

    public static final List<String> ALL = List.of(BITCROSS, ALESIS, SHUWA);

    private AffiliationCompanies() {
    }

    public static boolean isValid(String company) {
        return company != null && ALL.contains(company.trim());
    }

    public static String normalize(String company) {
        if (company == null || company.isBlank()) {
            return BITCROSS;
        }
        String trimmed = company.trim();
        return isValid(trimmed) ? trimmed : BITCROSS;
    }

    public static boolean isBitcross(String company) {
        return BITCROSS.equals(normalize(company));
    }
}
