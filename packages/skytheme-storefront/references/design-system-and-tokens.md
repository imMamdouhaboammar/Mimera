# SkyTheme Design System & Token Specification

> **Reverse-Engineered from:** SkyTheme High-End E-Commerce Storefront  
> **Aesthetic Profile:** Ultra-modern luxury fashion, editorial typography, fluid responsive layout, soft tactile surfaces, high-contrast micro-interactions.

---

## 1. CSS Custom Properties (:root)

Apply these tokens to the global root style sheet (`styles/theme-tokens.css` or within `<style>:root`):

```css
:root {
  /* ==========================================================================
     TYPOGRAPHY TOKENS
     ========================================================================== */
  --bodyFontFamily: "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --bodyFontStyle: normal;
  --bodyFontWeight: 400;
  --bodyFontWeightBold: 700;
  --bodyFontLineHeight: 1.5;
  --bodyFontScale: 1;
  --bodyFontLetterSpacing: 0.1px;

  --headingFontFamily: "Quicksand", -apple-system, BlinkMacSystemFont, sans-serif;
  --headingFontStyle: normal;
  --headingFontWeight: 600;
  --headingFontLineHeight: 1.2;
  --headingFontScale: 1;
  --headingTextTransform: unset;
  --headingFontLetterSpacing: -0.4px;

  --accentFontFamily: "Protest Riot", cursive, sans-serif;
  --accentFontStyle: normal;
  --accentFontWeight: 400;
  --accentFontLineHeight: 1.2;
  --accentFontLetterSpacing: 0px;
  --accentFontScale: 1;

  /* ==========================================================================
     DISPLAY & HEADING HIERARCHY (DESKTOP BASE)
     ========================================================================== */
  --hd2: calc(var(--headingFontScale) * 120px);
  --hd1: calc(var(--headingFontScale) * 100px);
  --h0: calc(var(--headingFontScale) * 88px);
  --h1: calc(var(--headingFontScale) * 72px);
  --h2: calc(var(--headingFontScale) * 54px);
  --h3: calc(var(--headingFontScale) * 42px);
  --h4: calc(var(--headingFontScale) * 30px);
  --h5: calc(var(--headingFontScale) * 24px);
  --h6: calc(var(--headingFontScale) * 20px);

  /* ==========================================================================
     BODY & UTILITY TEXT SIZES
     ========================================================================== */
  --textXlarge: calc(var(--bodyFontScale) * 20px);
  --textLarge: calc(var(--bodyFontScale) * 18px);
  --textMedium: calc(var(--bodyFontScale) * 16px);
  --text: calc(var(--bodyFontScale) * 14px);
  --textSmall: calc(var(--bodyFontScale) * 12px);
  --textXsmall: calc(var(--bodyFontScale) * 10px);

  /* ==========================================================================
     INTERACTION & MOTION EASING
     ========================================================================== */
  --animation-nav: 0.5s cubic-bezier(0.6, 0, 0.4, 1);
  --animation-default: 0.5s cubic-bezier(0.3, 1, 0.3, 1);
  --animation-fast: 0.3s cubic-bezier(0.7, 0, 0.3, 1);
  --animation-default-ease: 0.5s ease;

  /* ==========================================================================
     STATUS & CONVERSION ACCENT COLORS (RGB CHANNELS)
     ========================================================================== */
  --successColor: 29 156 30;
  --successBackground: 230 249 235 / 1.0;
  --warningColor: 94 66 0;
  --warningBackground: 255 248 225 / 1.0;
  --errorColor: 142 31 11;
  --errorBackground: 255 243 242 / 1.0;
  --keyboradFocusColor: #000000;
  --cartBubbleBackgroundColor: 201 12 44;

  /* Stock Status Signals */
  --inStock: 65 125 61;             /* Forest Emerald */
  --lowStock: 224 46 46;            /* Urgent Red */
  --outofStock: 188 31 31;          /* Ruby Grayed */
  --preorderInventory: 121 0 219;   /* Royal Purple */

  /* Marketing & Promotion Badges */
  --saleBackground: 255 255 255;
  --saleTextColor: 0 0 0;
  --discountBackground: 255 255 255;
  --discountTextColor: 0 0 0;
  --soldOutBackground: 255 255 255;
  --soldOutTextColor: 0 0 0;
  --preOrderBackground: 255 255 255;
  --preOrderTextColor: 0 0 0;
  --customBadgeBackground: 255 255 255;
  --customBadgeTextColor: 0 0 0;

  /* Progress & Shipping Accent */
  --shippingBackgroundGradient: linear-gradient(127deg, rgba(255, 204, 0, 1) 11%, rgba(255, 68, 0, 1) 81%);

  /* ==========================================================================
     DIMENSIONS, RADII & SPATIAL METRICS
     ========================================================================== */
  --buttonRadius: 40px;            /* Full Pill Buttons */
  --buttonTextTransform: capitalize;
  --buttonHeight: 44px;
  --formRadius: 40px;              /* Pill Form Inputs */
  --blockRadius: 10px;             /* Rounded Cards & Tiles */
  --blockRadiusSmall: 5px;
  --swatchRadius: 50%;             /* Circular Swatches */
  --swatchSize: 14px;
  --swiperNavigationSize: 24px;
  --headerHeight: 78px;
  --headerHeightInitial: 78px;
  --mobileDockerHeight: 0px;
  --mobileDockerHeightDynamic: 0px;
}

/* ==========================================================================
   RESPONSIVE TYPOGRAPHY ADJUSTMENTS
   ========================================================================== */
@media (max-width: 1024px) {
  :root {
    --swatchSize: max(11.9px, 12px);
    --hd2: calc(var(--headingFontScale) * 60px);
    --hd1: calc(var(--headingFontScale) * 52px);
    --h0: calc(var(--headingFontScale) * 50px);
    --h1: calc(var(--headingFontScale) * 42px);
    --h2: calc(var(--headingFontScale) * 36px);
    --h3: calc(var(--headingFontScale) * 28px);
    --h4: calc(var(--headingFontScale) * 24px);
    --h5: calc(var(--headingFontScale) * 20px);
    --h6: calc(var(--headingFontScale) * 18px);
  }
}

@media (max-width: 767px) {
  :root {
    --swatchSize: max(9.8px, 12px);
    --hd2: calc(var(--headingFontScale) * 48px);
    --hd1: calc(var(--headingFontScale) * 40px);
    --h0: calc(var(--headingFontScale) * 36px);
    --h1: calc(var(--headingFontScale) * 30px);
    --h2: calc(var(--headingFontScale) * 26px);
    --h3: calc(var(--headingFontScale) * 22px);
    --h4: calc(var(--headingFontScale) * 18px);
    --h5: calc(var(--headingFontScale) * 16px);
    --h6: calc(var(--headingFontScale) * 14px);
    --headerHeight: 59px;
    --headerHeightInitial: 59px;
  }
}
```

