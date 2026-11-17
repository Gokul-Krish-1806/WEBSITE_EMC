const API = "/api";
const CART_KEY = "alr-store-cart";
const WISHLIST_KEY = "alr-store-wishlist";
const TOKEN_KEY = "alr-access-token";
const USER_KEY = "alr-current-user";
const VIEW_HISTORY_KEY = "alr-product-view-history";
const FREE_SHIPPING = 4999;
const SHIPPING_FEE = 149;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const page = document.body.dataset.page;
let products = [];
let orders = [];
let accountWishlist = new Set();
let activeToast;
let announcementTimer;
let heroTimer;
let promotionTimer;

function stored(key, fallback, validate) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (validate(value)) return value;
    throw new TypeError(`Invalid ${key} data.`);
  } catch (error) {
    console.error(`Could not read saved ALR data (${key}).`, error);
    localStorage.removeItem(key);
    return fallback;
  }
}

function cartItems() {
  return stored(CART_KEY, [], value => Array.isArray(value) && value.every(item =>
    item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0));
}

function wishlistIds() {
  return stored(WISHLIST_KEY, [], value => Array.isArray(value) && value.every(id => typeof id === "string"));
}

function productViewHistory() {
  return stored(VIEW_HISTORY_KEY, [], value => Array.isArray(value) && value.every(entry =>
    entry && typeof entry.id === "string" && Number.isInteger(entry.views) && entry.views > 0
    && typeof entry.lastViewedAt === "number"));
}

function rememberProductView(productId) {
  const history = productViewHistory();
  const existing = history.find(entry => entry.id === productId);
  if (existing) {
    existing.views += 1;
    existing.lastViewedAt = Date.now();
  } else {
    history.push({ id: productId, views: 1, lastViewedAt: Date.now() });
  }
  history.sort((a, b) => b.lastViewedAt - a.lastViewedAt);
  localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCounts();
}

function token() {
  return sessionStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const body = await response.text();
  let payload = null;
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch (error) {
      if (response.ok) throw new Error("The server returned an invalid response.");
    }
  }
  if (!response.ok) {
    if (response.status === 401 && token()) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      updateCounts();
    }
    throw new Error(payload?.message || `Request failed (${response.status}).`);
  }
  if (payload === null) throw new Error("The server returned an empty response.");
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function price(product) {
  return Number(product.salePrice || product.price);
}

function user() {
  try { return JSON.parse(sessionStorage.getItem(USER_KEY) || "null"); }
  catch (error) {
    console.error("Could not read the signed-in profile.", error);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

function updateCounts() {
  const count = cartItems().reduce((total, item) => total + item.quantity, 0);
  const cartBadge = document.getElementById("cart-count");
  const wishlistBadge = document.getElementById("wishlist-count");
  if (cartBadge) cartBadge.textContent = count;
  if (wishlistBadge) wishlistBadge.textContent = token() ? accountWishlist.size : wishlistIds().length;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(activeToast);
  activeToast = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function headerMarkup() {
  const count = cartItems().reduce((total, item) => total + item.quantity, 0);
  const savedUser = user();
  return `<div class="announcement" data-announcement-rotator><a id="announcement-link" href="/pages/products.html" aria-live="polite"><span id="announcement-message">Complimentary shipping over ₹4,999</span></a><span class="announcement-index" id="announcement-index"></span></div>
    <header class="site-header"><div class="header-inner">
      <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>
      <a class="brand" href="/" aria-label="ALR home">ALR<span>.</span></a>
      <nav class="primary-nav" id="primary-nav" aria-label="Main navigation">
        <a href="/">Home</a><a href="/pages/products.html?category=Sarees">Sarees</a><a href="/pages/products.html?category=Kurtis">Kurti</a>
        <a href="/pages/products.html?category=Short%20kurtis">Short kurti</a><a href="/pages/products.html?category=Maxi%20dresses">Maxi</a><a href="/pages/products.html?category=Nightwear">Nighties</a>
        <a href="/pages/products.html?category=Western%20wear">Western wear</a><a href="/pages/products.html?category=Co-ord%20sets">Co-ord sets</a>
        <a href="/pages/products.html?category=Jewellery">Jewellery</a><a href="/pages/products.html?category=Partywear">Partywear</a>
      </nav>
      <div class="header-actions">
        <a class="icon-link" href="/pages/products.html" aria-label="Search products">⌕ <span>Search</span></a>
        <a class="icon-link" href="${savedUser ? "/pages/orders.html" : "/pages/login.html"}" aria-label="${savedUser ? "Your account" : "Sign in"}">♙ <span>${savedUser ? "Account" : "Sign in"}</span></a>
        <a class="icon-link" href="/pages/wishlist.html" aria-label="Wishlist">♡ <span id="wishlist-count">${token() ? accountWishlist.size : wishlistIds().length}</span></a>
        <a class="icon-link" href="/pages/cart.html" aria-label="Shopping bag">Bag <span id="cart-count">${count}</span></a>
      </div>
    </div></header>`;
}

function footerMarkup() {
  return `<footer class="site-footer"><div class="footer-grid">
    <div class="footer-brand"><a class="brand" href="/">ALR<span>.</span></a><p>Indian craft, considered for the way we live today. Made for your moments, big and small.</p><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram ↗</a></div>
    <div class="footer-links"><h3>Explore</h3><a href="/pages/products.html?category=Sarees">Sarees</a><a href="/pages/products.html?category=Kurtis">Kurtis</a><a href="/pages/products.html?category=Co-ord%20sets">Co-ord sets</a><a href="/pages/products.html?category=Jewellery">Jewellery</a></div>
    <div class="footer-links"><h3>We're here</h3><a href="mailto:hello@alr.studio">Contact us</a><a href="/pages/checkout.html">Shipping & returns</a><a href="#privacy">Privacy policy</a><a href="#terms">Terms & conditions</a></div>
    <div class="footer-links"><h3>Your ALR</h3><a href="/pages/login.html">Sign in</a><a href="/pages/register.html">Create account</a><a href="/pages/orders.html">Order history</a><a href="/pages/admin.html">Store admin</a></div>
  </div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ALR Studio. All rights reserved.</span><span>Thoughtfully made, thoughtfully worn · India · INR ₹</span></div></footer>`;
}

function productCard(product) {
  const wished = token() ? accountWishlist.has(product.id) : wishlistIds().includes(product.id);
  const outOfStock = product.stock <= 0;
  return `<article class="product-card${outOfStock ? " is-out-of-stock" : ""}"><div class="product-picture">
    <a href="/pages/product-details.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}"><img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy"></a>
    ${outOfStock ? `<span class="product-badge out-of-stock-badge">Out of stock</span>` : product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
    <button class="heart-button" type="button" data-action="wishlist" data-id="${escapeHtml(product.id)}" aria-label="Toggle ${escapeHtml(product.name)} wishlist" aria-pressed="${wished}">♡</button>
    <div class="product-actions"><button type="button" data-action="details" data-id="${escapeHtml(product.id)}">Quick view</button><button type="button" data-action="details" data-id="${escapeHtml(product.id)}">Choose options</button></div>
  </div><div class="product-meta"><div><h3 class="product-name"><a href="/pages/product-details.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
    <p class="product-type">${escapeHtml(product.category)}</p><span class="product-stock${outOfStock ? " is-out-of-stock" : ""}">${outOfStock ? "Out of stock" : `${product.stock} ready to ship`}</span></div>
    <p class="product-price">${product.salePrice ? `<del>${money.format(product.price)}</del>` : ""}${money.format(price(product))}</p></div></article>`;
}

function sectionTitle(label, title, link = "/pages/products.html") {
  return `<div class="section-heading"><div><span class="eyebrow">${escapeHtml(label)}</span><h2>${escapeHtml(title)}</h2></div><a class="text-link" href="${link}">View collection →</a></div>`;
}

function homepageProductSection(label, title, list, link, note = "") {
  if (!list.length) return "";
  return `<section class="section">${sectionTitle(label, title, link)}${note ? `<p class="form-help">${escapeHtml(note)}</p>` : ""}<div class="product-grid">${list.slice(0, 4).map(productCard).join("")}</div></section>`;
}

function startHomepageFeatures() {
  clearInterval(announcementTimer);
  clearInterval(heroTimer);
  clearInterval(promotionTimer);
  const announcements = [
    ["Complimentary shipping on orders over ₹4,999", "/pages/products.html"],
    ["Cash on delivery is available", "/pages/products.html"],
    ["Discover the new ALR season", "/pages/products.html"]
  ];
  let announcementIndex = 0;
  const updateAnnouncement = () => {
    const message = document.getElementById("announcement-message");
    const link = document.getElementById("announcement-link");
    const index = document.getElementById("announcement-index");
    if (!message || !link || !index) return;
    message.textContent = announcements[announcementIndex][0];
    link.href = announcements[announcementIndex][1];
    index.textContent = `${announcementIndex + 1} / ${announcements.length}`;
  };
  updateAnnouncement();

  const slides = [...document.querySelectorAll("[data-hero-slide]")];
  let activeSlide = 0;
  const showSlide = next => {
    if (!slides.length) return;
    activeSlide = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeSlide);
      slide.setAttribute("aria-hidden", String(index !== activeSlide));
    });
    document.querySelectorAll(".hero-dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeSlide);
      dot.setAttribute("aria-pressed", String(index === activeSlide));
    });
  };
  document.querySelectorAll(".hero-dot").forEach((dot, index) => {
    dot.addEventListener("click", () => showSlide(index));
  });
  document.querySelector('[data-action="hero-previous"]')?.addEventListener("click", () => showSlide(activeSlide - 1));
  document.querySelector('[data-action="hero-next"]')?.addEventListener("click", () => showSlide(activeSlide + 1));

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    announcementTimer = setInterval(() => {
      announcementIndex = (announcementIndex + 1) % announcements.length;
      updateAnnouncement();
    }, 5000);
    if (slides.length > 1) heroTimer = setInterval(() => showSlide(activeSlide + 1), 6500);
  }

  loadHomepagePromotion();
}

