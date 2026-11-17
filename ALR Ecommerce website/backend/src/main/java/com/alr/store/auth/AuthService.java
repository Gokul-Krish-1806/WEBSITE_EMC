package com.alr.store.auth;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long expirationHours;

    public AuthService(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.jwt.expiration:PT12H}") java.time.Duration expiration) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.expirationHours = expiration.toHours();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        requireBcryptLength(request.password());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = request.phone().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account already exists for that email.");
        }
        if (users.existsByPhone(phone)) {
            throw new IllegalArgumentException("An account already exists for that phone number.");
        }
        AppUser user = new AppUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.CUSTOMER);
        user.setCreatedAt(Instant.now());
        return jwtService.issue(users.save(user), expirationHours);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadCredentialsException("Email/phone or password is incorrect.");
        }
        String identifier = request.identifier().trim();
        AppUser user = (identifier.contains("@")
                ? users.findByEmailIgnoreCase(identifier)
                : users.findByPhone(identifier))
                .orElseThrow(() -> new BadCredentialsException("Email/phone or password is incorrect."));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email/phone or password is incorrect.");
        }
        return jwtService.issue(user, expirationHours);
    }

    private void requireBcryptLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password must be at most 72 UTF-8 bytes.");
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(String subject) {
        long id;
        try {
            id = Long.parseLong(subject);
        } catch (NumberFormatException exception) {
            throw new EntityNotFoundException("Account was not found.");
        }
        return users.findById(id).map(UserResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Account was not found."));
    }

    @Transactional(readOnly = true)
    public AppUser requireUser(String subject) {
        long id;
        try {
            id = Long.parseLong(subject);
        } catch (NumberFormatException exception) {
            throw new EntityNotFoundException("Account was not found.");
        }
        return users.findById(id).orElseThrow(() -> new EntityNotFoundException("Account was not found."));
    }
}