---

## 2. Five Canonical Color Schemes

SkyTheme utilizes CSS color mixing (`color-mix(in srgb, ...)`) with rgb channel triplets for instant theme switching:

### Scheme 1: Light Chalk / Modern Editorial (Default Storefront)
```css
:root, .scheme-1 {
  --background: 242 242 244;
  --backgroundContrast: 173 173 186;
  --gradientBackground: rgb(242 242 244);
  --alternateBackground: 255 255 255;
  --borderColor: 227 227 228 / 1.0;
  --headingColor: 0 0 0;
  --textColor: 32 32 32;
  --textColorLight: color-mix(in srgb, rgb(var(--textColor)), transparent 30%);
  --textColorXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 60%);
  --textColorXXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 80%);
  --textColorXXXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 90%);

  --buttonColor: 255 255 255;
  --buttonBackground: 0 0 0;
  --buttonColorHover: 255 255 255;
  --buttonBackgroundHover: 26 26 26;

  --buttonSecondaryColor: 0 0 0;
  --buttonSecondaryBackground: 255 60 2;        /* Vibrant Orange */
  --buttonSecondaryColorHover: 255 255 255;
  --buttonSecondaryBackgroundHover: 26 26 26;

  --imageBackground: 242 242 244;
  --productCardBackground: 255 255 255;
  --productTitleColor: 0 0 0;
  --productTextColor: 0 0 0;
  --productTextColorLight: color-mix(in srgb, rgb(var(--productTextColor)), transparent 30%);
  --productCardBackdropBg: 255 255 255 / 0.67;
  --productCardBackdropColor: 43 43 43;

  --cardBackground: 255 255 255;
  --cardBorder: 229 229 229 / 1.0;
  --cardHeading: 0 0 0;
  --cardDescription: 0 0 0;

  --swiperNavigationBackground: 255 255 255 / 1.0;
  --swiperNavigationColor: 0 0 0;
  --swiperNavigationBorderColor: 229 229 229 / 1.0;

  --formColor: 0 0 0;
  --formBackground: 255 255 255;
  --formBorder: 221 221 221 / 1.0;
}
```

