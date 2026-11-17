package com.alr.store.product;

import com.alr.store.common.StringListConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 100)
    private String brand = "ALR Studio";

    @Column(nullable = false, unique = true, length = 100)
    private String sku;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "sale_price", precision = 10, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "image_url", nullable = false, length = 1200)
    private String imageUrl;

    @Convert(converter = StringListConverter.class)
    @Column(name = "gallery_images", nullable = false, length = 3000)
    private List<String> galleryImages = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(nullable = false, length = 500)
    private List<String> sizes = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(nullable = false, length = 500)
    private List<String> colors = new ArrayList<>();

    @Column(nullable = false)
    private int stock;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, length = 80)
    private String badge = "";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Product() {
    }

    @PrePersist
    private void ensureSku() {
        if (sku == null || sku.isBlank()) {
            String prefix = id == null ? "PRODUCT" : id.toUpperCase(java.util.Locale.ROOT);
            sku = "ALR-" + prefix.substring(0, Math.min(prefix.length(), 84))
                    + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase(java.util.Locale.ROOT);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public List<String> getGalleryImages() { return galleryImages; }
    public void setGalleryImages(List<String> galleryImages) { this.galleryImages = new ArrayList<>(galleryImages); }
    public List<String> getSizes() { return sizes; }
    public void setSizes(List<String> sizes) { this.sizes = new ArrayList<>(sizes); }
    public List<String> getColors() { return colors; }
    public void setColors(List<String> colors) { this.colors = new ArrayList<>(colors); }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
