# SkyTheme Product Discovery & Navigation Systems

> **Reverse-Engineered from:** `header.js`, `mobile-docker.js`, `predictive-search.js`, `header-hamburger.js`, `mobile-menu-drawer.js`.  
> **Key Capabilities:** Smart Sticky Header with Scroll Thresholds, Animated Mega Menu, Mobile Docker Navigation Bar, Typewriter Predictive Search, Faceted Swatch Filters, Infinite Scroll, Back-to-Top.

---

## 1. Smart Sticky Header (`<sticky-header>`)

The header adapts dynamically:
- Transparent over the hero banner.
- Compact & blurred upon scrolling down past 500px (`scrolledAddAt`).
- Conceals itself when scrolling downwards (`header-hidden`) to maximize screen estate.
- Revealing immediately upon slight upward scroll motion (`header-scrolled`).

### Complete Sticky Header Logic (`js/header.js`)

```javascript
import { throttle } from "./theme-global.js";

export class StickyHeader extends HTMLElement {
  constructor() {
    super();
    this.isScrolled = false;
    this.buffer = 24;
    this.scrolledAddAt = 500;
    this.scrolledRemoveAt = 476;
    this.hiddenAddAt = 820;
    this.currentScrollTop = 0;
  }

  connectedCallback() {
    this.headerSection = this.closest(".header-main") || this;
    this.onScroll = throttle(this.handleScroll.bind(this), 10);
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this.onScroll);
  }

  handleScroll() {
    const scrollTop = window.scrollY;

    // 1. Add background blur & compact size
    if (!this.isScrolled && scrollTop > this.scrolledAddAt) {
      this.isScrolled = true;
      this.headerSection.classList.add("header-scrolled");
    } else if (this.isScrolled && scrollTop < this.scrolledRemoveAt) {
      this.isScrolled = false;
      this.headerSection.classList.remove("header-scrolled");
    }

    // 2. Hide on scroll down, show on scroll up
    if (scrollTop > this.hiddenAddAt) {
      if (scrollTop > this.currentScrollTop) {
        // Scrolling downwards -> hide
        this.headerSection.classList.add("header-hidden");
      } else {
        // Scrolling upwards -> reveal
        this.headerSection.classList.remove("header-hidden");
      }
    } else {
      this.headerSection.classList.remove("header-hidden");
    }

    this.currentScrollTop = scrollTop;
  }
}

customElements.define("sticky-header", StickyHeader, { extends: "header" });
```

---

## 2. Effortless Mobile Browsing Dock (`<mobile-docker>`)

A sticky bottom bar designed specifically for mobile ergonomics. Features high-frequency touch actions: Home, Search, Bag, Wishlist, and Profile, with dynamic safe-area insetting.

### Component Implementation (`js/mobile-docker.js`)

```javascript
import { throttle } from "./theme-global.js";

export class MobileDocker extends HTMLElement {
  connectedCallback() {
    this.currentScrollTop = window.scrollY;
    this.scrollingDown = false;
    this._onScroll = throttle(this.onScroll.bind(this), 20);

    window.addEventListener("scroll", this._onScroll, { passive: true });
    this.updateDockerHeight();
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this._onScroll);
  }

  updateDockerHeight() {
    const height = `${this.getBoundingClientRect().height}px`;
    document.documentElement.style.setProperty("--mobileDockerHeight", height);
  }

  onScroll() {
    const scrollTop = window.scrollY;
    const delta = scrollTop - this.currentScrollTop;
    if (Math.abs(delta) < 10) return;

    this.scrollingDown = delta > 0;
    this.currentScrollTop = scrollTop;

    // Keep docked bar visible and tactile
    this.classList.toggle("active", true);
  }
}

customElements.define("mobile-docker", MobileDocker);
```

### HTML Template (`mobile-docker.html`)

```html
<mobile-docker class="mobile-docker fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-40 lg:hidden px-4 py-2 flex items-center justify-around shadow-lg">
  <a href="/" class="docker-item flex flex-col items-center gap-1 text-gray-700 hover:text-black">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11l-9-9-9 9m15 1v10a1 1 0 01-1 1h-3"/></svg>
    <span class="text-[10px] font-medium tracking-tight">Home</span>
  </a>
  <button type="button" aria-controls="SearchDrawer" class="docker-item flex flex-col items-center gap-1 text-gray-700 hover:text-black">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    <span class="text-[10px] font-medium tracking-tight">Search</span>
  </button>
  <button type="button" aria-controls="CartDrawer" class="docker-item flex flex-col items-center gap-1 text-gray-700 hover:text-black relative">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
    <span class="cart-bubble absolute -top-1 right-2 bg-red-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold" data-cart-count>0</span>
    <span class="text-[10px] font-medium tracking-tight">Bag</span>
  </button>
  <a href="/account" class="docker-item flex flex-col items-center gap-1 text-gray-700 hover:text-black">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    <span class="text-[10px] font-medium tracking-tight">Account</span>
  </a>
</mobile-docker>
```

