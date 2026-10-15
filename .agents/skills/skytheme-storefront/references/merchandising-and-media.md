# SkyTheme Merchandising & Media Systems

> **Reverse-Engineered from:** `product-media-gallery.js`, `shop-the-look-banner.js`, `component-lookbook-carousel.js`, `theme-global.js`.  
> **Key Capabilities:** Multi-layout Product Media Gallery, Vertical Thumbnail Scroll-Sync, PhotoSwipe v5 Lightbox & Zoom, Hover Video Autoplay, Interactive Image Hotspots, Dual-Track Lookbook, Before/After Image Slider, Color Swatches.

---

## 1. Product Media Gallery (`<media-gallery>`)

The product gallery supports desktop vertical thumbnail strip (`left-vertical-filled`), mobile swipeable carousel, and full desktop scroll-sync with the buy box.

### Media Gallery Web Component

```javascript
import PhotoSwipeLightbox from "photoswipe/lightbox";
import PhotoSwipe from "photoswipe";

export class MediaGallery extends HTMLElement {
  constructor() {
    super();
    this.sliderInstance = null;
    this.mobileSliderInstance = null;
    this._photoswipe = null;
  }

  connectedCallback() {
    this.initPhotoswipe();
    this.bindLightboxTriggers();
  }

  initPhotoswipe() {
    this._photoswipe = new PhotoSwipeLightbox({
      gallery: this,
      children: "[data-pswp-item]",
      pswpModule: PhotoSwipe,
      bgOpacity: 0.96,
      wheelToZoom: true,
      zoom: true,
      closeSVG: '<svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5"/></svg>',
    });
    this._photoswipe.init();
  }

  bindLightboxTriggers() {
    this.querySelectorAll('[is="media-lightbox-button"]').forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const index = parseInt(button.dataset.index, 10) || 0;
        this._photoswipe.loadAndOpen(index);
      });
    });
  }
}

customElements.define("media-gallery", MediaGallery);
```

---

## 2. Vertical Thumbnail Scroll-Sync (`<media-gallery-grid-thumbs>`)

When scrolling through high-resolution product photos on desktop, thumbnails automatically scroll and highlight the currently centered image in the viewport:

```javascript
export class MediaGalleryGridThumbs extends HTMLDivElement {
  constructor() {
    super();
    this.activeIndex = 0;
    this._visibleMedia = new Map();
  }

  connectedCallback() {
    this.thumbs = Array.from(this.querySelectorAll("[data-thumbnail-item]"));
    this.setupScrollObserver();
  }

  setupScrollObserver() {
    const gallery = this.closest("media-gallery");
    const mediaItems = gallery?.querySelectorAll("[data-media-item]");
    if (!mediaItems?.length) return;

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.dataset.mediaId;
        if (entry.isIntersecting) {
          this._visibleMedia.set(id, entry.target);
        } else {
          this._visibleMedia.delete(id);
        }
      });
      this.syncActiveFromScroll();
    }, { threshold: [0.2, 0.5, 0.8] });

    mediaItems.forEach(item => this._observer.observe(item));
  }

  syncActiveFromScroll() {
    const viewportCenter = window.innerHeight / 2;
    let closestId = null;
    let minDistance = Infinity;

    for (const [id, el] of this._visibleMedia) {
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = id;
      }
    }

    if (closestId) {
      const index = this.thumbs.findIndex(t => t.dataset.mediaId === closestId);
      if (index !== -1 && index !== this.activeIndex) {
        this.setActiveIndex(index);
      }
    }
  }

  setActiveIndex(index) {
    this.activeIndex = index;
    this.thumbs.forEach((t, i) => {
      t.classList.toggle("is-active", i === index);
      t.setAttribute("aria-current", i === index ? "true" : "false");
    });
    // Smoothly scroll thumbnail container
    const activeThumb = this.thumbs[index];
    activeThumb?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

customElements.define("media-gallery-grid-thumbs", MediaGalleryGridThumbs, { extends: "div" });
```

---

## 3. Hover Video Autoplay with `<sky-lazy-media>`

Videos on collection cards and social feeds lazy-load until hovered or visible, fading the poster seamlessly:

