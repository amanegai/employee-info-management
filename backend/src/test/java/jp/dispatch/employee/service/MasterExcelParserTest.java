package jp.dispatch.employee.service;

import jp.dispatch.employee.service.MasterExcelParser.ParsedSheet;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MasterExcelParserTest {

    private final MasterExcelParser parser = new MasterExcelParser();

    @Test
    void parsesTemplateLayoutAndSkipsEmptyRows() throws Exception {
        byte[] bytes = workbook("社員", (sheet) -> {
            sheet.createRow(0).createCell(0).setCellValue("タイトル");
            Row group = sheet.createRow(1);
            group.createCell(0).setCellValue("所属・身分");
            Row header = sheet.createRow(2);
            header.createCell(0).setCellValue("社員ID*");
            header.createCell(1).setCellValue("社員名*");
            header.createCell(2).setCellValue("稼働状況*");
            header.createCell(3).setCellValue("社員種別*");
            header.createCell(4).setCellValue("所属部門*");
            Row hint = sheet.createRow(3);
            hint.createCell(0).setCellValue("必須");
            Row sample = sheet.createRow(4);
            sample.createCell(0).setCellValue("btcS00001");
            sample.createCell(1).setCellValue("山田 太郎");
            sample.createCell(2).setCellValue("待機中");
            sample.createCell(3).setCellValue("正社員");
            sample.createCell(4).setCellValue("営業部");
            sample.createCell(5).setCellValue("※これは記入例です。");
            Row data = sheet.createRow(5);
            data.createCell(0).setCellValue("btcK00002");
            data.createCell(1).setCellValue("佐藤 花子");
            data.createCell(2).setCellValue("稼働中");
            data.createCell(3).setCellValue("契約社員");
            data.createCell(4).setCellValue("人事部");
            sheet.createRow(6);
        });

        ParsedSheet parsed = parser.parse(xlsx(bytes), "社員", List.of("社員ID", "社員名", "稼働状況", "社員種別", "所属部門"));
        assertEquals(2, parsed.rows().size());
        assertTrue(parsed.rows().getFirst().isSample());
        assertEquals("佐藤 花子", parsed.rows().get(1).get("社員名"));
        assertEquals(6, parsed.rows().get(1).excelRowNumber());
    }

    @Test
    void parsesRequiredChildSheetsTogether() throws Exception {
        byte[] bytes;
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet employees = workbook.createSheet("社員");
            Row header = employees.createRow(2);
            header.createCell(0).setCellValue("社員ID*");
            header.createCell(1).setCellValue("社員名*");
            header.createCell(2).setCellValue("稼働状況*");
            header.createCell(3).setCellValue("社員種別*");
            header.createCell(4).setCellValue("所属部門*");
            employees.createRow(3);
            Row sample = employees.createRow(4);
            sample.createCell(0).setCellValue("btcS00001");
            sample.createCell(5).setCellValue("※これは記入例です。");
            Row data = employees.createRow(5);
            data.createCell(0).setCellValue("btcS00002");
            data.createCell(1).setCellValue("佐藤");
            data.createCell(2).setCellValue("待機中");
            data.createCell(3).setCellValue("正社員");
            data.createCell(4).setCellValue("営業部");

            Sheet qualifications = workbook.createSheet("保有資格");
            Row qHeader = qualifications.createRow(2);
            qHeader.createCell(0).setCellValue("社員ID*");
            qHeader.createCell(1).setCellValue("資格内容*");
            qualifications.createRow(3);
            Row qSample = qualifications.createRow(4);
            qSample.createCell(0).setCellValue("btcS00001");
            qSample.createCell(1).setCellValue("※これは記入例です。");
            Row qData = qualifications.createRow(5);
            qData.createCell(0).setCellValue("btcS00002");
            qData.createCell(1).setCellValue("基本情報技術者");

            Sheet technical = workbook.createSheet("関連技術");
            Row tHeader = technical.createRow(2);
            tHeader.createCell(0).setCellValue("社員ID*");
            tHeader.createCell(1).setCellValue("カテゴリ*");
            tHeader.createCell(2).setCellValue("項目名*");
            tHeader.createCell(3).setCellValue("レベル*");
            technical.createRow(3);
            Row tSample = technical.createRow(4);
            tSample.createCell(0).setCellValue("btcS00001");
            tSample.createCell(4).setCellValue("※これは記入例です。");

            Sheet careers = workbook.createSheet("職務経歴");
            Row cHeader = careers.createRow(2);
            cHeader.createCell(0).setCellValue("社員ID*");
            careers.createRow(3);
            Row cSample = careers.createRow(4);
            cSample.createCell(0).setCellValue("btcS00001");
            cSample.createCell(1).setCellValue("※これは記入例です。");

            workbook.write(out);
            bytes = out.toByteArray();
        }

        try (var workbook = parser.openWorkbook(xlsx(bytes))) {
            ParsedSheet employees = parser.parse(
                    workbook, "社員", List.of("社員ID", "社員名", "稼働状況", "社員種別", "所属部門"), true
            );
            ParsedSheet qualifications = parser.parse(
                    workbook, "保有資格", List.of("社員ID", "資格内容"), true
            );
            ParsedSheet technical = parser.parse(
                    workbook, "関連技術", List.of("社員ID", "カテゴリ", "項目名", "レベル"), true
            );
            ParsedSheet careers = parser.parse(workbook, "職務経歴", List.of("社員ID"), true);

            assertEquals(2, employees.rows().size());
            assertEquals(2, qualifications.rows().size());
            assertTrue(qualifications.rows().getFirst().isSample());
            assertEquals("基本情報技術者", qualifications.rows().get(1).get("資格内容"));
            assertEquals(1, technical.rows().size());
            assertTrue(technical.rows().getFirst().isSample());
            assertEquals(1, careers.rows().size());
            assertTrue(careers.rows().getFirst().isSample());
        }
    }

    @Test
    void rejectsMissingRequiredChildSheet() throws Exception {
        byte[] bytes = workbook("社員", (sheet) -> {
            Row header = sheet.createRow(2);
            header.createCell(0).setCellValue("社員ID*");
            header.createCell(1).setCellValue("社員名*");
            header.createCell(2).setCellValue("稼働状況*");
            header.createCell(3).setCellValue("社員種別*");
            header.createCell(4).setCellValue("所属部門*");
        });

        try (var workbook = parser.openWorkbook(xlsx(bytes))) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                    parser.parse(workbook, "保有資格", List.of("社員ID", "資格内容"), true));
            assertTrue(ex.getReason() != null && ex.getReason().contains("保有資格"));
        }
    }

    @Test
    void rejectsMissingSheet() throws Exception {
        byte[] bytes = workbook("別シート", (sheet) -> sheet.createRow(0).createCell(0).setCellValue("x"));
        assertThrows(ResponseStatusException.class, () ->
                parser.parse(xlsx(bytes), "社員", List.of("社員ID", "社員名", "稼働状況", "社員種別", "所属部門")));
    }

    @FunctionalInterface
    private interface SheetWriter {
        void write(Sheet sheet);
    }

    private static byte[] workbook(String sheetName, SheetWriter writer) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);
            writer.write(sheet);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static MockMultipartFile xlsx(byte[] bytes) {
        return new MockMultipartFile(
                "file",
                "template.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                bytes
        );
    }
}
