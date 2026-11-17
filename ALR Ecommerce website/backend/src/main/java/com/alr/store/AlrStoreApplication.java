package com.alr.store;

import com.alr.store.auth.AppUser;
import com.alr.store.auth.AppUserRepository;
import com.alr.store.auth.UserRole;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@SpringBootApplication
public class AlrStoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(AlrStoreApplication.class, args);
    }

    @Bean
    ApplicationRunner provisionAdmin(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:}") String email,
            @Value("${app.admin.password:}") String password) {
        return args -> {
            if (!StringUtils.hasText(email) && !StringUtils.hasText(password)) {
                return;
            }
            if (!StringUtils.hasText(email) || !StringUtils.hasText(password) || password.length() < 12) {
                throw new IllegalStateException("Set both ALR_ADMIN_EMAIL and ALR_ADMIN_PASSWORD (at least 12 characters).");
            }
            if (users.existsByEmailIgnoreCase(email)) {
                return;
            }
            AppUser admin = new AppUser();
            admin.setName("ALR Store Admin");
            admin.setEmail(email.trim().toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(UserRole.ADMIN);
            admin.setCreatedAt(Instant.now());
            users.save(admin);
        };
    }
}
