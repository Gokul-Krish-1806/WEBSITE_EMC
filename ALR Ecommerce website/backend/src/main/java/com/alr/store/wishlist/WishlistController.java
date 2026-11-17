package com.alr.store.wishlist;

import com.alr.store.auth.AuthService;
import com.alr.store.product.Product;
import com.alr.store.product.ProductRepository;
import com.alr.store.product.ProductResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {
    private final WishlistRepository wishlists;
    private final ProductRepository products;
    private final AuthService auth;

    public WishlistController(WishlistRepository wishlists, ProductRepository products, AuthService auth) {
        this.wishlists = wishlists;
        this.products = products;
        this.auth = auth;
    }

    @GetMapping
    public List<ProductResponse> get(@AuthenticationPrincipal Jwt jwt) {
        long userId = auth.requireUser(jwt.getSubject()).getId();
        return wishlists.findAllByUserIdOrderByIdDesc(userId).stream()
                .filter(entry -> entry.getProduct().isActive())
                .map(entry -> ProductResponse.from(entry.getProduct())).toList();
    }

    @PostMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(@AuthenticationPrincipal Jwt jwt, @PathVariable String productId) {
        var user = auth.requireUser(jwt.getSubject());
        Product product = products.findById(productId).filter(Product::isActive)
                .orElseThrow(() -> new EntityNotFoundException("Product was not found."));
        if (wishlists.findByUserIdAndProductId(user.getId(), productId).isEmpty()) {
            wishlists.save(new WishlistEntry(user, product));
        }
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable String productId) {
        long userId = auth.requireUser(jwt.getSubject()).getId();
        wishlists.deleteByUserIdAndProductId(userId, productId);
    }
}
