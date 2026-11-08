package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.MasterImportResultDto;
import jp.dispatch.employee.service.MasterImportService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/master")
public class MasterImportController {

    private final MasterImportService service;

    public MasterImportController(MasterImportService service) {
        this.service = service;
    }

    @PostMapping(value = "/employees/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MasterImportResultDto importEmployees(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dryRun", defaultValue = "true") boolean dryRun
    ) {
        return service.importEmployees(file, dryRun);
    }

    @PostMapping(value = "/clients/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MasterImportResultDto importClients(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dryRun", defaultValue = "true") boolean dryRun
    ) {
        return service.importClients(file, dryRun);
    }
}
