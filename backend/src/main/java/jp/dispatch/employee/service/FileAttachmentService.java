package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.FileAttachmentDto;
import jp.dispatch.employee.dto.FileBatchUploadResultDto;
import jp.dispatch.employee.dto.ExpenseApplicationUpdateItem;
import jp.dispatch.employee.dto.FileBatchUploadResultDto.AttendanceSyncResultDto;
import jp.dispatch.employee.dto.FileBatchUploadResultDto.ExpenseSyncResultDto;
import jp.dispatch.employee.dto.FileBatchUploadResultDto.BatchFileFailureDto;
import jp.dispatch.employee.dto.TimesheetAttendanceUpdateItem;
import jp.dispatch.employee.repository.FileAttachmentRepository;
import jp.dispatch.employee.repository.FileAttachmentRepository.FileAttachmentRecord;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class FileAttachmentService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final FileAttachmentRepository repository;
    private final FileStorageService storageService;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;
    private final TimesheetAttendanceSyncService timesheetAttendanceSyncService;
    private final ExpenseApplicationSyncService expenseApplicationSyncService;
    private final ObjectMapper objectMapper;
    private final long maxFileSizeBytes;

    public FileAttachmentService(
            FileAttachmentRepository repository,
            FileStorageService storageService,
            SecurityService securityService,
            AuditLogService auditLogService,
            TimesheetAttendanceSyncService timesheetAttendanceSyncService,
            ExpenseApplicationSyncService expenseApplicationSyncService,
            ObjectMapper objectMapper,
            @Value("${app.files.max-size-bytes:52428800}") long maxFileSizeBytes
    ) {
        this.repository = repository;
        this.storageService = storageService;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
        this.timesheetAttendanceSyncService = timesheetAttendanceSyncService;
        this.expenseApplicationSyncService = expenseApplicationSyncService;
        this.objectMapper = objectMapper;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public List<String> categories() {
        requireViewFilePermission();
        return FileCategoryData.CATEGORIES;
    }

    public List<FileAttachmentDto> search(String keyword, String category, String targetMonth) {
        requireViewFilePermission();
        String normalizedCategory = FileCategoryData.normalizeCategory(category);
        if (category != null && !category.isBlank() && normalizedCategory == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイル分類が不正です");
        }
        String normalizedTargetMonth = FileCategoryData.normalizeTargetMonth(targetMonth);
        if (targetMonth != null && !targetMonth.isBlank() && normalizedTargetMonth == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象年月は YYYY-MM 形式で指定してください");
        }
        return repository.search(keyword, normalizedCategory, normalizedTargetMonth);
    }

    public FileAttachmentDto upload(
            MultipartFile file,
            String description,
            String category,
            String targetMonth,
            Long employeeId
    ) {
        requireWriteFilePermission();
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルが選択されていません");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルサイズが上限を超えています");
        }

        String normalizedCategory = FileCategoryData.normalizeCategory(category);
        if (category != null && !category.isBlank() && normalizedCategory == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイル分類が不正です");
        }
        String normalizedTargetMonth = FileCategoryData.normalizeTargetMonth(targetMonth);
        if (targetMonth != null && !targetMonth.isBlank() && normalizedTargetMonth == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象年月は YYYY-MM 形式で指定してください");
        }

        AppUserDetails user = securityService.currentUser();
        String originalName = FileStorageService.sanitizeOriginalName(file.getOriginalFilename());
        String storagePath;
        try {
            storagePath = storageService.store(file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ファイルの保存に失敗しました");
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        String createdAt = LocalDateTime.now(ZONE).format(TIMESTAMP);
        long id = repository.insert(
                originalName,
                contentType,
                file.getSize(),
                storagePath,
                normalizeDescription(description),
                normalizedCategory,
                normalizedTargetMonth,
                employeeId,
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : "system",
                createdAt
        );

        auditLogService.log(
                AuditAction.FILE_UPLOAD,
                "file_attachment",
                String.valueOf(id),
                originalName
        );

        return repository.findActiveById(id)
                .map(FileAttachmentRecord::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "登録したファイルの取得に失敗しました"));
    }

    public FileBatchUploadResultDto batchUpload(
            List<MultipartFile> files,
            String description,
            String category,
            String targetMonth,
            boolean syncAttendance,
            String attendanceUpdatesJson,
            boolean syncExpense,
            String expenseUpdatesJson
    ) {
        requireWriteFilePermission();
        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルが選択されていません");
        }

        String normalizedCategory = FileCategoryData.normalizeCategory(category);
        if (category != null && !category.isBlank() && normalizedCategory == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイル分類が不正です");
        }
        String normalizedTargetMonth = FileCategoryData.normalizeTargetMonth(targetMonth);
        if (targetMonth != null && !targetMonth.isBlank() && normalizedTargetMonth == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象年月は YYYY-MM 形式で指定してください");
        }
        if (syncAttendance) {
            if (!FileCategoryData.TIMESHEET.equals(normalizedCategory)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "勤怠反映は勤務表分類のみ利用できます");
            }
            if (normalizedTargetMonth == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "勤怠反映には対象年月が必要です");
            }
        }

        if (syncExpense) {
            if (!FileCategoryData.APPLICATION.equals(normalizedCategory)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "経費反映は申請書分類のみ利用できます");
            }
        }

        var uploaded = new ArrayList<FileAttachmentDto>();
        var failures = new ArrayList<BatchFileFailureDto>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            try {
                uploaded.add(upload(file, description, normalizedCategory, normalizedTargetMonth, null));
            } catch (ResponseStatusException ex) {
                failures.add(new BatchFileFailureDto(
                        safeOriginalName(file),
                        ex.getReason() != null ? ex.getReason() : ex.getMessage()
                ));
            } catch (RuntimeException ex) {
                failures.add(new BatchFileFailureDto(
                        safeOriginalName(file),
                        ex.getMessage() != null ? ex.getMessage() : "アップロードに失敗しました"
                ));
            }
        }

        List<AttendanceSyncResultDto> attendanceResults = List.of();
        if (syncAttendance && !uploaded.isEmpty()) {
            var uploadedNames = uploaded.stream()
                    .map(FileAttachmentDto::originalName)
                    .collect(java.util.stream.Collectors.toSet());
            var updates = parseAttendanceUpdates(attendanceUpdatesJson).stream()
                    .filter(item -> item.fileName() != null && uploadedNames.contains(item.fileName()))
                    .toList();
            attendanceResults = timesheetAttendanceSyncService.applyUpdates(
                    updates,
                    normalizedTargetMonth
            );
        }

        List<ExpenseSyncResultDto> expenseResults = List.of();
        if (syncExpense && !uploaded.isEmpty()) {
            var uploadedNames = uploaded.stream()
                    .map(FileAttachmentDto::originalName)
                    .collect(java.util.stream.Collectors.toSet());
            var updates = parseExpenseUpdates(expenseUpdatesJson).stream()
                    .filter(item -> item.fileName() != null && uploadedNames.contains(item.fileName()))
                    .toList();
            expenseResults = expenseApplicationSyncService.applyUpdates(updates);
        }

        return new FileBatchUploadResultDto(uploaded, failures, attendanceResults, expenseResults);
    }

    private List<ExpenseApplicationUpdateItem> parseExpenseUpdates(String expenseUpdatesJson) {
        if (expenseUpdatesJson == null || expenseUpdatesJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    expenseUpdatesJson,
                    new TypeReference<List<ExpenseApplicationUpdateItem>>() {
                    }
            );
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "経費反映データの形式が不正です");
        }
    }

    private List<TimesheetAttendanceUpdateItem> parseAttendanceUpdates(String attendanceUpdatesJson) {
        if (attendanceUpdatesJson == null || attendanceUpdatesJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    attendanceUpdatesJson,
                    new TypeReference<List<TimesheetAttendanceUpdateItem>>() {
                    }
            );
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "勤怠反映データの形式が不正です");
        }
    }

    private static String safeOriginalName(MultipartFile file) {
        String name = file.getOriginalFilename();
        return name == null || name.isBlank() ? "unknown" : name;
    }

    public DownloadPayload download(long id) {
        requireFileAccessPermission();
        FileAttachmentRecord record = repository.findActiveById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ファイルが見つかりません"));

        Path path = storageService.resolveStoragePath(record.storagePath());
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ファイルが見つかりません");
        }

        Resource resource = new FileSystemResource(path);
        String contentType = record.contentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }
        return new DownloadPayload(resource, record.originalName(), contentType);
    }

    public void delete(long id) {
        requireWriteFilePermission();
        softDeleteInternal(id, true);
    }

    /**
     * 業務フローからのシステム削除（ファイル管理権限不要）。
     * 既に削除済みなら何もしない。
     */
    public void softDeleteForSystem(long id) {
        softDeleteInternal(id, false);
    }

    private void softDeleteInternal(long id, boolean requireExists) {
        var recordOpt = repository.findActiveById(id);
        if (recordOpt.isEmpty()) {
            if (requireExists) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ファイルが見つかりません");
            }
            return;
        }
        FileAttachmentRecord record = recordOpt.get();

        String deletedAt = LocalDateTime.now(ZONE).format(TIMESTAMP);
        if (!repository.markDeleted(id, deletedAt)) {
            if (requireExists) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ファイルが見つかりません");
            }
            return;
        }

        try {
            Path path = storageService.resolveStoragePath(record.storagePath());
            Files.deleteIfExists(path);
        } catch (IOException | RuntimeException ignored) {
            /* DB 上は削除済み。実ファイルが無い/削除失敗でも API は成功とする */
        }

        auditLogService.log(
                AuditAction.FILE_DELETE,
                "file_attachment",
                String.valueOf(id),
                record.originalName()
        );
    }

    private void requireAuthenticated() {
        if (!securityService.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
    }

    private void requireViewFilePermission() {
        if (!securityService.canViewFiles()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ファイルの閲覧権限がありません");
        }
    }

    private void requireFileAccessPermission() {
        if (!securityService.canViewFiles() && !securityService.canManageHrOps()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ファイルの閲覧権限がありません");
        }
    }

    private void requireWriteFilePermission() {
        if (!securityService.canWriteFiles()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ファイルの操作権限がありません");
        }
    }

    private static String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record DownloadPayload(Resource resource, String originalName, String contentType) {
    }
}
