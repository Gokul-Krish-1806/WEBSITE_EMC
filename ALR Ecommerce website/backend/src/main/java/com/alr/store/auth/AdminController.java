package com.alr.store.auth;

import com.alr.store.order.OrderRepository;
import com.alr.store.order.OrderResponse;
import com.alr.store.product.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AppUserRepository users;
    private final OrderRepository orders;
    private final ProductRepository products;

    public AdminController(AppUserRepository users, OrderRepository orders, ProductRepository products) {
        this.users = users;
        this.orders = orders;
        this.products = products;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
                "products", products.countByActiveTrue(),
                "customers", users.countByRole(UserRole.CUSTOMER),
                "orders", orders.count(),
                "sales", orders.totalSales() == null ? BigDecimal.ZERO : orders.totalSales());
    }

    @GetMapping("/customers")
    public List<CustomerResponse> customers(@RequestParam(required = false) String q) {
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        return users.findTop100ByRoleOrderByCreatedAtDesc(UserRole.CUSTOMER).stream()
                .filter(user -> query.isBlank() || (user.getName() + " " + user.getEmail() + " "
                        + user.getPhone()).toLowerCase(Locale.ROOT).contains(query))
                .map(user -> CustomerResponse.from(user, orders.countByUserId(user.getId())))
                .toList();
    }

    @GetMapping("/customers/{id}/orders")
    public List<OrderResponse> customerOrders(@PathVariable long id) {
        if (!users.existsById(id)) {
            throw new EntityNotFoundException("Customer was not found.");
        }
        return orders.findAllByUserIdOrderByCreatedAtDesc(id).stream()
                .map(OrderResponse::from).toList();
    }
}
