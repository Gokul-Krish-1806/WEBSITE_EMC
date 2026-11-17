# ALR Fashion Store

ALR is a responsive Indian-fashion storefront served by a Java 17 / Spring Boot REST API and MySQL. The frontend is semantic HTML, CSS, and vanilla JavaScript; there is no frontend framework. The API is the source of truth for products, stock, accounts, wishlists, and orders.

## Requirements

- Java 17+
- Maven 3.9+
- MySQL 8.0+

## Configure MySQL

The local MySQL service may already be running. This project does not include or assume your MySQL password.

Run `.\database\setup-mysql.ps1` from the project folder. It securely prompts for the local MySQL root password, creates `alr_store` and a restricted `alr_app` user with a generated strong password, and saves that password encrypted for the current Windows account outside the project. Run this setup only while the application is stopped; it rotates the app-user password. Flyway applies the schema and sample catalogue on first startup. The application itself does not connect as root.

## Run locally

From `D:\GK\ALR Ecommerce website`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The launcher reads the encrypted app-user password, prompts for the administrator credentials, generates an ephemeral local JWT signing key, and starts Spring Boot. Open `http://localhost:8080/`. On later starts, enter the same administrator email and password; the existing admin account is not overwritten. The encrypted database password is tied to the Windows account that ran the setup script.

The first run provisions an administrator only if `ALR_ADMIN_EMAIL` is not already registered. Keep that account private. Customer registration is available from the storefront. If you prefer to set environment variables yourself, use `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (Base64 for at least 32 random bytes), `ALR_ADMIN_EMAIL`, `ALR_ADMIN_PASSWORD` (at least 12 characters), and then run `mvn spring-boot:run` from `backend`. An optional homepage countdown can be enabled by setting both `ALR_PROMO_MESSAGE` and `ALR_PROMO_END` (an ISO-8601 UTC timestamp); it stays hidden when not configured or after expiry.

## Build and test

```powershell
cd .\backend
mvn clean test
mvn package
```

Automated integration tests use an isolated in-memory H2 database and do not require your MySQL password or a running MySQL server. The packaged Spring Boot application serves both the pages and `/api`.

## Storefront

- `/` — responsive editorial homepage with rotating announcements, an accessible hero carousel, seasonal category edits, best sellers, recent 30-day trends, new arrivals, sale prices, and local browsing/wishlist/order-based shelves. A promotion countdown appears only when its message and UTC end time are configured. Homepage browsing history stays in the current browser; it is not sent to ALR. Reviews remain illustrative samples.
- `/pages/products.html` — search, category/size/colour/price/availability filters, and featured, newest, price, or sales-based sorting.
- `/pages/product-details.html?id=...` — product gallery, options, related pieces, and stock-aware add to bag.
- `/pages/cart.html` — browser-persisted cart, quantity controls, shipping, and totals.
- `/pages/wishlist.html` — local wishlist while signed out; account-synced wishlist when signed in.
- `/pages/login.html` and `/pages/register.html` — secure API authentication.
- `/pages/checkout.html` — authenticated cash-on-delivery order placement.
- `/pages/orders.html` — signed-in order history.
- `/pages/admin.html` — protected product, stock, multi-image gallery, order, and customer management.

Admins can mark an in-stock item out of stock from the product table. This sets its database stock to zero; customers immediately see an “Out of stock” label, and purchase controls are disabled. Admins can restore availability by editing the product stock.

## API outline

- `GET /api/health`
- `GET /api/products?q=&category=&available=` and `GET /api/products/{id}`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/wishlist`, `POST/DELETE /api/wishlist/{productId}`
- `POST /api/orders`, `GET /api/orders/mine`
- `POST /api/newsletter`
- Admin bearer-token endpoints: product CRUD, `GET /api/orders`, `PATCH /api/orders/{id}/status`, `POST /api/admin/uploads`, and customer/summary endpoints under `/api/admin`.

Orders recalculate prices and shipping on the server, lock inventory while placing an order, decrement stock transactionally, and persist the customer's address and item snapshots. Only cash on delivery is enabled; no online payment is collected. Passwords are BCrypt-hashed, and API routes use signed short-lived JWT bearer tokens with customer/admin roles. Uploaded product photos are limited to 300 KB and PNG/JPEG/WebP.

The seeded catalogue, photography links, and homepage reviews are demonstration content. Product photography requires an internet connection. Email delivery, a real payment gateway, and deployment-specific HTTPS/secrets still need configuring before production use.

The advanced storefront brief is being delivered in phases. Phase 1 covers the homepage; notification delivery, designer metadata, and other later-phase features are not represented as working integrations yet.
