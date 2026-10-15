# SkyTheme Animation Engine & Motion Architecture

> **Reverse-Engineered from:** SkyTheme Motion System (`smooth-scroll.js`, `text-with-floating-images.js`, `component-lookbook-carousel.js`, `social-media-gallery.js`, `shop-the-look-banner.js`, `header.js`).  
> **Core Libraries:** Lenis Smooth Scroll v1.3.3, Motion (GSAP-compatible Web Animations / `@lib/motion`), Swiper v11, PhotoSwipe v5.

---

## 1. Lenis Smooth Scroll Engine

SkyTheme delivers an immersive, momentum-based scrolling experience on desktop while respecting touch gestures and battery on mobile devices.

### Complete Engine Implementation (`js/smooth-scroll.js`)

```javascript
import { ResizeManager } from "./theme-events.js";
import Lenis from "lenis"; // Or @lib/lenis

export class LenisSmoothScroll {
  constructor() {
    this.lenis = null;
    this.rafHandle = null;
    this.onScroll = this.onScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.isTouchDeviceManage = this.isTouchDevice();

    if (this.shouldEnable()) {
      this.init();
    }
    ResizeManager.subscribe(this.handleResize);
  }

  isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  shouldEnable() {
    // Only enabled when smooth scroll is configured, not a touch screen, and screen >= 768px
    const isExplicitlyDisabled = document.body.dataset.smoothScroll === "false";
    return !isExplicitlyDisabled && !this.isTouchDevice() && window.innerWidth >= 768;
  }

  init() {
    if (this.lenis) return;
    this.lenis = new Lenis({
      duration: 2.2, // Luxurious long momentum glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: !this.isTouchDeviceManage,
      mouseMultiplier: 1,
      smoothTouch: false, // Never interfere with native touch momentum on iOS/Android
      touchMultiplier: 2,
      infinite: false,
    });

    window.lenis = this.lenis;
    this.startRAF();
    this.addEventListeners();
  }

  startRAF() {
    if (this.rafHandle) return;
    const raf = (time) => {
      if (this.lenis) {
        this.lenis.raf(time);
        this.rafHandle = requestAnimationFrame(raf);
      }
    };
    this.rafHandle = requestAnimationFrame(raf);
  }

  addEventListeners() {
    if (this.lenis) {
      this.lenis.on("scroll", this.onScroll);
    }
  }

  onScroll(e) {
    // Dispatches scroll events for scroll-linked sections
    document.dispatchEvent(new CustomEvent("lenis:scroll", { detail: e }));
  }

  handleResize() {
    const shouldBeEnabled = this.shouldEnable();
    if (shouldBeEnabled && !this.lenis) {
      this.init();
      return;
    }
    if (!shouldBeEnabled && this.lenis) {
      this.disableLenisInstance();
      return;
    }
    if (shouldBeEnabled && this.lenis) {
      this.lenis.resize();
    }
  }

  disableLenisInstance() {
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.lenis) {
      this.lenis.off("scroll", this.onScroll);
      this.lenis.destroy();
      this.lenis = null;
    }
    window.lenis = null;
  }

  destroy() {
    this.disableLenisInstance();
    ResizeManager.unsubscribe(this.handleResize);
  }
}

// Auto-initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.lenisManager = new LenisSmoothScroll();
});
```

---

## 2. Scroll-Linked Lerp Parallax (`FloatingImages`)

Floating images smoothly drift, rotate, and scale relative to scroll velocity and viewport position.

### Complete Component Code (`js/text-with-floating-images.js`)

