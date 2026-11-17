ALTER TABLE products
    ADD COLUMN brand VARCHAR(100) NOT NULL DEFAULT 'ALR Studio',
    ADD COLUMN sku VARCHAR(100) NULL;

UPDATE products
SET sku = CONCAT(
    'ALR-',
    LEFT(UPPER(id), 84),
    '-',
    UPPER(SUBSTRING(SHA2(id, 256), 1, 8))
);

ALTER TABLE products
    MODIFY COLUMN sku VARCHAR(100) NOT NULL,
    ADD UNIQUE KEY uk_products_sku (sku);