```javascript
export class SkyLazyMedia extends HTMLElement {
  connectedCallback() {
    this.video = this.querySelector("video");
    this.poster = this.querySelector(".video-poster");
    this.autoplay = this.dataset.autoplay === "true";

    if (this.autoplay) {
      this.loadAndPlay();
    }
  }

  loadAndPlay() {
    if (!this.video) return;
    this.video.preload = "auto";
    const playPromise = this.video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (this.poster) {
          this.poster.style.opacity = "0";
          setTimeout(() => this.poster.classList.add("hidden"), 300);
        }
      }).catch(() => {
        // Autoplay prevented by browser
      });
    }
  }

  pauseMedia() {
    if (this.video && !this.video.paused) {
      this.video.pause();
      if (this.poster) {
        this.poster.classList.remove("hidden");
        this.poster.style.opacity = "1";
      }
    }
  }
}

customElements.define("sky-lazy-media", SkyLazyMedia);
```

---

## 4. Image Rollover Effect (`<media-on-hover>`)

Secondary lifestyle image fades or slides in smoothly when hovering over a product tile:

```javascript
export class MediaOnHover extends HTMLDivElement {
  connectedCallback() {
    const primaryImg = this.querySelector(".primary-image");
    const secondaryImg = this.querySelector(".secondary-image");
    if (!secondaryImg) return;

    this.addEventListener("mouseenter", () => {
      secondaryImg.style.opacity = "1";
      secondaryImg.style.transform = "scale(1.04)";
    });

    this.addEventListener("mouseleave", () => {
      secondaryImg.style.opacity = "0";
      secondaryImg.style.transform = "scale(1)";
    });
  }
}

customElements.define("media-on-hover", MediaOnHover, { extends: "div" });
```

---

## 5. Before/After Image Comparison Slider

Allows shoppers to inspect fabric drape, fit changes, or color contrasts interactively:

```html
<div class="before-after-slider relative w-full aspect-[4/5] rounded-[10px] overflow-hidden select-none">
  <!-- Before Image -->
  <img src="images/before.webp" alt="Standard Fit" class="absolute inset-0 w-full h-full object-cover" />
  
  <!-- After Image with clip-path -->
  <div class="after-image-wrapper absolute inset-0 w-full h-full overflow-hidden" style="clip-path: polygon(0 0, var(--slider-split, 50%) 0, var(--slider-split, 50%) 100%, 0 100%);">
    <img src="images/after.webp" alt="Tailored Fit" class="absolute inset-0 w-full h-full object-cover" />
  </div>

  <!-- Divider Handle -->
  <div class="slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg" style="left: var(--slider-split, 50%);">
    <div class="handle-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-black rounded-full shadow flex items-center justify-center font-bold text-xs">
      ⇄
    </div>
  </div>

  <input type="range" min="0" max="100" value="50" class="absolute inset-0 opacity-0 cursor-ew-resize z-20" oninput="this.parentElement.style.setProperty('--slider-split', this.value + '%')">
</div>
```

---

## 6. Color Swatches with Visual Preview

Swatches render circular color fills, image textures, and active state rings:

```html
<div class="swatch-list flex items-center gap-2">
  <button 
    type="button" 
    class="swatch-item w-[18px] h-[18px] rounded-full relative border border-gray-300 ring-2 ring-transparent transition-all hover:scale-110 active:ring-black"
    style="background-color: #2b2b2b;" 
    title="Charcoal"
    aria-label="Color Charcoal"
  ></button>
  <button 
    type="button" 
    class="swatch-item w-[18px] h-[18px] rounded-full relative border border-gray-300 ring-2 ring-black" 
    style="background-color: #e5dcc5;" 
    title="Oatmeal Heather"
    aria-label="Color Oatmeal Heather"
  ></button>
  <button 
    type="button" 
    class="swatch-item w-[18px] h-[18px] rounded-full relative border border-gray-300 ring-2 ring-transparent hover:scale-110" 
    style="background-color: #1a2a3a;" 
    title="Deep Navy"
    aria-label="Color Deep Navy"
  ></button>
</div>
```
