package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.MeetingRoomReservationDto;
import jp.dispatch.employee.dto.MeetingRoomReservationSaveRequest;
import jp.dispatch.employee.service.MeetingRoomReservationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meeting-room-reservations")
public class MeetingRoomReservationController {

    private final MeetingRoomReservationService service;

    public MeetingRoomReservationController(MeetingRoomReservationService service) {
        this.service = service;
    }

    @GetMapping
    public List<MeetingRoomReservationDto> search(
            @RequestParam String dateFrom,
            @RequestParam String dateTo,
            @RequestParam(required = false) Long roomId
    ) {
        return service.search(dateFrom, dateTo, roomId);
    }

    @GetMapping("/{id}")
    public MeetingRoomReservationDto get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    public MeetingRoomReservationDto create(@RequestBody MeetingRoomReservationSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public MeetingRoomReservationDto update(
            @PathVariable long id,
            @RequestBody MeetingRoomReservationSaveRequest request
    ) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void cancel(@PathVariable long id) {
        service.cancel(id);
    }
}