async function loadHomepagePromotion() {
  try {
    const promotion = await api("/storefront/promotion");
    const section = document.getElementById("homepage-promotion");
    const message = document.getElementById("promotion-message");
    const countdown = document.getElementById("promotion-countdown");
    if (!promotion.active || !section || !message || !countdown) return;
    const endsAt = Date.parse(promotion.endsAt);
    if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
      throw new Error("The configured promotion expiry is invalid or has passed.");
    }
    message.textContent = promotion.message;
    section.hidden = false;
    const updateCountdown = () => {
      const remaining = Math.max(0, endsAt - Date.now());
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      if (remaining === 0) {
        clearInterval(promotionTimer);
        countdown.textContent = "This offer has ended.";
      }
    };
    updateCountdown();
    promotionTimer = setInterval(updateCountdown, 1000);
  } catch (error) {
    console.error("Could not load the configured homepage promotion.", error);
    showToast(`Homepage promotion couldn't load: ${error.message}`);
  }
}

function renderHeroCarousel() {
  const slides = [
    ["The new season · ALR Studio", "Made for your moments.", "Indian craft, thoughtful details, and pieces that feel like you—wherever the day takes you.", "/pages/products.html", "Shop the collection", "photo-1610030469983-98e550d6193c"],
    ["Woven with a story", "A saree, your way.", "Discover considered drapes inspired by India's rich weaving traditions.", "/pages/products.html?category=Sarees", "Explore sarees", "photo-1594633312681-425c7b97ccd1"],
    ["Easy does it", "Everyday, elevated.", "Thoughtful kurtis and relaxed silhouettes for all the little moments.", "/pages/products.html?category=Kurtis", "Find your edit", "photo-1598033129183-c4f50c736f10"]
  ];
  return `<section class="hero" aria-roledescription="carousel" aria-label="ALR seasonal collections">
    ${slides.map(([eyebrow, title, description, href, label, photo], index) => `<article class="hero-slide${index === 0 ? " is-active" : ""}" data-hero-slide="${index}" aria-hidden="${index !== 0}" style="--hero-image:url('https://images.unsplash.com/${photo}?auto=format&fit=crop&w=2000&q=88')"><div class="hero-content"><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><div class="button-row"><a class="button button-light" href="${href}">${escapeHtml(label)} <span>→</span></a><a class="button button-outline" href="#story">Our story</a></div></div></article>`).join("")}
    <div class="hero-controls"><button class="hero-arrow" type="button" data-action="hero-previous" aria-label="Previous collection">←</button><div class="hero-dots">${slides.map((_, index) => `<button class="hero-dot${index === 0 ? " is-active" : ""}" type="button" data-action="hero-slide" data-slide="${index}" aria-label="Show collection ${index + 1}" aria-pressed="${index === 0}"></button>`).join("")}</div><button class="hero-arrow" type="button" data-action="hero-next" aria-label="Next collection">→</button></div>
  </section>`;
}

