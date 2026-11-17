package com.alr.store.product;

import com.alr.store.order.OrderLineRepository;
import com.alr.store.order.ProductSales;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
    private final ProductRepository products;
    private final OrderLineRepository orderLines;

    public ProductService(ProductRepository products, OrderLineRepository orderLines) {
        this.products = products;
        this.orderLines = orderLines;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list(String query, String category, Boolean available, boolean includeInactive) {
        Map<String, Long> sales = salesCounts();
        return (includeInactive ? products.findAllByOrderByCreatedAtDesc() : products.findAllByActiveTrueOrderByCreatedAtDesc())
                .stream()
                .filter(product -> query == null || query.isBlank()
                        || (product.getName() + " " + product.getCategory() + " " + product.getBrand()
                                + " " + product.getSku() + " " + product.getDescription())
                        .toLowerCase(Locale.ROOT)
                        .contains(query.trim().toLowerCase(Locale.ROOT)))
                .filter(product -> category == null || category.isBlank()
                        || product.getCategory().equalsIgnoreCase(category.trim()))
                .filter(product -> available == null || (product.getStock() > 0) == available)
                .map(product -> ProductResponse.from(product, sales.getOrDefault(product.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse get(String id) {
        Product product = products.findById(id).filter(Product::isActive)
                .orElseThrow(() -> new EntityNotFoundException("Product was not found."));
        return ProductResponse.from(product, salesCounts().getOrDefault(product.getId(), 0L));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> trending(Instant since) {
        Map<String, Long> sales = orderLines.findProductSalesSince(since).stream().collect(Collectors.toMap(
                ProductSales::getProductId, ProductSales::getQuantity, Long::sum));
        return products.findAllByActiveTrueOrderByCreatedAtDesc().stream()
                .filter(product -> sales.containsKey(product.getId()))
                .sorted(Comparator.comparingLong((Product product) -> sales.get(product.getId())).reversed())
                .limit(8)
                .map(product -> ProductResponse.from(product, sales.get(product.getId())))
                .toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        validatePrice(request);
        Product product = new Product();
        product.setId(slug(request.name()));
        copy(request, product);
        product.setCreatedAt(Instant.now());
        product.setActive(true);
        return ProductResponse.from(products.save(product));
    }

    @Transactional
    public ProductResponse update(String id, ProductRequest request) {
        validatePrice(request);
        Product product = products.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product was not found."));
        copy(request, product);
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse updateStock(String id, int stock) {
        if (stock < 0) {
            throw new IllegalArgumentException("Stock cannot be negative.");
        }
        Product product = products.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product was not found."));
        product.setStock(stock);
        return ProductResponse.from(product, salesCounts().getOrDefault(product.getId(), 0L));
    }

    @Transactional
    public void delete(String id) {
        Product product = products.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product was not found."));
        product.setActive(false);
    }

    private void copy(ProductRequest request, Product product) {
        if (request.stock() < 0) {
            throw new IllegalArgumentException("Stock cannot be negative.");
        }
        product.setName(request.name().trim());
        product.setCategory(request.category().trim());
        if (request.brand() != null && !request.brand().isBlank()) {
            product.setBrand(request.brand().trim());
        }
        if (request.sku() != null && !request.sku().isBlank()) {
            product.setSku(request.sku().trim());
        }
        product.setPrice(request.price());
        product.setSalePrice(request.salePrice());
        product.setDescription(request.description().trim());
        product.setImageUrl(request.imageUrl().trim());
        product.setGalleryImages(request.galleryImages() == null ? List.of() : request.galleryImages());
        product.setSizes(request.sizes());
        product.setColors(request.colors());
        product.setStock(request.stock());
        product.setBadge(request.badge() == null ? "" : request.badge().trim());
    }

    private void validatePrice(ProductRequest request) {
        if (request.salePrice() != null && request.salePrice().compareTo(request.price()) > 0) {
            throw new IllegalArgumentException("Sale price cannot exceed the regular price.");
        }
    }

    private String slug(String name) {
        String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return (base.isBlank() ? "product" : base) + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private Map<String, Long> salesCounts() {
        return orderLines.findProductSales().stream().collect(Collectors.toMap(
                ProductSales::getProductId, ProductSales::getQuantity, Long::sum));
    }
}
