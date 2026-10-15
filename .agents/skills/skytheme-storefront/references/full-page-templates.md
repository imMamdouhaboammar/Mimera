# SkyTheme Full-Page Architectural Templates

> **Reverse-Engineered from:** Complete SkyTheme Production Pages (`index.html`, `products/essential-crew-knit-copy.html`, `collections/all.html`, `pages/lookbook.html`, `pages/size-guide.html`, `pages/faq.html`, `cart.html`).  
> **Key Architecture:** Valid Semantic HTML5, Custom Web Component Tags, Import Maps for ES Modules, Lenis Smooth Scroll Integration, Tailwind / Theme CSS Classes.

---

## 1. Homepage Master Blueprint (`index.html`)

```html
<!DOCTYPE html>
<html lang="en" class="js scheme-1">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SKY Theme — Modern Luxury Fashion Storefront</title>

  <!-- Typography Preconnect & Stylesheets -->
  <link rel="stylesheet" href="css/theme-base.css" />
  <link rel="stylesheet" href="css/theme-main.css" />
  <link rel="stylesheet" href="css/theme-utilities.css" />
  <link rel="stylesheet" href="css/header.css" />
  <link rel="stylesheet" href="css/cart.css" />
  <link rel="stylesheet" href="css/lookbook-carousel.css" />
  <link rel="stylesheet" href="css/shop-the-look-banner.css" />
  <link rel="stylesheet" href="css/swiper-bundle.css" />

  <!-- ES Modules Import Map -->
  <script type="importmap">
  {
    "imports": {
      "@lib/lenis": "./js/theme-lib-lenis.min.js",
      "@theme/theme-global": "./js/theme-global.js",
      "@theme/events": "./js/theme-events.js"
    }
  }
  </script>

  <!-- Core Scripts -->
  <script type="module" src="js/smooth-scroll.js"></script>
  <script type="module" src="js/header.js"></script>
  <script type="module" src="js/bag-drawer.js"></script>
  <script type="module" src="js/predictive-search.js"></script>
  <script type="module" src="js/mobile-docker.js"></script>
  <script type="module" src="js/component-lookbook-carousel.js"></script>
  <script type="module" src="js/shop-the-look-banner.js"></script>
  <script type="module" src="js/social-media-gallery.js"></script>
  <script type="module" src="js/text-with-floating-images.js"></script>
</head>
<body data-smooth-scroll="true" class="bg-[rgb(var(--background))] text-[rgb(var(--textColor))] font-body antialiased">

  <!-- 1. Top Announcement Bar -->
  <div class="announcement-bar py-2.5 px-4 text-center text-xs font-semibold bg-black text-white flex justify-center items-center gap-2">
    <span>Free Worldwide Express Shipping on Orders Over $150</span>
    <span class="text-gray-400">|</span>
    <span class="text-orange-400 font-bold">Code: AUTUMN25 for 25% Off</span>
  </div>

  <!-- 2. Sticky & Transparent Header -->
  <header is="sticky-header" class="header-main sticky top-0 inset-x-0 z-40 transition-all duration-300" data-sticky-type="always">
    <div class="container flex items-center justify-between h-[var(--headerHeight)]">
      <!-- Left: Navigation Menu -->
      <nav class="hidden lg:flex items-center gap-6">
        <details is="details-mega" class="mega-menu">
          <summary class="cursor-pointer font-semibold text-sm">Women</summary>
          <!-- Mega Menu Panel -->
        </details>
        <details is="details-mega" class="mega-menu">
          <summary class="cursor-pointer font-semibold text-sm">Men</summary>
        </details>
        <a href="/pages/lookbook" class="font-semibold text-sm hover:underline">Lookbook</a>
        <a href="/collections/all" class="font-semibold text-sm hover:underline">Shop All</a>
      </nav>

      <!-- Center: Brand Logo -->
      <a href="/" class="brand-logo text-2xl font-bold tracking-tight font-heading">
        SKY THEME
      </a>

      <!-- Right: Search, Account & Cart -->
      <div class="flex items-center gap-4">
        <button type="button" aria-controls="SearchDrawer" class="p-2 hover:opacity-70" aria-label="Search">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </button>
        <a href="/account" class="hidden sm:block p-2 hover:opacity-70" aria-label="Account">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        </a>
        <button type="button" aria-controls="CartDrawer" class="p-2 hover:opacity-70 relative" aria-label="Open Cart">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span class="cart-count absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" data-cart-count>0</span>
        </button>
      </div>
    </div>
  </header>

  <!-- 3. Full Hero Banner with Parallax Video / Imagery -->
  <section class="hero-banner relative min-h-[85vh] flex items-center justify-center overflow-hidden">
    <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover">
      <source src="media/hero.mp4" type="video/mp4" />
    </video>
    <div class="absolute inset-0 bg-black/25"></div>
    <div class="relative z-10 text-center text-white p-6 max-w-3xl">
      <span class="text-xs uppercase tracking-[0.2em] font-bold">Autumn / Winter Edition</span>
      <h1 class="font-heading text-5xl md:text-7xl font-bold mt-4 tracking-tight">Elegance In Every Thread</h1>
      <p class="mt-4 text-lg text-white/90 font-light">Engineered for effortless warmth, timeless cut, and refined everyday luxury.</p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <a href="/collections/all" class="btn btn-secondary px-8">Shop Collection</a>
        <a href="/pages/lookbook" class="btn btn-outline border-white text-white hover:bg-white hover:text-black px-8">View Lookbook</a>
      </div>
    </div>
  </section>

  <!-- 4. Categories Grid -->
  <section class="categories-grid py-20 container">
    <div class="flex items-end justify-between mb-8">
      <div>
        <span class="text-xs uppercase font-bold tracking-widest text-gray-400">Curated Categories</span>
        <h2 class="font-heading text-3xl font-bold mt-1">Shop By Category</h2>
      </div>
      <a href="/collections/all" class="text-sm font-semibold hover:underline">Explore All Collections →</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Category Card 1 -->
      <a href="/collections/knitwear" class="category-card group block relative rounded-2xl overflow-hidden aspect-[3/4]">
        <img src="images/coll-casual-collection_1.webp" alt="Knitwear" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
          <h3 class="font-heading text-xl font-bold">Knitwear</h3>
          <span class="text-xs text-white/80">32 Items</span>
        </div>
      </a>
      <!-- Category Card 2 -->
      <a href="/collections/outwear" class="category-card group block relative rounded-2xl overflow-hidden aspect-[3/4]">
        <img src="images/coll-premium-jacket_5.webp" alt="Coats & Jackets" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
          <h3 class="font-heading text-xl font-bold">Coats & Jackets</h3>
          <span class="text-xs text-white/80">18 Items</span>
        </div>
      </a>
      <!-- Category Card 3 -->
      <a href="/collections/trousers" class="category-card group block relative rounded-2xl overflow-hidden aspect-[3/4]">
        <img src="images/coll-wardrobe-staples_2.webp" alt="Trousers" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
          <h3 class="font-heading text-xl font-bold">Trousers</h3>
          <span class="text-xs text-white/80">24 Items</span>
        </div>
      </a>
      <!-- Category Card 4 -->
      <a href="/collections/shirts" class="category-card group block relative rounded-2xl overflow-hidden aspect-[3/4]">
        <img src="images/coll-essential-classic_5.webp" alt="Shirts" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
          <h3 class="font-heading text-xl font-bold">Shirts & Tops</h3>
          <span class="text-xs text-white/80">20 Items</span>
        </div>
      </a>
    </div>
  </section>

  <!-- 5. Dual-Track Lookbook Carousel (Pinned Scroll) -->
  <section data-lookbook-main class="relative bg-white py-16 overflow-hidden">
    <lookbook-carousel class="block">
      <div class="container grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Left 3D Fanned Images Track -->
        <div class="lg:col-span-7 overflow-hidden" data-lookbook-left-viewport>
          <div class="flex items-center gap-4 transition-transform will-change-transform" data-lookbook-left>
            <div data-lookbook-image class="shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl" data-index="0">
              <img src="images/young-caucasian-woman-posing-elegant-silk-dress-brown-jacket-rooftop-stylish-girl-stands_1_7.webp" alt="Look 1" class="w-full h-full object-cover" />
            </div>
            <div data-lookbook-image class="shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl" data-index="1">
              <img src="images/coll-elegant-looks_5.webp" alt="Look 2" class="w-full h-full object-cover" />
            </div>
            <div data-lookbook-image class="shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl" data-index="2">
              <img src="images/coll-heritage_1.webp" alt="Look 3" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <!-- Right Product Showcase Details -->
        <div class="lg:col-span-5" data-lookbook-right>
          <div data-lookbook-products class="space-y-6">
            <span class="text-xs uppercase font-bold tracking-widest text-orange-600">Editorial Look 01</span>
            <h2 class="font-heading text-4xl font-bold">The Luxe Tailored Blazer & Silk Slip</h2>
            <p class="text-gray-600 text-sm">Woven from Italian double-faced wool with natural horn buttons and hand-finished pick stitching.</p>
            <div class="text-2xl font-bold">$385.00</div>
            <button type="button" is="quick-view" data-product-handle="tailored-pant-2" class="btn btn-secondary w-full">Quick Shop This Look</button>
          </div>
        </div>
      </div>
    </lookbook-carousel>
  </section>

  <!-- 6. Shop The Look Banner with Hotspot Pins -->
  <section class="shop-the-look py-20 container">
    <div is="shop-the-look-banner" class="relative rounded-3xl overflow-hidden aspect-[16/9] bg-gray-100">
      <img src="images/STL-bnr.webp" alt="Shop The Look" class="w-full h-full object-cover" />
      
      <!-- Interactive Hotspot Pins -->
      <button type="button" data-hotspot="true" data-index="0" class="hotspot-pin active absolute top-[35%] left-[45%] w-7 h-7 bg-white text-black rounded-full shadow-2xl flex items-center justify-center font-bold text-xs ring-4 ring-white/40 transition-transform hover:scale-125" style="top: 35%; left: 45%;">
        +
      </button>
      <button type="button" data-hotspot="true" data-index="1" class="hotspot-pin absolute top-[68%] left-[52%] w-7 h-7 bg-white text-black rounded-full shadow-2xl flex items-center justify-center font-bold text-xs ring-4 ring-white/40 transition-transform hover:scale-125" style="top: 68%; left: 52%;">
        +
      </button>
    </div>
  </section>

  <!-- 7. Text With Floating Images (Lerp Physics) -->
  <section class="floating-text-section py-24 container relative overflow-hidden">
    <div is="floating-images" class="relative z-10 text-center max-w-2xl mx-auto">
      <h2 class="font-heading text-4xl md:text-5xl font-bold leading-tight">Effortless Warmth Without Bulk</h2>
      <p class="mt-4 text-gray-600">We obsess over fiber grade, stitch density, and silhouette balance to create garments you'll reach for season after season.</p>
      
      <!-- Floating Parallax Images -->
      <img src="images/floating-bg_4.svg" data-floating-image class="absolute -top-12 -left-20 w-32 pointer-events-none" />
      <img src="images/floating-bg_6.svg" data-floating-image class="absolute -bottom-8 -right-16 w-36 pointer-events-none" />
    </div>
  </section>

  <!-- 8. Scatter Marquee (Fanned Playing Cards) -->
  <section class="scatter-section py-20 overflow-hidden bg-black text-white">
    <scatter-marquee class="block" data-speed="4" data-direction="ltr">
      <div class="marquee-track flex items-center gap-4 will-change-transform" data-marquee-track>
        <div data-card class="aspect-[3/4] w-60 rounded-2xl overflow-hidden shrink-0 relative bg-gray-900 group">
          <img src="images/SM1_5.webp" alt="Social Post" class="w-full h-full object-cover" />
          <sky-lazy-media data-autoplay="true" class="absolute inset-0">
            <video loop muted playsinline class="w-full h-full object-cover"><source src="media/video1.mp4" type="video/mp4" /></video>
          </sky-lazy-media>
        </div>
        <div data-card class="aspect-[3/4] w-60 rounded-2xl overflow-hidden shrink-0 relative bg-gray-900 group">
          <img src="images/SM4.webp" alt="Social Post" class="w-full h-full object-cover" />
        </div>
        <div data-card class="aspect-[3/4] w-60 rounded-2xl overflow-hidden shrink-0 relative bg-gray-900 group">
          <img src="images/SM6_7.webp" alt="Social Post" class="w-full h-full object-cover" />
        </div>
      </div>
    </scatter-marquee>
  </section>

  <!-- 9. Slide-Out Cart Drawer -->
  <bag-drawer id="CartDrawer" class="drawer fixed inset-0 z-50 pointer-events-none hidden [&[open]]:block [&[open]]:pointer-events-auto" role="dialog" aria-modal="true" aria-label="Shopping Cart">
    <div class="drawer-overlay fixed inset-0 bg-black/50 backdrop-blur-sm" is="close-drawer"></div>
    <div class="drawer-content fixed right-0 top-0 bottom-0 w-full max-w-md bg-white p-6 shadow-2xl flex flex-col z-10 overflow-y-auto">
      <div class="cart-drawer-header flex items-center justify-between pb-4 border-b">
        <h3 class="text-xl font-bold font-heading">Your Shopping Bag</h3>
        <button type="button" class="drawer-close-btn p-2" is="close-drawer" aria-label="Close cart">✕</button>
      </div>
      <!-- Free Shipping Goal Indicator -->
      <div class="py-4" data-shipping-box>
        <div class="text-xs font-semibold" data-shipping-message>Spend $35.00 more for Free Worldwide Shipping</div>
        <div class="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div class="h-full bg-orange-500 rounded-full" data-shipping-bar-fill style="width: 75%;"></div>
        </div>
      </div>
      <!-- Bag Line Items -->
      <bag-lines class="flex-1 overflow-y-auto space-y-4 py-4">
        <!-- Lines injected here -->
      </bag-lines>
      <!-- Footer & Checkout CTA -->
      <div class="pt-4 border-t space-y-3">
        <div class="flex justify-between font-bold text-lg">
          <span>Subtotal</span>
          <span>$210.00</span>
        </div>
        <a href="/checkout" class="btn btn-secondary w-full text-center">Proceed to Checkout</a>
      </div>
    </div>
  </bag-drawer>

  <!-- 10. Mobile Bottom Docker -->
  <mobile-docker class="mobile-docker fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-40 lg:hidden px-4 py-2 flex items-center justify-around shadow-lg">
    <a href="/" class="flex flex-col items-center gap-1 text-gray-700 hover:text-black">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11l-9-9-9 9m15 1v10a1 1 0 01-1 1h-3"/></svg>
      <span class="text-[10px] font-medium">Home</span>
    </a>
    <button type="button" aria-controls="SearchDrawer" class="flex flex-col items-center gap-1 text-gray-700 hover:text-black">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <span class="text-[10px] font-medium">Search</span>
    </button>
    <button type="button" aria-controls="CartDrawer" class="flex flex-col items-center gap-1 text-gray-700 hover:text-black relative">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
      <span class="cart-bubble absolute -top-1 right-2 bg-red-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold" data-cart-count>0</span>
      <span class="text-[10px] font-medium">Bag</span>
    </button>
    <a href="/account" class="flex flex-col items-center gap-1 text-gray-700 hover:text-black">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      <span class="text-[10px] font-medium">Account</span>
    </a>
  </mobile-docker>

</body>
</html>
```

