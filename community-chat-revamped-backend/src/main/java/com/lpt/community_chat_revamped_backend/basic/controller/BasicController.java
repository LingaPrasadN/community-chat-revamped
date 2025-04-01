package com.lpt.community_chat_revamped_backend.basic.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BasicController {

    @GetMapping("/")
    public String welcome() {
        return "Welcome to the \"community-chat-revamped backend\"";
    }
}
