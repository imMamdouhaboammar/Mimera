# SkyTheme Marketing & Conversion Architecture

> **Reverse-Engineered from:** `countdown-timer.js`, `theme-global.js`, `announcement-bar.js`, `component-newsletter-popup.css`.  
> **Key Capabilities:** Evergreen & Fixed Countdown Timers, Urgency Stock Counters, Recently Viewed Local Storage Tracking, Quick View Modal Drawer, Multi-Language EU Selector, Promo Banners, Trust Badges, Age Verifier.

---

## 1. Countdown Timer Component (`<countdown-timer>`)

Supports two operational modes:
1. **Fixed Time**: Counts down to a specific ISO date/time (`2026-12-31T23:59:59Z`). Shows fallback expired text when complete.
2. **Evergreen Cycles**: Automatically resets relative to customer visit (`every_2_hrs`, `every_6_hrs`, `every_12_hrs`, `every_24_hrs`, `every_week`, `every_month`).

### Web Component Implementation (`js/countdown-timer.js`)

```javascript
export class CountdownTimer extends HTMLElement {
  connectedCallback() {
    this.type = this.dataset.type || "evergreen";
    this.duration = this.dataset.duration || "every_24_hrs";
    this.initTimer();
  }

  initTimer() {
    if (this.type === "fixed_time") {
      this.targetTime = new Date(this.dataset.dueDate).getTime();
    } else {
      this.targetTime = this.getEvergreenDueDate().getTime();
    }

    if (this.targetTime) {
      this.tick();
      this.intervalId = setInterval(() => this.tick(), 1000);
    }
  }

  getEvergreenDueDate() {
    const now = new Date();
    const target = new Date(now);
    if (this.duration === "every_24_hrs") {
      target.setHours(24, 0, 0, 0);
    } else if (this.duration === "every_2_hrs") {
      const h = now.getHours();
      target.setHours(h + (2 - (h % 2)), 0, 0, 0);
    }
    return target;
  }

  tick() {
    const remaining = this.targetTime - Date.now();
    if (remaining <= 0) {
      clearInterval(this.intervalId);
      this.classList.add("is-expired");
      return;
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((remaining / (1000 * 60)) % 60);
    const secs = Math.floor((remaining / 1000) % 60);

    const pad = (n) => (n < 10 ? `0${n}` : n);

    const dayEl = this.querySelector("[data-timer-day]");
    const hourEl = this.querySelector("[data-timer-hour]");
    const minEl = this.querySelector("[data-timer-minute]");
    const secEl = this.querySelector("[data-timer-second]");

    if (dayEl) dayEl.textContent = pad(days);
    if (hourEl) hourEl.textContent = pad(hours);
    if (minEl) minEl.textContent = pad(mins);
    if (secEl) secEl.textContent = pad(secs);
  }

  disconnectedCallback() {
    clearInterval(this.intervalId);
  }
}

customElements.define("countdown-timer", CountdownTimer);
```

### HTML Template (`countdown-timer.html`)

```html
<countdown-timer data-type="evergreen" data-duration="every_24_hrs" class="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-full w-fit">
  <span class="text-xs uppercase font-bold tracking-wider text-orange-400">Flash Sale Ends:</span>
  <div class="flex items-center gap-1 font-mono text-sm font-bold">
    <span data-timer-hour class="bg-white/10 px-2 py-0.5 rounded">00</span>:
    <span data-timer-minute class="bg-white/10 px-2 py-0.5 rounded">00</span>:
    <span data-timer-second class="bg-white/10 px-2 py-0.5 rounded">00</span>
  </div>
</countdown-timer>
```

---

## 2. Stock Counter & Scarcity Urgency

Visual indicator on PDP that updates thresholds (`inStock`, `lowStock`, `outOfStock`):

```html
<div class="stock-counter-block flex items-center gap-2 text-sm mt-3" data-stock-counter>
  <!-- Low Stock Example (< 5 units) -->
  <span class="w-2.5 h-2.5 rounded-full bg-[rgb(var(--lowStock))] animate-pulse"></span>
  <span class="font-medium text-[rgb(var(--lowStock))]">
    Only <strong>3 items</strong> left in stock — order soon
  </span>
</div>
```

---

## 3. Recently Viewed Products (`<recently-viewed>`)

Persists browsing history across sessions in `localStorage` without server dependencies:

```javascript
export class RecentlyViewed extends HTMLElement {
  static MAX_ITEMS = 6;
  static STORAGE_KEY = "SKY:recently-viewed";

  connectedCallback() {
    const currentId = this.dataset.productId;
    if (currentId) {
      RecentlyViewed.record(currentId);
    }
    this.render();
  }

  static record(productId) {
    let items = JSON.parse(localStorage.getItem(RecentlyViewed.STORAGE_KEY) || "[]");
    items = items.filter(id => id !== productId);
    items.unshift(productId);
    localStorage.setItem(RecentlyViewed.STORAGE_KEY, JSON.stringify(items.slice(0, RecentlyViewed.MAX_ITEMS)));
  }

  render() {
    const items = JSON.parse(localStorage.getItem(RecentlyViewed.STORAGE_KEY) || "[]");
    const container = this.querySelector(".recently-viewed-grid");
    if (!items.length || !container) {
      this.classList.add("hidden");
      return;
    }
    this.classList.remove("hidden");
  }
}

customElements.define("recently-viewed", RecentlyViewed);
```

---

## 4. Quick View Drawer (`<quick-view-drawer>`)

Loads a complete product buy-box into a side drawer or modal overlay without leaving the collection page:

```javascript
import { closeDrawer, lockScroll, unlockScroll, trapFocus } from "./theme-global.js";

export class QuickViewDrawer extends HTMLElement {
  connectedCallback() {
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest('[is="quick-view"]');
      if (trigger) {
        e.preventDefault();
        const handle = trigger.dataset.productHandle;
        this.open(handle);
      }
    });

    this.querySelectorAll('[is="close-drawer"]').forEach(btn => {
      btn.addEventListener("click", () => this.close());
    });
  }

  async open(handle) {
    this.setAttribute("open", "");
    this.setAttribute("active", "");
    lockScroll();

    const contentBox = this.querySelector(".quick-view-content");
    contentBox.innerHTML = "<div class='p-12 text-center'>Loading product...</div>";

    try {
      const res = await fetch(`/products/${handle}?view=quick-view`);
      const html = await res.text();
      contentBox.innerHTML = html;
      trapFocus(this, this.querySelector(".drawer-close-btn"));
    } catch {
      contentBox.innerHTML = "<div class='p-12 text-center text-red-500'>Failed to load product.</div>";
    }
  }

  close() {
    closeDrawer(this);
    this.removeAttribute("open");
    this.removeAttribute("active");
    unlockScroll();
  }
}

customElements.define("quick-view-drawer", QuickViewDrawer);
```

---

## 5. Multi-Language EU Localization Selector

Supports EN, FR, IT, DE, and ES with instant currency & language popover:

```html
<div class="localization-selector relative">
  <button type="button" class="flex items-center gap-2 py-2 px-3 text-xs font-semibold rounded-full border border-gray-300 hover:border-black" aria-expanded="false" id="LanguageBtn">
    <img src="images/fi.svg" alt="English" class="w-4 h-4 rounded-full" />
    <span>EN | USD ($)</span>
  </button>

  <div class="localization-dropdown hidden absolute bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-64 z-50">
    <div class="text-xs font-bold uppercase text-gray-400 mb-2">Select Language & Region</div>
    <ul class="space-y-1 text-sm">
      <li><a href="/" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 font-bold"><span>English (US)</span><span>USD ($)</span></a></li>
      <li><a href="/es" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"><span>Español</span><span>EUR (€)</span></a></li>
      <li><a href="/fr" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"><span>Français</span><span>EUR (€)</span></a></li>
      <li><a href="/de" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"><span>Deutsch</span><span>EUR (€)</span></a></li>
      <li><a href="/it" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"><span>Italiano</span><span>EUR (€)</span></a></li>
    </ul>
  </div>
</div>
```

---

## 6. Luxury Trust Badges Grid

Instills buyer confidence on checkout and PDP:

```html
<div class="trust-badges-grid grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-t border-b border-gray-200 my-8">
  <div class="trust-badge-item flex items-center gap-3">
    <div class="icon-wrap w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"/></svg>
    </div>
    <div>
      <h5 class="font-heading font-bold text-sm">Sustainable Fibers</h5>
      <p class="text-xs text-gray-500">100% certified organic cashmere & cotton</p>
    </div>
  </div>

  <div class="trust-badge-item flex items-center gap-3">
    <div class="icon-wrap w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
    </div>
    <div>
      <h5 class="font-heading font-bold text-sm">Secure Checkout</h5>
      <p class="text-xs text-gray-500">256-bit encrypted checkout with Shop Pay</p>
    </div>
  </div>

  <div class="trust-badge-item flex items-center gap-3">
    <div class="icon-wrap w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
    </div>
    <div>
      <h5 class="font-heading font-bold text-sm">30-Day Free Returns</h5>
      <p class="text-xs text-gray-500">Complimentary prepaid label included</p>
    </div>
  </div>

  <div class="trust-badge-item flex items-center gap-3">
    <div class="icon-wrap w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
    </div>
    <div>
      <h5 class="font-heading font-bold text-sm">Express Shipping</h5>
      <p class="text-xs text-gray-500">Dispatched within 24 hours globally</p>
    </div>
  </div>
</div>
```