---

## 2. Product Detail Page Blueprint (`products/product.html`)

```html
<main class="container py-8">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
    <!-- Left: Media Gallery (Vertical Thumbs on Desktop) -->
    <div class="lg:col-span-7">
      <media-gallery class="media-gallery block">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <!-- Thumbnail strip -->
          <div is="media-gallery-grid-thumbs" class="hidden md:block md:col-span-2 space-y-3">
            <button class="thumb-btn border rounded-xl overflow-hidden aspect-[3/4] active" data-media-id="1">
              <img src="images/pro1-a.jpg" alt="Thumb 1" class="w-full h-full object-cover" />
            </button>
            <button class="thumb-btn border rounded-xl overflow-hidden aspect-[3/4]" data-media-id="2">
              <img src="images/pro1-c.jpg" alt="Thumb 2" class="w-full h-full object-cover" />
            </button>
          </div>
          <!-- Main view -->
          <div class="md:col-span-10 space-y-4">
            <div data-media-item data-media-id="1" class="rounded-2xl overflow-hidden aspect-[3/4] relative group">
              <img src="images/pro1-a.jpg" alt="Main View" class="w-full h-full object-cover" />
              <button is="media-lightbox-button" data-index="0" class="absolute bottom-4 right-4 bg-white/80 p-2 rounded-full shadow hover:bg-white" aria-label="Zoom image">🔍</button>
            </div>
          </div>
        </div>
      </media-gallery>
    </div>

    <!-- Right: Buy Box -->
    <div class="lg:col-span-5">
      <buy-box class="buy-box block space-y-6" data-section="main-product" data-product-id="101">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-gray-500">Knitwear</span>
          <h1 class="font-heading text-3xl font-bold mt-1">Essential Cashmere Crew Knit</h1>
          <div class="text-2xl font-bold mt-2" data-product-price>$180.00</div>
        </div>

        <!-- Color Swatches -->
        <div>
          <span class="text-xs font-bold uppercase text-gray-600">Color: Charcoal Heather</span>
          <div class="flex items-center gap-2 mt-2">
            <button class="w-6 h-6 rounded-full border ring-2 ring-black bg-[#2b2b2b]" title="Charcoal"></button>
            <button class="w-6 h-6 rounded-full border bg-[#e5dcc5]" title="Oatmeal"></button>
          </div>
        </div>

        <!-- Size Picker with Size Guide Modal Trigger -->
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-gray-600">Size</span>
            <button type="button" is="size-chart-trigger" class="text-xs font-semibold underline hover:text-black">Size Guide</button>
          </div>
          <div class="grid grid-cols-4 gap-2 mt-2">
            <button class="border py-2 text-sm font-bold rounded-xl hover:border-black">XS</button>
            <button class="border py-2 text-sm font-bold rounded-xl bg-black text-white">S</button>
            <button class="border py-2 text-sm font-bold rounded-xl hover:border-black">M</button>
            <button class="border py-2 text-sm font-bold rounded-xl hover:border-black">L</button>
          </div>
        </div>

        <!-- Add to Cart Form -->
        <form data-type="add-to-cart-form" class="space-y-4">
          <input type="hidden" name="id" value="variant_101_s" />
          <div class="flex items-center gap-4">
            <div class="flex items-center border rounded-full px-4 py-2 gap-3">
              <button type="button" data-qty-btn="minus">−</button>
              <input type="number" name="quantity" value="1" min="1" class="w-8 text-center bg-transparent border-none font-bold" />
              <button type="button" data-qty-btn="plus">+</button>
            </div>
            <button type="submit" name="add" class="btn btn-secondary flex-1 py-4">Add to Bag</button>
          </div>
        </form>

        <!-- Trust Badges -->
        <div class="space-y-2 pt-4 border-t text-xs text-gray-500">
          <div class="flex items-center gap-2">✓ Free carbon-neutral shipping over $150</div>
          <div class="flex items-center gap-2">✓ 30-day effortless worldwide returns</div>
        </div>
      </buy-box>
    </div>
  </div>
</main>
```
