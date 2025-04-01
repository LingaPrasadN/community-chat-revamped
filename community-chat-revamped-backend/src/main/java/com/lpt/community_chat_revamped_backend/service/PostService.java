package com.lpt.community_chat_revamped_backend.service;

import com.lpt.community_chat_revamped_backend.model.Post;
import com.lpt.community_chat_revamped_backend.model.User;
import com.lpt.community_chat_revamped_backend.repository.PostRepository;
import com.lpt.community_chat_revamped_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PostService {
    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Post> getAllPosts() {
        return postRepository.findAllOrderByCreatedAtDesc();
    }

    public Post createPost(Long userId, String title, String content) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Post post = new Post();
        post.setUser(user);
        post.setTitle(title);
        post.setContent(content);
        
        return postRepository.save(post);
    }

    @Transactional
    public Post likePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!post.getLikedBy().contains(user)) {
            post.getLikedBy().add(user);
            post.setLikesCount(post.getLikesCount() + 1);
            return postRepository.save(post);
        }
        return post;
    }

    @Transactional
    public Post unlikePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (post.getLikedBy().contains(user)) {
            post.getLikedBy().remove(user);
            post.setLikesCount(post.getLikesCount() - 1);
            return postRepository.save(post);
        }
        return post;
    }

    @Transactional
    public Post addComment(Long postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));
        
        post.setCommentsCount(post.getCommentsCount() + 1);
        return postRepository.save(post);
    }

    public long getLikeCount(Long postId) {
        return postRepository.countLikes(postId);
    }
} 