package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.EmployeeCodeExistsDto;
import jp.dispatch.employee.dto.EmployeeDetailDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.AttendanceDto;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.dto.EmployeePayrollSlipDto;
import jp.dispatch.employee.dto.EmployeeSaveRequest;
import jp.dispatch.employee.dto.MasterDto;
import jp.dispatch.employee.dto.NextEmployeeCodeDto;
import jp.dispatch.employee.dto.SummaryDto;
import jp.dispatch.employee.service.EmployeeService;
import jp.dispatch.employee.service.ResumeExcelExportService.ResumeExcelFile;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
public class EmployeeController {

    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public SummaryDto summary() {
        return service.getSummary();
    }

    @GetMapping("/master")
    public MasterDto master() {
        return service.getMaster();
    }

    @GetMapping("/employees")
    public List<EmployeeDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String affiliationCompany,
            @RequestParam(required = false) String summaryFilter,
            @RequestParam(required = false) String skillKeyword,
            @RequestParam(required = false) String technicalCategory,
            @RequestParam(required = false) String technicalItem,
            @RequestParam(required = false) String technicalMinLevel,
            @RequestParam(required = false) String employeeType,
            @RequestParam(required = false) String workStatus
    ) {
        return service.search(
                keyword,
                employeeCode,
                name,
                departmentId,
                affiliationCompany,
                summaryFilter,
                skillKeyword,
                technicalCategory,
                technicalItem,
                technicalMinLevel,
                employeeType,
                workStatus
        );
    }

    @GetMapping("/employee-code/next")
    public NextEmployeeCodeDto nextEmployeeCode() {
        return new NextEmployeeCodeDto(service.getNextEmployeeCode());
    }

    @GetMapping("/employee-code/recommend")
    public NextEmployeeCodeDto recommendEmployeeCode(
            @RequestParam String employeeType,
            @RequestParam Long departmentId,
            @RequestParam(required = false) String affiliationCompany
    ) {
        return service.recommendEmployeeCode(employeeType, departmentId, affiliationCompany);
    }

    @GetMapping("/employee-code/exists")
    public EmployeeCodeExistsDto employeeCodeExists(@RequestParam String code) {
        return service.employeeCodeExists(code);
    }

    @GetMapping("/employees/{id}")
    public EmployeeDto get(@PathVariable long id) {
        return service.getById(id);
    }

    @GetMapping("/employees/{id}/detail")
    public EmployeeDetailDto getDetail(@PathVariable long id) {
        return service.getDetail(id);
    }

    @GetMapping("/employees/{id}/resume.xlsx")
    public ResponseEntity<Resource> downloadResumeExcel(@PathVariable long id) {
        ResumeExcelFile file = service.exportResumeExcel(id);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(file.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(file.content().length)
                .body(new ByteArrayResource(file.content()));
    }

    @GetMapping("/employees/{id}/attendance/months")
    public List<String> getAttendanceMonths(@PathVariable long id) {
        return service.getAttendanceMonths(id);
    }

    @GetMapping("/employees/{id}/attendance")
    public AttendanceDto getAttendance(
            @PathVariable long id,
            @RequestParam String targetMonth
    ) {
        return service.getAttendanceForMonth(id, targetMonth);
    }

    @GetMapping("/employees/{id}/payroll-slips")
    public List<EmployeePayrollSlipDto> getPayrollSlips(@PathVariable long id) {
        return service.getPayrollSlips(id);
    }

    @DeleteMapping("/employees/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @PostMapping("/employees")
    public EmployeeDto create(@RequestBody EmployeeSaveRequest request) {
        return service.create(request);
    }

    @PostMapping("/employees/import")
    public EmployeeDto createFromImport(@RequestBody EmployeeSaveRequest request) {
        return service.createFromImport(request);
    }

    @PutMapping("/employees/{id}")
    public EmployeeDto update(@PathVariable long id, @RequestBody EmployeeSaveRequest request) {
        return service.update(id, request);
    }
}
