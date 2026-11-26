package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AuthUserListItemDto;
import jp.dispatch.employee.dto.AuthUserSaveRequest;
import jp.dispatch.employee.dto.PagedResultDto;
import jp.dispatch.employee.service.AuthUserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
public class AuthUserController {

    private final AuthUserService service;

    public AuthUserController(AuthUserService service) {
        this.service = service;
    }

    @GetMapping
    public PagedResultDto<AuthUserListItemDto> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String affiliationCompany,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return service.list(keyword, role, affiliationCompany, enabled, page, size);
    }

    @PostMapping
    public AuthUserListItemDto create(@RequestBody AuthUserSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public AuthUserListItemDto update(@PathVariable long id, @RequestBody AuthUserSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