async function renderHome() {
  const categories = [
    ["Sarees", "photo-1610030469983-98e550d6193c"], ["Kurtis", "photo-1598033129183-c4f50c736f10"],
    ["Short kurtis", "photo-1591047139829-d91aecb6caea"], ["Maxi dresses", "photo-1597983073493-88cd35cf93b0"],
    ["Nightwear", "photo-1609357605129-26f69add5d6e"], ["Western wear", "photo-1529139574466-a303027c1d8b"],
    ["Co-ord sets", "photo-1617627143750-d86bc21e42bb"], ["Partywear", "photo-1594633312681-425c7b97ccd1"],
    ["Jewellery", "photo-1617038220319-276d3cfab638"]
  ];
  const history = productViewHistory();
  const viewedIds = history.map(entry => entry.id);
  const viewedProducts = viewedIds.map(id => products.find(product => product.id === id)).filter(Boolean);
  const popularForYou = [...history].sort((a, b) => b.views - a.views || b.lastViewedAt - a.lastViewedAt)
    .map(entry => products.find(product => product.id === entry.id)).filter(Boolean);
  const newest = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const bestSellers = [...products].filter(product => (product.salesCount || 0) > 0)
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  const saleProducts = [...products].filter(product => product.salePrice && Number(product.salePrice) < Number(product.price))
    .sort((a, b) => (Number(a.salePrice) / Number(a.price)) - (Number(b.salePrice) / Number(b.price)));
  const savedIds = token() ? [...accountWishlist] : wishlistIds();
  const savedProducts = savedIds.map(id => products.find(product => product.id === id)).filter(Boolean);
  const affinityProducts = [...viewedProducts, ...savedProducts];
  const categoryAffinity = affinityProducts.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});
  const preferredCategory = Object.entries(categoryAffinity).sort((a, b) => b[1] - a[1])[0]?.[0];
  const recommendations = preferredCategory
    ? products.filter(product => product.category === preferredCategory
      && !savedIds.includes(product.id) && !viewedIds.includes(product.id)).slice(0, 4)
    : [];
  let trendingProducts = [];
  try {
    trendingProducts = await api("/storefront/trending");
  } catch (error) {
    console.error("Could not load recently trending products.", error);
    showToast(`Trending products couldn't load: ${error.message}`);
  }
  let purchasedProducts = [];
  if (token()) {
    try {
      const customerOrders = await api("/orders/mine");
      const purchasedIds = [...new Set(customerOrders
        .filter(order => order.status !== "CANCELLED")
        .flatMap(order => order.items.map(item => item.productId)))];
      purchasedProducts = purchasedIds.map(id => products.find(product => product.id === id)).filter(Boolean);
    } catch (error) {
      console.error("Could not load recently purchased homepage recommendations.", error);
      showToast(`Your recent purchases couldn't load: ${error.message}`);
    }
  }
  return `${renderHeroCarousel()}
    <section class="section" id="seasonal-collections">${sectionTitle("The season, considered", "Explore the collection edits")}<div class="category-grid">${categories.map(([name, photo]) => `<a class="category-card" href="/pages/products.html?category=${encodeURIComponent(name)}"><img src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=700&q=80" alt="${escapeHtml(name)} collection" loading="lazy"><span>${escapeHtml(name)}</span></a>`).join("")}</div></section>
  ${homepageProductSection("Purchased in the last 30 days", "Trending now", trendingProducts, "/pages/products.html", "Ranked from non-cancelled order quantities in the last 30 days.")}
    ${homepageProductSection("Chosen by ALR customers", "Best sellers", bestSellers, "/pages/products.html?sort=best-selling", "Ranked using completed, non-cancelled order quantities.")}
    ${homepageProductSection("A fresh point of view", "Recently added", newest, "/pages/products.html?sort=newest")}
    ${homepageProductSection("A little something for later", "Your saved pieces", savedProducts, "/pages/wishlist.html")}
    ${homepageProductSection("A familiar favourite", "Recently viewed", viewedProducts, "/pages/products.html", "Stored only in this browser on this device.")}
    ${homepageProductSection("Most viewed on this device", "Most viewed by you", popularForYou, "/pages/products.html", "View counts are private to this browser and are not shared with ALR.")}
    ${homepageProductSection("Picked from your interests", "A few more to love", recommendations, preferredCategory ? `/pages/products.html?category=${encodeURIComponent(preferredCategory)}` : "/pages/products.html", "Simple recommendations based on categories you viewed or saved; not AI-generated.")}
    ${homepageProductSection("Welcome back", "Recently purchased", purchasedProducts, "/pages/orders.html", "From your completed account order history.")}
    ${homepageProductSection("Seasonal highlights", "Special prices", saleProducts, "/pages/products.html", "Current catalogue sale prices; availability is checked at checkout.")}
    <section class="section">${sectionTitle("Woven with a story", "The saree collection", "/pages/products.html?category=Sarees")}<div class="saree-links">${[
      ["Kanchipuram silk", "kanchipuram"], ["Semi silk", "semi"], ["Soft silk", "soft"], ["Sungudi", "sungudi"], ["Maheshwari silk cotton", "maheshwari"], ["Bridal sarees", "bridal"]
    ].map(([label, query]) => `<a href="/pages/products.html?category=Sarees&q=${query}"><span>${escapeHtml(label)}</span><span aria-hidden="true">→</span></a>`).join("")}</div></section>
    <section class="story" id="story"><div class="story-image" role="img" aria-label="A look from the ALR collection"></div><div class="story-copy"><span class="eyebrow">A little about us</span><h2>Rooted in craft.<br>Made for now.</h2><p>We believe the things we wear should carry a little meaning. ALR brings Indian-inspired textiles, considered silhouettes and everyday ease together, for every version of your day.</p><a class="button button-dark" href="/pages/products.html">Discover ALR →</a></div></section>
    <section class="promo"><span class="eyebrow">For every celebration</span><h2>Wear the moments that matter.</h2><p>Find something lovely for your next little (or big) occasion.</p><a class="button button-light" href="/pages/products.html?category=Partywear">Explore occasionwear →</a></section>
    <section class="promo-countdown" id="homepage-promotion" hidden aria-live="polite"><div><span class="eyebrow">A little time, a lovely offer</span><h2 id="promotion-message"></h2></div><div class="countdown-clock" id="promotion-countdown" aria-label="Promotion time remaining"></div></section>
    <section class="section"><div class="section-heading"><div><span class="eyebrow">A note from our community</span><h2>Kind words, kindly worn</h2></div></div><div class="reviews"><article class="review"><span class="review-stars">★★★★★</span><p>“Beautifully finished, and the colour is even lovelier in person. I felt completely at home in it.”</p><strong>Sample review · Gulmohar Silk Saree</strong></article><article class="review"><span class="review-stars">★★★★★</span><p>“The fit is so comfortable and the details are thoughtful. Already planning what to wear it with next.”</p><strong>Sample review · Noor Embroidered Kurti</strong></article><article class="review"><span class="review-stars">★★★★★</span><p>“A lovely set that feels special without trying too hard. It arrived beautifully packed, too.”</p><strong>Sample review · Meher Co-ord Set</strong></article></div><p class="form-help">Reviews shown are illustrative samples, not verified customer submissions.</p></section>
    <section class="section instagram-section"><div class="section-heading"><div><span class="eyebrow">Follow our style</span><h2>A little ALR, out in the world</h2></div><a class="text-link" href="https://www.instagram.com/" target="_blank" rel="noreferrer">Find us on Instagram ↗</a></div><div class="instagram-grid">${["photo-1610030469983-98e550d6193c", "photo-1598033129183-c4f50c736f10", "photo-1617627143750-d86bc21e42bb", "photo-1597983073493-88cd35cf93b0"].map((photo, index) => `<a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="ALR style inspiration ${index + 1}"><img src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy"></a>`).join("")}</div><p class="form-help">Editorial inspiration from the ALR collection.</p></section>
    <section class="newsletter"><span class="eyebrow">The ALR letter</span><h2>A little loveliness in your inbox.</h2><p>New collections, thoughtful stories, and notes from the studio.</p><form class="newsletter-form" id="newsletter-form"><label class="sr-only" for="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" placeholder="Your email address" required maxlength="254"><button class="button button-dark" type="submit">Subscribe →</button></form></section>
    <a class="whatsapp-support" href="https://wa.me/?text=Hello%20ALR%2C%20I%20need%20help%20with%20your%20store." target="_blank" rel="noreferrer" aria-label="Contact ALR on WhatsApp"><span aria-hidden="true">◉</span><span class="whatsapp-label">Chat with us</span></a>`;
}

function renderProducts() {
  const category = new URLSearchParams(location.search).get("category") || "";
  const query = new URLSearchParams(location.search).get("q") || "";
  const requestedSort = new URLSearchParams(location.search).get("sort") || "";
  const sort = ["featured", "newest", "low", "high", "best-selling"].includes(requestedSort)
    ? requestedSort : "featured";
  const categories = [...new Set(products.map(product => product.category))].sort();
  const colors = [...new Set(products.flatMap(product => product.colors))].sort();
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / The collection</p><div class="page-heading"><span class="eyebrow">Considered pieces, made to be worn</span><h1>Shop the collection</h1><p>Discover the pieces that make every day feel a little more like your own.</p></div>
    <div class="filter-bar"><label class="sr-only" for="search-products">Search products</label><input id="search-products" type="search" placeholder="Search by name or category…" value="${escapeHtml(query)}"><select id="filter-category" aria-label="Category"><option value="">All categories</option>${categories.map(item => `<option value="${escapeHtml(item)}" ${item.toLowerCase() === category.toLowerCase() ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select><select id="filter-size" aria-label="Size"><option value="">All sizes</option>${["XS", "S", "M", "L", "XL", "XXL", "Free size", "One size"].map(size => `<option>${size}</option>`).join("")}</select><select id="filter-color" aria-label="Colour"><option value="">All colours</option>${colors.map(color => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`).join("")}</select><input id="filter-price-min" type="number" min="0" placeholder="Min ₹" aria-label="Minimum price"><input id="filter-price-max" type="number" min="0" placeholder="Max ₹" aria-label="Maximum price"><select id="sort-products" aria-label="Sort products"><option value="featured" ${sort === "featured" ? "selected" : ""}>Featured</option><option value="newest" ${sort === "newest" ? "selected" : ""}>Newest</option><option value="low" ${sort === "low" ? "selected" : ""}>Price: low to high</option><option value="high" ${sort === "high" ? "selected" : ""}>Price: high to low</option><option value="best-selling" ${sort === "best-selling" ? "selected" : ""}>Best selling</option></select><label class="icon-link"><input id="filter-available" type="checkbox"> In stock</label></div>
    <p id="products-count" class="form-help"></p><div class="product-grid" id="products-grid"></div></section>`;
}

function renderProductGrid(list, container = document.getElementById("products-grid")) {
  if (!container) return;
  container.innerHTML = list.length ? list.map(productCard).join("") : `<div class="empty-state"><h2>No pieces found</h2><p>Try changing your filters to see more of the collection.</p></div>`;
}

function applyProductFilters() {
  const query = document.getElementById("search-products")?.value.trim().toLowerCase() || "";
  const category = document.getElementById("filter-category")?.value || "";
  const size = document.getElementById("filter-size")?.value || "";
  const color = document.getElementById("filter-color")?.value || "";
  const minPrice = Number(document.getElementById("filter-price-min")?.value || 0);
  const maxPrice = Number(document.getElementById("filter-price-max")?.value || Infinity);
  const available = document.getElementById("filter-available")?.checked || false;
  const sort = document.getElementById("sort-products")?.value || "featured";
  let matches = products.filter(product =>
    `${product.name} ${product.category}`.toLowerCase().includes(query) &&
    (!category || product.category === category) &&
    (!size || product.sizes.includes(size)) &&
    (!color || product.colors.includes(color)) &&
    price(product) >= minPrice && price(product) <= maxPrice &&
    (!available || product.stock > 0));
  if (sort === "low") matches.sort((a, b) => price(a) - price(b));
  if (sort === "high") matches.sort((a, b) => price(b) - price(a));
  if (sort === "newest") matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "best-selling") matches.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  const count = document.getElementById("products-count");
  if (count) count.textContent = `${matches.length} ${matches.length === 1 ? "piece" : "pieces"}`;
  renderProductGrid(matches);
}

function renderDetail(product) {
  const gallery = [...new Set([product.imageUrl, ...(product.galleryImages || [])])].slice(0, 8);
  const related = products.filter(item => item.id !== product.id && item.category === product.category).slice(0, 4);
  const options = `<div class="choice-row"><label for="detail-size">Size</label><select class="field" id="detail-size">${product.sizes.map(size => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join("")}</select></div>
    <div class="choice-row"><label for="detail-color">Colour</label><select class="field" id="detail-color">${product.colors.map(color => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`).join("")}</select></div>`;
  const thumbnails = gallery.length > 1 ? `<div class="detail-thumbnails">${gallery.map((image, index) => `<button type="button" data-action="select-image" data-image="${escapeHtml(image)}" aria-label="View product image ${index + 1}"><img src="${escapeHtml(image)}" alt=""></button>`).join("")}</div>` : "";
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / <a href="/pages/products.html">The collection</a> / ${escapeHtml(product.name)}</p><div class="product-detail">
    <div><img class="detail-image" id="detail-main-image" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}">${thumbnails}</div>
    <div class="detail-copy"><span class="eyebrow">${escapeHtml(product.category)}</span><h1>${escapeHtml(product.name)}</h1><p class="detail-price">${product.salePrice ? `<del>${money.format(product.price)}</del> ` : ""}${money.format(price(product))}</p><p>${escapeHtml(product.description)}</p><p class="product-stock${product.stock <= 0 ? " is-out-of-stock" : ""}">${product.stock > 0 ? `${product.stock} ready to ship` : "Out of stock"}</p>${options}
      <div class="choice-row"><label for="detail-quantity">Quantity</label><input class="field quantity-input" id="detail-quantity" type="number" min="1" max="${Math.max(1, product.stock)}" value="1"></div>
      <div class="button-row"><button class="button button-dark" type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>Add to bag</button><button class="button button-outline" type="button" data-action="buy-now" data-id="${escapeHtml(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>Buy now</button><button class="button button-outline" type="button" data-action="wishlist" data-id="${escapeHtml(product.id)}">♡ Save</button></div>
      <div class="admin-section"><h2>A little more</h2><p>${escapeHtml(product.description)}</p><p>Made with care. Follow the care label for the fabric. Complimentary shipping over ₹4,999. Cash on delivery available.</p><details><summary>Size guide</summary><p>Choose your usual size for a comfortable fit. Sarees and one-size accessories are labelled accordingly.</p></details><details><summary>Shipping and returns</summary><p>Complimentary shipping over ₹4,999. Eligible unworn items can be returned within 7 days of delivery.</p></details></div></div></div></section>
    ${related.length ? `<section class="section">${sectionTitle("Made to go together", "You may also like")}<div class="product-grid">${related.map(productCard).join("")}</div></section>` : ""}`;
}

