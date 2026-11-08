package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.EmployeeDetailDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.CareerDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.PersonalDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.QualificationDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.TechnicalSkillDto;
import jp.dispatch.employee.model.EmployeeCodeRules;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTPageSetup;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTSheetView;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTWorksheet;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.STSheetViewType;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * 技術者履歴書 Excel を公式テンプレートへ埋めて出力する。
 * テンプレート: classpath:templates/resume/technical-resume.xlsx
 * セル座標は frontend resumeImport.js の読取位置と揃える。
 */
@Service
public class ResumeExcelExportService {

    private static final String TEMPLATE_PATH = "templates/resume/technical-resume.xlsx";
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyy/MM");
    /** 公式テンプレの経歴行高（空白テンプレの 381pt は過大） */
    private static final float CAREER_ROW_HEIGHT_POINTS = 242f;
    private static final DateTimeFormatter CREATED_DATE = DateTimeFormatter.ofPattern("yyyy年M月d日");
    private static final String CAREER_DATE_FORMAT = "yyyy\"年\"m\"月\";@";
    private static final String CAREER_MONTH_FORMAT = "0\"ヶ\"\"月\"";

    private static final int[] ITEM_COLS = {4, 8, 12, 16, 20, 24, 28, 32, 36};
    private static final String[] CAREER_PHASES = {
            "要件定義", "基本設計", "詳細設計", "製造", "単体テスト", "結合テスト", "総合テスト", "保守・運用"
    };
    private static final int[] CAREER_PHASE_COLS = {32, 33, 34, 35, 36, 37, 38, 39};
    /** 経歴データ行の横方向マージ（1-indexed inclusive） */
    private static final int[][] CAREER_ROW_MERGES = {
            {2, 3}, {5, 6}, {7, 8}, {9, 19}, {20, 21}, {23, 24}, {25, 27}, {28, 31}
    };
    private static final int CAREER_FIRST_ROW = 60;
    private static final int REMARKS_TEMPLATE_ROW = 61;

