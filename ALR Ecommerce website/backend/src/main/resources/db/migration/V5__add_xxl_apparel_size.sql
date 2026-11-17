UPDATE products
SET sizes = CONCAT(sizes, '|XXL')
WHERE CONCAT('|', sizes, '|') LIKE '%|XL|%'
  AND CONCAT('|', sizes, '|') NOT LIKE '%|XXL|%';
