package com.lpt.community_chat_revamped_backend.repository;

import com.lpt.community_chat_revamped_backend.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    List<Post> findAllOrderByCreatedAtDesc();

    @Query("SELECT COUNT(l) FROM Post p JOIN p.likedBy l WHERE p.id = :postId")
    long countLikes(@Param("postId") Long postId);
} 