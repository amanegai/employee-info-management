package jp.dispatch.employee.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssignmentRoleCodesTest {

    @Test
    void normalizesBracketedRoleTokens() {
        assertEquals("PL", AssignmentRoleCodes.normalize("【リーダー】"));
        assertEquals("PM", AssignmentRoleCodes.normalize("【PM】"));
        assertEquals("SE", AssignmentRoleCodes.normalize("【SE】"));
        assertEquals("PG", AssignmentRoleCodes.normalize("【PG】"));
    }

    @Test
    void roleEligibilityFollowsHierarchy() {
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PG", "PG"));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PG", "PM"));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("SE", "PL"));
        assertFalse(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("SE", "PG"));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PL", "PM"));
        assertFalse(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PL", "SE"));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PM", "PM"));
        assertFalse(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("PM", "PL"));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("【リーダー】", "PL"));
        assertFalse(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("【リーダー】", "SE"));
    }

    @Test
    void nullProjectRoleDoesNotFilter() {
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole(null, null));
        assertTrue(AssignmentRoleCodes.isEmployeeEligibleForProjectRole("", "PG"));
    }
}
