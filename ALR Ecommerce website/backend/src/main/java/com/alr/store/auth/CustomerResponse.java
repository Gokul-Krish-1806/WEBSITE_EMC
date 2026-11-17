package com.alr.store.auth;

import java.time.Instant;

public record CustomerResponse(Long id, String name, String email, String phone, Instant createdAt, long orderCount) {
    static CustomerResponse from(AppUser user, long orderCount) {
        return new CustomerResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                user.getCreatedAt(), orderCount);
    }
}
