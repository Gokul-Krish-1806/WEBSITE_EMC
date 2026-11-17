package com.alr.store.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        String status,
        String customerName,
        String customerEmail,
        String customerPhone,
        String shippingAddress,
        String payment,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shipping,
        BigDecimal total,
        Instant createdAt,
        List<Item> items) {
    public static OrderResponse from(CustomerOrder order) {
        String address = String.join(", ", order.getHouse(), order.getStreet(),
                order.getCity(), order.getState(), order.getPinCode());
        List<Item> items = order.getItems().stream().map(item -> new Item(
                item.getProductId(), item.getProductName(), item.getImageUrl(), item.getSize(),
                item.getColor(), item.getQuantity(), item.getUnitPrice())).toList();
        return new OrderResponse(order.getId(), order.getOrderNumber(), order.getStatus().name(),
                order.getCustomerName(), order.getCustomerEmail(), order.getCustomerPhone(), address,
                order.getPayment(), order.getSubtotal(), order.getDiscount(), order.getShipping(),
                order.getTotal(), order.getCreatedAt(), items);
    }

    public record Item(String productId, String productName, String imageUrl, String size,
                       String color, int quantity, BigDecimal unitPrice) {
    }
}
