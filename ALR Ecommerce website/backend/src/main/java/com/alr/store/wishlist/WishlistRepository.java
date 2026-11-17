package com.alr.store.wishlist;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WishlistRepository extends JpaRepository<WishlistEntry, Long> {
    @EntityGraph(attributePaths = "product")
    List<WishlistEntry> findAllByUserIdOrderByIdDesc(Long userId);
    Optional<WishlistEntry> findByUserIdAndProductId(Long userId, String productId);
    void deleteByUserIdAndProductId(Long userId, String productId);
}