function subtotal(items = cartItems()) {
  return items.reduce((sum, item) => sum + price(products.find(product => product.id === item.id) || { price: 0 }) * item.quantity, 0);
}

function renderCart() {
  const items = cartItems();
  if (!items.length) return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / Shopping bag</p><div class="empty-state"><span class="eyebrow">Your ALR edit</span><h2>Your bag is waiting for something lovely.</h2><p>Explore the collection and save a piece for later.</p><a class="button button-dark" href="/pages/products.html">Browse the collection →</a></div></section>`;
  const lines = items.map((item, index) => {
    const product = products.find(entry => entry.id === item.id);
    if (!product) return "";
    return `<article class="cart-line"><a href="/pages/product-details.html?id=${encodeURIComponent(product.id)}"><img src="${escapeHtml(product.imageUrl)}" alt=""></a><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</p><div class="quantity-control"><button type="button" data-action="quantity" data-index="${index}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-action="quantity" data-index="${index}" data-delta="1" aria-label="Increase quantity">+</button><button class="text-button" type="button" data-action="remove-cart" data-index="${index}">Remove</button></div></div><strong>${money.format(price(product) * item.quantity)}</strong></article>`;
  }).join("");
  const total = subtotal(items);
  const shipping = total >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / Shopping bag</p><div class="page-heading"><span class="eyebrow">Your ALR edit</span><h1>Your shopping bag</h1></div><div class="cart-layout"><div>${lines}<p><a class="text-link" href="/pages/products.html">Continue shopping →</a></p></div><aside class="summary-card"><h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><span>${money.format(total)}</span></div><div class="summary-row"><span>Shipping</span><span>${shipping ? money.format(shipping) : "Complimentary"}</span></div><div class="summary-row summary-total"><span>Total</span><span>${money.format(total + shipping)}</span></div><p class="form-help">${total < FREE_SHIPPING ? `Add ${money.format(FREE_SHIPPING - total)} for complimentary shipping.` : "Complimentary shipping applied."}</p><a class="button button-dark" href="/pages/checkout.html">Continue to checkout →</a></aside></div></section>`;
}

async function wishlistProducts() {
  if (token()) return api("/wishlist");
  return wishlistIds().map(id => products.find(product => product.id === id)).filter(Boolean);
}

async function renderWishlist() {
  const saved = await wishlistProducts();
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / Wishlist</p><div class="page-heading"><span class="eyebrow">A little something for later</span><h1>Your wishlist</h1><p>${token() ? "Your saved pieces follow your account." : "Sign in to keep your wishlist synced to your account."}</p></div>
    ${saved.length ? `<div class="product-grid">${saved.map(productCard).join("")}</div>` : `<div class="empty-state"><h2>Nothing saved just yet.</h2><p>Tap the heart on anything that catches your eye.</p><a class="button button-dark" href="/pages/products.html">Explore the collection →</a></div>`}</section>`;
}

