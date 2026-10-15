#!/usr/bin/env bun
/**
 * SkyTheme Storefront Generator
 * Generates an ultra-luxurious e-commerce storefront with SkyTheme styling,
 * Lenis smooth scrolling, Web Components, and conversion features.
 *
 * Usage:
 *   bun scripts/generate-storefront.ts --name "My Brand" --out ./dist
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { assertFreshOutput } from "./safe-output.ts";

export function generateStorefrontHtml(storeName: string = "AURA LUXE", schemeClass: string = "scheme-1"): string {
  storeName = storeName.replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch] || ch));
  if (!/^scheme-[1-5]$/.test(schemeClass)) throw new Error("Invalid scheme");
  return `<!DOCTYPE html>
<html lang="en" class="js ${schemeClass}" style="--scrollbarWidth: 10px;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeName} — Premium Luxury Fashion</title>
  <meta name="description" content="Shop modern luxury knitwear, fine tailoring, and timeless wardrobe essentials. Engineered in premium fabrics." />
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="css/theme-tokens.css" />
  <link rel="stylesheet" href="css/theme-components.css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.3/dist/lenis.min.js"></script>

  <script type="module" src="js/store-app.js"></script>
</head>
<body data-smooth-scroll="true" class="bg-[rgb(var(--colorBackground))] text-[rgb(var(--colorText))] font-sans antialiased selection:bg-black selection:text-white">

  <!-- Top Announcement Bar -->
  <aside class="bg-black text-white py-2.5 px-4 text-center text-xs font-semibold tracking-wide flex items-center justify-center gap-3">
    <span>Free Worldwide Express Shipping on Orders Over $150</span>
    <span class="text-gray-500">|</span>
    <span class="text-orange-400 font-bold">Use Code AURA20 for 20% Off</span>
  </aside>

  <!-- Sticky Header -->
  <sticky-header class="sticky top-0 inset-x-0 z-40 block bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
    <header class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <nav class="hidden lg:flex items-center gap-8 font-semibold text-sm">
        <a href="#collections" class="hover:text-orange-600 transition-colors">Collections</a>
        <a href="#lookbook" class="hover:text-orange-600 transition-colors">Lookbook</a>
        <a href="#shop-the-look" class="hover:text-orange-600 transition-colors">Shop The Look</a>
        <a href="#editorial" class="hover:text-orange-600 transition-colors">Editorial</a>
      </nav>

      <a href="/" class="text-2xl font-bold tracking-tight uppercase">${storeName}</a>

      <div class="flex items-center gap-4">
        <button id="searchOpenBtn" class="p-2 hover:opacity-70" aria-label="Search">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </button>
        <button id="cartOpenBtn" class="p-2 hover:opacity-70 relative" aria-label="Cart">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="cartCountBadge" class="absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
        </button>
      </div>
    </header>
  </sticky-header>

  <!-- Hero Section -->
  <section class="relative min-h-[85vh] flex items-center justify-center bg-gray-900 text-white overflow-hidden px-6">
    <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" alt="Hero Lifestyle" class="absolute inset-0 w-full h-full object-cover opacity-60" />
    <div class="relative z-10 text-center max-w-3xl space-y-6">
      <span class="text-xs uppercase tracking-[0.25em] font-bold text-orange-400">The Modern Wardrobe</span>
      <h1 class="text-5xl md:text-7xl font-bold tracking-tight">Sculpted Simplicity. Everyday Luxury.</h1>
      <p class="text-lg text-white/90 font-light max-w-xl mx-auto">Discover Italian cashmere, tailored trousers, and effortless staples engineered to last a lifetime.</p>
      <div class="flex items-center justify-center gap-4 pt-4">
        <a href="#collections" class="btn-primary">Shop Collection</a>
        <a href="#lookbook" class="btn-secondary">Explore Lookbook</a>
      </div>
    </div>
  </section>

  <!-- Lookbook Section -->
  <section id="lookbook" class="py-24 max-w-7xl mx-auto px-6">
    <div class="flex justify-between items-end mb-12">
      <div>
        <span class="text-xs font-bold uppercase tracking-widest text-orange-500">Haute Couture</span>
        <h2 class="text-4xl font-bold tracking-tight mt-1">Autumn / Winter Lookbook</h2>
      </div>
      <p class="text-sm text-gray-500 max-w-xs text-right">Dual-track fanned image choreography synchronized with real-time product cards.</p>
    </div>
    <lookbook-carousel class="block relative min-h-[500px]">
      <div class="lookbook-track flex gap-6 overflow-hidden">
        <div class="lookbook-card flex-1 min-w-[280px] rounded-xl overflow-hidden shadow-lg" data-rank="1">
          <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop" alt="Look 01" class="w-full h-[450px] object-cover" />
          <div class="p-4 bg-white">
            <h4 class="font-bold">01. Oversized Cashmere Coat</h4>
            <span class="text-sm text-gray-500">$580.00</span>
          </div>
        </div>
        <div class="lookbook-card flex-1 min-w-[280px] rounded-xl overflow-hidden shadow-lg" data-rank="2">
          <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop" alt="Look 02" class="w-full h-[450px] object-cover" />
          <div class="p-4 bg-white">
            <h4 class="font-bold">02. Tailored Wool Trousers</h4>
            <span class="text-sm text-gray-500">$290.00</span>
          </div>
        </div>
      </div>
    </lookbook-carousel>
  </section>

  <!-- Shop The Look Banner -->
  <section id="shop-the-look" class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold tracking-tight">Shop The Look</h2>
        <p class="text-gray-500 text-sm mt-2">Interactive coordinates pinned directly to haute couture photography.</p>
      </div>
      <div class="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
        <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop" alt="Shop the look scene" class="w-full h-[550px] object-cover" />
        <button class="absolute w-8 h-8 rounded-full bg-white/90 text-black shadow-lg flex items-center justify-center font-bold text-xs ring-4 ring-white/40 hover:scale-110 transition" style="top: 35%; left: 45%;" data-hotspot="true" data-product-id="coat" aria-label="View Coat Pin">+</button>
        <button class="absolute w-8 h-8 rounded-full bg-white/90 text-black shadow-lg flex items-center justify-center font-bold text-xs ring-4 ring-white/40 hover:scale-110 transition" style="top: 70%; left: 52%;" data-hotspot="true" data-product-id="pants" aria-label="View Trousers Pin">+</button>
      </div>
    </div>
  </section>

  <p id="hotspotStatus" role="status" aria-live="polite" class="sr-only"></p>

  <!-- Slide-out Cart Drawer -->
  <bag-drawer id="cartDrawer" role="dialog" aria-modal="true" aria-label="Shopping Cart" class="fixed inset-0 z-50 pointer-events-none hidden [&.is-open]:block [&.is-open]:pointer-events-auto">
    <div id="cartOverlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"></div>
    <div class="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white p-6 shadow-2xl flex flex-col z-10 overflow-y-auto">
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-xl font-bold">Shopping Bag</h3>
        <button id="cartCloseBtn" class="p-2 text-xl font-bold" aria-label="Close cart">✕</button>
      </div>
      <div class="py-4 border-b" data-shipping-box>
        <div id="freeShippingNotice" class="text-xs font-semibold">Spend $45.00 more for Free Express Shipping</div>
        <div class="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div id="freeShippingProgress" class="h-full bg-orange-500 rounded-full transition-all duration-500" style="width: 70%;"></div>
        </div>
      </div>
      <div id="cartItemsList" class="flex-1 py-6 space-y-4">
        <p class="text-gray-500 text-sm text-center py-12">Your bag is currently empty.</p>
      </div>
      <div class="pt-4 border-t space-y-3">
        <div class="flex justify-between font-bold text-lg">
          <span>Subtotal</span>
          <span id="cartSubtotalText">$0.00</span>
        </div>
        <button class="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition">Checkout</button>
      </div>
    </div>
  </bag-drawer>

  <!-- Mobile Bottom Docker (Touch-Device Optimized) -->
  <mobile-docker class="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-40 px-6 py-3 flex items-center justify-around shadow-lg">
    <a href="#" class="flex flex-col items-center gap-1 text-xs font-semibold text-gray-700">Home</a>
    <button class="flex flex-col items-center gap-1 text-xs font-semibold text-gray-700">Cart</button>
    <a href="#lookbook" class="flex flex-col items-center gap-1 text-xs font-semibold text-gray-700">Lookbook</a>
  </mobile-docker>

</body>
</html>`;
}

export function generateTokensCss(): string {
  return `:root {
  --colorBackground: 242 242 244;
  --colorText: 32 32 32;
  --buttonBackground: 0 0 0;
  --buttonColor: 255 255 255;
  --buttonSecondaryBackground: 255 60 2;
  --buttonSecondaryColor: 255 255 255;
  --buttonRadius: 40px;
  --buttonHeight: 48px;
  --blockRadius: 10px;
  --fontFamilyBody: "Bricolage Grotesque", -apple-system, sans-serif;
  --fontFamilyHeading: "Quicksand", -apple-system, sans-serif;
}

body {
  font-family: var(--fontFamilyBody);
}

h1, h2, h3, h4 {
  font-family: var(--fontFamilyHeading);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--buttonHeight);
  padding: 0 32px;
  border-radius: var(--buttonRadius);
  background: rgb(var(--buttonBackground));
  color: rgb(var(--buttonColor));
  font-weight: 600;
  transition: transform 0.2s ease, background 0.2s ease;
}
.btn-primary:hover {
  background: #222;
  transform: translateY(-2px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--buttonHeight);
  padding: 0 32px;
  border-radius: var(--buttonRadius);
  background: rgb(var(--buttonSecondaryBackground));
  color: rgb(var(--buttonSecondaryColor));
  font-weight: 600;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.btn-secondary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
`;
}

export function generateStoreAppJs(): string {
  return "const coarse=matchMedia('(pointer: coarse)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');\nlet lenis=null,scrollFrame=0;\nfunction initScroll(){if(!window.Lenis||coarse.matches||reduce.matches||innerWidth<768||lenis)return;\nlenis=new window.Lenis({duration:1.2,smoothWheel:true});\nconst raf=t=>{if(!lenis)return;lenis.raf(t);scrollFrame=requestAnimationFrame(raf)};scrollFrame=requestAnimationFrame(raf)}\nfunction endScroll(){lenis?.destroy();lenis=null;if(scrollFrame)cancelAnimationFrame(scrollFrame);scrollFrame=0}\ninitScroll();addEventListener('resize',()=>{if(coarse.matches||reduce.matches||innerWidth<768)endScroll();else initScroll()},{passive:true});\nclass BagDrawer extends HTMLElement {\nconnectedCallback(){this.inert=true;this.setAttribute('aria-hidden','true');this.keyHandler=this.onKeys.bind(this)}\nfocusable(){return [...this.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex=\"-1\"])')].filter(el=>el.getClientRects().length)}\nonKeys(e){if(e.key==='Escape'){e.preventDefault();this.close();return}if(e.key!=='Tab')return;\nconst els=this.focusable();if(!els.length)return;let first=els[0],last=els[els.length-1];\nif(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}\nopen(){if(this.classList.contains('is-open'))return;this.opener=document.activeElement;this.lastOverflow=document.body.style.overflow;this.inert=false;this.classList.add('is-open');this.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.addEventListener('keydown',this.keyHandler);requestAnimationFrame(()=>this.focusable()[0]?.focus())}\nclose(){if(!this.classList.contains('is-open'))return;this.classList.remove('is-open');this.setAttribute('aria-hidden','true');this.inert=true;document.body.style.overflow=this.lastOverflow??'';document.removeEventListener('keydown',this.keyHandler);this.opener?.focus?.()}\ndisconnectedCallback(){document.removeEventListener('keydown',this.keyHandler);if(this.classList.contains('is-open'))document.body.style.overflow=this.lastOverflow??''}}\ncustomElements.define('bag-drawer',BagDrawer);\nclass LookbookCarousel extends HTMLElement {\nconnectedCallback(){this.cards=[...this.querySelectorAll('.lookbook-card')];this.onScroll=this.onScroll.bind(this);this.observer=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);if(this.visible)this.onScroll()});this.observer.observe(this);addEventListener('scroll',this.onScroll,{passive:true});addEventListener('resize',this.onScroll,{passive:true})}\nonScroll(){if(!this.visible||this.frame||reduce.matches||this.cards.length<2)return;\nthis.frame=requestAnimationFrame(()=>{this.frame=0;const r=this.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));this.cards.forEach((card,i)=>{const rank=i-(this.cards.length-1)/2;card.style.transform='translate3d(0,'+Math.round(Math.sin(p*Math.PI)*Math.abs(rank)*18)+'px,0) rotate('+(rank*(1-p)*2).toFixed(2)+'deg)'})})}\ndisconnectedCallback(){this.observer?.disconnect();removeEventListener('scroll',this.onScroll);removeEventListener('resize',this.onScroll);if(this.frame)cancelAnimationFrame(this.frame)}}\ncustomElements.define('lookbook-carousel',LookbookCarousel);\nconst drawer=document.getElementById('cartDrawer');\ndocument.getElementById('cartOpenBtn')?.addEventListener('click',()=>drawer?.open());\ndocument.getElementById('cartCloseBtn')?.addEventListener('click',()=>drawer?.close());\ndocument.getElementById('cartOverlay')?.addEventListener('click',()=>drawer?.close());\ndocument.querySelector('mobile-docker button')?.addEventListener('click',()=>drawer?.open());\nfor(const pin of document.querySelectorAll('[data-hotspot]'))pin.addEventListener('click',()=>{\ndocument.querySelectorAll('[data-hotspot]').forEach(el=>el.setAttribute('aria-pressed',String(el===pin)));\nconst status=document.getElementById('hotspotStatus');if(status)status.textContent='Selected look: '+(pin.getAttribute('data-product-id')||'item')});";
}

// Standalone CLI Execution
if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      name: { type: "string", default: "AURA LUXE" },
      out: { type: "string", default: "./storefront-dist" },
      scheme: { type: "string", default: "scheme-1" },
    },
    strict: false,
  });

  const storeName = typeof values.name === "string" ? values.name : "AURA LUXE";
  const rawOut = typeof values.out === "string" ? values.out : "./storefront-dist";
  const outDir = assertFreshOutput(rawOut);
  const schemeClass = typeof values.scheme === "string" ? values.scheme : "scheme-1";

  console.log(`🚀 Generating SkyTheme Storefront for "${storeName}"...`);
  console.log(`📁 Target Directory: ${outDir}`);

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  mkdirSync(join(outDir, "css"), { recursive: true });
  mkdirSync(join(outDir, "js"), { recursive: true });

  writeFileSync(join(outDir, "index.html"), generateStorefrontHtml(storeName, schemeClass));
  writeFileSync(join(outDir, "css/theme-tokens.css"), generateTokensCss());
  writeFileSync(join(outDir, "css/theme-components.css"), `.lookbook-card { transition: transform 180ms linear; }\n[data-hotspot][aria-pressed="true"] { outline: 3px solid #111; outline-offset: 4px; }\n@media (prefers-reduced-motion: reduce) { .lookbook-card { transition: none; } }\n`);
  writeFileSync(join(outDir, "js/store-app.js"), generateStoreAppJs());

  console.log(`Standalone HTML preview scaffolded at ${outDir}. NOT a Shopify theme or evidence of Sky parity.`);
}