```javascript
export class FloatingImages extends HTMLDivElement {
  static LERP_FACTOR = 0.22; // Smooth damping coefficient
  static PROGRESS_EPSILON = 1e-4; // Numerical stability threshold

  constructor() {
    super();
    this.section = this.closest(".shopify-section, section");
    this.images = this.querySelectorAll("[data-floating-image]");
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.sectionWidth = 0;
    this.sectionHeight = 0;
    this.scrollStartY = 0;
    this.scrollTotalDist = 1;
    this.viewportHeight = 0;
    this.loopActive = false;
    this.renderRaf = null;
    this.animationReady = false;

    this.boundOnScroll = this.onScroll.bind(this);
    this.boundOnResize = this.onResize.bind(this);
    this.boundTick = this.tick.bind(this);
  }

  connectedCallback() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          this.initAnimation();
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    observer.observe(this.section);
  }

  initAnimation() {
    if (this.images.length === 0 || this.animationReady) return;
    this.animationReady = true;

    // GPU layer promotion
    if (this.images[0]) this.images[0].style.willChange = "transform";
    if (this.images.length > 2) this.images[this.images.length - 1].style.willChange = "transform";

    window.addEventListener("scroll", this.boundOnScroll, { passive: true });
    window.addEventListener("resize", this.boundOnResize, { passive: true });
    if (window.lenis) {
      window.lenis.on("scroll", this.boundOnScroll);
    }

    this.cacheMetrics();
    this.startLoop();
  }

  cacheMetrics() {
    const rect = this.section.getBoundingClientRect();
    this.sectionWidth = rect.width;
    this.sectionHeight = rect.height;
    this.viewportHeight = window.innerHeight;
    this.scrollStartY = this.viewportHeight * 0.5;
    const endY = this.viewportHeight - 150 - this.sectionHeight;
    this.scrollTotalDist = Math.max(1, this.scrollStartY - endY);
  }

  getTargetProgress(sectionTop) {
    return Math.max(0, Math.min(1, (this.scrollStartY - sectionTop) / this.scrollTotalDist));
  }

  startLoop() {
    if (this.loopActive) return;
    this.loopActive = true;
    this.renderRaf = requestAnimationFrame(this.boundTick);
  }

  stopLoop() {
    this.loopActive = false;
    if (this.renderRaf) {
      cancelAnimationFrame(this.renderRaf);
      this.renderRaf = null;
    }
  }

  tick() {
    if (!this.loopActive) return;
    const rect = this.section.getBoundingClientRect();
    if (rect.top > this.viewportHeight || rect.bottom < 0) {
      this.stopLoop();
      return;
    }

    this.targetProgress = this.getTargetProgress(rect.top);
    const diff = this.targetProgress - this.currentProgress;

    if (Math.abs(diff) < FloatingImages.PROGRESS_EPSILON) {
      this.currentProgress = this.targetProgress;
    } else {
      this.currentProgress += diff * FloatingImages.LERP_FACTOR;
    }

    this.applyTransforms(this.currentProgress);

    if (Math.abs(this.targetProgress - this.currentProgress) < FloatingImages.PROGRESS_EPSILON) {
      this.stopLoop();
      return;
    }
    this.renderRaf = requestAnimationFrame(this.boundTick);
  }

  applyTransforms(progress) {
    const remaining = 1 - progress;
    const buildTransform = (tx, ty, scaleEnd, rotation) => {
      const scale = 1 + (scaleEnd - 1) * remaining;
      return `translate3d(${tx * remaining}px, ${ty * remaining}px, 0) scale(${scale}) rotateZ(${rotation * remaining}deg)`;
    };

    const firstImage = this.images[0];
    if (firstImage) {
      firstImage.style.transform = buildTransform(-(this.sectionWidth * 0.02), -(this.sectionHeight * 0.4), 0.5, -19.2);
    }

    if (this.images.length > 2) {
      const lastImage = this.images[this.images.length - 1];
      lastImage.style.transform = buildTransform(this.sectionWidth * 0.025, -(this.sectionHeight * 0.35), 0.3, 23.0);
    }
  }

  onScroll() { this.startLoop(); }
  onResize() { this.cacheMetrics(); this.startLoop(); }
}

customElements.define("floating-images", FloatingImages, { extends: "div" });
```

---

## 3. Dual-Track Lookbook Carousel (Desktop 3D Track + Mobile Drawer)

In desktop mode, pinning the section locks vertical scroll and drives a synchronized two-track animation:
- **Left Track**: Stacked image cards with rank-based flex expansion, cubic opacity easing, and Gaussian blur falloff.
- **Right Track**: Accompanying product showcase scrolling in exact sync with scroll progress.

### Lookbook Math Formulation

$$\text{progress} = \frac{-\text{sectionTop}}{\text{scrollDistance}}, \quad \text{travel} = \text{progress} \times (N - 1), \quad \text{rank} = \text{blockIndex} - \text{travel}$$

$$\text{flexPct} = \max(\text{minPct}, \text{maxPct} - \text{rank} \times \text{stepPct})$$

### Complete Component Code (`js/component-lookbook-carousel.js`)

