# Feature: Lookbook 3D Carousel & Shop The Look Hotspots

## Sub-features
- Dual-track Lookbook scroll synchronization
- Fanned perspective compression with opacity/blur falloff
- Shop-the-look image pins with pulse rings
- Pin click syncs Swiper slide index
- Slide swipe highlights corresponding pin

## How to get to it (user POV)
1. Scroll down to the editorial Lookbook section (`[data-lookbook-main]`).
2. Scroll through: see the left images slide and expand while right product card translates.
3. Scroll further to the "Shop The Look" lifestyle photo.
4. Click on a `+` pin over a garment to jump to that product card in the slider.

## Driving it with DOM API
```javascript
// Check Lookbook Carousel
const lookbook = document.querySelector("lookbook-carousel");
console.assert(lookbook !== null, "LookbookCarousel must be defined");

// Check Hotspots
const hotspots = document.querySelectorAll('[data-hotspot="true"]');
console.assert(hotspots.length >= 2, "Shop The Look must contain at least 2 hotspots");

// Click second pin
hotspots[1].click();
console.assert(hotspots[1].classList.contains("active"), "Clicked hotspot must become active");
```

## Gotchas
- On viewports < 768px, Lookbook switches to `<lookbook-carousel-mobile>` with sticky product bottom sheet.
