package jp.dispatch.employee.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TechnicalSkillCatalogTest {

    @Test
    void acceptsKnownCategoryItemPairs() {
        assertTrue(TechnicalSkillCatalog.isValid("開発言語", "Java"));
        assertTrue(TechnicalSkillCatalog.isValid("DB", "PostgreSQL"));
        assertTrue(TechnicalSkillCatalog.isValid("業務知識", "保険"));
    }

    @Test
    void rejectsUnknownOrMismatchedPairs() {
        assertFalse(TechnicalSkillCatalog.isValid("開発言語", "PostgreSQL"));
        assertFalse(TechnicalSkillCatalog.isValid("未知", "Java"));
        assertFalse(TechnicalSkillCatalog.isValid(null, "Java"));
        assertFalse(TechnicalSkillCatalog.isValid("Java", null));
    }
}
