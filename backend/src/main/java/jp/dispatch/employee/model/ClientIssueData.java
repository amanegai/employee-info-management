package jp.dispatch.employee.model;

import java.util.List;

public final class ClientIssueData {

    public static final List<String> STATUSES = List.of(
            "未着手",
            "対応中",
            "完了",
            "保留"
    );

    public static final List<String> PRIORITIES = List.of(
            "高",
            "中",
            "低"
    );

    private ClientIssueData() {
    }
}
