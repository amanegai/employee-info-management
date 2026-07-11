package jp.dispatch.employee.model;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ProjectWorkflowData {

    private ProjectWorkflowData() {
    }

    public static final List<String> PROJECT_STATUSES = List.of(
            "OPEN",
            "PARTIALLY_FILLED",
            "FILLED",
            "ON_HOLD",
            "CLOSED",
            "CANCELLED"
    );

    public static final Map<String, String> PROJECT_STATUS_LABELS = Map.of(
            "OPEN", "募集中",
            "PARTIALLY_FILLED", "一部確定",
            "FILLED", "満員",
            "ON_HOLD", "保留",
            "CLOSED", "終了",
            "CANCELLED", "キャンセル"
    );

    public static final List<String> CANDIDATE_STAGES = List.of(
            "MATCHED",
            "PROPOSED",
            "INTERVIEW_SCHEDULED",
            "INTERVIEWING",
            "OFFERED",
            "CONFIRMED",
            "REJECTED",
            "WITHDRAWN",
            "LOST"
    );

    public static final Set<String> ALL_CANDIDATE_STAGES = Set.copyOf(CANDIDATE_STAGES);

    public static final Map<String, String> CANDIDATE_STAGE_LABELS = Map.of(
            "MATCHED", "マッチング済",
            "PROPOSED", "顧客提案済",
            "INTERVIEW_SCHEDULED", "面談設定済み",
            "INTERVIEWING", "選考中",
            "OFFERED", "内定待ち",
            "CONFIRMED", "採用確定",
            "REJECTED", "不採用",
            "WITHDRAWN", "提案撤回",
            "LOST", "他案件確定"
    );

    public static final Set<String> ACTIVE_CANDIDATE_STAGES = Set.of(
            "MATCHED",
            "PROPOSED",
            "INTERVIEW_SCHEDULED",
            "INTERVIEWING"
    );

    public static final List<String> ASSIGNMENT_STATUSES = List.of(
            "PLANNED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED"
    );

    public static final Set<String> OPEN_ASSIGNMENT_STATUSES = Set.of("PLANNED", "ACTIVE");

    /** 案件マッチング可能なステータス（募集中・一部確定） */
    public static final Set<String> MATCHABLE_PROJECT_STATUSES = Set.of("OPEN", "PARTIALLY_FILLED");
}
