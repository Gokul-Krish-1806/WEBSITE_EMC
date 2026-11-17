package com.alr.store.order;

import java.util.List;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<CustomerOrder, Long> {
    @EntityGraph(attributePaths = {"items", "user"})
    List<CustomerOrder> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"items", "user"})
    List<CustomerOrder> findAllByOrderByCreatedAtDesc();

    long countByUserId(Long userId);

    @Query("select coalesce(sum(o.total), 0) from CustomerOrder o where o.status <> com.alr.store.order.OrderStatus.CANCELLED")
    BigDecimal totalSales();
}
