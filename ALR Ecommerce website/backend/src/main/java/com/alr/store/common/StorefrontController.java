package com.alr.store.common;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import com.alr.store.product.ProductResponse;
import com.alr.store.product.ProductService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

@RestController
@RequestMapping("/api/storefront")
public class StorefrontController {
    private final String promotionMessage;
    private final String promotionEndsAt;
    private final ProductService products;

    public StorefrontController(
            @Value("${app.storefront.promotion.message:}") String promotionMessage,
            @Value("${app.storefront.promotion.ends-at:}") String promotionEndsAt,
            ProductService products) {
        this.promotionMessage = promotionMessage;
        this.promotionEndsAt = promotionEndsAt;
        this.products = products;
    }

    @GetMapping("/trending")
    public List<ProductResponse> trending() {
        return products.trending(Instant.now().minus(30, ChronoUnit.DAYS));
    }

    @GetMapping("/promotion")
    public PromotionResponse promotion() {
        if (!StringUtils.hasText(promotionMessage) && !StringUtils.hasText(promotionEndsAt)) {
            return new PromotionResponse(false, "", null);
        }
        if (!StringUtils.hasText(promotionMessage) || !StringUtils.hasText(promotionEndsAt)) {
            throw new IllegalStateException("Configure both ALR_PROMO_MESSAGE and ALR_PROMO_END to enable a homepage promotion.");
        }
        Instant endsAt;
        try {
            endsAt = Instant.parse(promotionEndsAt.trim());
        } catch (java.time.format.DateTimeParseException exception) {
            throw new IllegalStateException("ALR_PROMO_END must be an ISO-8601 UTC timestamp.", exception);
        }
        boolean active = endsAt.isAfter(Instant.now());
        return new PromotionResponse(active, active ? promotionMessage.trim() : "", active ? endsAt : null);
    }

    public record PromotionResponse(boolean active, String message, Instant endsAt) {
    }
}