function renderLogin() {
  const rememberedEmail = localStorage.getItem("alr-last-email") || "";
  return `<section class="page-shell"><form class="form-card" id="login-form"><span class="eyebrow">Welcome back</span><h1>Sign in</h1><p>Sign in to see your account and keep your favourite pieces close.</p><div class="form-error" id="auth-error" role="alert"></div>
    <div class="form-field"><label for="identifier">Email or phone</label><input id="identifier" name="identifier" required autocomplete="username" value="${escapeHtml(rememberedEmail)}"></div>
    <div class="form-field"><label for="password">Password</label><div class="filter-bar"><input id="password" name="password" type="password" required autocomplete="current-password"><button class="button button-outline" type="button" data-action="toggle-password" data-target="password">Show</button></div></div>
    <label class="icon-link"><input type="checkbox" name="rememberEmail" ${rememberedEmail ? "checked" : ""}> Remember my email on this device</label>
    <button class="button button-dark" type="submit">Sign in →</button><p class="form-help">New to ALR? <a class="text-link" href="/pages/register.html">Create an account</a></p></form></section>`;
}

function renderRegister() {
  return `<section class="page-shell"><form class="form-card" id="register-form"><span class="eyebrow">A place of your own</span><h1>Create an account</h1><p>Keep your details and order history together.</p><div class="form-error" id="auth-error" role="alert"></div>
    <div class="form-field"><label for="name">Full name</label><input id="name" name="name" required maxlength="140" autocomplete="name"></div>
    <div class="form-field"><label for="email">Email</label><input id="email" name="email" type="email" required maxlength="254" autocomplete="email"></div>
    <div class="form-field"><label for="phone">Phone number</label><input id="phone" name="phone" type="tel" required pattern="[+0-9\\(\\) .\\-]{8,24}" autocomplete="tel"></div>
    <div class="form-field"><label for="password">Password (at least 10 characters)</label><div class="filter-bar"><input id="password" name="password" type="password" required minlength="10" maxlength="72" autocomplete="new-password"><button class="button button-outline" type="button" data-action="toggle-password" data-target="password">Show</button></div></div>
    <div class="form-field"><label for="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" required minlength="10" maxlength="72" autocomplete="new-password"></div>
    <button class="button button-dark" type="submit">Create account →</button><p class="form-help">Already with us? <a class="text-link" href="/pages/login.html">Sign in</a></p></form></section>`;
}

async function renderCheckout() {
  const account = user();
  if (!token() || !account) return `<section class="page-shell"><div class="empty-state"><h2>Sign in to continue</h2><p>Orders are saved securely to your ALR account.</p><a class="button button-dark" href="/pages/login.html?next=checkout">Sign in →</a><p class="form-help">New here? <a class="text-link" href="/pages/register.html">Create an account</a></p></div></section>`;
  const items = cartItems();
  if (!items.length) return renderCart();
  const total = subtotal(items);
  const shipping = total >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / <a href="/pages/cart.html">Bag</a> / Checkout</p><div class="page-heading"><span class="eyebrow">Almost yours</span><h1>Secure your selection</h1><p>Cash on delivery is available. No online payments are processed.</p></div>
    <div class="checkout-layout"><form class="form-card" id="checkout-form"><h2>Your details</h2><div class="form-error" id="checkout-error" role="alert"></div><div class="form-grid">
      <div class="form-field full"><label for="checkout-name">Full name</label><input id="checkout-name" name="name" required maxlength="140" value="${escapeHtml(account.name)}" autocomplete="name"></div>
      <div class="form-field"><label for="checkout-phone">Mobile number</label><input id="checkout-phone" name="phone" type="tel" required pattern="[+0-9\\(\\) .\\-]{8,24}" value="${escapeHtml(account.phone || "")}" autocomplete="tel"></div>
      <div class="form-field"><label for="checkout-email">Email</label><input id="checkout-email" name="email" type="email" required maxlength="254" value="${escapeHtml(account.email)}" autocomplete="email"></div>
      <div class="form-field"><label for="checkout-house">House / flat</label><input id="checkout-house" name="house" required maxlength="180" autocomplete="address-line1"></div>
      <div class="form-field"><label for="checkout-street">Street / area</label><input id="checkout-street" name="street" required maxlength="180" autocomplete="address-line2"></div>
      <div class="form-field"><label for="checkout-city">City</label><input id="checkout-city" name="city" required maxlength="100" autocomplete="address-level2"></div>
      <div class="form-field"><label for="checkout-state">State</label><input id="checkout-state" name="state" required maxlength="100" autocomplete="address-level1"></div>
      <div class="form-field"><label for="checkout-pin">PIN code</label><input id="checkout-pin" name="pinCode" required pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code"></div>
    </div><div class="form-field"><label for="checkout-payment">Payment</label><select class="field" id="checkout-payment" name="payment"><option value="COD">Cash on delivery</option></select><span class="form-help">This prototype accepts COD orders only; no payment is collected online.</span></div><button class="button button-dark" type="submit">Place order →</button></form>
    <aside class="summary-card"><h2>Order summary</h2>${items.map(item => { const product = products.find(entry => entry.id === item.id); return product ? `<div class="summary-row"><span>${escapeHtml(product.name)} × ${item.quantity}</span><span>${money.format(price(product) * item.quantity)}</span></div>` : ""; }).join("")}<div class="summary-row"><span>Shipping</span><span>${shipping ? money.format(shipping) : "Complimentary"}</span></div><div class="summary-row summary-total"><span>Total</span><span>${money.format(total + shipping)}</span></div></aside></div></section>`;
}

function renderOrders() {
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / Account</p><div class="page-heading"><span class="eyebrow">Your ALR</span><h1>Order history</h1></div><div id="order-list" class="loading">Loading your orders…</div></section>`;
}

