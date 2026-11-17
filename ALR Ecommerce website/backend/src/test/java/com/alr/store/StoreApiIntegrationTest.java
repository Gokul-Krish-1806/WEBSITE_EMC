package com.alr.store;

import static org.assertj.core.api.Assertions.assertThat;

import com.alr.store.auth.AuthResponse;
import com.alr.store.auth.LoginRequest;
import com.alr.store.auth.RegisterRequest;
import com.alr.store.order.OrderRequest;
import com.alr.store.order.OrderResponse;
import com.alr.store.product.Product;
import com.alr.store.product.ProductRequest;
import com.alr.store.product.ProductRepository;
import com.alr.store.product.ProductResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StoreApiIntegrationTest {
    @Autowired
    private TestRestTemplate http;

    @Autowired
    private ProductRepository products;

    @Test
    void healthAndCatalogArePublic() {
        ResponseEntity<String> health = http.getForEntity("/api/health", String.class);
        assertThat(health.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(health.getBody()).contains("\"status\":\"ok\"");
        ResponseEntity<String> trending = http.getForEntity("/api/storefront/trending", String.class);
        assertThat(trending.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(trending.getBody()).isEqualTo("[]");
        ResponseEntity<String> promotion = http.getForEntity("/api/storefront/promotion", String.class);
        assertThat(promotion.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(promotion.getBody()).contains("\"active\":false");
        ResponseEntity<String> homepage = http.getForEntity("/", String.class);
        assertThat(homepage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(homepage.getBody()).contains("ALR — Made for your moments");
        ResponseEntity<String> productsPage = http.getForEntity("/pages/products.html", String.class);
        assertThat(productsPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(productsPage.getBody()).contains("data-page=\"products\"");

        Product product = createProduct();
        ResponseEntity<String> catalog = http.getForEntity("/api/products", String.class);
        assertThat(catalog.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(catalog.getBody()).contains(product.getId());
        ResponseEntity<ProductResponse[]> searched = http.getForEntity(
                "/api/products?q=" + product.getSku(), ProductResponse[].class);
        assertThat(searched.getBody()).hasSize(1);
        assertThat(searched.getBody()[0].brand()).isEqualTo("ALR Studio");
    }

    @Test
    void registrationAuthenticationAndOrderUseDatabasePricesAndStock() {
        Product product = createProduct();
        RegisterRequest request = new RegisterRequest(
                "Test Customer", "customer-" + UUID.randomUUID() + "@example.test",
                "+919876543210", "strong-test-password-2026");
        ResponseEntity<AuthResponse> registered = http.postForEntity("/api/auth/register", request, AuthResponse.class);
        assertThat(registered.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(registered.getBody()).isNotNull();
        String customerToken = registered.getBody().accessToken();

        ResponseEntity<AuthResponse> loggedIn = http.postForEntity("/api/auth/login",
                new LoginRequest(request.email(), request.password()), AuthResponse.class);
        assertThat(loggedIn.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loggedIn.getBody().user().email()).isEqualTo(request.email());

        OrderRequest checkout = new OrderRequest(
                "Test Customer", "+919876543210", request.email(), "12", "Sample Street",
                "Chennai", "Tamil Nadu", "600001", "COD",
                List.of(new OrderRequest.Item(product.getId(), "M", "Sage", 2)));
        ResponseEntity<OrderResponse> placed = http.exchange("/api/orders", HttpMethod.POST,
                authenticated(customerToken, checkout), OrderResponse.class);

        assertThat(placed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(placed.getBody().subtotal()).isEqualByComparingTo("2400.00");
        assertThat(placed.getBody().discount()).isEqualByComparingTo("600.00");
        assertThat(placed.getBody().shipping()).isEqualByComparingTo("149.00");
        assertThat(placed.getBody().total()).isEqualByComparingTo("2549.00");
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(3);
        ResponseEntity<String> trending = http.getForEntity("/api/storefront/trending", String.class);
        assertThat(trending.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(trending.getBody()).contains(product.getId()).contains("\"salesCount\":2");

        ResponseEntity<String> customerOrders = http.exchange("/api/orders/mine", HttpMethod.GET,
                authenticated(customerToken, null), String.class);
        assertThat(customerOrders.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(customerOrders.getBody()).contains(placed.getBody().orderNumber());

        AuthResponse admin = http.postForObject("/api/auth/login",
                new LoginRequest("admin@test.alr", "admin-test-password-2026"), AuthResponse.class);
        ResponseEntity<Map> salesBeforeCancellation = http.exchange("/api/admin/summary", HttpMethod.GET,
                authenticated(admin.accessToken(), null), Map.class);
        BigDecimal totalSalesBeforeCancellation = new BigDecimal(
                String.valueOf(salesBeforeCancellation.getBody().get("sales")));
        ResponseEntity<OrderResponse> cancelled = http.exchange(
                "/api/orders/" + placed.getBody().id() + "/status", HttpMethod.PATCH,
                authenticated(admin.accessToken(), Map.of("status", "CANCELLED")), OrderResponse.class);
        assertThat(cancelled.getBody().status()).isEqualTo("CANCELLED");
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(5);
        ResponseEntity<Map> salesAfterCancellation = http.exchange("/api/admin/summary", HttpMethod.GET,
                authenticated(admin.accessToken(), null), Map.class);
        BigDecimal totalSalesAfterCancellation = new BigDecimal(
                String.valueOf(salesAfterCancellation.getBody().get("sales")));
        assertThat(totalSalesAfterCancellation)
                .isEqualByComparingTo(totalSalesBeforeCancellation.subtract(placed.getBody().total()));
    }

    @Test
    void adminRoutesRejectCustomersAndAllowProvisionedAdmin() {
        RegisterRequest customer = new RegisterRequest("Another Customer",
                "another-" + UUID.randomUUID() + "@example.test", "+919876543211", "strong-test-password-2026");
        AuthResponse customerAuth = http.postForObject("/api/auth/register", customer, AuthResponse.class);
        ResponseEntity<String> forbidden = http.exchange("/api/orders", HttpMethod.GET,
                authenticated(customerAuth.accessToken(), null), String.class);
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        AuthResponse admin = http.postForObject("/api/auth/login",
                new LoginRequest("admin@test.alr", "admin-test-password-2026"), AuthResponse.class);
        ResponseEntity<String> summary = http.exchange("/api/admin/summary", HttpMethod.GET,
                authenticated(admin.accessToken(), null), String.class);
        assertThat(summary.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(summary.getBody()).contains("\"sales\"");
        ResponseEntity<String> customers = http.exchange("/api/admin/customers", HttpMethod.GET,
                authenticated(admin.accessToken(), null), String.class);
        assertThat(customers.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(customers.getBody()).contains(customer.email());
    }

    @Test
    void wishlistNewsletterAndAdminProductManagementWork() {
        Product product = createProduct();
        RegisterRequest request = new RegisterRequest(
                "Wishlist Customer", "wishlist-" + UUID.randomUUID() + "@example.test",
                "+919876543212", "strong-test-password-2026");
        AuthResponse customer = http.postForObject("/api/auth/register", request, AuthResponse.class);

        ResponseEntity<Void> saved = http.exchange("/api/wishlist/" + product.getId(), HttpMethod.POST,
                authenticated(customer.accessToken(), null), Void.class);
        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        ResponseEntity<String> wishlist = http.exchange("/api/wishlist", HttpMethod.GET,
                authenticated(customer.accessToken(), null), String.class);
        assertThat(wishlist.getBody()).contains(product.getId());

        ResponseEntity<Map> subscription = http.postForEntity("/api/newsletter",
                Map.of("email", "newsletter-" + UUID.randomUUID() + "@example.test"), Map.class);
        assertThat(subscription.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(subscription.getBody()).containsKey("message");

        AuthResponse admin = http.postForObject("/api/auth/login",
                new LoginRequest("admin@test.alr", "admin-test-password-2026"), AuthResponse.class);
        ProductRequest newProduct = new ProductRequest(
                "Admin-created Kurti", "Kurtis", new BigDecimal("2100.00"),
                null, "A new item.", "https://example.test/kurti.jpg",
                List.of("https://example.test/kurti-detail.jpg"),
                List.of("S", "M"), List.of("Ivory"), 7, "New", "Test Studio", "TS-KURTI-001");
        ResponseEntity<ProductResponse> created = http.exchange("/api/products", HttpMethod.POST,
                authenticated(admin.accessToken(), newProduct), ProductResponse.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody().stock()).isEqualTo(7);
        assertThat(created.getBody().galleryImages()).containsExactly("https://example.test/kurti-detail.jpg");
        assertThat(created.getBody().brand()).isEqualTo("Test Studio");
        assertThat(created.getBody().sku()).isEqualTo("TS-KURTI-001");

        ResponseEntity<ProductResponse> outOfStock = http.exchange(
                "/api/products/" + created.getBody().id() + "/stock", HttpMethod.PATCH,
                authenticated(admin.accessToken(), Map.of("stock", 0)), ProductResponse.class);
        assertThat(outOfStock.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(outOfStock.getBody().stock()).isZero();
        ResponseEntity<ProductResponse> customerProduct = http.getForEntity(
                "/api/products/" + created.getBody().id(), ProductResponse.class);
        assertThat(customerProduct.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(customerProduct.getBody().stock()).isZero();
        assertThat(customerProduct.getBody().active()).isTrue();

        ResponseEntity<String> forbiddenStockUpdate = http.exchange(
                "/api/products/" + created.getBody().id() + "/stock", HttpMethod.PATCH,
                authenticated(customer.accessToken(), Map.of("stock", 5)), String.class);
        assertThat(forbiddenStockUpdate.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<Void> removed = http.exchange("/api/products/" + created.getBody().id(),
                HttpMethod.DELETE, authenticated(admin.accessToken(), null), Void.class);
        assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    private Product createProduct() {
        String id = "test-" + UUID.randomUUID();
        Product product = new Product();
        product.setId(id);
        product.setName("Test Kurti");
        product.setCategory("Kurtis");
        product.setPrice(new BigDecimal("1500.00"));
        product.setSalePrice(new BigDecimal("1200.00"));
        product.setDescription("A test product for the API.");
        product.setImageUrl("https://example.test/test.jpg");
        product.setGalleryImages(List.of());
        product.setSizes(List.of("S", "M", "L"));
        product.setColors(List.of("Ivory", "Sage"));
        product.setStock(5);
        product.setActive(true);
        product.setBadge("");
        product.setCreatedAt(Instant.now());
        return products.save(product);
    }

    private HttpEntity<?> authenticated(String jwt, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }
}
