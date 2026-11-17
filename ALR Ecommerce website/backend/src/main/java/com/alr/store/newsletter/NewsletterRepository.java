package com.alr.store.newsletter;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscription, Long> {
    boolean existsByEmailIgnoreCase(String email);
}