function renderAdmin() {
  return `<section class="page-shell"><p class="breadcrumb"><a href="/">Home</a> / Store administration</p><div class="page-heading"><span class="eyebrow">ALR Studio</span><h1>Store administration</h1><p>Product and order management. Sign in with an administrator account to continue.</p></div><div class="loading" id="admin-content">Checking administrator access…</div></section>`;
}

function orderCard(order) {
  return `<article class="admin-section"><div class="section-heading"><div><span class="eyebrow">${escapeHtml(order.orderNumber)}</span><h2>${escapeHtml(order.status)}</h2></div><strong>${money.format(order.total)}</strong></div><p>${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "")}</p><p>${escapeHtml(order.shippingAddress)}</p>${order.items.map(item => `<p>${escapeHtml(item.productName)} · ${escapeHtml(item.size)} / ${escapeHtml(item.color)} · Qty ${item.quantity} · ${money.format(item.unitPrice)}</p>`).join("")}</article>`;
}

function renderOrderHistory(list) {
  const host = document.getElementById("order-list");
  host.innerHTML = list.length ? list.map(orderCard).join("") : `<div class="empty-state"><h2>No orders yet</h2><p>Your next favourite is waiting in the collection.</p><a class="button button-dark" href="/pages/products.html">Explore pieces →</a></div>`;
}

function adminMarkup(productList, orderList, stats, customerList) {
  const productRows = productList.map(product => `<tr><td><img src="${escapeHtml(product.imageUrl)}" alt=""></td><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>${money.format(product.price)}</td><td>${product.stock > 0 ? product.stock : "Out of stock"}</td><td><button class="button button-outline" type="button" data-action="edit-product" data-id="${escapeHtml(product.id)}">Edit</button> ${product.stock > 0 ? `<button class="text-button" type="button" data-action="mark-out-of-stock" data-id="${escapeHtml(product.id)}">Mark out of stock</button>` : ""} <button class="text-button" type="button" data-action="delete-product" data-id="${escapeHtml(product.id)}">Remove</button></td></tr>`).join("");
  const nextStatuses = { PLACED: ["PLACED", "CONFIRMED", "CANCELLED"], CONFIRMED: ["CONFIRMED", "SHIPPED", "CANCELLED"], SHIPPED: ["SHIPPED", "DELIVERED"], DELIVERED: ["DELIVERED"], CANCELLED: ["CANCELLED"] };
  const orderRows = orderList.map(order => `<tr><td>${escapeHtml(order.orderNumber)}</td><td>${escapeHtml(order.customerName)}<br>${escapeHtml(order.customerEmail)}</td><td>${money.format(order.total)}</td><td>${escapeHtml(order.status)}</td><td><select class="field" data-order-status="${order.id}">${(nextStatuses[order.status] || [order.status]).map(status => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select><button class="text-button" type="button" data-action="update-order" data-id="${order.id}">Update</button></td></tr>`).join("");
  const customerRows = customerList.map(customer => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.email)}</td><td>${escapeHtml(customer.phone || "—")}</td><td>${customer.orderCount}</td><td><button class="text-button" type="button" data-action="customer-history" data-id="${customer.id}">View history</button></td></tr>`).join("");
  return `<div class="admin-section"><div class="section-heading"><div><span class="eyebrow">Overview</span><h2>Store at a glance</h2></div><button class="button button-outline" type="button" data-action="logout">Sign out</button></div><div class="reviews"><div class="review"><span class="eyebrow">Products</span><h2>${stats.products}</h2></div><div class="review"><span class="eyebrow">Orders</span><h2>${stats.orders}</h2></div><div class="review"><span class="eyebrow">Customers</span><h2>${stats.customers}</h2></div><div class="review"><span class="eyebrow">Sales</span><h2>${money.format(stats.sales)}</h2></div></div></div>
    <div class="admin-section"><h2 id="product-form-title">Add a product</h2><form id="admin-product-form"><input type="hidden" name="id" id="admin-id"><div class="form-grid">
      <div class="form-field"><label for="admin-name">Product name</label><input id="admin-name" name="name" required maxlength="180"></div>
      <div class="form-field"><label for="admin-category">Category</label><input id="admin-category" name="category" required maxlength="80"></div>
      <div class="form-field"><label for="admin-price">Price (₹)</label><input id="admin-price" name="price" type="number" min="0.01" step="0.01" required></div>
      <div class="form-field"><label for="admin-sale">Sale price (₹, optional)</label><input id="admin-sale" name="salePrice" type="number" min="0.01" step="0.01"></div>
      <div class="form-field"><label for="admin-stock">Stock</label><input id="admin-stock" name="stock" type="number" min="0" required value="12"></div>
      <div class="form-field"><label for="admin-badge">Badge</label><input id="admin-badge" name="badge" maxlength="80"></div>
      <div class="form-field full"><label for="admin-description">Description</label><textarea id="admin-description" name="description" required maxlength="1000"></textarea></div>
      <div class="form-field"><label for="admin-sizes">Sizes (comma-separated)</label><input id="admin-sizes" name="sizes" required placeholder="XS, S, M, L, XL, XXL"></div>
      <div class="form-field"><label for="admin-colors">Colours (comma-separated)</label><input id="admin-colors" name="colors" required placeholder="Ivory, Sage"></div>
      <div class="form-field"><label for="admin-image">Main image URL</label><input id="admin-image" name="imageUrl" maxlength="1200"></div>
      <div class="form-field"><label for="admin-gallery">Gallery image URLs (comma-separated, optional)</label><input id="admin-gallery" name="galleryImages" maxlength="3000"></div>
      <div class="form-field full"><label for="admin-file">Or upload images (PNG/JPG/WebP, max 300 KB each)</label><input id="admin-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" multiple></div>
    </div><p class="form-error" id="admin-error" role="alert"></p><button class="button button-dark" type="submit">Save product</button> <button class="button button-outline" type="reset">Clear form</button></form></div>
    <div class="admin-section"><h2>Products</h2><div class="table-wrap"><table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${productRows}</tbody></table></div></div>
    <div class="admin-section"><h2>Orders</h2><div class="table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${orderRows || `<tr><td colspan="5">No orders yet.</td></tr>`}</tbody></table></div></div>
    <div class="admin-section"><h2>Customers</h2><form id="customer-search" class="filter-bar"><label class="sr-only" for="customer-query">Search customers</label><input id="customer-query" name="q" type="search" placeholder="Search by name, email or phone"><button class="button button-outline" type="submit">Search</button></form><div class="table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>History</th></tr></thead><tbody id="customer-rows">${customerRows || `<tr><td colspan="5">No customers found.</td></tr>`}</tbody></table></div><div id="customer-history"></div></div>`;
}

