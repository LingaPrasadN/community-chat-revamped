package com.lpt.community_chat_revamped_backend.repository;

import com.lpt.community_chat_revamped_backend.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    void deleteByMessageId(Long messageId);
    void deleteByMessageIdAndUserIdAndEmoji(Long messageId, Long userId, String emoji);
} 