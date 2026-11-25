package jp.dispatch.employee.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 履歴書テンプレート「関連技術」と同じカテゴリ・項目定義（新テンプレ準拠）。
 * frontend/src/constants/technicalSkillTemplate.js と同期すること。
 */
public final class TechnicalSkillCatalog {

    private static final List<CategoryItems> ORDERED = buildOrdered();
    private static final Map<String, Set<String>> ITEMS_BY_CATEGORY = buildLookup(ORDERED);

    public record CategoryItems(String category, List<String> items) {
    }

    private TechnicalSkillCatalog() {
    }

    public static boolean isValid(String category, String itemName) {
        if (category == null || itemName == null) {
            return false;
        }
        Set<String> items = ITEMS_BY_CATEGORY.get(category.trim());
        if (items == null) {
            return false;
        }
        String trimmed = itemName.trim();
        if (items.contains(trimmed)) {
            return true;
        }
        String canonical = canonicalizeItemName(trimmed);
        return items.contains(canonical);
    }

    public static Set<String> categories() {
        return ITEMS_BY_CATEGORY.keySet();
    }

    /** 履歴書 Excel 出力用：表示順を保持したカテゴリ・項目 */
    public static List<CategoryItems> orderedCategories() {
        return ORDERED;
    }

    private static String canonicalizeItemName(String itemName) {
        return switch (itemName) {
            case "UNIX" -> "Unix";
            case "Mac" -> "macOS";
            case "Redhat" -> "RHEL";
            case "C#.net" -> "C#";
            case "VB.net" -> "VB.NET";
            case "python" -> "Python";
            case "swift" -> "Swift";
            case "PLSQL" -> "PL/SQL";
            case "SAP/ABAP" -> "ABAP";
            case "Oracle" -> "Oracle Database";
            case "SQLServer" -> "SQL Server";
            case "Db2", "IBM DB2", "ibm db2" -> "DB2";
            case "Spring" -> "Spring Framework";
            case "Tomcat" -> "Apache Tomcat";
            case "Weblogic" -> "WebLogic";
            case "Jboss" -> "JBoss EAP";
            case "Amazon AWS" -> "AWS";
            case "kafka" -> "Kafka";
            case "NodeJS" -> "Node.js / Express";
            case "WinバッチScript" -> "Windowsバッチ";
            case "AngularJS" -> "Angular";
            case "RPA・Uipath" -> "UiPath";
            case "Dynamics" -> "Dynamics 365";
            case "Linix/Unixコマンド" -> "Linux/Unixコマンド";
            default -> itemName;
        };
    }

    private static Map<String, Set<String>> buildLookup(List<CategoryItems> ordered) {
        Map<String, Set<String>> map = new LinkedHashMap<>();
        for (CategoryItems entry : ordered) {
            map.put(entry.category(), Set.copyOf(new LinkedHashSet<>(entry.items())));
        }
        return Map.copyOf(map);
    }

    private static List<CategoryItems> buildOrdered() {
        List<CategoryItems> list = new ArrayList<>();
        list.add(new CategoryItems("OS", List.of(
                "Windows", "Linux", "Ubuntu", "RHEL", "Rocky Linux", "macOS",
                "Windows Server", "Unix", "FreeBSD"
        )));
        list.add(new CategoryItems("開発言語", List.of(
                "Java", "Kotlin", "C", "C++", "C#", "Go", "Swift", "Python", "PHP",
                "Ruby", "Rust", "COBOL", "VB.NET", "SQL", "PL/SQL", "ABAP", "Apex"
        )));
        list.add(new CategoryItems("Script言語", List.of(
                "JavaScript", "TypeScript", "PowerShell", "Bash", "Windowsバッチ",
                "Python", "Perl", "Groovy", "VBA"
        )));
        list.add(new CategoryItems("DB", List.of(
                "Oracle Database", "SQL Server", "DB2", "PostgreSQL", "MySQL", "MariaDB", "SQLite",
                "MongoDB", "Redis", "DynamoDB", "Amazon Aurora", "Azure Cosmos DB",
                "Snowflake", "BigQuery"
        )));
        list.add(new CategoryItems("フレームワーク", List.of(
                "Spring Boot", "Spring Framework", "ASP.NET Core", "React", "Next.js",
                "Vue.js", "Angular", "Django", "Flask", "Laravel", "Node.js / Express", "FastAPI"
        )));
        list.add(new CategoryItems("業務ソリューション", List.of(
                "SAP S/4HANA", "SAP BTP", "Oracle Fusion ERP", "Salesforce", "ServiceNow",
                "Dynamics 365", "Pega", "OutSystems", "Mendix", "kintone", "intra-mart",
                "Workday", "Power Platform", "UiPath"
        )));
        list.add(new CategoryItems("WEB", List.of(
                "HTML5", "CSS3", "REST API", "GraphQL", "gRPC", "WebSocket", "OAuth 2.0", "OpenAPI"
        )));
        list.add(new CategoryItems("APサーバ", List.of(
                "Apache Tomcat", "WildFly", "WebLogic", "WebSphere", "IIS", "JBoss EAP"
        )));
        list.add(new CategoryItems("ミドルウェア", List.of(
                "Nginx", "Apache HTTP Server", "Kafka", "RabbitMQ", "HULFT",
                "API Gateway", "Elasticsearch"
        )));
        list.add(new CategoryItems("クラウド", List.of(
                "AWS", "Microsoft Azure", "Google Cloud", "OCI", "Azure OpenAI Service"
        )));
        list.add(new CategoryItems("DevOps", List.of(
                "Docker", "Kubernetes", "Terraform", "Ansible", "Git",
                "GitHub Actions", "GitLab CI/CD", "Jenkins"
        )));
        list.add(new CategoryItems("AIツール", List.of(
                "ChatGPT", "GitHub Copilot", "Microsoft Copilot", "Copilot Studio",
                "Azure AI Foundry", "LangChain", "LlamaIndex", "RAG", "AIエージェント"
        )));
        list.add(new CategoryItems("業務知識", List.of(
                "銀行", "保険", "決済", "流通", "物流", "通信", "製造", "医療・公共", "サービス"
        )));
        return List.copyOf(list);
    }
}