async function renderAdminData() {
  const host = document.getElementById("admin-content");
  try {
    const current = token() ? await api("/auth/me") : null;
    if (!current || current.role !== "ADMIN") {
      host.innerHTML = `<div class="empty-state"><h2>Administrator sign-in required</h2><p>Use your configured store admin account to manage the catalogue and orders.</p><a class="button button-dark" href="/pages/login.html?next=admin">Sign in →</a></div>`;
      return;
    }
    const [allProducts, allOrders, stats, customerList] = await Promise.all([
      api("/products/admin/all"), api("/orders"), api("/admin/summary"), api("/admin/customers")
    ]);
    products = allProducts;
    orders = allOrders;
    host.outerHTML = `<div id="admin-content">${adminMarkup(allProducts, allOrders, stats, customerList)}</div>`;
  } catch (error) {
    host.innerHTML = `<div class="empty-state"><h2>Could not load administration</h2><p>${escapeHtml(error.message)}</p><a class="button button-outline" href="/pages/login.html?next=admin">Sign in again →</a></div>`;
  }
}

async function renderPage() {
  const app = document.getElementById("app");
  try {
    if (page !== "login" && page !== "register" && page !== "admin") products = await api("/products");
    if (token()) {
      try {
        accountWishlist = new Set((await api("/wishlist")).map(product => product.id));
      } catch (error) {
        console.error("Could not load the account wishlist.", error);
        showToast(error.message);
      }
    } else {
      accountWishlist.clear();
    }
    updateCounts();
    switch (page) {
      case "home":
        app.innerHTML = await renderHome();
        startHomepageFeatures();
        break;
      case "products":
        app.innerHTML = renderProducts();
        applyProductFilters();
        break;
      case "detail": {
        const id = new URLSearchParams(location.search).get("id");
        const product = products.find(entry => entry.id === id);
        if (product) rememberProductView(product.id);
        app.innerHTML = product ? renderDetail(product) : `<section class="page-shell"><div class="empty-state"><h2>We couldn't find that piece.</h2><a class="button button-dark" href="/pages/products.html">Browse the collection →</a></div></section>`;
        break;
      }
      case "cart": app.innerHTML = renderCart(); break;
      case "wishlist": app.innerHTML = await renderWishlist(); break;
      case "login": app.innerHTML = renderLogin(); break;
      case "register": app.innerHTML = renderRegister(); break;
      case "checkout": app.innerHTML = await renderCheckout(); break;
      case "orders":
        app.innerHTML = renderOrders();
        if (!token()) location.replace("/pages/login.html");
        else renderOrderHistory(await api("/orders/mine"));
        break;
      case "admin":
        app.innerHTML = renderAdmin();
        renderAdminData();
        break;
      default: app.innerHTML = `<section class="page-shell"><div class="empty-state"><h2>Page not found</h2><a class="button button-dark" href="/">Return home</a></div></section>`;
    }
  } catch (error) {
    app.innerHTML = `<section class="page-shell"><div class="empty-state"><h2>The collection couldn't load</h2><p>${escapeHtml(error.message)}</p><button class="button button-outline" type="button" onclick="location.reload()">Try again</button></div></section>`;
  }
}

function addToCart(product, size, color, quantity = 1) {
  if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
    showToast("Please choose an available quantity and options.");
    return;
  }
  const items = cartItems();
  const existing = items.find(item => item.id === product.id && item.size === size && item.color === color);
  if (existing) {
    if (existing.quantity + quantity > product.stock) {
      showToast(`Only ${product.stock} of this piece are available.`);
      return;
    }
    existing.quantity += quantity;
  } else {
    items.push({ id: product.id, size, color, quantity });
  }
  setCart(items);
  showToast(`${product.name} added to your bag.`);
}

async function toggleWishlist(productId) {
  if (token()) {
    const exists = accountWishlist.has(productId);
    await api(`/wishlist/${encodeURIComponent(productId)}`, { method: exists ? "DELETE" : "POST" });
    if (exists) accountWishlist.delete(productId);
    else accountWishlist.add(productId);
    updateCounts();
    showToast(exists ? "Removed from your wishlist." : "Saved to your account wishlist.");
    if (page === "wishlist") await renderPage();
    else if (page === "products") applyProductFilters();
    else if (page === "home") await renderPage();
  } else {
    const ids = wishlistIds();
    const next = ids.includes(productId) ? ids.filter(id => id !== productId) : [...ids, productId];
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    updateCounts();
    showToast(next.includes(productId) ? "Saved to your wishlist." : "Removed from your wishlist.");
    if (page === "wishlist") await renderPage();
    else if (page === "products") applyProductFilters();
    else if (page === "home") await renderPage();
  }
}

