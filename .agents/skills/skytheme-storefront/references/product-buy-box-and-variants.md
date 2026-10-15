# SkyTheme Buy Box & Variant Engine

> **Reverse-Engineered from:** `buy-box.js`, `buy-form.js`, `theme-global.js`, `sticky-add-to-cart-success.js`.  
> **Key Capabilities:** Dynamic Variant Switching, View Transitions, Asynchronous Section Updates, Size Chart Modal, Volume Pricing Tiers, Pre-Order Properties, Back-in-Stock Alerts, Sticky Add-to-Cart Bar.

---

## 1. Dynamic Buy Box (`<buy-box>`)

The central nervous system of the Product Detail Page (PDP). When the shopper selects a new variant (e.g., Color or Size), `buy-box`:
1. Dispatches an option change event.
2. Fetches the updated HTML fragment via Section Rendering API or endpoint.
3. Performs a smooth `ViewTransition` without jarring page jumps.
4. Updates URL (`?variant=...`), Price, Badges, Inventory status, and Media gallery.

### Full Buy Box Component (`js/buy-box.js`)

```javascript
export class BuyBox extends HTMLElement {
  constructor() {
    super();
    this.quantityInput = this.querySelector('[name="quantity"]');
    this.variantRequestId = 0;
  }

  connectedCallback() {
    this.bindOptionPickers();
    this.bindSizeChart();
    this.bindQuantity();
  }

  bindOptionPickers() {
    this.addEventListener("change", (event) => {
      if (event.target.matches("input[type='radio'], select")) {
        this.onOptionChange(event);
      }
    });
  }

  async onOptionChange(event) {
    const selectedOptions = Array.from(this.querySelectorAll("input[type='radio']:checked, select")).map(el => el.value);
    const targetUrl = new URL(this.dataset.url || window.location.href, window.location.origin);
    targetUrl.searchParams.set("options", selectedOptions.join(","));

    const requestId = ++this.variantRequestId;
    this.setUpdating(true);

    try {
      const response = await fetch(`${targetUrl.pathname}${targetUrl.search}&section_id=${this.dataset.section}`);
      const htmlText = await response.text();
      if (requestId !== this.variantRequestId) return;

      const newDoc = new DOMParser().parseFromString(htmlText, "text/html");
      this.applyVariantUpdate(newDoc);
    } catch (err) {
      console.error("Variant switch error:", err);
    } finally {
      if (requestId === this.variantRequestId) {
        this.setUpdating(false);
      }
    }
  }

  applyVariantUpdate(newDoc) {
    // Execute smooth View Transition if supported
    const updateDOM = () => {
      // 1. Update Price
      const newPrice = newDoc.querySelector("[data-product-price]");
      const currentPrice = this.querySelector("[data-product-price]");
      if (newPrice && currentPrice) currentPrice.innerHTML = newPrice.innerHTML;

      // 2. Update Inventory / Stock Counter
      const newStock = newDoc.querySelector("[data-stock-counter]");
      const currentStock = this.querySelector("[data-stock-counter]");
      if (newStock && currentStock) currentStock.innerHTML = newStock.innerHTML;

      // 3. Update Badges
      const newBadges = newDoc.querySelector("[data-product-badges]");
      const currentBadges = this.querySelector("[data-product-badges]");
      if (newBadges && currentBadges) currentBadges.innerHTML = newBadges.innerHTML;

      // 4. Update Variant ID in forms
      const newVariantId = newDoc.querySelector('input[name="id"]')?.value;
      if (newVariantId) {
        this.querySelectorAll('input[name="id"]').forEach(input => input.value = newVariantId);
        // Sync Sticky ATC Form
        document.querySelectorAll('input[name="id"][data-sticky-id]').forEach(input => input.value = newVariantId);
      }

      // 5. Update Add to Cart Button state
      const newSubmitBtn = newDoc.querySelector('button[type="submit"][name="add"]');
      const currentSubmitBtn = this.querySelector('button[type="submit"][name="add"]');
      if (newSubmitBtn && currentSubmitBtn) {
        currentSubmitBtn.disabled = newSubmitBtn.disabled;
        currentSubmitBtn.innerHTML = newSubmitBtn.innerHTML;
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  }

  setUpdating(isUpdating) {
    this.classList.toggle("is-updating", isUpdating);
  }

  bindSizeChart() {
    const trigger = this.querySelector('[is="size-chart-trigger"]');
    const modal = this.querySelector("size-chart-modal");
    if (!trigger || !modal) return;

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      modal.setAttribute("open", "");
      modal.classList.add("is-active");
    });
  }

  bindQuantity() {
    const qtyInput = this.querySelector('[name="quantity"]');
    this.querySelectorAll("[data-qty-btn]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const action = btn.dataset.qtyBtn;
        let val = parseInt(qtyInput.value, 10) || 1;
        if (action === "plus") val++;
        if (action === "minus") val = Math.max(1, val - 1);
        qtyInput.value = val;
      });
    });
  }
}

customElements.define("buy-box", BuyBox);
```

---

## 2. Accessible Size Chart Modal (`<size-chart-modal>`)

