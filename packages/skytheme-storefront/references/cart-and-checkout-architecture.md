# SkyTheme Cart & Checkout Architecture

> **Reverse-Engineered from:** `bag-drawer.js`, `bag-lines.js`, `cart.css`, `pickup-availability.js`, `sticky-add-to-cart-success.js`.  
> **Key Capabilities:** Slide-Out Cart Drawer, Free Shipping Goal Indicator, Live Cart Notes, Discount Code Engine, Shipping Rate Estimator, Pre-Order Support, Gift Wrapping, In-Store Pickup Modal, Sticky Cart Integration.

---

## 1. Slide-Out Cart Drawer (`<bag-drawer>`)

The slide-out drawer provides instant cart feedback without page reloads, managing focus trapping, scroll locking, and accessible drawer attributes.

### Web Component Implementation (`js/bag-drawer.js`)

```javascript
import { trapFocus, removeTrapFocus, lockScroll, unlockScroll, closeDrawer, setDrawerOpenAccessibility, setDrawerClosedAccessibility } from "./theme-global.js";

export class BagDrawer extends HTMLElement {
  constructor() {
    super();
    this.activeElement = null;
    this._focusTimer = null;
    this._onEscapeKeydown = this._onEscapeKeydown.bind(this);
    this.bindHeaderTriggers();
    this.bindCloseTriggers();
  }

  connectedCallback() {
    this.bindRecommendedTrigger();
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onEscapeKeydown);
  }

  get closeButton() {
    return this.querySelector(".cart-drawer-header .drawer-close-btn") || this.querySelector(".drawer-close-btn");
  }

  bindHeaderTriggers() {
    this._cartTriggers = Array.from(document.querySelectorAll('[aria-controls="CartDrawer"]:not([data-sticky-view-cart])'));
    this._cartTriggers.forEach(trigger => {
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        this.open(e.currentTarget);
      });
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.activeElement = triggeredBy;
    setDrawerOpenAccessibility(this);

    this.setAttribute("open", "");
    this.setAttribute("active", "");
    this.classList.add("is-active");

    document.addEventListener("keydown", this._onEscapeKeydown);
    this._focusTimer = setTimeout(() => {
      trapFocus(this, this.closeButton || this);
    }, 400);

    lockScroll();
  }

  close() {
    if (!this.hasAttribute("open") && !this.hasAttribute("active")) return;
    closeDrawer(this);
    this.removeAttribute("open");
    this.removeAttribute("active");
    this.classList.remove("is-active");

    removeTrapFocus(this.activeElement);
    setDrawerClosedAccessibility(this);
    unlockScroll();
    document.removeEventListener("keydown", this._onEscapeKeydown);
  }

  bindCloseTriggers() {
    this.querySelectorAll('[is="close-drawer"]').forEach(trigger => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
      });
    });
  }

  _onEscapeKeydown(e) {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  }

  bindRecommendedTrigger() {
    this.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-cart-drawer-recommended-trigger]");
      if (trigger) {
        e.preventDefault();
        const sidebar = this.querySelector("[data-cart-drawer-recommended-sidebar]");
        sidebar?.classList.toggle("is-visible");
      }
    });
  }
}

customElements.define("bag-drawer", BagDrawer);
```

---

## 2. Dynamic Free Shipping Goal Bar

Displays an animated gradient bar updating in real time against a configurable order threshold (e.g., $150 Free Shipping).

### HTML Template & State Attributes

```html
<div class="free-shipping-box" data-shipping-box>
  <div class="shipping-message font-medium text-sm" data-shipping-message>
    <!-- Rendered dynamically by Liquid / JS -->
    <span>Spend <strong>$35.00</strong> more to unlock <strong>Free Worldwide Shipping</strong></span>
  </div>
  <div class="shipping-bar-track relative w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
    <div 
      class="shipping-bar-fill h-full rounded-full transition-all duration-500 ease-out" 
      data-shipping-bar-fill 
      data-bar-width="75%" 
      style="--shippingProgress: 75%; width: var(--shippingProgress); background: var(--shippingBackgroundGradient);"
    ></div>
  </div>
</div>
```

### Live Progress Calculation

```javascript
export function updateFreeShippingProgress(cartTotalInCents, thresholdInCents = 15000) {
  const diff = thresholdInCents - cartTotalInCents;
  const progressPercent = Math.min(100, Math.max(0, (cartTotalInCents / thresholdInCents) * 100));

  const barFill = document.querySelector("[data-shipping-bar-fill]");
  const messageEl = document.querySelector("[data-shipping-message]");

  if (barFill) {
    barFill.style.setProperty("--shippingProgress", `${progressPercent}%`);
    barFill.dataset.barWidth = `${progressPercent}%`;
  }

  if (messageEl) {
    if (diff <= 0) {
      messageEl.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked <strong>Free Shipping!</strong>`;
    } else {
      const remainingFormatted = (diff / 100).toFixed(2);
      messageEl.innerHTML = `Spend <strong>$${remainingFormatted}</strong> more to unlock <strong>Free Shipping</strong>`;
    }
  }
}
```

---

## 3. Cart Line Items & AJAX Updates (`<bag-lines>`)

Manages line quantity mutations, debounce delays, live subtotal updates, and out-of-stock validation.

```javascript
import { debounce } from "./theme-global.js";

