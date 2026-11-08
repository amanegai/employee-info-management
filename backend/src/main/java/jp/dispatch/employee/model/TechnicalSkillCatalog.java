package jp.dispatch.employee.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 履歴書テンプレート「関連技術」と同じカテゴリ・項目定義。
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
        // 旧テンプレ表記互換
        if ("Linix/Unixコマンド".equals(trimmed)) {
            return items.contains("Linux/Unixコマンド");
        }
        return false;
    }

    public static Set<String> categories() {
        return ITEMS_BY_CATEGORY.keySet();
    }

    /** 履歴書 Excel 出力用：表示順を保持したカテゴリ・項目 */
    public static List<CategoryItems> orderedCategories() {
        return ORDERED;
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
                "Windows", "UNIX", "Linux", "HP-UX", "Solaris", "AIX", "Redhat", "Mac", "Android", "IBM/Host"
        )));
        list.add(new CategoryItems("開発言語", List.of(
                "Java", "VB", "C/C++", "VC/VC++", "組込C", "Objective-C", "swift", "C#.net", "ASP.net",
                "VB.net", "SAP/ABAP", "Perl", "Ruby/Jruby", "python", "COBOL", "TSO操作/JCL", "PHP",
                "VBA（Excel）", "VBA（Access）", "PLSQL", "Pro*C", "Salesforce",
                "RPA・BizRobo!", "RPA・Uipath", "RPA・WinActor"
        )));
        list.add(new CategoryItems("Script言語", List.of(
                "WinバッチScript", "JavaScript", "AJAX/Jquery", "AJAX/prototype", "VBScript", "Shell",
                "PowerShell", "NodeJS", "Linux/Unixコマンド", "AngularJS"
        )));
        list.add(new CategoryItems("DB", List.of(
                "Oracle", "SQLServer", "DB2", "HiRDB", "SYBASE", "MySQL", "PostgreSQL", "Redis",
                "Hbase", "Cassandra", "MongoDB", "DynamoDB", "GoogleCloud", "AzureDocumentDB", "Neo4j"
        )));
        list.add(new CategoryItems("フレームワーク/ソリューション", List.of(
                "Struts", "Spring", "seasar2", "JSF", "Hibernate", "iBatis", "Ruby on Rails",
                "terasoluna", "intra-mart", "Gprime", "Flex System", "Notes/Domino", "INTARFRM",
                "Redmine", "Hive", "LAMP"
        )));
        list.add(new CategoryItems("サーバ/モニター", List.of(
                "Apache", "Tomcat", "Weblogic", "WebSphere", "WebSphere MQ", "Interstage", "Tuxedo",
                "TPBroker", "HULFT", "OracleApplicationServer", "Jboss"
        )));
        list.add(new CategoryItems("その他", List.of(
                "Hadoop", "Storm/Spark", "OpenStack", "Amazon AWS", "Microsoft Azure", "Dynamics",
                "Office365", "SharePoint", "Power Apps", "DWH", "EAI・ETL", "BusinessObjects",
                "DataStage", "Tableau", "PowerCenter", "ASTERIA", "JP1", "kafka", "Vmware", "KVM",
                "IoT/M2M関連", "AI/AR/VR/MR関連", "OS・サーバ構築", "NWネットワーク構築",
                "セキュリティ設計", "構成管理・git等", "BSE常駐"
        )));
        list.add(new CategoryItems("業務知識", List.of(
                "金融業・証券・銀行", "クレジットカード", "通信・広告", "保険", "流通・調達",
                "地図・ナビ", "販売・購買", "医療・福祉・年金", "サービス業・他"
        )));
        return List.copyOf(list);
    }
}
