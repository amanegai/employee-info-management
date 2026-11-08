package jp.dispatch.employee.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class MasterExcelParser {

    static final String SAMPLE_MARKER = "これは記入例";
    private static final int HEADER_SCAN_ROWS = 15;
    private static final int MAX_DATA_ROWS = 2000;
    private static final DataFormatter FORMATTER = new DataFormatter(Locale.JAPAN);

    public record ParsedRow(int excelRowNumber, Map<String, String> values, boolean sample) {
        boolean isEmpty() {
            return values.values().stream().allMatch(value -> value == null || value.isBlank());
        }

        boolean isSample() {
            if (sample) {
                return true;
            }
            return values.values().stream().anyMatch(value -> value != null && value.contains(SAMPLE_MARKER));
        }

        String get(String header) {
            String value = values.get(header);
            return value == null ? "" : value.trim();
        }
    }

    public record ParsedSheet(String sheetName, List<String> headers, List<ParsedRow> rows) {
    }

    public Workbook openWorkbook(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excelファイルを選択してください");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excelファイル（.xlsx）を指定してください");
        }
        try {
            InputStream in = file.getInputStream();
            return WorkbookFactory.create(in);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excelファイルを読み取れませんでした");
        }
    }

    public ParsedSheet parse(MultipartFile file, String sheetName, List<String> requiredHeaders) {
        try (Workbook workbook = openWorkbook(file)) {
            return parse(workbook, sheetName, requiredHeaders, true);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excelファイルを読み取れませんでした");
        }
    }

    /**
     * @param sheetRequired true のときシート欠如はエラー。false のときは空の ParsedSheet を返す。
     */
    public ParsedSheet parse(
            Workbook workbook,
            String sheetName,
            List<String> requiredHeaders,
            boolean sheetRequired
    ) {
        Sheet sheet = workbook.getSheet(sheetName);
        if (sheet == null) {
            if (!sheetRequired) {
                return new ParsedSheet(sheetName, List.of(), List.of());
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "「" + sheetName + "」シートが見つかりません。正しいテンプレートを使用してください"
            );
        }
        if (requiredHeaders == null || requiredHeaders.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "必須見出しが指定されていません");
        }
        int headerRowIndex = findHeaderRow(sheet, requiredHeaders, sheetName);
        Row headerRow = sheet.getRow(headerRowIndex);
        List<String> headers = readHeaders(headerRow);
        Map<Integer, String> columnHeaders = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            if (!headers.get(i).isBlank()) {
                columnHeaders.put(i, headers.get(i));
            }
        }
        int dataStart = headerRowIndex + 2;
        int lastRow = sheet.getLastRowNum();
        List<ParsedRow> rows = new ArrayList<>();
        for (int r = dataStart; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            Map<String, String> values = new LinkedHashMap<>();
            boolean sample = false;
            short lastCell = row.getLastCellNum();
            for (int i = 0; i < lastCell; i++) {
                String cellValue = readCell(row.getCell(i));
                if (cellValue.contains(SAMPLE_MARKER)) {
                    sample = true;
                }
            }
            for (Map.Entry<Integer, String> entry : columnHeaders.entrySet()) {
                values.put(entry.getValue(), readCell(row.getCell(entry.getKey())));
            }
            ParsedRow parsed = new ParsedRow(r + 1, values, sample);
            if (parsed.isEmpty()) {
                continue;
            }
            rows.add(parsed);
            if (rows.size() > MAX_DATA_ROWS) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "「" + sheetName + "」のデータ行が多すぎます（最大" + MAX_DATA_ROWS + "行）"
                );
            }
        }
        return new ParsedSheet(sheetName, headers, rows);
    }

    static String normalizeHeader(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace('*', ' ')
                .replace("＊", " ")
                .replace('\u3000', ' ')
                .trim();
    }

    private int findHeaderRow(Sheet sheet, List<String> requiredHeaders, String sheetName) {
        for (int r = 0; r < HEADER_SCAN_ROWS; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            List<String> headers = readHeaders(row);
            boolean matched = requiredHeaders.stream().allMatch(headers::contains);
            if (matched) {
                return r;
            }
        }
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "「" + sheetName + "」の見出し行が見つかりません。テンプレートの列名を変更せずに使用してください"
        );
    }

    private List<String> readHeaders(Row row) {
        List<String> headers = new ArrayList<>();
        short last = row.getLastCellNum();
        for (int i = 0; i < last; i++) {
            headers.add(normalizeHeader(readCell(row.getCell(i))));
        }
        return headers;
    }

    private String readCell(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        if (type == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                LocalDate date = cell.getLocalDateTimeCellValue().toLocalDate();
                return date.toString();
            }
            return FORMATTER.formatCellValue(cell).trim();
        }
        return FORMATTER.formatCellValue(cell).trim();
    }
}
