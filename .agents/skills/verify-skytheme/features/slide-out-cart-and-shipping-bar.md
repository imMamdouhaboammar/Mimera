# Feature: Slide-Out Cart & Free Shipping Bar

## Sub-features
- Header Cart icon click opens `<bag-drawer>`
- Background overlay dimming & scroll lock on `<body>`
- Free shipping progress bar rendering dynamically based on cart total
- Accessible focus trapping to drawer close button
- Escape key closes drawer and restores focus

## How to get to it (user POV)
1. Load homepage or PDP.
2. Click the Bag / Cart icon in the top right header (`[aria-controls="CartDrawer"]`).
3. Observe drawer sliding in from the right edge with the order goal bar.

## Driving it with DOM API
```javascript
// Open Drawer
const trigger = document.querySelector('[aria-controls="CartDrawer"]');
trigger.click();

// Verify open state
console.assert(document.querySelector("bag-drawer").hasAttribute("open"), "Drawer should have [open]");
console.assert(document.body.classList.contains("scroll-locked") || document.body.style.overflow === "hidden", "Scroll should be locked");

// Verify shipping goal
const shippingBox = document.querySelector("[data-shipping-box]");
console.assert(shippingBox !== null, "Shipping box must exist");

// Close Drawer
const closeBtn = document.querySelector("#CartDrawer .drawer-close-btn") || document.querySelector('[is="close-drawer"]');
closeBtn.click();
```

## Gotchas
- Ensure focus returns to the opener element after drawer closes.
- On mobile viewports, opening drawer must calculate `--mobileDockerHeight` offset.
