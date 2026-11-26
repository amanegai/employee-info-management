package jp.dispatch.employee.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "権限がありません"
        );
        detail.setTitle("403");
        return detail;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handle(ResponseStatusException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String reason = ex.getReason();
        if (reason == null || reason.isBlank()) {
            reason = defaultMessageForStatus(status);
        }
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(status, reason);
        detail.setTitle(String.valueOf(status.value()));
        return detail;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        String raw = String.valueOf(ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage()).toLowerCase();
        String message = "データの整合性エラーにより保存できませんでした";
        if (raw.contains("idx_career_unique") || raw.contains("employee_career")) {
            message = "履歴書の内容に問題があります。職務経歴に同一期間の行が複数あります。"
                    + "Excel を修正してから再度取り込んでください";
        } else if (raw.contains("uq_auth_user_employee_id") || raw.contains("auth_user_employee")) {
            message = "この社員は既に別ユーザーに連携されています";
        } else if (raw.contains("username") && raw.contains("unique")) {
            message = "ユーザー名が既に登録されています";
        } else if (raw.contains("employee_code") && raw.contains("unique")) {
            message = "社員IDが既に登録されています";
        } else if (raw.contains("client_code") && raw.contains("unique")) {
            message = "取引先コードが既に登録されています";
        } else if (raw.contains("idx_meeting_room_floor_name") || raw.contains("meeting_room")) {
            message = "同じフロアに同じ名前の会議室が既に存在します";
        } else if (raw.contains("project_candidate") || raw.contains("unique(project_id, employee_id)")) {
            message = "この社員は既に候補に追加されています";
        } else if (raw.contains("unique")) {
            message = "一意制約に違反しています。重複するデータがないか確認してください";
        }
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, message);
        detail.setTitle("409");
        return detail;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleNotReadable(HttpMessageNotReadableException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "リクエストの形式が不正です。入力内容を確認してください"
        );
        detail.setTitle("400");
        return detail;
    }

    private static String defaultMessageForStatus(HttpStatusCode status) {
        if (status.value() == 400) {
            return "リクエストが不正です";
        }
        if (status.value() == 401) {
            return "認証が必要です";
        }
        if (status.value() == 403) {
            return "権限がありません";
        }
        if (status.value() == 404) {
            return "対象データが見つかりません";
        }
        if (status.value() == 409) {
            return "データの競合により保存できませんでした";
        }
        return "リクエストに失敗しました（HTTP " + status.value() + "）";
    }
}