    /**
     * POI/XMLBeans が mc/xr/x14ac 等を ns1/ns2 に書き換えると Excel が修復ダイアログを出すため、
     * 公式テンプレと同じプレフィックスへ戻す。
     */
    private static final Map<String, String> OOXML_URI_TO_PREFIX;
    static {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("http://schemas.openxmlformats.org/markup-compatibility/2006", "mc");
        map.put("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "r");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac", "x14ac");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2009/9/main", "x14");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2010/11/main", "x15");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2014/revision", "xr");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2015/revision2", "xr2");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2016/revision3", "xr3");
        map.put("http://schemas.microsoft.com/office/spreadsheetml/2015/02/main", "x16r2");
        OOXML_URI_TO_PREFIX = Map.copyOf(map);
    }

    private static final Pattern XMLNS_PREFIX = Pattern.compile("xmlns:([A-Za-z0-9_]+)=\"([^\"]+)\"");
    private static final Pattern IGNORABLE_ATTR = Pattern.compile("\\bmc:Ignorable=\"([^\"]*)\"");

    public record ResumeExcelFile(String filename, byte[] content) {
    }

    public ResumeExcelFile export(EmployeeDetailDto detail) {
        ClassPathResource resource = new ClassPathResource(TEMPLATE_PATH);
        try (InputStream in = resource.getInputStream();
             Workbook workbook = new XSSFWorkbook(in);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.getSheetAt(0);
            prepareSheetForDownload(sheet);
            fillSheet(sheet, detail);
            workbook.write(out);
            byte[] sanitized = sanitizeOoxmlForExcel(out.toByteArray());
            return new ResumeExcelFile(buildFilename(detail), sanitized);
        } catch (IOException e) {
            throw new IllegalStateException("履歴書 Excel の生成に失敗しました", e);
        }
    }

    static byte[] sanitizeOoxmlForExcel(byte[] poiBytes) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream(poiBytes.length + 1024);
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(poiBytes));
             ZipOutputStream zos = new ZipOutputStream(bos)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                byte[] data = zis.readAllBytes();
                String name = entry.getName();
                if (needsNamespaceRepair(name)) {
                    data = repairXmlNamespacePrefixes(data);
                }
                ZipEntry outEntry = new ZipEntry(name);
                zos.putNextEntry(outEntry);
                zos.write(data);
                zos.closeEntry();
            }
        }
        return bos.toByteArray();
    }

    private static boolean needsNamespaceRepair(String entryName) {
        return "xl/styles.xml".equals(entryName)
                || "xl/workbook.xml".equals(entryName)
                || (entryName.startsWith("xl/worksheets/") && entryName.endsWith(".xml"));
    }

    private static byte[] repairXmlNamespacePrefixes(byte[] xmlBytes) {
        String xml = new String(xmlBytes, StandardCharsets.UTF_8);
        Matcher matcher = XMLNS_PREFIX.matcher(xml);
        Map<String, String> rename = new LinkedHashMap<>();
        while (matcher.find()) {
            String currentPrefix = matcher.group(1);
            String uri = matcher.group(2);
            String desired = OOXML_URI_TO_PREFIX.get(uri);
            if (desired != null && !desired.equals(currentPrefix)) {
                rename.put(currentPrefix, desired);
            }
        }
        for (Map.Entry<String, String> e : rename.entrySet()) {
            String from = e.getKey();
            String to = e.getValue();
            xml = xml.replace("xmlns:" + from + "=\"", "xmlns:" + to + "=\"");
            xml = xml.replaceAll("(?<![A-Za-z0-9_])" + Pattern.quote(from) + ":", Matcher.quoteReplacement(to) + ":");
        }
        xml = syncIgnorableWithDeclaredPrefixes(xml);
        xml = ensureRequiredNamespaceDeclarations(xml);
        return xml.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * mc:Ignorable に未宣言プレフィックスが残ると Excel が styles/sheet を破棄する。
     * 宣言済みプレフィックスだけに絞り込む。
     */
    private static String syncIgnorableWithDeclaredPrefixes(String xml) {
        Set<String> declared = new HashSet<>();
        Matcher xmlns = XMLNS_PREFIX.matcher(xml);
        while (xmlns.find()) {
            declared.add(xmlns.group(1));
        }
        Matcher ignorable = IGNORABLE_ATTR.matcher(xml);
        if (!ignorable.find()) {
            return xml;
        }
        String[] tokens = ignorable.group(1).trim().isEmpty()
                ? new String[0]
                : ignorable.group(1).trim().split("\\s+");
        StringBuilder kept = new StringBuilder();
        for (String token : tokens) {
            if (declared.contains(token)) {
                if (!kept.isEmpty()) {
                    kept.append(' ');
                }
                kept.append(token);
            }
        }
        String replacement = kept.isEmpty() ? "" : "mc:Ignorable=\"" + kept + "\"";
        return IGNORABLE_ATTR.matcher(xml).replaceFirst(Matcher.quoteReplacement(replacement));
    }

    /** xr:uid 等で必要な xmlns が POI により落ちた場合に補完する */
    private static String ensureRequiredNamespaceDeclarations(String xml) {
        if (xml.contains("xr:uid=") && !xml.contains("xmlns:xr=\"")) {
            xml = injectXmlns(xml, "xr", "http://schemas.microsoft.com/office/spreadsheetml/2014/revision");
        }
        if ((xml.contains(" r:") || xml.contains("<r:") || xml.contains(" r=\""))
                && xml.contains("<worksheet")
                && !xml.contains("xmlns:r=\"")) {
            xml = injectXmlns(xml, "r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships");
        }
        return xml;
    }

    private static String injectXmlns(String xml, String prefix, String uri) {
        int worksheet = xml.indexOf("<worksheet");
        int styleSheet = xml.indexOf("<styleSheet");
        int rootStart = worksheet >= 0 ? worksheet : styleSheet;
        if (rootStart < 0) {
            return xml;
        }
        int rootEnd = xml.indexOf('>', rootStart);
        if (rootEnd < 0) {
            return xml;
        }
        String decl = " xmlns:" + prefix + "=\"" + uri + "\"";
        return xml.substring(0, rootEnd) + decl + xml.substring(rootEnd);
    }

    /**
     * 印刷プレビュー／プリンタ接続ダイアログを避けるため、通常表示に戻しプリンタ設定参照を外す。
     */
    private static void prepareSheetForDownload(Sheet sheet) {
        if (!(sheet instanceof XSSFSheet xssfSheet)) {
            return;
        }
        CTWorksheet ct = xssfSheet.getCTWorksheet();
        if (ct.isSetSheetViews()) {
            for (CTSheetView view : ct.getSheetViews().getSheetViewArray()) {
                view.setView(STSheetViewType.NORMAL);
            }
        }
        if (ct.isSetPageSetup()) {
            CTPageSetup pageSetup = ct.getPageSetup();
            if (pageSetup.isSetId()) {
                pageSetup.unsetId();
            }
        }
    }

    private void fillSheet(Sheet sheet, EmployeeDetailDto detail) {
        PersonalDto p = detail.personal();

        setCreatedDate(sheet, LocalDate.now(ZONE));

        setValue(sheet, 3, 4, text(p != null ? p.furigana() : null));
        setValue(sheet, 4, 4, text(detail.name()));
        setValue(sheet, 4, 8, text(p != null ? p.gender() : null));
        setValue(sheet, 4, 10, text(p != null ? p.nationality() : null));
        setValue(sheet, 4, 12, formatAge(p));
        setValue(sheet, 4, 14, text(p != null ? p.maritalStatus() : null));
        setValue(sheet, 4, 16, text(p != null ? p.nearestStation() : null));
        setValue(sheet, 4, 25, formatItYears(p));
        setValue(sheet, 4, 32, formatYearMonth(p != null ? p.japanArrivalDate() : null));
        setValue(sheet, 4, 35, formatStayYears(p != null ? p.japanArrivalDate() : null));

        setValue(sheet, 5, 4, text(p != null ? p.educationDegree() : null));
        setValue(sheet, 5, 12, text(p != null ? p.schoolName() : null));
        setValue(sheet, 5, 25, text(p != null ? p.major() : null));
        setValue(sheet, 6, 4, formatQualifications(detail.qualifications()));

        setValue(sheet, 10, 4, text(p != null ? firstNonBlank(p.japaneseConversation(), p.japaneseLevel()) : null));
        setValue(sheet, 10, 9, text(p != null ? p.japaneseReading() : null));
        setValue(sheet, 10, 14, text(p != null ? p.japaneseWriting() : null));
        setValue(sheet, 11, 4, text(p != null ? firstNonBlank(p.englishConversation(), p.englishLevel()) : null));
        setValue(sheet, 11, 9, text(p != null ? p.englishReading() : null));
        setValue(sheet, 11, 14, text(p != null ? p.englishWriting() : null));

        writeSkillLevels(sheet, detail.technicalSkills());

        setValue(sheet, 50, 4, text(p != null ? p.specialtyDev() : null));
        setValue(sheet, 51, 4, text(p != null ? p.specialtyBusiness() : null));
        setValue(sheet, 52, 4, text(p != null ? p.selfPr() : null));

        writeCareers(sheet, detail.careers());
    }

    private void writeSkillLevels(Sheet sheet, List<TechnicalSkillDto> skills) {
        Map<String, String> byItem = toSkillItemMap(skills);
        for (int row = 14; row <= 48; row++) {
            for (int col : ITEM_COLS) {
                String itemName = getString(sheet, row, col);
                if (itemName.isEmpty() || itemName.startsWith("「")) {
                    continue;
                }
                String level = lookupSkillLevel(byItem, itemName);
                if (!level.isEmpty()) {
                    setValue(sheet, row + 1, col, level);
                }
            }
        }
    }

    private void writeCareers(Sheet sheet, List<CareerDto> careers) {
        List<CareerDto> list = sortCareersOldestFirst(careers);
        Row templateRow = sheet.getRow(CAREER_FIRST_ROW - 1);
        if (templateRow != null) {
            templateRow.setHeightInPoints(CAREER_ROW_HEIGHT_POINTS);
        }
        clearCareerPlaceholder(sheet);

        if (list.isEmpty()) {
            return;
        }

        if (list.size() > 1) {
            int shiftStart = REMARKS_TEMPLATE_ROW - 1; // 0-based 備考行
            int last = Math.max(sheet.getLastRowNum(), shiftStart);
            removeMergesTouchingRow(sheet, shiftStart);
            sheet.shiftRows(shiftStart, last, list.size() - 1, true, false);
            for (int i = 1; i < list.size(); i++) {
                int row1 = CAREER_FIRST_ROW + i;
                copyCareerRowSkeleton(sheet, templateRow, row1);
                ensureCareerRowMerges(sheet, row1);
            }
        }

        int index = 1;
        for (CareerDto career : list) {
            writeCareerRow(sheet, CAREER_FIRST_ROW + index - 1, index, career);
            index++;
        }

        int remarksRow = CAREER_FIRST_ROW + list.size();
        setValue(sheet, remarksRow, 1, "備考");
        ensureRemarksMerge(sheet, remarksRow);
    }

    private static List<CareerDto> sortCareersOldestFirst(List<CareerDto> careers) {
        if (careers == null || careers.isEmpty()) {
            return List.of();
        }
        List<CareerDto> list = new ArrayList<>(careers);
        list.sort(Comparator.comparing(
                (CareerDto c) -> parseDate(c == null ? null : c.startDate()),
                Comparator.nullsLast(Comparator.naturalOrder())
        ));
        return list;
    }

    private void clearCareerPlaceholder(Sheet sheet) {
        blankCell(sheet, CAREER_FIRST_ROW, 1);
        blankCell(sheet, CAREER_FIRST_ROW, 2);
        blankCell(sheet, CAREER_FIRST_ROW, 5);
        blankCell(sheet, CAREER_FIRST_ROW, 7);
        blankCell(sheet, CAREER_FIRST_ROW, 9);
        blankCell(sheet, CAREER_FIRST_ROW, 20);
        blankCell(sheet, CAREER_FIRST_ROW, 22);
        blankCell(sheet, CAREER_FIRST_ROW, 23);
        blankCell(sheet, CAREER_FIRST_ROW, 25);
        blankCell(sheet, CAREER_FIRST_ROW, 28);
        for (int col : CAREER_PHASE_COLS) {
            blankCell(sheet, CAREER_FIRST_ROW, col);
        }
    }

    private static void copyCareerRowSkeleton(Sheet sheet, Row templateRow, int row1) {
        Row row = sheet.getRow(row1 - 1);
        if (row == null) {
            row = sheet.createRow(row1 - 1);
        }
        row.setHeightInPoints(CAREER_ROW_HEIGHT_POINTS);
        if (templateRow == null) {
            return;
        }
        for (int c = 0; c < 39; c++) {
            Cell src = templateRow.getCell(c);
            Cell dst = row.getCell(c);
            if (dst == null) {
                dst = row.createCell(c);
            }
            if (src != null) {
                dst.setCellStyle(src.getCellStyle());
            }
            dst.setBlank();
        }
    }

    private void writeCareerRow(Sheet sheet, int row1, int index, CareerDto career) {
        ensureCareerRowMerges(sheet, row1);
        Row row = sheet.getRow(row1 - 1);
        if (row != null) {
            row.setHeightInPoints(CAREER_ROW_HEIGHT_POINTS);
        }

        Cell indexCell = ensureCell(sheet, row1, 1);
        indexCell.setCellValue(index);

        LocalDate start = parseDate(career.startDate());
        LocalDate end = parseDate(career.endDate());
        setCareerDate(sheet, row1, 2, start);
        setValue(sheet, row1, 4, "-"); // 期間の開始〜終了の区切り（D列）
        setCareerDate(sheet, row1, 5, end);
        setCareerMonths(sheet, row1, start, end, career.months());

        setValue(sheet, row1, 9, normalizeMultiline(career.roleOverview()));
        setValue(sheet, row1, 20, text(career.workplace()));
        setValue(sheet, row1, 22, text(career.role()));
        setValue(sheet, row1, 23, normalizeMultiline(career.osDb()));
        setValue(sheet, row1, 25, normalizeMultiline(career.languages()));
        setValue(sheet, row1, 28, normalizeMultiline(career.fwTools()));
        writeCareerPhases(sheet, row1, career.phases());
    }

    private static void setCreatedDate(Sheet sheet, LocalDate date) {
        // 文字列で書き、テンプレの表示形式(@)と衝突して壊れるのを避ける
        setValue(sheet, 2, 36, date.format(CREATED_DATE));
    }

    private static void setCareerDate(Sheet sheet, int row1, int col1, LocalDate date) {
        Cell cell = ensureCell(sheet, row1, col1);
        if (date == null) {
            cell.setBlank();
            return;
        }
        cell.setCellValue(java.util.Date.from(date.atStartOfDay(ZONE).toInstant()));
        applyDataFormat(cell, CAREER_DATE_FORMAT);
    }

    private static void setCareerMonths(
            Sheet sheet, int row1, LocalDate start, LocalDate end, Integer monthsFallback
    ) {
        Cell cell = ensureCell(sheet, row1, 7);
        if (start != null && end != null) {
            cell.setCellFormula(String.format(
                    Locale.ROOT,
                    "(YEAR(E%d)-YEAR(B%d))*12+MONTH(E%d)-MONTH(B%d)+1",
                    row1, row1, row1, row1
            ));
        } else if (monthsFallback != null) {
            cell.setCellValue(monthsFallback.doubleValue());
        } else {
            cell.setBlank();
            return;
        }
        applyDataFormat(cell, CAREER_MONTH_FORMAT);
    }

    private static void applyDataFormat(Cell cell, String format) {
        Workbook workbook = cell.getSheet().getWorkbook();
        CellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(cell.getCellStyle());
        style.setDataFormat(workbook.createDataFormat().getFormat(format));
        cell.setCellStyle(style);
    }

    private static void blankCell(Sheet sheet, int row1, int col1) {
        ensureCell(sheet, row1, col1).setBlank();
    }

    private static String normalizeMultiline(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').trim();
    }

    private void writeCareerPhases(Sheet sheet, int row1, String phasesCsv) {
        Set<String> phases = new HashSet<>();
        if (phasesCsv != null && !phasesCsv.isBlank()) {
            for (String part : phasesCsv.split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    phases.add(trimmed);
                }
            }
        }
        for (int i = 0; i < CAREER_PHASES.length; i++) {
            setValue(sheet, row1, CAREER_PHASE_COLS[i], phases.contains(CAREER_PHASES[i]) ? "●" : "");
        }
    }

    private static void ensureCareerRowMerges(Sheet sheet, int row1) {
        int r0 = row1 - 1;
        for (int[] pair : CAREER_ROW_MERGES) {
            CellRangeAddress region = new CellRangeAddress(r0, r0, pair[0] - 1, pair[1] - 1);
            if (!containsMerge(sheet, region)) {
                sheet.addMergedRegion(region);
            }
        }
    }

    private static void ensureRemarksMerge(Sheet sheet, int row1) {
        int r0 = row1 - 1;
        CellRangeAddress region = new CellRangeAddress(r0, r0, 1, 38);
        if (!containsMerge(sheet, region)) {
            // 既存の部分マージを除去してから追加
            removeMergesTouchingRow(sheet, r0);
            sheet.addMergedRegion(region);
            setValue(sheet, row1, 1, "備考");
        }
    }

    private static void removeMergesTouchingRow(Sheet sheet, int row0) {
        for (int i = sheet.getNumMergedRegions() - 1; i >= 0; i--) {
            CellRangeAddress region = sheet.getMergedRegion(i);
            if (region.getFirstRow() <= row0 && region.getLastRow() >= row0) {
                sheet.removeMergedRegion(i);
            }
        }
    }

    private static boolean containsMerge(Sheet sheet, CellRangeAddress target) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress region = sheet.getMergedRegion(i);
            if (region.getFirstRow() == target.getFirstRow()
                    && region.getLastRow() == target.getLastRow()
                    && region.getFirstColumn() == target.getFirstColumn()
                    && region.getLastColumn() == target.getLastColumn()) {
                return true;
            }
        }
        return false;
    }

    private static Map<String, String> toSkillItemMap(List<TechnicalSkillDto> skills) {
        Map<String, String> map = new HashMap<>();
        if (skills == null) {
            return map;
        }
        for (TechnicalSkillDto skill : skills) {
            if (skill == null || isBlank(skill.itemName()) || isBlank(skill.level())) {
                continue;
            }
            map.put(normalizeLabel(skill.itemName()), skill.level().trim());
        }
        return map;
    }

    private static String lookupSkillLevel(Map<String, String> byItem, String templateItemName) {
        String normalized = normalizeLabel(templateItemName);
        String level = byItem.get(normalized);
        if (level != null) {
            return level;
        }
        // 表記ゆれ
        if (normalized.contains("swift") || normalized.startsWith("swi")) {
            level = firstPresent(byItem, "swift", "swiｆｔ");
            if (level != null) {
                return level;
            }
        }
        if (normalized.contains("linix") || normalized.contains("linuxunix")) {
            level = firstPresent(byItem, "linuxunixコマンド", "linixunixコマンド");
            if (level != null) {
                return level;
            }
        }
        if (normalized.contains("bse")) {
            level = firstPresent(byItem, "bse経験", "bse常駐");
            if (level != null) {
                return level;
            }
        }
        return "";
    }

    private static String firstPresent(Map<String, String> map, String... keys) {
        for (String key : keys) {
            String value = map.get(normalizeLabel(key));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String normalizeLabel(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r", "")
                .replace("\n", "")
                .replace(" ", "")
                .replace("　", "")
                .toLowerCase(Locale.ROOT);
    }

    private static String formatQualifications(List<QualificationDto> qualifications) {
        if (qualifications == null || qualifications.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (QualificationDto q : qualifications) {
            if (q == null || isBlank(q.description())) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append('\n');
            }
            sb.append(q.description().trim());
        }
        return sb.toString();
    }

    private static String formatAge(PersonalDto p) {
        if (p == null) {
            return "";
        }
        if (p.age() != null) {
            return p.age() + "歳";
        }
        LocalDate birth = parseDate(p.birthDate());
        if (birth == null) {
            return "";
        }
        return Period.between(birth, LocalDate.now(ZONE)).getYears() + "歳";
    }

    private static String formatItYears(PersonalDto p) {
        if (p == null || p.itIndustryYears() == null) {
            return "";
        }
        return p.itIndustryYears() + "年";
    }

    private static String formatStayYears(String arrival) {
        LocalDate date = parseDate(arrival);
        if (date == null) {
            return "";
        }
        Period period = Period.between(date, LocalDate.now(ZONE));
        return Math.max(0, period.getYears()) + "年" + Math.max(0, period.getMonths()) + "ヶ月";
    }

    private static String formatYearMonth(String raw) {
        LocalDate date = parseDate(raw);
        if (date == null) {
            return text(raw);
        }
        return date.format(YM);
    }

    private static LocalDate parseDate(String raw) {
        if (isBlank(raw)) {
            return null;
        }
        String text = raw.trim();
        try {
            if (text.length() >= 10 && text.charAt(4) == '-') {
                return LocalDate.parse(text.substring(0, 10));
            }
            if (text.length() >= 7 && text.charAt(4) == '-') {
                return LocalDate.parse(text.substring(0, 7) + "-01");
            }
            if (text.length() >= 7 && text.charAt(4) == '/') {
                String normalized = text.replace('/', '-');
                if (normalized.length() >= 10) {
                    return LocalDate.parse(normalized.substring(0, 10));
                }
                return LocalDate.parse(normalized.substring(0, 7) + "-01");
            }
        } catch (DateTimeParseException ignored) {
            return null;
        }
        return null;
    }

    static String buildFilename(EmployeeDetailDto detail) {
        String abbr = EmployeeCodeRules.requiredPrefix(detail.affiliationCompany()).toUpperCase(Locale.ROOT);
        String name = sanitizeNameForFilename(detail.name());
        if (!name.isEmpty()) {
            return "【" + abbr + "】技術者履歴書_" + name + ".xlsx";
        }
        return "【" + abbr + "】技術者履歴書.xlsx";
    }

    private static String sanitizeNameForFilename(String name) {
        if (name == null) {
            return "";
        }
        return name.trim()
                .replaceAll("[\\s　]+", "")
                .replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private static void setValue(Sheet sheet, int row1, int col1, String value) {
        Cell cell = ensureCell(sheet, row1, col1);
        cell.setCellValue(value == null ? "" : value);
    }

    private static void setValue(Sheet sheet, int row1, int col1, LocalDate date) {
        Cell cell = ensureCell(sheet, row1, col1);
        if (date == null) {
            cell.setBlank();
            return;
        }
        cell.setCellValue(java.util.Date.from(date.atStartOfDay(ZONE).toInstant()));
    }

    private static Cell ensureCell(Sheet sheet, int row1, int col1) {
        Row row = sheet.getRow(row1 - 1);
        if (row == null) {
            row = sheet.createRow(row1 - 1);
        }
        Cell cell = row.getCell(col1 - 1);
        if (cell == null) {
            cell = row.createCell(col1 - 1);
        }
        return cell;
    }

    private static String getString(Sheet sheet, int row1, int col1) {
        Row row = sheet.getRow(row1 - 1);
        if (row == null) {
            return "";
        }
        Cell cell = row.getCell(col1 - 1);
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> text(cell.getStringCellValue());
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? ""
                    : String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield text(cell.getStringCellValue());
                } catch (Exception e) {
                    yield "";
                }
            }
            default -> "";
        };
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }

    private static String firstNonBlank(String first, String second) {
        if (!isBlank(first)) {
            return first.trim();
        }
        if (!isBlank(second)) {
            return second.trim();
        }
        return "";
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
