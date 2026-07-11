package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AuthUserListItemDto;
import jp.dispatch.employee.dto.AuthUserSaveRequest;
import jp.dispatch.employee.service.AuthUserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AuthUserController {

    private final AuthUserService service;

    public AuthUserController(AuthUserService service) {
        this.service = service;
    }

    @GetMapping
    public List<AuthUserListItemDto> list() {
        return service.list();
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
