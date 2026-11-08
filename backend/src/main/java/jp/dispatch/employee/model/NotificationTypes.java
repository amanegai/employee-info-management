package jp.dispatch.employee.model;

public final class NotificationTypes {
    public static final String BP_HELP_REQUESTED = "BP_HELP_REQUESTED";
    public static final String BP_HELP_REFERRAL_SUBMITTED = "BP_HELP_REFERRAL_SUBMITTED";
    public static final String BP_HELP_REFERRAL_APPROVED = "BP_HELP_REFERRAL_APPROVED";
    public static final String BP_HELP_REFERRAL_REJECTED = "BP_HELP_REFERRAL_REJECTED";
    public static final String BP_HELP_REFERRAL_TO_CLIENT = "BP_HELP_REFERRAL_TO_CLIENT";
    public static final String BP_HELP_REFERRAL_INTERVIEW = "BP_HELP_REFERRAL_INTERVIEW";
    public static final String BP_HELP_REFERRAL_HIRED = "BP_HELP_REFERRAL_HIRED";
    public static final String BP_HELP_REFERRAL_CLOSED = "BP_HELP_REFERRAL_CLOSED";
    /** 満員案件の終了確認リマインド（担当者向け） */
    public static final String PROJECT_FILLED_CLOSE_REMIND = "PROJECT_FILLED_CLOSE_REMIND";

    private NotificationTypes() {
    }
}
