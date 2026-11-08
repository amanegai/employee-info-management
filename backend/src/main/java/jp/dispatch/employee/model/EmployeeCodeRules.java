package jp.dispatch.employee.model;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 社員ID規則：{btc|als|swt}{S|K|P|B}{5桁}
 * プレフィックスは所属会社で決定する。
 */
public final class EmployeeCodeRules {

    public static final String PREFIX_BTC = "btc";
    public static final String PREFIX_ALS = "als";
    public static final String PREFIX_SWT = "swt";

    public static final String DEPT_ALESIS = "アレシス";
    public static final String DEPT_SONOTA = "その他";
    public static final String DEPT_KAIHATSU = "開発部";
    public static final String DEPT_EIGYO = "営業部";

    public static final String TYPE_SEISHAIN = "正社員";
    public static final String TYPE_KEIYAKU = "契約社員";
    public static final String TYPE_KOJIN = "個人事業主";
    public static final String TYPE_BP = "BP";

    private static final Map<String, Character> TYPE_LETTER = Map.of(
            TYPE_SEISHAIN, 'S',
            TYPE_KEIYAKU, 'K',
            TYPE_KOJIN, 'P',
            TYPE_BP, 'B'
    );

    private static final Map<String, String> COMPANY_PREFIX = Map.of(
            AffiliationCompanies.BITCROSS, PREFIX_BTC,
            AffiliationCompanies.ALESIS, PREFIX_ALS,
            AffiliationCompanies.SHUWA, PREFIX_SWT
    );

    private static final Set<String> FIXED_DEPT_TYPES = Set.of(TYPE_KOJIN, TYPE_BP);
    private static final Set<String> CAN_CHANGE_DEPT_TYPES = Set.of(TYPE_SEISHAIN, TYPE_KEIYAKU);
    private static final Set<String> ALS_SWT_DEPTS = Set.of(DEPT_KAIHATSU, DEPT_EIGYO);

    private static final Pattern CODE_PATTERN = Pattern.compile("^(btc|als|swt)([SKPB])(\\d{5})$");

    private EmployeeCodeRules() {
    }

    public static Character typeLetter(String employeeType) {
        if (employeeType == null || employeeType.isBlank()) {
            return null;
        }
        return TYPE_LETTER.get(employeeType.trim());
    }

    /** @deprecated 部門名ではなく所属会社で判定する */
    @Deprecated
    public static boolean isAlesisDepartment(String departmentName) {
        return DEPT_ALESIS.equals(departmentName);
    }

    public static boolean isSonotaDepartment(String departmentName) {
        return DEPT_SONOTA.equals(departmentName);
    }

    public static String requiredPrefix(String affiliationCompany) {
        String company = AffiliationCompanies.normalize(affiliationCompany);
        return COMPANY_PREFIX.getOrDefault(company, PREFIX_BTC);
    }

    /** @deprecated use {@link #requiredPrefix(String)} with company */
    @Deprecated
    public static String requiredPrefixForDepartment(String departmentName) {
        if (isAlesisDepartment(departmentName)) {
            return PREFIX_ALS;
        }
        return PREFIX_BTC;
    }

    public static boolean isFixedDepartmentType(String employeeType) {
        return employeeType != null && FIXED_DEPT_TYPES.contains(employeeType.trim());
    }

    public static boolean canChangeDepartment(String employeeType) {
        return employeeType != null && CAN_CHANGE_DEPT_TYPES.contains(employeeType.trim());
    }

    public static boolean isDepartmentAllowedForType(String employeeType, String departmentName, String company) {
        if (employeeType == null || employeeType.isBlank()
                || departmentName == null || departmentName.isBlank()) {
            return false;
        }
        String type = employeeType.trim();
        String dept = departmentName.trim();
        String affiliation = AffiliationCompanies.normalize(company);

        if (AffiliationCompanies.ALESIS.equals(affiliation)
                || AffiliationCompanies.SHUWA.equals(affiliation)) {
            return ALS_SWT_DEPTS.contains(dept);
        }

        // ビットクロス
        if (isAlesisDepartment(dept)) {
            return false;
        }
        if (isFixedDepartmentType(type)) {
            return isSonotaDepartment(dept);
        }
        if (TYPE_SEISHAIN.equals(type) || TYPE_KEIYAKU.equals(type)) {
            return !isSonotaDepartment(dept);
        }
        return false;
    }

    /** @deprecated use overload with company */
    @Deprecated
    public static boolean isDepartmentAllowedForType(String employeeType, String departmentName) {
        return isDepartmentAllowedForType(employeeType, departmentName, AffiliationCompanies.BITCROSS);
    }

    public static boolean isCrossCompanyTransfer(String fromCompany, String toCompany) {
        if (fromCompany == null || toCompany == null) {
            return false;
        }
        return !AffiliationCompanies.normalize(fromCompany)
                .equals(AffiliationCompanies.normalize(toCompany));
    }

    public static String normalizeCode(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim();
    }

    public static boolean matchesFormat(String code) {
        return CODE_PATTERN.matcher(normalizeCode(code)).matches();
    }

    /**
     * 形式・種別文字・所属会社プレフィックスを検証。問題なければ null。
     */
    public static String validate(String code, String employeeType, String departmentName, String company) {
        String normalized = normalizeCode(code);
        if (normalized.isEmpty()) {
            return "社員IDは必須です";
        }
        var matcher = CODE_PATTERN.matcher(normalized);
        if (!matcher.matches()) {
            return "社員IDは btc/als/swt + 種別英字(S/K/P/B) + 5桁数字 で入力してください（例：btcS00001）";
        }
        String prefix = matcher.group(1);
        char letter = matcher.group(2).charAt(0);

        Character expectedLetter = typeLetter(employeeType);
        if (expectedLetter == null) {
            return "社員種別が不正です";
        }
        if (letter != expectedLetter) {
            return "社員IDの4文字目は社員種別「" + employeeType + "」に対応する「" + expectedLetter + "」である必要があります";
        }

        String affiliation = AffiliationCompanies.normalize(company);
        String expectedPrefix = requiredPrefix(affiliation);
        if (!expectedPrefix.equals(prefix)) {
            return "所属会社「" + affiliation + "」のとき、社員IDは "
                    + expectedPrefix + " で始まる必要があります";
        }

        if (!isDepartmentAllowedForType(employeeType, departmentName, affiliation)) {
            if (AffiliationCompanies.isBitcross(affiliation) && isFixedDepartmentType(employeeType)) {
                return "個人事業主・BP の所属部門は「その他」のみ選択できます";
            }
            if (!AffiliationCompanies.isBitcross(affiliation)) {
                return "アレシス・衆和テクノロジーの所属部門は「開発部」「営業部」のみです";
            }
            return "正社員・契約社員の所属部門に「その他」は選択できません";
        }
        return null;
    }

    /** @deprecated use overload with company */
    @Deprecated
    public static String validate(String code, String employeeType, String departmentName) {
        return validate(code, employeeType, departmentName, AffiliationCompanies.BITCROSS);
    }

    public static String buildCode(String prefix, char typeLetter, int serial) {
        return prefix + typeLetter + String.format(Locale.ROOT, "%05d", serial);
    }

    public static String codePrefixForLookup(String prefix, char typeLetter) {
        return prefix + typeLetter;
    }

    public static List<String> allowedDepartmentNamesForType(
            String employeeType,
            String company,
            List<String> allAssignableNames
    ) {
        if (allAssignableNames == null) {
            return List.of();
        }
        return allAssignableNames.stream()
                .filter(name -> isDepartmentAllowedForType(employeeType, name, company))
                .toList();
    }
}
