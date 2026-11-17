package com.alr.store.auth;

public record UserResponse(Long id, String name, String email, String phone, String role) {
    static UserResponse from(AppUser user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                user.getRole().name());
    }
}
