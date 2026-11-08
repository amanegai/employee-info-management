package jp.dispatch.employee.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmployeeCodeRulesTest {

    @Test
    void acceptsValidBtcSeishain() {
        assertNull(EmployeeCodeRules.validate(
                "btcS00001", "正社員", "営業部", AffiliationCompanies.BITCROSS));
    }

    @Test
    void acceptsValidAlsBp() {
        assertNull(EmployeeCodeRules.validate(
                "alsB00012", "BP", "開発部", AffiliationCompanies.ALESIS));
    }

    @Test
    void acceptsValidSwtSeishain() {
        assertNull(EmployeeCodeRules.validate(
                "swtS00001", "正社員", "営業部", AffiliationCompanies.SHUWA));
    }

    @Test
    void rejectsWrongPrefixForAlesis() {
        String message = EmployeeCodeRules.validate(
                "btcS00001", "正社員", "開発部", AffiliationCompanies.ALESIS);
        assertTrue(message != null && message.contains("als"));
    }

    @Test
    void rejectsSonotaForSeishain() {
        String message = EmployeeCodeRules.validate(
                "btcS00001", "正社員", "その他", AffiliationCompanies.BITCROSS);
        assertTrue(message != null && message.contains("その他"));
    }

    @Test
    void rejectsNormalDeptForBpOnBitcross() {
        assertFalse(EmployeeCodeRules.isDepartmentAllowedForType(
                "BP", "営業部", AffiliationCompanies.BITCROSS));
        assertTrue(EmployeeCodeRules.isDepartmentAllowedForType(
                "BP", "その他", AffiliationCompanies.BITCROSS));
        assertTrue(EmployeeCodeRules.isDepartmentAllowedForType(
                "BP", "開発部", AffiliationCompanies.ALESIS));
    }

    @Test
    void detectsCrossCompanyTransfer() {
        assertTrue(EmployeeCodeRules.isCrossCompanyTransfer(
                AffiliationCompanies.BITCROSS, AffiliationCompanies.ALESIS));
        assertFalse(EmployeeCodeRules.isCrossCompanyTransfer(
                AffiliationCompanies.BITCROSS, AffiliationCompanies.BITCROSS));
    }

    @Test
    void typeLetterMapping() {
        assertEquals('S', EmployeeCodeRules.typeLetter("正社員"));
        assertEquals('K', EmployeeCodeRules.typeLetter("契約社員"));
        assertEquals('P', EmployeeCodeRules.typeLetter("個人事業主"));
        assertEquals('B', EmployeeCodeRules.typeLetter("BP"));
    }
}