export class BagLines extends HTMLElement {
  constructor() {
    super();
    this.onLineChange = debounce(this.handleQuantityInput.bind(this), 300);
    this.addEventListener("change", this.onLineChange);
  }

  handleQuantityInput(event) {
    const input = event.target;
    if (!input.matches('input[name="updates[]"]')) return;
    const lineIndex = input.dataset.index;
    const quantity = parseInt(input.value, 10);
    this.updateCartLine(lineIndex, quantity);
  }

  async updateCartLine(line, quantity) {
    const response = await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ line, quantity })
    });
    const cartData = await response.json();
    this.renderUpdatedCart(cartData);
    document.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart: cartData } }));
  }

  renderUpdatedCart(cart) {
    // Updates item count badge and shipping goal
    const countBadges = document.querySelectorAll("[data-cart-count]");
    countBadges.forEach(badge => badge.textContent = cart.item_count);
    updateFreeShippingProgress(cart.total_price);
  }
}

customElements.define("bag-lines", BagLines);
```

---

## 4. Debounced Cart Notes (`<bag-note>`)

Persists customer instructions without needing a "Save Note" button:

```javascript
import { debounce } from "./theme-global.js";

customElements.define("bag-note", class extends HTMLElement {
  connectedCallback() {
    const textarea = this.querySelector("textarea");
    if (!textarea) return;

    textarea.addEventListener("input", debounce(async (e) => {
      await fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: e.target.value })
      });
    }, 400));
  }
});
```

---

## 5. Discount Code Application Engine (`<bag-discount>`)

Provides instant coupon validation inside the slide-out drawer:

```javascript
export class BagDiscount extends HTMLFormElement {
  connectedCallback() {
    this.addEventListener("submit", async (e) => {
      e.preventDefault();
      const codeInput = this.querySelector('input[name="discount"]');
      const code = codeInput?.value?.trim();
      if (!code) return;

      const formData = new FormData();
      formData.append("discount", code);

      const res = await fetch("/cart/update.js", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData
      });
      const data = await res.json();
      // Handle success or error notification
      if (data.token) {
        document.dispatchEvent(new CustomEvent("cart:refresh"));
      }
    });
  }
}

customElements.define("bag-discount", BagDiscount, { extends: "form" });
```

---

## 6. Real-Time Shipping Estimator (`<shipping-calculator>`)

Allows shoppers to calculate regional shipping costs before checkout:

```javascript
export class ShippingCalculator extends HTMLFormElement {
  connectedCallback() {
    this.addEventListener("submit", async (e) => {
      e.preventDefault();
      const zip = this.querySelector('[name="address[zip]"]').value;
      const country = this.querySelector('[name="address[country]"]').value;
      const province = this.querySelector('[name="address[province]"]').value;

      const resultsBox = this.querySelector("[data-shipping-results]");
      resultsBox.innerHTML = "<p>Calculating rates...</p>";

      try {
        const res = await fetch(`/cart/shipping_rates.json?shipping_address[zip]=${encodeURIComponent(zip)}&shipping_address[country]=${encodeURIComponent(country)}&shipping_address[province]=${encodeURIComponent(province)}`);
        const { shipping_rates } = await res.json();

        if (shipping_rates && shipping_rates.length > 0) {
          resultsBox.innerHTML = shipping_rates.map(r => `
            <div class="flex justify-between py-1 text-sm border-b">
              <span>${r.presentment_name}</span>
              <strong>$${r.price}</strong>
            </div>
          `).join("");
        } else {
          resultsBox.innerHTML = "<p class='text-red-500 text-sm'>No shipping rates found for this destination.</p>";
        }
      } catch (err) {
        resultsBox.innerHTML = "<p class='text-red-500 text-sm'>Error estimating shipping.</p>";
      }
    });
  }
}

customElements.define("shipping-calculator", ShippingCalculator, { extends: "form" });
```

---

## 7. In-Store Pickup Availability (`<pickup-availability>`)

Renders local retail pickup status with store location drawer:

```javascript
customElements.define("pickup-availability", class extends HTMLElement {
  connectedCallback() {
    const variantId = this.dataset.variantId;
    if (variantId) this.fetchPickupStores(variantId);
  }

  async fetchPickupStores(variantId) {
    const res = await fetch(`/variants/${variantId}/?section_id=pickup-availability`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    const content = doc.querySelector(".pickup-availability-information");
    if (content) {
      this.innerHTML = content.innerHTML;
      this.classList.remove("hidden");
    }
  }
});
```
