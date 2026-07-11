package jp.dispatch.employee.model;

import java.util.Set;

public final class SummaryFilter {

    public static final String ACTIVE = "active";
    public static final String WORKING = "working";
    public static final String STANDBY = "standby";
    public static final String ENDING_THIS_MONTH = "endingThisMonth";

    private static final Set<String> ALLOWED = Set.of(ACTIVE, WORKING, STANDBY, ENDING_THIS_MONTH);

    public static boolean isValid(String value) {
        return value != null && ALLOWED.contains(value);
    }

    private SummaryFilter() {
    }
}