---

## 3. Mega Menu with Tabbed Categories (`<details-mega>`)

Expands smoothly from the header with category columns, featured promotional banners, and quick links:

```html
<details is="details-mega" class="mega-menu-item relative group">
  <summary class="flex items-center gap-1 cursor-pointer py-4 px-3 font-semibold text-sm hover:opacity-70 list-none">
    <span>Collections</span>
    <svg class="w-3 h-3 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
  </summary>
  <div class="mega-menu-dropdown fixed left-0 right-0 top-[var(--headerHeight)] bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-2xl p-8 transition-all">
    <div class="container grid grid-cols-4 gap-8">
      <div>
        <h4 class="font-heading font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Clothing</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/collections/knitwear" class="hover:underline">Cashmere & Knitwear</a></li>
          <li><a href="/collections/outerwear" class="hover:underline">Tailored Coats</a></li>
          <li><a href="/collections/trousers" class="hover:underline">Pleated Trousers</a></li>
          <li><a href="/collections/shirts" class="hover:underline">Silk & Cotton Shirts</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-heading font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Trending</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/collections/the-luxe-edit" class="hover:underline">The Luxe Edit</a></li>
          <li><a href="/collections/weekend-edit" class="hover:underline">Weekend Club</a></li>
          <li><a href="/collections/essential-collection" class="hover:underline">Essentials</a></li>
        </ul>
      </div>
      <div class="col-span-2 grid grid-cols-2 gap-4">
        <a href="/collections/new-arrivals" class="promo-tile relative rounded-xl overflow-hidden aspect-[4/3] group">
          <img src="images/coll-elegant-looks_5.webp" alt="New Arrivals" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white">
            <span class="text-xs uppercase font-bold tracking-wider">New Season</span>
            <span class="font-heading text-lg font-bold">Autumn / Winter Edit →</span>
          </div>
        </a>
        <a href="/pages/lookbook" class="promo-tile relative rounded-xl overflow-hidden aspect-[4/3] group">
          <img src="images/coll-premium-jacket_5.webp" alt="Lookbook" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white">
            <span class="text-xs uppercase font-bold tracking-wider">Editorial</span>
            <span class="font-heading text-lg font-bold">Discover Lookbook →</span>
          </div>
        </a>
      </div>
    </div>
  </div>
</details>
```

---

## 4. Faceted Swatch Filters & Sorting

Provides instant product filtering without disrupting the browsing flow:

```html
<aside class="collection-filters flex flex-wrap items-center justify-between gap-4 py-4 border-b">
  <!-- Swatch & Size Filter Pills -->
  <div class="flex items-center gap-3">
    <div class="filter-group flex items-center gap-1.5">
      <span class="text-xs font-semibold text-gray-500 uppercase">Color:</span>
      <button class="filter-swatch w-5 h-5 rounded-full border ring-2 ring-black bg-[#1f1f1f]" title="Black"></button>
      <button class="filter-swatch w-5 h-5 rounded-full border bg-[#f3efe6]" title="Cream"></button>
      <button class="filter-swatch w-5 h-5 rounded-full border bg-[#35495e]" title="Navy"></button>
    </div>
    <div class="filter-group flex items-center gap-1">
      <span class="text-xs font-semibold text-gray-500 uppercase ml-2">Size:</span>
      <button class="size-pill px-3 py-1 rounded-full text-xs font-bold border hover:border-black">XS</button>
      <button class="size-pill px-3 py-1 rounded-full text-xs font-bold border bg-black text-white">S</button>
      <button class="size-pill px-3 py-1 rounded-full text-xs font-bold border hover:border-black">M</button>
      <button class="size-pill px-3 py-1 rounded-full text-xs font-bold border hover:border-black">L</button>
    </div>
  </div>

  <!-- Sorting Dropdown -->
  <div class="sort-select flex items-center gap-2">
    <label for="SortBy" class="text-xs font-semibold text-gray-500 uppercase">Sort by:</label>
    <select id="SortBy" class="form-control-select bg-transparent text-sm font-semibold border-none cursor-pointer focus:outline-none">
      <option value="manual">Featured</option>
      <option value="price-ascending">Price: Low to High</option>
      <option value="price-descending">Price: High to Low</option>
      <option value="created-descending">Date: New to Old</option>
      <option value="best-selling">Best Selling</option>
    </select>
  </div>
</aside>
```
