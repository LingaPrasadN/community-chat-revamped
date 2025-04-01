package com.lpt.community_chat_revamped_backend.service;

import com.lpt.community_chat_revamped_backend.model.ChatMessage;
import com.lpt.community_chat_revamped_backend.model.MessageReaction;
import com.lpt.community_chat_revamped_backend.model.User;
import com.lpt.community_chat_revamped_backend.repository.ChatMessageRepository;
import com.lpt.community_chat_revamped_backend.repository.MessageReactionRepository;
import com.lpt.community_chat_revamped_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageReactionRepository messageReactionRepository;

    @Autowired
    private FileService fileService;

    public ChatMessage sendMessage(Long userId, String content, MultipartFile file) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        ChatMessage message = new ChatMessage();
        message.setUser(user);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        message.setStatus(ChatMessage.MessageStatus.SENT);

        if (file != null && !file.isEmpty()) {
            try {
                String fileUrl = fileService.saveFile(file);
                message.setFileName(file.getOriginalFilename());
                message.setFileType(file.getContentType());
                message.setFileSize(file.getSize());
                message.setFileUrl(fileUrl);
            } catch (Exception e) {
                throw new RuntimeException("Failed to save file", e);
            }
        }

        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getMessages() {
        return chatMessageRepository.findAllOrderByTimestampDesc();
    }

    public void updateMessageStatus(Long messageId, ChatMessage.MessageStatus status) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setStatus(status);
        chatMessageRepository.save(message);
    }

    public MessageReaction addReaction(Long messageId, Long userId, String emoji) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        MessageReaction reaction = new MessageReaction();
        reaction.setMessage(message);
        reaction.setUser(user);
        reaction.setEmoji(emoji);

        return messageReactionRepository.save(reaction);
    }

    public void removeReaction(Long messageId, Long userId, String emoji) {
        messageReactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, userId, emoji);
    }

    public ChatMessage updateMessage(Long messageId, String content) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        
        return chatMessageRepository.save(message);
    }

    public void deleteMessage(Long messageId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        // Delete associated file if exists
        if (message.getFileUrl() != null) {
            try {
                fileService.deleteFile(message.getFileUrl());
            } catch (Exception e) {
                // Log error but continue with message deletion
            }
        }

        // Delete associated reactions
        messageReactionRepository.deleteByMessageId(messageId);
        
        // Delete the message
        chatMessageRepository.delete(message);
    }
} 