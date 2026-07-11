package jp.dispatch.employee.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ProjectInfoParser {

    public static final String HEADCOUNT_MULTIPLE_LABEL = "複数名";

    private static final Pattern SECTION_HEADER = Pattern.compile("【([^】]+)】");
    private static final Pattern LINE_SECTION_HEADER = Pattern.compile("^■\\s*(.+)$", Pattern.MULTILINE);
    private static final Pattern PROJECT_NAME_LINE = Pattern.compile("^(?:【案件】|■案件)\\s*(.+)$");
    private static final Pattern PRICE_RANGE_MAN = Pattern.compile("(\\d+)\\s*万(?:円)?\\s*[〜~～－\\-—–]\\s*(\\d+)\\s*万(?:円)?");
    private static final Pattern PRICE_RANGE = Pattern.compile("(\\d+)\\s*[〜~～－\\-—–]\\s*(\\d+)\\s*万(?:円)?");
    private static final Pattern PRICE_SINGLE = Pattern.compile("(\\d+)\\s*万(?:円)?");
    private static final Pattern PRICE_YEN = Pattern.compile("(\\d{1,3}(?:,\\d{3})+|\\d+)\\s*円");
    private static final Pattern PRICE_KEYWORD_LINE = Pattern.compile(".*(?:報酬|単価|見積|予算|提示|精算|月額|スキル単価).*", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEADER_YEARS = Pattern.compile("(\\d+)\\s*年(?:以上)?.*(?:リーダー|PM|PL)");
    private static final Pattern IT_YEARS = Pattern.compile("(\\d+)\\s*年(?:以上)?.*(?:開発|IT|SE|エンジニア)");
    private static final Pattern BULLET = Pattern.compile("^[\\s・･•\\-*－—–]+");
    private static final Pattern PERIOD_PARENS = Pattern.compile("[（(]([^）)]+)[）)]");
    private static final Pattern YEAR_MONTH = Pattern.compile("(\\d{4})\\s*年?\\s*(\\d{1,2})\\s*月");
    private static final Pattern MONTH_ONLY = Pattern.compile("(\\d{1,2})\\s*月");

    private ProjectInfoParser() {
    }

    public static ParsedProjectInfo parse(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return ParsedProjectInfo.empty();
        }

        String text = rawText.replace("\r\n", "\n").trim();
        var sections = splitSections(text);
        String projectName = extractProjectName(text, sections);

        List<String> requiredSkills = mergeSkillSections(sections, "必須", "必須スキル");
        List<String> optionalSkills = mergeSkillSections(sections, "任意", "歓迎", "尚可", "尚可スキル");
        String workSummary = findSection(sections, "作業概要", "業務内容", "概要");
        String workContent = workSummary != null ? workSummary : findSection(sections, "業務内容", "概要");
        String location = findSection(sections, "就業場所", "勤務地", "最寄り", "場所");
        String industry = findSection(sections, "業種");
        ParsedHeadcount headcount = resolveHeadcount(sections);
        Integer headcountRequired = headcount.count();
        boolean headcountUnlimited = headcount.unlimited();
        String headcountSection = findSection(sections, "人数", "人員", "人　数");
        String projectRole = resolveProjectRole(sections);
        if (projectRole == null && headcountSection != null && headcountSection.contains("リーダー")) {
            projectRole = "PL";
        }
        String hopePriceSection = findSection(sections, "希望単金", "月額報酬", "月額", "報酬", "単価", "見積", "予算", "提示", "精算");
        String billingPriceLabel = null;
        boolean skipUnitPriceFilter = false;
        PriceRange priceRange = PriceRange.empty();
        if (isSkillBasedPrice(hopePriceSection)) {
            billingPriceLabel = "スキル見合い";
            skipUnitPriceFilter = true;
        } else {
            priceRange = parsePriceRange(hopePriceSection != null ? hopePriceSection : extractPriceContext(text));
            if (priceRange.isEmpty()) {
                priceRange = parsePriceRange(text);
            }
        }
        String interviewRounds = findSection(sections, "面談回数");
        String notes = findSection(sections, "備考", "備　　考");
        ParsedPeriod parsedPeriod = parsePeriod(findSection(sections, "期間", "期　　間", "稼働期間", "契約期間"));
        Integer minItYears = parseMinYears(text, requiredSkills);

        List<String> keywords = buildKeywords(workContent, location, industry, requiredSkills, optionalSkills);
        if (keywords.isEmpty() && requiredSkills.isEmpty() && optionalSkills.isEmpty()) {
            keywords = buildKeywords(text, location, industry, requiredSkills, optionalSkills);
        }

        return new ParsedProjectInfo(
                projectName,
                requiredSkills,
                optionalSkills,
                priceRange.minUnitPrice(),
                priceRange.maxUnitPrice(),
                minItYears,
                keywords,
                workSummary,
                location,
                headcountRequired,
                projectRole,
                billingPriceLabel,
                skipUnitPriceFilter,
                interviewRounds,
                notes,
                parsedPeriod != null ? parsedPeriod.expectedStartDate() : null,
                parsedPeriod != null ? parsedPeriod.periodNotes() : null,
                headcountUnlimited
        );
    }

    public static ParsedProjectInfo mergeProjectRecord(ParsedProjectInfo parsed, jp.dispatch.employee.dto.DispatchProjectDto project) {
        if (project == null) {
            return parsed;
        }
        ParsedProjectInfo merged = mergeStructuredFields(
                parsed,
                project.requiredSkills(),
                project.optionalSkills(),
                project.billingUnitPrice(),
                project.billingPriceLabel()
        );
        return new ParsedProjectInfo(
                coalesceText(merged.projectName(), project.projectName()),
                merged.requiredSkills(),
                merged.optionalSkills(),
                merged.minUnitPrice(),
                merged.maxUnitPrice(),
                merged.minItYears(),
                merged.keywords(),
                coalesceText(merged.workSummary(), project.projectText()),
                coalesceText(merged.workLocation(), project.workLocation()),
                coalesceInteger(merged.headcountRequired(), project.headcountRequired()),
                coalesceText(merged.projectRole(), project.projectRole()),
                merged.billingPriceLabel(),
                merged.skipUnitPriceFilter(),
                coalesceText(merged.interviewRounds(), project.interviewRounds()),
                coalesceText(merged.notes(), project.notes()),
                coalesceText(merged.expectedStartDate(), project.expectedStartDate()),
                coalesceText(merged.periodNotes(), project.periodNotes()),
                coalesceHeadcountUnlimited(merged.headcountUnlimited(), project.headcountUnlimited())
        );
    }

    private static String coalesceText(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        if (fallback == null || fallback.isBlank()) {
            return primary;
        }
        return fallback.trim();
    }

    private static Integer coalesceInteger(Integer primary, Integer fallback) {
        if (primary != null) {
            return primary;
        }
        if (fallback == null || fallback <= 0) {
            return primary;
        }
        return fallback;
    }

    private static boolean coalesceHeadcountUnlimited(boolean primary, boolean fallback) {
        return primary || fallback;
    }

    private static String resolveProjectRole(List<Section> sections) {
        String roleBody = findSection(sections, "役割", "役　　割");
        String parsed = parseProjectRole(roleBody);
        if (parsed != null) {
            return parsed;
        }
        for (int i = 0; i < sections.size(); i++) {
            Section section = sections.get(i);
            if (!sectionTitleMatches(section.title(), "役割") && !sectionTitleMatches(section.title(), "役　　割")) {
                continue;
            }
            if (i + 1 < sections.size()) {
                Section next = sections.get(i + 1);
                String fromNextTitle = AssignmentRoleCodes.normalize(next.title());
                if (fromNextTitle != null && (next.body() == null || next.body().isBlank())) {
                    return fromNextTitle;
                }
            }
        }
        for (Section section : sections) {
            String fromTitle = AssignmentRoleCodes.normalize(section.title());
            if (fromTitle != null) {
                return fromTitle;
            }
        }
        return null;
    }

    private static String parseProjectRole(String roleSection) {
        if (roleSection == null || roleSection.isBlank()) {
            return null;
        }
        return AssignmentRoleCodes.normalize(roleSection);
    }

    public static List<String> parseSkillField(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        Set<String> items = new LinkedHashSet<>();
        for (String line : text.split("\n")) {
            for (String part : line.split("[,、/|]")) {
                String item = part.trim();
                if (!item.isEmpty()) {
                    items.add(item);
                }
            }
        }
        return List.copyOf(items);
    }

    public static ParsedProjectInfo mergeStructuredFields(
            ParsedProjectInfo parsed,
            String requiredSkillsText,
            String optionalSkillsText,
            Integer billingUnitPrice,
            String billingPriceLabel
    ) {
        List<String> required = mergeUnique(parsed.requiredSkills(), parseSkillField(requiredSkillsText));
        List<String> optional = mergeUnique(parsed.optionalSkills(), parseSkillField(optionalSkillsText));

        Integer maxPrice = parsed.maxUnitPrice();
        boolean skipUnitPriceFilter = parsed.skipUnitPriceFilter();
        String mergedPriceLabel = parsed.billingPriceLabel();
        if (billingPriceLabel != null && !billingPriceLabel.isBlank()) {
            mergedPriceLabel = billingPriceLabel.trim();
            if (isSkillBasedPrice(mergedPriceLabel)) {
                mergedPriceLabel = "スキル見合い";
                skipUnitPriceFilter = true;
                maxPrice = null;
            }
        } else if (billingUnitPrice != null && billingUnitPrice > 0) {
            maxPrice = billingUnitPrice;
            skipUnitPriceFilter = false;
        }

        Set<String> keywords = new LinkedHashSet<>(parsed.keywords());
        keywords.addAll(required);
        keywords.addAll(optional);
        for (String skill : required) {
            extractTechKeywords(keywords, skill);
        }
        for (String skill : optional) {
            extractTechKeywords(keywords, skill);
        }

        return new ParsedProjectInfo(
                parsed.projectName(),
                required,
                optional,
                parsed.minUnitPrice(),
                maxPrice,
                parsed.minItYears(),
                List.copyOf(keywords),
                parsed.workSummary(),
                parsed.workLocation(),
                parsed.headcountRequired(),
                parsed.projectRole(),
                mergedPriceLabel,
                skipUnitPriceFilter,
                parsed.interviewRounds(),
                parsed.notes(),
                parsed.expectedStartDate(),
                parsed.periodNotes(),
                parsed.headcountUnlimited()
        );
    }

    private static ParsedHeadcount resolveHeadcount(List<Section> sections) {
        String headcountSection = findSection(sections, "人数", "人員", "人　数");
        ParsedHeadcount parsed = parseHeadcountInfo(headcountSection);
        if (parsed.unlimited() || parsed.count() != null) {
            return parsed;
        }
        for (int i = 0; i < sections.size(); i++) {
            Section section = sections.get(i);
            if (!sectionTitleMatches(section.title(), "人数")
                    && !sectionTitleMatches(section.title(), "人　数")
                    && !sectionTitleMatches(section.title(), "人員")) {
                continue;
            }
            if (i + 1 < sections.size()) {
                ParsedHeadcount fromNext = parseHeadcountInfo(sections.get(i + 1).title());
                if (fromNext.unlimited() || fromNext.count() != null) {
                    return fromNext;
                }
            }
        }
        for (Section section : sections) {
            ParsedHeadcount fromTitle = parseHeadcountInfo(section.title());
            if (fromTitle.unlimited()) {
                return fromTitle;
            }
        }
        return parsed;
    }

    private static ParsedHeadcount parseHeadcountInfo(String text) {
        if (text == null || text.isBlank()) {
            return ParsedHeadcount.empty();
        }
        if (containsMultipleHeadcountLabel(text)) {
            return ParsedHeadcount.multiple();
        }
        Matcher matcher = Pattern.compile("(\\d+)").matcher(text);
        int count = 0;
        while (matcher.find()) {
            count = Math.max(count, Integer.parseInt(matcher.group(1)));
        }
        return count > 0 ? ParsedHeadcount.of(count) : ParsedHeadcount.empty();
    }

    private static boolean containsMultipleHeadcountLabel(String text) {
        String compact = text.replaceAll("[\\s　]+", "");
        if (compact.contains("複数名")) {
            return true;
        }
        Matcher bracket = Pattern.compile("【([^】]+)】").matcher(text);
        while (bracket.find()) {
            if (bracket.group(1).replaceAll("[\\s　]+", "").contains("複数名")) {
                return true;
            }
        }
        return false;
    }

    private record ParsedHeadcount(Integer count, boolean unlimited) {
        static ParsedHeadcount empty() {
            return new ParsedHeadcount(null, false);
        }

        static ParsedHeadcount multiple() {
            return new ParsedHeadcount(null, true);
        }

        static ParsedHeadcount of(int count) {
            return new ParsedHeadcount(count, false);
        }
    }

    private static List<String> mergeUnique(List<String> left, List<String> right) {
        Set<String> merged = new LinkedHashSet<>();
        merged.addAll(left);
        merged.addAll(right);
        return List.copyOf(merged);
    }

    private static String extractProjectName(String text, List<Section> sections) {
        String fromSection = firstNonEmptyLine(findSection(sections, "案件", "案　　件", "案"));
        if (fromSection != null) {
            return fromSection;
        }
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            Matcher projectLine = PROJECT_NAME_LINE.matcher(trimmed);
            if (projectLine.matches()) {
                return projectLine.group(1).trim();
            }
            if (trimmed.startsWith("■") && !isSquareSectionHeader(trimmed)) {
                return trimmed.substring(1).trim();
            }
            if (!trimmed.startsWith("【") && !trimmed.startsWith("■")) {
                return trimmed;
            }
        }
        return "";
    }

    private static boolean isSquareSectionHeader(String line) {
        return LINE_SECTION_HEADER.matcher(line).matches();
    }

    private static List<Section> splitSections(String text) {
        record Header(int start, int end, String title) {
        }

        List<Header> headers = new ArrayList<>();

        Matcher bracket = SECTION_HEADER.matcher(text);
        while (bracket.find()) {
            String title = bracket.group(1).trim();
            if ("案件".equals(title)) {
                continue;
            }
            headers.add(new Header(bracket.start(), bracket.end(), title));
        }

        Matcher square = LINE_SECTION_HEADER.matcher(text);
        while (square.find()) {
            headers.add(new Header(square.start(), square.end(), square.group(1).trim()));
        }

        headers.sort(Comparator.comparingInt(Header::start).thenComparingInt(Header::end));

        List<Section> sections = new ArrayList<>();
        for (int i = 0; i < headers.size(); i++) {
            Header header = headers.get(i);
            int bodyStart = header.end();
            int bodyEnd = i + 1 < headers.size() ? headers.get(i + 1).start() : text.length();
            String body = text.substring(bodyStart, bodyEnd).trim();
            sections.add(new Section(header.title(), body));
        }
        return sections;
    }

    private static String findSection(List<Section> sections, String... keywords) {
        for (Section section : sections) {
            for (String keyword : keywords) {
                if (sectionTitleMatches(section.title(), keyword)) {
                    return section.body();
                }
            }
        }
        return null;
    }

    private static String firstNonEmptyLine(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        return null;
    }

    private static boolean sectionTitleMatches(String title, String keyword) {
        return normalizeSectionTitle(title).contains(normalizeSectionTitle(keyword));
    }

    private static String normalizeSectionTitle(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\s　]+", "");
    }

    private static ParsedPeriod parsePeriod(String periodSection) {
        if (periodSection == null || periodSection.isBlank()) {
            return null;
        }
        String text = periodSection.trim();
        String periodNotes = extractPeriodNotes(text);
        String[] parts = text.split("[～~〜]", 2);
        String startPart = parts[0].trim();
        String expectedStartDate = parsePeriodStartDate(startPart);
        if (expectedStartDate == null && periodNotes == null) {
            return null;
        }
        return new ParsedPeriod(expectedStartDate, periodNotes);
    }

    private static String extractPeriodNotes(String text) {
        Matcher matcher = PERIOD_PARENS.matcher(text);
        List<String> notes = new ArrayList<>();
        while (matcher.find()) {
            String note = matcher.group(1).trim();
            if (!note.isEmpty()) {
                notes.add(note);
            }
        }
        if (notes.isEmpty()) {
            return null;
        }
        return String.join(" ", notes);
    }

    private static String parsePeriodStartDate(String startPart) {
        if (startPart == null || startPart.isBlank()) {
            return null;
        }
        String cleaned = PERIOD_PARENS.matcher(startPart).replaceAll("").trim();
        Matcher yearMonth = YEAR_MONTH.matcher(cleaned);
        if (yearMonth.find()) {
            return toIsoFirstDay(
                    Integer.parseInt(yearMonth.group(1)),
                    Integer.parseInt(yearMonth.group(2))
            );
        }
        Matcher monthOnly = MONTH_ONLY.matcher(cleaned);
        if (monthOnly.find()) {
            return toIsoFirstDay(LocalDate.now().getYear(), Integer.parseInt(monthOnly.group(1)));
        }
        return null;
    }

    private static String toIsoFirstDay(int year, int month) {
        if (month < 1 || month > 12) {
            return null;
        }
        return String.format(Locale.ROOT, "%04d-%02d-01", year, month);
    }

    private static boolean isSkillBasedPrice(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return normalizeSectionTitle(text).contains("スキル見合");
    }

    private static List<String> mergeSkillSections(List<Section> sections, String... keywords) {
        Set<String> items = new LinkedHashSet<>();
        for (Section section : sections) {
            for (String keyword : keywords) {
                if (section.title().contains(keyword)) {
                    items.addAll(extractSkillItems(section.body()));
                    break;
                }
            }
        }
        return List.copyOf(items);
    }

    private static List<String> extractSkillItems(String sectionBody) {
        if (sectionBody == null || sectionBody.isBlank()) {
            return List.of();
        }
        Set<String> items = new LinkedHashSet<>();
        for (String line : sectionBody.split("\n")) {
            String item = normalizeSkillLine(line);
            if (!item.isEmpty()) {
                items.add(item);
            }
        }
        return List.copyOf(items);
    }

    private static String normalizeSkillLine(String line) {
        if (line == null) {
            return "";
        }
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("【") || trimmed.startsWith("■")) {
            return "";
        }
        trimmed = BULLET.matcher(trimmed).replaceFirst("").trim();
        if (trimmed.startsWith("・") || trimmed.startsWith("･")) {
            trimmed = trimmed.substring(1).trim();
        }
        if (trimmed.startsWith("※")) {
            trimmed = trimmed.substring(1).trim();
        }
        return trimmed;
    }

    private static String extractPriceContext(String text) {
        StringBuilder context = new StringBuilder();
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (PRICE_KEYWORD_LINE.matcher(trimmed).matches() || trimmed.contains("万")) {
                context.append(trimmed).append('\n');
            }
        }
        return context.toString();
    }

    private static PriceRange parsePriceRange(String text) {
        if (text == null || text.isBlank()) {
            return PriceRange.empty();
        }
        Matcher rangeMan = PRICE_RANGE_MAN.matcher(text);
        if (rangeMan.find()) {
            return new PriceRange(
                    Integer.parseInt(rangeMan.group(1)) * 10_000,
                    Integer.parseInt(rangeMan.group(2)) * 10_000
            );
        }
        Matcher range = PRICE_RANGE.matcher(text);
        if (range.find()) {
            return new PriceRange(
                    Integer.parseInt(range.group(1)) * 10_000,
                    Integer.parseInt(range.group(2)) * 10_000
            );
        }
        Matcher single = PRICE_SINGLE.matcher(text);
        if (single.find()) {
            int value = Integer.parseInt(single.group(1)) * 10_000;
            return new PriceRange(null, value);
        }
        Matcher yen = PRICE_YEN.matcher(text);
        if (yen.find()) {
            int value = Integer.parseInt(yen.group(1).replace(",", ""));
            return new PriceRange(null, value);
        }
        return PriceRange.empty();
    }

    private static Integer parseMinYears(String text, List<String> requiredSkills) {
        Integer years = parseYearsFromText(text);
        if (years != null) {
            return years;
        }
        for (String skill : requiredSkills) {
            years = parseYearsFromText(skill);
            if (years != null) {
                return years;
            }
        }
        return null;
    }

    private static Integer parseYearsFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher leader = LEADER_YEARS.matcher(text);
        if (leader.find()) {
            return Integer.parseInt(leader.group(1));
        }
        Matcher it = IT_YEARS.matcher(text);
        if (it.find()) {
            return Integer.parseInt(it.group(1));
        }
        return null;
    }

    private static List<String> buildKeywords(
            String workContent,
            String location,
            String industry,
            List<String> requiredSkills,
            List<String> optionalSkills
    ) {
        Set<String> keywords = new LinkedHashSet<>();
        addKeywordTokens(keywords, workContent);
        addKeywordTokens(keywords, location);
        addKeywordTokens(keywords, industry);
        keywords.addAll(requiredSkills);
        keywords.addAll(optionalSkills);
        extractTechKeywords(keywords, workContent);
        for (String skill : requiredSkills) {
            extractTechKeywords(keywords, skill);
        }
        return List.copyOf(keywords);
    }

    private static void extractTechKeywords(Set<String> keywords, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        Pattern tech = Pattern.compile(
                "[A-Za-z][A-Za-z0-9+#./\\s-]{1,40}|[\\p{IsHan}]{2,10}(?:開発|経験|設計|知識)"
        );
        Matcher matcher = tech.matcher(text);
        while (matcher.find()) {
            String token = matcher.group().trim();
            if (token.length() >= 2 && !isStopWord(token)) {
                keywords.add(token);
            }
        }
    }

    private static void addKeywordTokens(Set<String> keywords, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        for (String token : text.split("[\\s、,・\\n/／]+")) {
            String normalized = token.trim();
            if (normalized.length() >= 2 && !isStopWord(normalized)) {
                keywords.add(normalized);
            }
        }
    }

    private static boolean isStopWord(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        return switch (lower) {
            case "の", "に", "を", "で", "と", "や", "等", "など", "実施", "業務", "管理", "開発", "経験" -> true;
            default -> false;
        };
    }

    private record Section(String title, String body) {
    }

    private record PriceRange(Integer minUnitPrice, Integer maxUnitPrice) {
        static PriceRange empty() {
            return new PriceRange(null, null);
        }

        boolean isEmpty() {
            return minUnitPrice == null && maxUnitPrice == null;
        }
    }

    private record ParsedPeriod(String expectedStartDate, String periodNotes) {
    }

    public record ParsedProjectInfo(
            String projectName,
            List<String> requiredSkills,
            List<String> optionalSkills,
            Integer minUnitPrice,
            Integer maxUnitPrice,
            Integer minItYears,
            List<String> keywords,
            String workSummary,
            String workLocation,
            Integer headcountRequired,
            String projectRole,
            String billingPriceLabel,
            boolean skipUnitPriceFilter,
            String interviewRounds,
            String notes,
            String expectedStartDate,
            String periodNotes,
            boolean headcountUnlimited
    ) {
        public static ParsedProjectInfo empty() {
            return new ParsedProjectInfo(
                    "",
                    List.of(),
                    List.of(),
                    null,
                    null,
                    null,
                    List.of(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    false,
                    null,
                    null,
                    null,
                    null,
                    false
            );
        }
    }
}
