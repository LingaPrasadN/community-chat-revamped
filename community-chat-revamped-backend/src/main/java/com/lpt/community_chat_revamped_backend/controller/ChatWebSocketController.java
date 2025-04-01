package com.lpt.community_chat_revamped_backend.controller;

import com.lpt.community_chat_revamped_backend.model.ChatMessage;
import com.lpt.community_chat_revamped_backend.model.MessageReaction;
import com.lpt.community_chat_revamped_backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatWebSocketController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ConcurrentHashMap<Long, String> onlineUsers = new ConcurrentHashMap<>();

    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public ChatMessage sendMessage(Map<String, Object> messageRequest) {
        Long userId = Long.parseLong(messageRequest.get("userId").toString());
        String content = (String) messageRequest.get("content");
        
        // Handle file upload if present
        MultipartFile file = null;
        if (messageRequest.containsKey("file")) {
            file = (MultipartFile) messageRequest.get("file");
        }

        ChatMessage message = chatService.sendMessage(userId, content, file);
        messagingTemplate.convertAndSend("/topic/messages", message);
        return message;
    }

    @MessageMapping("/chat.reaction.add")
    public void addReaction(Map<String, String> reactionRequest) {
        MessageReaction reaction = chatService.addReaction(
            Long.parseLong(reactionRequest.get("messageId")),
            Long.parseLong(reactionRequest.get("userId")),
            reactionRequest.get("emoji")
        );
        messagingTemplate.convertAndSend("/topic/reactions", Map.of(
            "type", "ADD",
            "messageId", reaction.getMessage().getId(),
            "reaction", reaction
        ));
    }

    @MessageMapping("/chat.reaction.remove")
    public void removeReaction(Map<String, String> reactionRequest) {
        chatService.removeReaction(
            Long.parseLong(reactionRequest.get("messageId")),
            Long.parseLong(reactionRequest.get("userId")),
            reactionRequest.get("emoji")
        );
        messagingTemplate.convertAndSend("/topic/reactions", Map.of(
            "type", "REMOVE",
            "messageId", reactionRequest.get("messageId"),
            "userId", reactionRequest.get("userId"),
            "emoji", reactionRequest.get("emoji")
        ));
    }

    @MessageMapping("/chat.message.delivered")
    public void messageDelivered(Map<String, String> deliveryRequest) {
        Long messageId = Long.parseLong(deliveryRequest.get("messageId"));
        Long userId = Long.parseLong(deliveryRequest.get("userId"));
        chatService.updateMessageStatus(messageId, ChatMessage.MessageStatus.DELIVERED);
        messagingTemplate.convertAndSend("/topic/message.status", Map.of(
            "messageId", messageId,
            "status", "DELIVERED",
            "userId", userId
        ));
    }

    @MessageMapping("/chat.message.read")
    public void messageRead(Map<String, String> readRequest) {
        Long messageId = Long.parseLong(readRequest.get("messageId"));
        Long userId = Long.parseLong(readRequest.get("userId"));
        chatService.updateMessageStatus(messageId, ChatMessage.MessageStatus.READ);
        messagingTemplate.convertAndSend("/topic/message.status", Map.of(
            "messageId", messageId,
            "status", "READ",
            "userId", userId
        ));
    }

    @MessageMapping("/chat.join")
    public void userJoined(Map<String, String> joinRequest) {
        Long userId = Long.parseLong(joinRequest.get("userId"));
        String username = joinRequest.get("username");
        onlineUsers.put(userId, username);
        messagingTemplate.convertAndSend("/topic/presence", onlineUsers);
    }

    @MessageMapping("/chat.leave")
    public void userLeft(Map<String, String> leaveRequest) {
        Long userId = Long.parseLong(leaveRequest.get("userId"));
        onlineUsers.remove(userId);
        messagingTemplate.convertAndSend("/topic/presence", onlineUsers);
    }

    @MessageMapping("/chat.typing")
    public void userTyping(Map<String, String> typingRequest) {
        Long userId = Long.parseLong(typingRequest.get("userId"));
        String username = typingRequest.get("username");
        messagingTemplate.convertAndSend("/topic/typing", Map.of(
            "userId", userId,
            "username", username,
            "isTyping", typingRequest.get("isTyping")
        ));
    }

    @MessageMapping("/chat.message.edit")
    public void editMessage(Map<String, String> editRequest) {
        Long messageId = Long.parseLong(editRequest.get("messageId"));
        String content = editRequest.get("content");
        
        ChatMessage updatedMessage = chatService.updateMessage(messageId, content);
        messagingTemplate.convertAndSend("/topic/message.edit", Map.of(
            "messageId", messageId,
            "content", content,
            "timestamp", updatedMessage.getTimestamp()
        ));
    }

    @MessageMapping("/chat.message.delete")
    public void deleteMessage(Map<String, String> deleteRequest) {
        Long messageId = Long.parseLong(deleteRequest.get("messageId"));
        Long userId = Long.parseLong(deleteRequest.get("userId"));
        
        chatService.deleteMessage(messageId);
        messagingTemplate.convertAndSend("/topic/message.delete", Map.of(
            "messageId", messageId,
            "userId", userId
        ));
    }
} 