```javascript
const VISIBLE_COUNT = 4;

export class LookbookCarousel extends HTMLElement {
  constructor() {
    super();
    this.section = null;
    this.leftViewport = null;
    this.leftTrack = null;
    this.leftImages = [];
    this.rightViewport = null;
    this.rightTrack = null;
    this.scrollDistance = 0;
    this.rightOverflow = 0;
    this.count = 0;
    this.flexMaxPct = 33; // Front image expands to 33%
    this.flexMinPct = 18; // Background cards compress to 18%
    this.flexStepPct = 5;
    this.ticking = false;
    this._active = false;
  }

  connectedCallback() {
    this.section = this.closest("[data-lookbook-main]");
    this.leftViewport = this.querySelector("[data-lookbook-left-viewport]");
    this.leftTrack = this.querySelector("[data-lookbook-left]");
    this.leftImages = [...this.querySelectorAll("[data-lookbook-image]")];
    this.rightViewport = this.querySelector("[data-lookbook-right]");
    this.rightTrack = this.querySelector("[data-lookbook-products]");
    this.count = this.leftImages.length;

    if (this.count > 0) {
      this._activate();
    }
  }

  _activate() {
    this._active = true;
    this.leftTrack.style.willChange = "transform";
    this.rightTrack.style.willChange = "transform";
    window.addEventListener("scroll", () => this.onScroll(), { passive: true });
    this.measure();
  }

  measure() {
    const viewportHeight = window.innerHeight;
    const rightHeight = this.rightTrack.scrollHeight;
    const rightVisible = this.rightViewport.clientHeight;
    this.rightOverflow = Math.max(0, rightHeight - rightVisible);

    const first = this.leftImages[0];
    const last = this.leftImages[this.count - 1];
    this.totalTrackTranslate = this.count > 1 ? last.offsetLeft - first.offsetLeft : 0;
    this.scrollDistance = Math.max(this.rightOverflow, this.totalTrackTranslate, 1);
    this.section.style.height = `${this.scrollDistance + viewportHeight}px`;
    this.update();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  getProgress() {
    const top = this.section.getBoundingClientRect().top;
    return top > 0 ? 0 : Math.min(1, Math.max(0, -top / this.scrollDistance));
  }

  getOpacity(flexPct) {
    const stops = [[18, 0.3], [21, 0.3], [24, 0.35], [27, 0.5], [30, 0.6], [33, 1.0]];
    for (let i = 0; i < stops.length - 1; i++) {
      const [x1, y1] = stops[i], [x2, y2] = stops[i + 1];
      if (flexPct >= x1 && flexPct <= x2) {
        return y1 + (y2 - y1) * ((flexPct - x1) / (x2 - x1));
      }
    }
    return 1;
  }

  getBlur(flexPct) {
    const stops = [[18, 3.5], [21, 3.0], [24, 2.0], [27, 1.0], [30, 0], [33, 0]];
    for (let i = 0; i < stops.length - 1; i++) {
      const [x1, y1] = stops[i], [x2, y2] = stops[i + 1];
      if (flexPct >= x1 && flexPct <= x2) {
        return y1 + (y2 - y1) * ((flexPct - x1) / (x2 - x1));
      }
    }
    return 0;
  }

  update() {
    const progress = this.getProgress();
    const travel = progress * Math.max(this.count - 1, 1);
    const trackX = progress * this.totalTrackTranslate;

    this.leftImages.forEach((el, index) => {
      const rank = index - travel;
      if (rank > VISIBLE_COUNT + 1) {
        el.style.flex = `0 0 ${this.flexMinPct}%`;
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }

      const flexPct = rank < 0 ? this.flexMaxPct : Math.max(this.flexMinPct, this.flexMaxPct - rank * this.flexStepPct);
      const opacity = this.getOpacity(flexPct);
      const blur = this.getBlur(flexPct);

      el.style.flex = `0 0 ${flexPct}%`;
      el.style.opacity = opacity;
      const img = el.querySelector("img, svg");
      if (img) img.style.filter = `blur(${blur}px)`;
      el.style.zIndex = String(VISIBLE_COUNT - Math.round(Math.max(0, Math.min(rank, VISIBLE_COUNT - 1))));
    });

    this.leftTrack.style.transform = `translate3d(${trackX}px, 0, 0)`;
    const rightY = -progress * this.rightOverflow;
    this.rightTrack.style.transform = `translate3d(0, ${rightY}px, 0)`;
  }
}

customElements.define("lookbook-carousel", LookbookCarousel);
```

---

## 4. Scatter Deck Marquee (`ScatterMarquee`)

Cards initially present stacked in the center like a fanned deck of luxury cards with subtle rotation and overlap. Upon entering the viewport, they explode outwards with spring physics into an infinite scrolling marquee.

### Complete Scatter Implementation (`js/social-media-gallery.js`)

