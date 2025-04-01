package com.lpt.community_chat_revamped_backend.repository;

import com.lpt.community_chat_revamped_backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("SELECT m FROM ChatMessage m ORDER BY m.timestamp DESC")
    List<ChatMessage> findAllOrderByTimestampDesc();
} 