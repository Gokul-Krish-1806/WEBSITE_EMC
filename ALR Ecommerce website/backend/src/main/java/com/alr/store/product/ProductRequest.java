package com.alr.store.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        @NotBlank @Size(max = 180) String name,
        @NotBlank @Size(max = 80) String category,
        @NotNull @DecimalMin(value = "0.01") BigDecimal price,
        @DecimalMin(value = "0.01") BigDecimal salePrice,
        @NotBlank @Size(max = 1000) String description,
        @NotBlank @Size(max = 1200) String imageUrl,
        @Size(max = 8) List<@NotBlank @Size(max = 1200) String> galleryImages,
        @NotEmpty List<@NotBlank @Size(max = 40) String> sizes,
        @NotEmpty List<@NotBlank @Size(max = 40) String> colors,
        @NotNull Integer stock,
        @Size(max = 80) String badge,
        @Size(max = 100) String brand,
        @Size(max = 100) String sku) {
}