```javascript
export class ScatterMarquee extends HTMLElement {
  constructor() {
    super();
    this.CONFIG = { deckOverlap: 15, scatterDuration: 0.5, rotationRange: 16 };
    this.isScattered = false;
    this.isTransitioning = false;
  }

  connectedCallback() {
    this.track = this.querySelector("[data-marquee-track]");
    this.cards = Array.from(this.track.querySelectorAll("[data-card]:not([data-clone])"));
    if (!this.cards.length) return;

    this.direction = this.dataset.direction || "ltr";
    this.initDeck();

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isScattered) {
        this.handleScatter();
      }
    }, { rootMargin: "0px 0px -40% 0px" });
    observer.observe(this);
  }

  initDeck() {
    const cardWidth = this.cards[0].offsetWidth || 235;
    const containerWidth = this.offsetWidth || window.innerWidth;
    const centerX = containerWidth / 2;
    const baseX = centerX - cardWidth / 2;
    const deckCount = Math.min(5, this.cards.length);

    this.cards.forEach((card, i) => {
      if (i < deckCount) {
        const factor = (deckCount - 1) / 2 - i;
        const ratio = deckCount > 1 ? (deckCount - 1 - i) / (deckCount - 1) : 0;
        const x = baseX + factor * this.CONFIG.deckOverlap;
        const y = ratio * ratio * 24;
        const rot = ratio * this.CONFIG.rotationRange;
        card.style.transform = `translate3d(${x}px, ${y}px, 0px) rotate(${rot}deg) scale(0.92)`;
        card.style.zIndex = String(10 + i);
      } else {
        card.style.transform = `translate3d(${containerWidth + 100}px, 0px, 0px)`;
      }
    });
  }

  handleScatter() {
    if (this.isTransitioning || this.isScattered) return;
    this.isTransitioning = true;
    this.classList.add("is-scattering");

    const cardWidth = this.cards[0].offsetWidth || 235;
    const spacing = 16;
    const step = cardWidth + spacing;
    const totalWidth = this.cards.length * step;
    const containerWidth = this.offsetWidth || window.innerWidth;
    const rowStartX = containerWidth / 2 - totalWidth / 2;

    const animations = this.cards.map((card, i) => {
      const targetTransform = `translate3d(${rowStartX + i * step}px, 0px, 0px) rotate(0deg) scale(1)`;
      return card.animate(
        [{ transform: card.style.transform }, { transform: targetTransform }],
        { duration: this.CONFIG.scatterDuration * 1000, delay: i * 35, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
      ).finished.then(() => {
        card.style.transform = targetTransform;
      });
    });

    Promise.all(animations).then(() => {
      this.isTransitioning = false;
      this.isScattered = true;
      this.classList.remove("is-scattering");
      this.track.classList.add("marquee-running");
      this.track.style.setProperty("--marquee-start", `${rowStartX}px`);
      this.track.style.setProperty("--marquee-end", `${rowStartX - totalWidth}px`);
    });
  }
}

customElements.define("scatter-marquee", ScatterMarquee);
```

---

## 5. Shop The Look Interactive Hotspots

Hotspot buttons pinned to editorial lifestyle photography seamlessly sync bidirectionally with a Swiper product slider:

```javascript
export class ShopTheLookBanner extends HTMLDivElement {
  connectedCallback() {
    this.sliderInstance = this.querySelector(".swiper")?.swiper;
    this.setupHotspotSync();
  }

  setupHotspotSync() {
    const hotspots = this.querySelectorAll('[data-hotspot="true"]');
    hotspots.forEach((pin) => {
      pin.addEventListener("click", (e) => {
        e.preventDefault();
        const index = Number(pin.dataset.index);
        this.sliderInstance?.slideToLoop ? this.sliderInstance.slideToLoop(index) : this.sliderInstance?.slideTo(index);
        this.setActiveHotspot(index);
      });
    });

    this.sliderInstance?.on("slideChange", () => {
      this.setActiveHotspot(this.sliderInstance.realIndex);
    });
  }

  setActiveHotspot(index) {
    this.querySelectorAll('[data-hotspot="true"]').forEach((pin) => {
      pin.classList.toggle("active", Number(pin.dataset.index) === index);
    });
  }
}

customElements.define("shop-the-look-banner", ShopTheLookBanner, { extends: "div" });
```

---

## 6. Typewriter Predictive Search Placeholder

Creates human-like typing and erasing micro-interactions in search inputs:

```javascript
export class RunningPlaceholder {
  constructor(input, linesSource) {
    this._input = input;
    this._lines = JSON.parse(linesSource || '["Cashmere Sweaters", "Pleated Trousers", "Silk Dresses", "Wool Overcoats"]');
    this._lineIndex = 0;
    this._charIndex = 0;
    this._timer = null;
  }

  start() {
    this.type();
  }

  type() {
    const line = this._lines[this._lineIndex];
    if (this._charIndex < line.length) {
      this._charIndex += 1;
      this._input.placeholder = line.slice(0, this._charIndex);
      this._timer = setTimeout(() => this.type(), 40); // 40ms typing speed
    } else {
      this._timer = setTimeout(() => this.erase(), 2000); // 2s pause at end
    }
  }

  erase() {
    const line = this._lines[this._lineIndex];
    if (this._charIndex > 0) {
      this._charIndex -= 1;
      this._input.placeholder = line.slice(0, this._charIndex);
      this._timer = setTimeout(() => this.erase(), 25); // 25ms erase speed
    } else {
      this._lineIndex = (this._lineIndex + 1) % this._lines.length;
      this._timer = setTimeout(() => this.type(), 40);
    }
  }

  stop() {
    clearTimeout(this._timer);
  }
}
```
