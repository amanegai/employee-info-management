package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.MeetingRoomDto;
import jp.dispatch.employee.dto.MeetingRoomSaveRequest;
import jp.dispatch.employee.service.MeetingRoomService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meeting-rooms")
public class MeetingRoomController {

    private final MeetingRoomService service;

    public MeetingRoomController(MeetingRoomService service) {
        this.service = service;
    }

    @GetMapping
    public List<MeetingRoomDto> list(@RequestParam(required = false, defaultValue = "false") boolean all) {
        return all ? service.listAll() : service.listActive();
    }

    @GetMapping("/{id}")
    public MeetingRoomDto get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    public MeetingRoomDto create(@RequestBody MeetingRoomSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public MeetingRoomDto update(@PathVariable long id, @RequestBody MeetingRoomSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
