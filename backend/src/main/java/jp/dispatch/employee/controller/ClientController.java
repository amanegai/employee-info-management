package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.ClientDetailDto;
import jp.dispatch.employee.dto.ClientDto;
import jp.dispatch.employee.dto.ClientInternalContactCandidateDto;
import jp.dispatch.employee.dto.ClientSaveRequest;
import jp.dispatch.employee.dto.ClientSummaryDto;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.service.ClientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService service;

    public ClientController(ClientService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ClientSummaryDto summary() {
        return service.summary();
    }

    @GetMapping("/meta/contract-statuses")
    public List<String> contractStatuses() {
        return service.contractStatuses();
    }

    @GetMapping("/meta/ranks")
    public List<String> clientRanks() {
        return service.clientRanks();
    }

    @GetMapping("/meta/contract-types")
    public List<String> contractTypes() {
        return service.contractTypes();
    }

    @GetMapping("/meta/eligible-internal-contacts")
    public List<ClientInternalContactCandidateDto> eligibleInternalContacts() {
        return service.eligibleInternalContacts();
    }

    @GetMapping
    public List<ClientDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String contractStatus
    ) {
        return service.search(keyword, name, location, contractStatus);
    }

    @GetMapping("/{id}")
    public ClientDetailDto get(@PathVariable long id) {
        return service.getById(id);
    }

    @GetMapping("/{id}/projects")
    public List<DispatchProjectDto> relatedProjects(@PathVariable long id) {
        return service.listRelatedProjects(id);
    }

    @PostMapping
    public ClientDetailDto create(@RequestBody ClientSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ClientDetailDto update(@PathVariable long id, @RequestBody ClientSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