async function syncLocalWishlist() {
  const ids = wishlistIds();
  for (const id of ids) {
    try {
      await api(`/wishlist/${encodeURIComponent(id)}`, { method: "POST" });
      accountWishlist.add(id);
    } catch (error) {
      console.error(`Could not sync wishlist item ${id}.`, error);
      showToast("Some saved pieces could not be moved to your account.");
      return;
    }
  }
  localStorage.removeItem(WISHLIST_KEY);
}

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const product = products.find(item => item.id === button.dataset.id);
  try {
    if (action === "select-image") {
      const mainImage = document.getElementById("detail-main-image");
      if (mainImage) mainImage.src = button.dataset.image;
    }
    if (action === "toggle-password") {
      const input = document.getElementById(button.dataset.target);
      if (input) {
        input.type = input.type === "password" ? "text" : "password";
        button.textContent = input.type === "password" ? "Show" : "Hide";
      }
    }
    if (action === "details" && product) location.href = `/pages/product-details.html?id=${encodeURIComponent(product.id)}`;
    if (action === "wishlist" && product) await toggleWishlist(product.id);
    if ((action === "add-cart" || action === "buy-now") && product) {
      addToCart(product, document.getElementById("detail-size")?.value || product.sizes[0],
        document.getElementById("detail-color")?.value || product.colors[0],
        Number(document.getElementById("detail-quantity")?.value || 1));
      if (action === "buy-now") location.href = "/pages/checkout.html";
    }
    if (action === "quantity") {
      const items = cartItems();
      const index = Number(button.dataset.index);
      const item = items[index];
      if (!item) return;
      item.quantity += Number(button.dataset.delta);
      if (item.quantity <= 0) items.splice(index, 1);
      else {
        const itemProduct = products.find(entry => entry.id === item.id);
        if (itemProduct && item.quantity > itemProduct.stock) item.quantity = itemProduct.stock;
      }
      setCart(items);
      await renderPage();
    }
    if (action === "remove-cart") {
      setCart(cartItems().filter((_, index) => index !== Number(button.dataset.index)));
      await renderPage();
    }
    if (action === "edit-product" && product) {
      const form = document.getElementById("admin-product-form");
      for (const [key, value] of Object.entries({
        id: product.id, name: product.name, category: product.category, price: product.price,
        salePrice: product.salePrice ?? "", stock: product.stock, badge: product.badge,
        description: product.description, sizes: product.sizes.join(", "),
        colors: product.colors.join(", "), imageUrl: product.imageUrl,
        galleryImages: (product.galleryImages || []).join(", ")
      })) form.elements[key].value = value;
      document.getElementById("product-form-title").textContent = `Edit ${product.name}`;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (action === "delete-product" && product && confirm(`Remove ${product.name} from the catalogue?`)) {
      await api(`/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      showToast("Product removed from the catalogue.");
      await renderPage();
    }
    if (action === "mark-out-of-stock" && product && product.stock > 0) {
      await api(`/products/${encodeURIComponent(product.id)}/stock`, {
        method: "PATCH", body: JSON.stringify({ stock: 0 })
      });
      showToast(`${product.name} is now marked out of stock for customers.`);
      await renderAdminData();
    }
    if (action === "update-order") {
      const status = document.querySelector(`[data-order-status="${button.dataset.id}"]`).value;
      await api(`/orders/${button.dataset.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      showToast("Order status updated.");
      await renderPage();
    }
    if (action === "customer-history") {
      const history = await api(`/admin/customers/${button.dataset.id}/orders`);
      document.getElementById("customer-history").innerHTML = `<h3>Order history</h3>${history.length ? history.map(orderCard).join("") : "<p>No orders for this customer.</p>"}`;
    }
    if (action === "logout") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      location.href = "/";
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  try {
    if (form.id === "newsletter-form") {
      const result = await api("/newsletter", { method: "POST", body: JSON.stringify({ email: form.elements.email.value }) });
      showToast(result.message);
      form.reset();
    }
    if (form.id === "customer-search") {
      const q = document.getElementById("customer-query").value.trim();
      const matchingCustomers = await api(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      document.getElementById("customer-rows").innerHTML = matchingCustomers.map(customer => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.email)}</td><td>${escapeHtml(customer.phone || "—")}</td><td>${customer.orderCount}</td><td><button class="text-button" type="button" data-action="customer-history" data-id="${customer.id}">View history</button></td></tr>`).join("") || `<tr><td colspan="5">No customers found.</td></tr>`;
    }
    if (form.id === "login-form" || form.id === "register-form") {
      const error = document.getElementById("auth-error");
      error.textContent = "";
      const body = form.id === "login-form"
        ? { identifier: form.elements.identifier.value, password: form.elements.password.value }
        : { name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value, password: form.elements.password.value };
      if (form.id === "register-form" && form.elements.password.value !== form.elements.confirmPassword.value) {
        error.textContent = "The passwords do not match.";
        return;
      }
      try {
        const result = await api(`/auth/${form.id === "login-form" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(body) });
        sessionStorage.setItem(TOKEN_KEY, result.accessToken);
        sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
        accountWishlist = new Set();
        await syncLocalWishlist();
        if (form.id === "login-form" && form.elements.rememberEmail.checked && body.identifier.includes("@")) {
          localStorage.setItem("alr-last-email", body.identifier.trim());
        } else if (form.id === "login-form") {
          localStorage.removeItem("alr-last-email");
        }
        const next = new URLSearchParams(location.search).get("next");
        location.href = next === "admin" ? "/pages/admin.html" : next === "checkout" ? "/pages/checkout.html" : "/";
      } catch (error) {
        errorElement(error);
      }
    }
    if (form.id === "checkout-form") {
      const errorHost = document.getElementById("checkout-error");
      errorHost.textContent = "";
      const data = Object.fromEntries(new FormData(form));
      const items = cartItems().map(item => ({ productId: item.id, size: item.size, color: item.color, quantity: item.quantity }));
      const order = await api("/orders", { method: "POST", body: JSON.stringify({ ...data, items }) });
      setCart([]);
      document.getElementById("app").innerHTML = `<section class="page-shell"><div class="empty-state"><span class="eyebrow">Thank you</span><h2>Your order is on its way.</h2><p>Order ${escapeHtml(order.orderNumber)} is confirmed as ${escapeHtml(order.status)}. Payment is cash on delivery.</p><p>Total: ${money.format(order.total)}</p><a class="button button-dark" href="/pages/orders.html">View order history →</a></div></section>`;
    }
    if (form.id === "admin-product-form") {
      const errorHost = document.getElementById("admin-error");
      errorHost.textContent = "";
      const id = form.elements.id.value;
      let imageUrl = form.elements.imageUrl.value.trim();
      const galleryImages = form.elements.galleryImages.value.split(",").map(value => value.trim()).filter(Boolean);
      const uploadedImages = [];
      for (const file of form.elements.file.files) {
        const upload = new FormData();
        upload.append("file", file);
        uploadedImages.push((await api("/admin/uploads", { method: "POST", body: upload })).imageUrl);
      }
      if (uploadedImages.length) imageUrl = uploadedImages[0];
      if (!imageUrl) throw new Error("Provide a main image URL or upload at least one product image.");
      const allGalleryImages = [...new Set([...galleryImages, ...uploadedImages])].slice(0, 8);
      const sale = form.elements.salePrice.value;
      const body = {
        name: form.elements.name.value.trim(), category: form.elements.category.value.trim(),
        price: Number(form.elements.price.value), salePrice: sale ? Number(sale) : null,
        stock: Number(form.elements.stock.value), badge: form.elements.badge.value.trim(),
        description: form.elements.description.value.trim(), imageUrl,
        galleryImages: allGalleryImages,
        sizes: form.elements.sizes.value.split(",").map(value => value.trim()).filter(Boolean),
        colors: form.elements.colors.value.split(",").map(value => value.trim()).filter(Boolean)
      };
      await api(id ? `/products/${encodeURIComponent(id)}` : "/products", {
        method: id ? "PUT" : "POST", body: JSON.stringify(body)
      });
      showToast(id ? "Product updated." : "Product created.");
      await renderPage();
    }
  } catch (error) {
    const host = document.getElementById(form.id === "checkout-form" ? "checkout-error" : form.id === "admin-product-form" ? "admin-error" : "auth-error");
    if (host) host.textContent = error.message;
    else showToast(error.message);
  }
}

function errorElement(error) {
  const host = document.getElementById("auth-error");
  if (host) host.textContent = error.message;
}

document.addEventListener("click", event => { handleClick(event); });
document.addEventListener("submit", event => { handleSubmit(event); });
document.addEventListener("input", event => {
  if (["search-products", "filter-price-min", "filter-price-max"].includes(event.target.id)) applyProductFilters();
});
document.addEventListener("change", event => {
  if (["filter-category", "filter-size", "filter-color", "sort-products", "filter-available"].includes(event.target.id)) applyProductFilters();
});
document.querySelector("#site-header").innerHTML = headerMarkup();
document.querySelector("#site-footer").innerHTML = footerMarkup();
document.querySelector(".menu-toggle").addEventListener("click", event => {
  const nav = document.getElementById("primary-nav");
  const open = nav.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.getElementById("primary-nav").classList.remove("is-open");
    document.body.classList.remove("menu-open");
    document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
  }
});
renderPage().then(() => {
  if (page === "products") {
    ["search-products", "filter-category"].forEach(id => document.getElementById(id)?.addEventListener("change", () => {
      const params = new URLSearchParams();
      if (document.getElementById("filter-category").value) params.set("category", document.getElementById("filter-category").value);
      if (document.getElementById("search-products").value) params.set("q", document.getElementById("search-products").value);
      history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
    }));
  }
});
