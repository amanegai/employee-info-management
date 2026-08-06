package jp.dispatch.employee.model;

import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.model.ProjectInfoParser;
import jp.dispatch.employee.model.ProjectInfoParser.ParsedProjectInfo;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectInfoParserTest {

    private static final String SAMPLE = """
            【案　　件】システム開発におけるAIエージェント開発案件
            【期　　間】7月～（8月でも検討可能）
            【人　　数】リーダー枠1名
            【作業概要】
            設計書生成やコード生成を行うAIエージェントを開発
            生成AI有識者・経験者はチーム内外に居るため、本募集では生成AIに関する知識・経験よりも、システム開発のご経験やアーキテクチャ設計の経験を重視
            【必須スキル】
            ・Gitを使ったチーム開発経験
            ・Javaを用いた豊富なWebバックエンドの実装経験
            【尚可スキル】
            ・Webサービスの運用設計あるいは運用経験
            【就業場所】基本リモート（出社場所は豊洲）
            【希望単金】スキル見合い　ご提示ください
            【面談回数】お客様面談1回　弊社面談1回　合計2回
            【備　　考】日本籍が望ましい
            """;

    @Test
    void parsesStructuredProjectBrief() {
        ParsedProjectInfo parsed = ProjectInfoParser.parse(SAMPLE);

        assertEquals("システム開発におけるAIエージェント開発案件", parsed.projectName());
        assertTrue(parsed.workSummary().contains("AIエージェントを開発"));
        assertEquals("基本リモート（出社場所は豊洲）", parsed.workLocation());
        assertEquals(Integer.valueOf(1), parsed.headcountRequired());
        assertEquals("スキル見合い", parsed.billingPriceLabel());
        assertTrue(parsed.skipUnitPriceFilter());
        assertEquals("お客様面談1回　弊社面談1回　合計2回", parsed.interviewRounds());
        assertEquals(String.format("%d-07-01", LocalDate.now().getYear()), parsed.expectedStartDate());
        assertEquals("8月でも検討可能", parsed.periodNotes());
        assertTrue(parsed.requiredSkills().stream().anyMatch(s -> s.contains("Git")));
        assertTrue(parsed.optionalSkills().stream().anyMatch(s -> s.contains("運用設計")));
    }

    @Test
    void parsesProjectRoleSection() {
        String text = """
                【役割】PL
                【作業概要】テスト案件
                """;
        ParsedProjectInfo parsed = ProjectInfoParser.parse(text);
        assertEquals("PL", parsed.projectRole());
    }

    @Test
    void parsesBracketedLeaderRole() {
        ParsedProjectInfo parsed = ProjectInfoParser.parse("""
                【役割】【リーダー】
                【作業概要】テスト
                """);
        assertEquals("PL", parsed.projectRole());
    }

    @Test
    void infersLeaderRoleFromHeadcountSection() {
        ParsedProjectInfo parsed = ProjectInfoParser.parse("""
                【人　　数】リーダー枠1名
                【作業概要】テスト
                """);
        assertEquals("PL", parsed.projectRole());
        assertEquals(Integer.valueOf(1), parsed.headcountRequired());
    }

    @Test
    void parsesMultipleHeadcountLabel() {
        ParsedProjectInfo parsed = ProjectInfoParser.parse("""
                【人　　数】【複数名】
                【作業概要】テスト案件
                """);
        assertTrue(parsed.headcountUnlimited());
        assertEquals(null, parsed.headcountRequired());
    }

    @Test
    void mergeProjectRecordFillsMissingParsedFieldsFromDatabase() {
        ParsedProjectInfo parsed = ProjectInfoParser.parse("【作業概要】設計書生成やコード生成を行うAIエージェントを開発");
        DispatchProjectDto project = new DispatchProjectDto(
                1L,
                null,
                "（取引先未設定）",
                "システム開発におけるAIエージェント開発案件",
                "設計書生成やコード生成を行うAIエージェントを開発",
                "Git\nJava",
                "Python",
                null,
                "スキル見合い",
                "基本リモート（出社場所は豊洲）",
                "2026-07-01",
                null,
                1,
                0,
                false,
                "SE",
                "お客様面談1回　弊社面談1回　合計2回",
                "OPEN",
                null,
                null,
                null,
                "8月でも検討可能",
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "2026-01-01",
                "2026-01-01",
                List.of()
        );

        ParsedProjectInfo merged = ProjectInfoParser.mergeProjectRecord(parsed, project);

        assertEquals("基本リモート（出社場所は豊洲）", merged.workLocation());
        assertEquals(Integer.valueOf(1), merged.headcountRequired());
        assertEquals("2026-07-01", merged.expectedStartDate());
        assertEquals("8月でも検討可能", merged.periodNotes());
        assertEquals("SE", merged.projectRole());
    }
}
