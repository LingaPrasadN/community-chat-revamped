package com.lpt.community_chat_revamped_backend.controller;

import com.lpt.community_chat_revamped_backend.model.Post;
import com.lpt.community_chat_revamped_backend.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "http://localhost:3000")
public class PostController {
    @Autowired
    private PostService postService;

    @GetMapping
    public ResponseEntity<List<Post>> getAllPosts() {
        return ResponseEntity.ok(postService.getAllPosts());
    }

    @PostMapping
    public ResponseEntity<Post> createPost(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(postService.createPost(
            userId,
            request.get("title"),
            request.get("content")
        ));
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<Post> likePost(
            @PathVariable Long postId,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(postService.likePost(postId, userId));
    }

    @PostMapping("/{postId}/unlike")
    public ResponseEntity<Post> unlikePost(
            @PathVariable Long postId,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(postService.unlikePost(postId, userId));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<Post> addComment(
            @PathVariable Long postId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        return ResponseEntity.ok(postService.addComment(postId));
    }
} 