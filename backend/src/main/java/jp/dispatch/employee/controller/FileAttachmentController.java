package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.FileAttachmentDto;
import jp.dispatch.employee.dto.FileBatchUploadResultDto;
import jp.dispatch.employee.service.FileAttachmentService;
import jp.dispatch.employee.service.FileAttachmentService.DownloadPayload;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileAttachmentController {

    private final FileAttachmentService service;

    public FileAttachmentController(FileAttachmentService service) {
        this.service = service;
    }

    @GetMapping("/meta/categories")
    public List<String> categories() {
        return service.categories();
    }

    @GetMapping
    public List<FileAttachmentDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String targetMonth
    ) {
        return service.search(keyword, category, targetMonth);
    }

    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileBatchUploadResultDto batchUpload(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "targetMonth", required = false) String targetMonth,
            @RequestParam(value = "syncAttendance", defaultValue = "false") boolean syncAttendance,
            @RequestParam(value = "attendanceUpdates", required = false) String attendanceUpdates,
            @RequestParam(value = "syncExpense", defaultValue = "false") boolean syncExpense,
            @RequestParam(value = "expenseUpdates", required = false) String expenseUpdates
    ) {
        return service.batchUpload(files, description, category, targetMonth, syncAttendance, attendanceUpdates, syncExpense, expenseUpdates);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileAttachmentDto upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "targetMonth", required = false) String targetMonth,
            @RequestParam(value = "employeeId", required = false) Long employeeId
    ) {
        return service.upload(file, description, category, targetMonth, employeeId);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable long id) {
        DownloadPayload payload = service.download(id);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(payload.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(payload.contentType()))
                .body(payload.resource());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
