package com.alr.store.order;

import java.util.List;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

public interface OrderLineRepository extends JpaRepository<OrderLine, Long> {
    @Query("""
            select line.productId as productId, sum(line.quantity) as quantity
            from OrderLine line join line.order customerOrder
            where customerOrder.status <> com.alr.store.order.OrderStatus.CANCELLED
            group by line.productId
            """)
    List<ProductSales> findProductSales();

    @Query("""
            select line.productId as productId, sum(line.quantity) as quantity
            from OrderLine line join line.order customerOrder
            where customerOrder.status <> com.alr.store.order.OrderStatus.CANCELLED
                and customerOrder.createdAt >= :since
            group by line.productId
            """)
    List<ProductSales> findProductSalesSince(@Param("since") Instant since);
}
