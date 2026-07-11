package jp.dispatch.employee.service;

import java.util.List;

public final class HrOpsWorkflowData {

    public static final List<String> REQUEST_TYPES = List.of(
            "CERTIFICATE",
            "ADDRESS_CHANGE",
            "ONBOARDING",
            "OFFBOARDING",
            "PAYROLL",
            "OTHER"
    );

    public static final List<String> STATUSES = List.of(
            "DRAFT",
            "SUBMITTED",
            "IN_PROGRESS",
            "COMPLETED",
            "REJECTED",
            "CANCELLED"
    );

    private HrOpsWorkflowData() {
    }
}
