package com.alr.store.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record OrderRequest(
        @NotBlank @Size(max = 140) String name,
        @NotBlank @Pattern(regexp = "^[+0-9() .-]{8,24}$") String phone,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 180) String house,
        @NotBlank @Size(max = 180) String street,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state,
        @NotBlank @Pattern(regexp = "^[0-9]{6}$") String pinCode,
        @NotBlank @Pattern(regexp = "^COD$") String payment,
        @NotEmpty List<@Valid Item> items) {
    public record Item(
            @NotBlank @Size(max = 100) String productId,
            @NotBlank @Size(max = 40) String size,
            @NotBlank @Size(max = 40) String color,
            @NotNull @Min(1) @Max(20) Integer quantity) {
    }
}
