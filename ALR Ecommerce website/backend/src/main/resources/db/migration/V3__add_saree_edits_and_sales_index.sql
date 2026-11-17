CREATE INDEX idx_order_items_product ON order_items (product_id);

INSERT INTO products
(id, name, category, price, sale_price, description, image_url, sizes, colors, stock, active, badge, created_at)
VALUES
('kanchipuram-silk-saree', 'Kanchipuram Silk Saree', 'Sarees', 12990.00, NULL,
 'A luminous silk drape inspired by the richness of South Indian weaving traditions.',
 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Ruby|Gold', 8, TRUE, 'Silk edit', UTC_TIMESTAMP(6)),
('semi-silk-saree', 'Semi Silk Saree', 'Sarees', 4290.00, 3790.00,
 'A graceful, easy-care saree with a soft sheen for festive afternoons and family gatherings.',
 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Rose|Sandalwood', 10, TRUE, 'Everyday occasion', UTC_TIMESTAMP(6)),
('soft-silk-saree', 'Soft Silk Saree', 'Sarees', 7690.00, NULL,
 'An easy-draping silk with a fluid hand and an understated finish for special days.',
 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Sage|Antique gold', 7, TRUE, 'Soft silk', UTC_TIMESTAMP(6)),
('sungudi-cotton-saree', 'Sungudi Cotton Saree', 'Sarees', 3490.00, NULL,
 'A breathable cotton saree with a cheerful print and a light, comfortable drape.',
 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Indigo|Marigold', 14, TRUE, 'Handloom edit', UTC_TIMESTAMP(6)),
('maheshwari-silk-cotton-saree', 'Maheshwari Silk Cotton Saree', 'Sarees', 5690.00, 4990.00,
 'A light silk-cotton weave with a fine border, made for long celebrations and easy movement.',
 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Terracotta|Ivory', 9, TRUE, 'Silk cotton', UTC_TIMESTAMP(6)),
('bridal-silk-saree', 'Bridal Silk Saree', 'Sarees', 18990.00, NULL,
 'A keepsake-worthy occasion saree with a rich colour story and considered finishing details.',
 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=82',
 'Free size', 'Garnet|Gold', 4, TRUE, 'Bridal edit', UTC_TIMESTAMP(6));
