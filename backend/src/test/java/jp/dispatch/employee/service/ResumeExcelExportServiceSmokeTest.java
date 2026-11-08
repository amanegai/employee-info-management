package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.EmployeeDetailDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.CareerDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.PersonalDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.QualificationDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.TechnicalSkillDto;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.STSheetViewType;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResumeExcelExportServiceSmokeTest {

    @Test
    void exportsFromOfficialTemplateWithCompanyFilename() throws Exception {
        PersonalDto personal = new PersonalDto(
                "女", "1990/01/15", 35, null, "中国", false,
                null, null, null, null,
                "090-0000-0000", "taro@example.com", "東京都",
                "大学卒", "蓮根駅", null, "ソ　ケン", "未婚",
                5, "2019/11/01", "大学", "北京体育大学", "応用心理学",
                "N1", "B", "◎", "◎",
                "D", "D", "△", "△",
                "上級", "Java、PHP", "人事、物流", "自己PR"
        );
        EmployeeDetailDto detail = new EmployeeDetailDto(
                1L, "btcS00001", "蘇　娟", 1L, "開発部", "ビットクロス",
                "SE", "PG", "正社員", "稼働中", 0, null, null,
                personal,
                List.of(),
                List.of(new TechnicalSkillDto("OS", "Windows", "◎"),
                        new TechnicalSkillDto("開発言語", "Java", "◎")),
                List.of(new QualificationDto("日本語能力試験1級（N1）")),
                List.of(
                        new CareerDto(
                                "2024/04〜2025/03", "○○株式会社", "新しい案件\r\n詳細",
                                "2024/04/01", "2025/03/31", 12,
                                "日本", "PG", "Windows/PostgreSQL", "Java", "Spring",
                                "詳細設計,製造,単体テスト"
                        ),
                        new CareerDto(
                                "2020/04〜2021/03", "△△株式会社", "古い案件",
                                "2020/04/01", "2021/03/31", 12,
                                "日本", "PG", "Windows/Oracle", "Java", "Struts",
                                "製造"
                        )
                ),
                null, null, null, List.of(), null, null, null, List.of(), null, false,
                1, null, null
        );

        ResumeExcelExportService.ResumeExcelFile file = new ResumeExcelExportService().export(detail);
        assertEquals("【BTC】技術者履歴書_蘇娟.xlsx", file.filename());

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file.content()))) {
            Sheet sheet = wb.getSheetAt(0);
            XSSFSheet xssfSheet = (XSSFSheet) sheet;
            assertEquals(
                    STSheetViewType.NORMAL,
                    xssfSheet.getCTWorksheet().getSheetViews().getSheetViewArray(0).getView()
            );
            assertFalse(xssfSheet.getCTWorksheet().getPageSetup().isSetId());

            assertEquals("蘇　娟", sheet.getRow(3).getCell(3).getStringCellValue());
            assertEquals("◎", sheet.getRow(14).getCell(3).getStringCellValue());
            assertTrue(sheet.getRow(1).getCell(35).getStringCellValue().contains("年"));
            assertEquals(CellType.STRING, sheet.getRow(1).getCell(35).getCellType());

            Row firstCareer = sheet.getRow(59);
            assertEquals(242f, firstCareer.getHeightInPoints(), 0.1);
            assertEquals(1.0, firstCareer.getCell(0).getNumericCellValue(), 0.001);
            assertEquals(CellType.NUMERIC, firstCareer.getCell(1).getCellType());
            assertTrue(firstCareer.getCell(1).getLocalDateTimeCellValue().getYear() == 2020);
            assertEquals("-", firstCareer.getCell(3).getStringCellValue());
            assertEquals(CellType.FORMULA, firstCareer.getCell(6).getCellType());
            assertTrue(firstCareer.getCell(6).getCellFormula().contains("YEAR"));
            assertEquals("古い案件", firstCareer.getCell(8).getStringCellValue());

            Row secondCareer = sheet.getRow(60);
            assertEquals(242f, secondCareer.getHeightInPoints(), 0.1);
            assertTrue(secondCareer.getCell(8).getStringCellValue().contains("新しい案件\n詳細"));
            assertTrue(!secondCareer.getCell(8).getStringCellValue().contains("\r"));
            assertTrue(sheet.getNumMergedRegions() > 100);
        }

        assertValidOoxmlParts(file.content());
    }

    private static void assertValidOoxmlParts(byte[] content) throws Exception {
        boolean sawStyles = false;
        boolean sawSheet = false;
        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                String name = entry.getName();
                if ("xl/styles.xml".equals(name) || "xl/worksheets/sheet1.xml".equals(name)) {
                    byte[] bytes = zin.readAllBytes();
                    String xml = new String(bytes, StandardCharsets.UTF_8);
                    assertTrue(xml.contains("<?xml"), name + " missing xml declaration");
                    assertFalse(xml.contains("ns1:Ignorable"), name + " still has POI ns1:Ignorable");
                    assertFalse(hasUndeclaredIgnorablePrefix(xml), name + " has undeclared mc:Ignorable prefix");
                    if (name.endsWith("styles.xml")) {
                        sawStyles = true;
                        assertTrue(xml.contains("<styleSheet"), "styles root missing");
                        assertTrue(xml.contains("xmlns:x14ac="), "styles missing x14ac");
                    } else {
                        sawSheet = true;
                        assertTrue(xml.contains("<worksheet"), "sheet root missing");
                        assertTrue(xml.contains("xr:uid="), "sheet missing xr:uid");
                        assertTrue(xml.contains("xmlns:xr="), "sheet missing xmlns:xr");
                    }
                }
            }
        }
        assertTrue(sawStyles && sawSheet, "expected styles.xml and sheet1.xml");
    }

    private static boolean hasUndeclaredIgnorablePrefix(String xml) {
        java.util.Set<String> declared = new java.util.HashSet<>();
        java.util.regex.Matcher xmlns = java.util.regex.Pattern
                .compile("xmlns:([A-Za-z0-9_]+)=\"")
                .matcher(xml);
        while (xmlns.find()) {
            declared.add(xmlns.group(1));
        }
        java.util.regex.Matcher ign = java.util.regex.Pattern
                .compile("\\bmc:Ignorable=\"([^\"]*)\"")
                .matcher(xml);
        if (!ign.find()) {
            return false;
        }
        String value = ign.group(1).trim();
        if (value.isEmpty()) {
            return false;
        }
        for (String token : value.split("\\s+")) {
            if (!declared.contains(token)) {
                return true;
            }
        }
        return false;
    }
}
