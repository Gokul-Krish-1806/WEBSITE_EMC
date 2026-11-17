package com.alr.store.order;

import com.alr.store.auth.AppUser;
import com.alr.store.auth.AuthService;
import com.alr.store.product.Product;
import com.alr.store.product.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private final OrderRepository orders;
    private final ProductRepository products;
    private final AuthService auth;
    private final BigDecimal freeShippingThreshold;
    private final BigDecimal shippingFee;

    public OrderService(
            OrderRepository orders,
            ProductRepository products,
            AuthService auth,
            @Value("${app.shipping.free-threshold:4999}") BigDecimal freeShippingThreshold,
            @Value("${app.shipping.fee:149}") BigDecimal shippingFee) {
        this.orders = orders;
        this.products = products;
        this.auth = auth;
        this.freeShippingThreshold = freeShippingThreshold;
        this.shippingFee = shippingFee;
    }

    @Transactional
    public OrderResponse create(String subject, OrderRequest request) {
        AppUser user = auth.requireUser(subject);
        CustomerOrder order = new CustomerOrder();
        order.setOrderNumber("ALR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setUser(user);
        order.setCustomerName(request.name().trim());
        order.setCustomerEmail(request.email().trim().toLowerCase());
        order.setCustomerPhone(request.phone().trim());
        order.setHouse(request.house().trim());
        order.setStreet(request.street().trim());
        order.setCity(request.city().trim());
        order.setState(request.state().trim());
        order.setPinCode(request.pinCode().trim());
        order.setPayment("COD");
        order.setStatus(OrderStatus.PLACED);
        order.setCreatedAt(Instant.now());

        BigDecimal subtotal = ZERO;
        BigDecimal discount = ZERO;
        for (OrderRequest.Item requestedItem : request.items()) {
            Product product = products.findActiveByIdForUpdate(requestedItem.productId())
                    .orElseThrow(() -> new EntityNotFoundException("A product in your bag is no longer available."));
            if (product.getStock() < requestedItem.quantity()) {
                throw new IllegalArgumentException(product.getName() + " has only " + product.getStock() + " left.");
            }
            if (!product.getSizes().contains(requestedItem.size())) {
                throw new IllegalArgumentException("The selected size is not available for " + product.getName() + ".");
            }
            if (!product.getColors().contains(requestedItem.color())) {
                throw new IllegalArgumentException("The selected colour is not available for " + product.getName() + ".");
            }

            BigDecimal unitPrice = product.getSalePrice() == null ? product.getPrice() : product.getSalePrice();
            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(requestedItem.quantity())));
            discount = discount.add(product.getPrice().subtract(unitPrice)
                    .multiply(BigDecimal.valueOf(requestedItem.quantity())));
            product.setStock(product.getStock() - requestedItem.quantity());

            OrderLine line = new OrderLine();
            line.setProductId(product.getId());
            line.setProductName(product.getName());
            line.setImageUrl(product.getImageUrl());
            line.setSize(requestedItem.size());
            line.setColor(requestedItem.color());
            line.setQuantity(requestedItem.quantity());
            line.setUnitPrice(unitPrice);
            order.addItem(line);
        }

        BigDecimal shipping = subtotal.compareTo(freeShippingThreshold) >= 0 ? ZERO : shippingFee;
        order.setSubtotal(subtotal);
        order.setDiscount(discount);
        order.setShipping(shipping);
        order.setTotal(subtotal.add(shipping));
        return OrderResponse.from(orders.save(order));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> mine(String subject) {
        AppUser user = auth.requireUser(subject);
        return orders.findAllByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> all() {
        return orders.findAllByOrderByCreatedAtDesc().stream().map(OrderResponse::from).toList();
    }

    @Transactional
    public OrderResponse updateStatus(long id, OrderStatus nextStatus) {
        CustomerOrder order = orders.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order was not found."));
        OrderStatus current = order.getStatus();
        if (current == nextStatus) {
            return OrderResponse.from(order);
        }
        if (current == OrderStatus.DELIVERED || current == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("A completed order cannot change status.");
        }
        boolean valid = switch (current) {
            case PLACED -> nextStatus == OrderStatus.CONFIRMED || nextStatus == OrderStatus.CANCELLED;
            case CONFIRMED -> nextStatus == OrderStatus.SHIPPED || nextStatus == OrderStatus.CANCELLED;
            case SHIPPED -> nextStatus == OrderStatus.DELIVERED;
            default -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException("That order status transition is not allowed.");
        }
        if (nextStatus == OrderStatus.CANCELLED) {
            order.getItems().forEach(item -> products.findByIdForUpdate(item.getProductId())
                    .ifPresent(product -> product.setStock(product.getStock() + item.getQuantity())));
        }
        order.setStatus(nextStatus);
        return OrderResponse.from(order);
    }
}
