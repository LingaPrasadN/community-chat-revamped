package com.lpt.community_chat_revamped_backend;

import com.lpt.community_chat_revamped_backend.config.TestSecurityConfig;
import com.lpt.community_chat_revamped_backend.config.TestJwtAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@Import({TestSecurityConfig.class, TestJwtAuthenticationFilter.class})
@TestPropertySource(properties = {
    "jwt.secret=test-secret-key-for-testing-purposes-only",
    "jwt.expiration=86400000",
    "spring.main.allow-bean-definition-overriding=true"
})
class CommunityChatRevampedBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
