# Feature: Product Buy Box & Size Chart Modal

## Sub-features
- Variant selection with radio pills and color swatches
- Smooth HTML updates without full page reloads
- Size Chart modal opening with focus trap
- Quantity increments/decrements with minimum limit
- Sticky Add to Cart bar on scroll

## How to get to it (user POV)
1. Open any product page (e.g., `/products/essential-crew-knit-copy.html`).
2. Click different color swatches and size options.
3. Click "Size Guide" to view measurement tables in an accessible drawer.
4. Scroll down past the primary Buy Button to see the Sticky Add to Cart bar appear.

## Driving it with DOM API
```javascript
// Test Variant Picker
const swatch = document.querySelector(".swatch-item, input[type='radio'][name='Color']");
if (swatch) swatch.click();

// Test Size Chart Modal Trigger
const sizeChartTrigger = document.querySelector('[is="size-chart-trigger"]');
if (sizeChartTrigger) {
  sizeChartTrigger.click();
  const modal = document.querySelector("size-chart-modal");
  console.assert(modal.hasAttribute("open"), "Size chart modal should be open");
  
  // Close modal
  const closeBtn = modal.querySelector('[is="close-drawer"]');
  closeBtn.click();
}
```

## Gotchas
- When variant changes, verify that the price element updates its text without throwing exceptions.
