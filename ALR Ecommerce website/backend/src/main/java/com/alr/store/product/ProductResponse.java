package com.alr.store.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProductResponse(
        String id,
        String name,
        String category,
        String brand,
        String sku,
        BigDecimal price,
        BigDecimal salePrice,
        String description,
        String imageUrl,
        List<String> galleryImages,
        List<String> sizes,
        List<String> colors,
        int stock,
        boolean active,
        String badge,
        Instant createdAt,
        long salesCount) {
    public static ProductResponse from(Product product) {
        return from(product, 0);
    }

    public static ProductResponse from(Product product, long salesCount) {
        return new ProductResponse(product.getId(), product.getName(), product.getCategory(),
                product.getBrand(), product.getSku(), product.getPrice(), product.getSalePrice(),
                product.getDescription(), product.getImageUrl(),
                product.getGalleryImages(), product.getSizes(), product.getColors(), product.getStock(), product.isActive(),
                product.getBadge(), product.getCreatedAt(), salesCount);
    }
}
