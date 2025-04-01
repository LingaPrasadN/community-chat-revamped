package com.lpt.community_chat_revamped_backend.controller;

import com.lpt.community_chat_revamped_backend.model.ChatMessage;
import com.lpt.community_chat_revamped_backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessage>> getMessages() {
        return ResponseEntity.ok(chatService.getMessages());
    }

    @PostMapping("/messages")
    public ResponseEntity<ChatMessage> sendMessage(
            @RequestParam("userId") Long userId,
            @RequestParam("content") String content,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(chatService.sendMessage(userId, content, file));
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessage> updateMessage(
            @PathVariable Long messageId,
            @RequestBody String content) {
        return ResponseEntity.ok(chatService.updateMessage(messageId, content));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId) {
        chatService.deleteMessage(messageId);
        return ResponseEntity.ok().build();
    }
} 