### Scheme 2: Night Luxe (Dark Monolith)
```css
.scheme-2 {
  --background: 0 0 0;
  --backgroundContrast: 128 128 128;
  --gradientBackground: rgb(0 0 0);
  --alternateBackground: 255 255 255;
  --borderColor: 229 229 229 / 1.0;
  --headingColor: 255 255 255;
  --textColor: 255 255 255;
  --textColorLight: color-mix(in srgb, rgb(var(--textColor)), transparent 30%);
  --textColorXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 60%);
  --textColorXXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 80%);
  --textColorXXXLight: color-mix(in srgb, rgb(var(--textColor)), transparent 90%);

  --buttonColor: 0 0 0;
  --buttonBackground: 255 255 255;
  --buttonColorHover: 0 0 0;
  --buttonBackgroundHover: 230 230 230;

  --imageBackground: 54 54 54;
  --productCardBackground: 255 255 255;
  --productTitleColor: 0 0 0;
  --productTextColor: 0 0 0;
  --cardBackground: 20 20 20;
  --cardBorder: 40 40 40 / 1.0;
  --formColor: 255 255 255;
  --formBackground: 20 20 20;
  --formBorder: 50 50 50 / 1.0;
}
```

### Scheme 3: Pure Optical White with Electric Accent
```css
.scheme-3 {
  --background: 255 255 255;
  --backgroundContrast: 191 191 191;
  --gradientBackground: rgb(255 255 255);
  --alternateBackground: 242 242 244;
  --borderColor: 227 227 228 / 1.0;
  --headingColor: 0 0 0;
  --textColor: 36 36 36;
  --buttonColor: 255 255 255;
  --buttonBackground: 255 68 0; /* High Voltage Sunset */
  --buttonColorHover: 255 255 255;
  --buttonBackgroundHover: 0 0 0;
}
```

### Scheme 4: Warm Minimalist Sand
```css
.scheme-4 {
  --background: 242 242 244;
  --backgroundContrast: 173 173 186;
  --borderColor: 32 32 32 / 0.19;
  --headingColor: 43 43 43;
  --textColor: 43 43 43;
  --buttonBackground: 255 68 0;
  --buttonSecondaryBackground: 255 84 33;
}
```

### Scheme 5: Crisp High-Contrast Monochrome
```css
.scheme-5 {
  --background: 255 255 255;
  --backgroundContrast: 191 191 191;
  --borderColor: 229 229 229 / 1.0;
  --headingColor: 0 0 0;
  --textColor: 0 0 0;
  --buttonColor: 255 255 255;
  --buttonBackground: 0 0 0;
}
```

---

## 3. Layout Grid & Container Structure

```css
.container,
.container-wide,
.container-narrow,
.container-small,
.container-xsmall {
  --pagePadding: 15px;
  width: 100%;
  margin: 0 auto;
  padding-inline: var(--pagePadding);
}

@media (min-width: 768px) {
  .container,
  .container-wide,
  .container-narrow,
  .container-small,
  .container-xsmall {
    --pagePadding: 2.5rem;
  }
}

@media (min-width: 1200px) {
  .container,
  .container-wide,
  .container-narrow,
  .container-small,
  .container-xsmall {
    --pagePadding: 3rem;
  }
}

@media (min-width: 1536px) {
  .container,
  .container-wide,
  .container-small,
  .container-xsmall {
    --pagePadding: max(60px, 50vw - var(--scrollbarWidth, 0px) / 2 - var(--pageWidth) / 2);
  }
  .container-narrow {
    --pageWidth: 1920px;
    --pagePadding: max(30px, 50vw - var(--scrollbarWidth, 0px) / 2 - var(--pageWidth) / 2);
  }
  .container-wide   { --pageWidth: 1920px; }
  .container        { --pageWidth: 1675px; }
  .container-small  { --pageWidth: 1480px; }
  .container-xsmall { --pageWidth: 1400px; }
}
```

---

## 4. Reusable Component Primitives

### Pill Button System
```css
.btn, button.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--buttonHeight);
  padding: 0 28px;
  border-radius: var(--buttonRadius);
  background: rgb(var(--buttonBackground));
  color: rgb(var(--buttonColor));
  font-family: var(--bodyFontFamily);
  font-weight: 600;
  font-size: var(--text);
  text-transform: var(--buttonTextTransform);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.3, 1, 0.3, 1);
  border: 1px solid transparent;
}

.btn:hover {
  background: rgb(var(--buttonBackgroundHover));
  color: rgb(var(--buttonColorHover));
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgb(var(--buttonSecondaryBackground));
  color: rgb(var(--buttonSecondaryColor));
}

.btn-outline {
  background: transparent;
  color: rgb(var(--textColor));
  border-color: rgba(var(--borderColor));
}
```

### Pill Form Inputs
```css
.form-control {
  width: 100%;
  background-color: rgb(var(--formBackground));
  color: rgb(var(--formColor));
  border: 1px solid rgb(var(--formBorder));
  border-radius: var(--formRadius);
  padding: 9px 24px;
  min-height: 50px;
  font-family: var(--bodyFontFamily);
  font-weight: var(--bodyFontWeight);
  font-size: var(--text);
  transition: 0.3s all;
}

.form-control:focus-visible {
  outline: none;
  border-color: rgb(var(--textColor));
}
```
