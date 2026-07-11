package jp.dispatch.employee.model;

import java.util.List;

public final class ClientEventData {

    public static final List<String> EVENT_TYPES = List.of(
            "説明会",
            "接待",
            "セミナー",
            "訪問",
            "展示会",
            "その他"
    );

    public static final List<String> EVENT_STATUSES = List.of(
            "予定",
            "実施済",
            "中止",
            "延期"
    );

    private ClientEventData() {
    }
}
