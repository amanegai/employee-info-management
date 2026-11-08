package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.MyPageDto;
import jp.dispatch.employee.service.MyPageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MyPageController {

    private final MyPageService myPageService;

    public MyPageController(MyPageService myPageService) {
        this.myPageService = myPageService;
    }

    @GetMapping("/mypage")
    public MyPageDto myPage() {
        return myPageService.getCurrent();
    }
}
