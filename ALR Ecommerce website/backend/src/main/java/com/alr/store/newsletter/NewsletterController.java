package com.alr.store.newsletter;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/newsletter")
public class NewsletterController {
    private final NewsletterRepository subscriptions;

    public NewsletterController(NewsletterRepository subscriptions) {
        this.subscriptions = subscriptions;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> subscribe(@Valid @RequestBody NewsletterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (subscriptions.existsByEmailIgnoreCase(email)) {
            return Map.of("message", "This email is already subscribed.");
        }
        subscriptions.save(new NewsletterSubscription(email, Instant.now()));
        return Map.of("message", "Thank you for subscribing.");
    }
}