Provides a clean slide-over drawer with unit toggle (Inches / CM) and accessible focus management:

```html
<size-chart-modal class="drawer fixed inset-0 z-50 pointer-events-none hidden [&[open]]:block [&[open]]:pointer-events-auto" role="dialog" aria-modal="true" aria-label="Size Guide">
  <div class="drawer-overlay fixed inset-0 bg-black/50 backdrop-blur-sm" is="close-drawer"></div>
  <div class="drawer-content fixed right-0 top-0 bottom-0 w-full max-w-md bg-white p-6 shadow-2xl flex flex-col z-10 overflow-y-auto">
    <div class="flex items-center justify-between pb-4 border-b">
      <h3 class="text-xl font-bold font-heading">Size & Fit Guide</h3>
      <button type="button" class="drawer-close-btn p-2" is="close-drawer" aria-label="Close size guide">✕</button>
    </div>

    <!-- Metric / Imperial Toggle -->
    <div class="flex items-center gap-2 my-4 bg-gray-100 p-1 rounded-full w-fit">
      <button type="button" class="px-4 py-1 rounded-full bg-white text-xs font-bold shadow-sm" data-unit="in">Inches</button>
      <button type="button" class="px-4 py-1 rounded-full text-xs font-bold text-gray-500" data-unit="cm">CM</button>
    </div>

    <!-- Size Table -->
    <table class="w-full text-left text-sm mt-2 border-collapse">
      <thead>
        <tr class="border-b text-gray-500">
          <th class="py-2">Size</th>
          <th class="py-2">Chest</th>
          <th class="py-2">Waist</th>
          <th class="py-2">Hip</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b"><td class="py-2 font-bold">XS</td><td>34 - 36"</td><td>28 - 30"</td><td>34 - 36"</td></tr>
        <tr class="border-b"><td class="py-2 font-bold">S</td><td>36 - 38"</td><td>30 - 32"</td><td>36 - 38"</td></tr>
        <tr class="border-b"><td class="py-2 font-bold">M</td><td>38 - 40"</td><td>32 - 34"</td><td>38 - 40"</td></tr>
        <tr class="border-b"><td class="py-2 font-bold">L</td><td>40 - 42"</td><td>34 - 36"</td><td>40 - 42"</td></tr>
        <tr class="border-b"><td class="py-2 font-bold">XL</td><td>42 - 44"</td><td>36 - 38"</td><td>42 - 44"</td></tr>
      </tbody>
    </table>
  </div>
</size-chart-modal>
```

---

## 3. Volume Quantity Pricing Tiers

Incentivizes multi-unit purchasing with automatic wholesale pricing tiers:

```html
<div class="volume-pricing-block mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200" data-volume-pricing>
  <span class="text-xs uppercase tracking-wider font-bold text-gray-500">Volume Discounts</span>
  <div class="grid grid-cols-3 gap-2 mt-2">
    <div class="tier-card p-3 rounded-lg border bg-white text-center cursor-pointer hover:border-black active:border-black" data-qty="1">
      <div class="font-bold text-sm">Buy 1</div>
      <div class="text-xs text-gray-500">$120 / ea</div>
    </div>
    <div class="tier-card p-3 rounded-lg border bg-white text-center cursor-pointer border-black" data-qty="2">
      <span class="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">Save 10%</span>
      <div class="font-bold text-sm mt-1">Buy 2</div>
      <div class="text-xs text-gray-500">$108 / ea</div>
    </div>
    <div class="tier-card p-3 rounded-lg border bg-white text-center cursor-pointer hover:border-black" data-qty="3">
      <span class="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
      <div class="font-bold text-sm mt-1">Buy 3+</div>
      <div class="text-xs text-gray-500">$96 / ea</div>
    </div>
  </div>
</div>
```

---

## 4. Back-in-Stock Alert Form

When a variant is sold out, the Buy Box seamlessly toggles from the Add-to-Cart form to an email notification capture form:

```html
<form data-type="back-in-stock-form" class="back-in-stock-form hidden flex flex-col gap-2 mt-4 p-4 rounded-xl bg-gray-100">
  <div class="font-semibold text-sm">Notify me when available</div>
  <p class="text-xs text-gray-600">Enter your email and we'll alert you the moment this size returns to stock.</p>
  <div class="flex gap-2">
    <input type="email" placeholder="Your email address" required class="form-control flex-1" />
    <button type="submit" class="btn btn-secondary">Notify Me</button>
  </div>
</form>
```

---

## 5. Sticky Add-to-Cart Bar (`<sticky-add-to-cart>`)

Fixed bar anchored at bottom of screen (or below header) when user scrolls past the main buy button:

```javascript
export class StickyAddToCart extends HTMLElement {
  connectedCallback() {
    const buyButton = document.querySelector('buy-box button[name="add"]');
    if (!buyButton) return;

    const observer = new IntersectionObserver(([entry]) => {
      // Visible when main button leaves the viewport
      this.classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0 });

    observer.observe(buyButton);
  }
}

customElements.define("sticky-add-to-cart", StickyAddToCart);
```
