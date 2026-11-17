package com.alr.store.wishlist;

import com.alr.store.auth.AppUser;
import com.alr.store.product.Product;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "wishlist_items", uniqueConstraints = @UniqueConstraint(
        name = "uk_wishlist_user_product", columnNames = {"user_id", "product_id"}))
public class WishlistEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    protected WishlistEntry() {
    }

    public WishlistEntry(AppUser user, Product product) {
        this.user = user;
        this.product = product;
    }

    public Product getProduct() { return product; }
}
