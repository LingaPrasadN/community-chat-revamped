package com.lpt.community_chat_revamped_backend.service;

import com.lpt.community_chat_revamped_backend.model.Comment;
import com.lpt.community_chat_revamped_backend.model.Post;
import com.lpt.community_chat_revamped_backend.model.User;
import com.lpt.community_chat_revamped_backend.repository.CommentRepository;
import com.lpt.community_chat_revamped_backend.repository.PostRepository;
import com.lpt.community_chat_revamped_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CommentService {
    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Comment> getPostComments(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtDesc(postId);
    }

    public Comment addComment(Long postId, Long userId, String content) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setAuthor(user);
        comment.setPost(post);
        return commentRepository.save(comment);
    }
} 