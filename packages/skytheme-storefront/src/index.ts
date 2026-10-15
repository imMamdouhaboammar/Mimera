import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

export const SkyThemeSchemeSchema = z.enum([
  "scheme-1",
  "scheme-2",
  "scheme-3",
  "scheme-4",
  "scheme-5",
]);
export type SkyThemeScheme = z.infer<typeof SkyThemeSchemeSchema>;

export const StorefrontGenerationOptionsSchema = z.object({
  storeName: z.string().default("AURA LUXE"),
  schemeClass: SkyThemeSchemeSchema.default("scheme-1"),
  outDir: z.string().default("./storefront-dist"),
});
export type StorefrontGenerationOptions = z.infer<typeof StorefrontGenerationOptionsSchema>;

export const StorefrontInvariantCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  details: z.string().optional(),
});
export type StorefrontInvariantCheck = z.infer<typeof StorefrontInvariantCheckSchema>;

export const StorefrontValidationResultSchema = z.object({
  passed: z.boolean(),
  totalChecks: z.number().int().nonnegative(),
  failedChecks: z.number().int().nonnegative(),
  checks: z.array(StorefrontInvariantCheckSchema),
});
export type StorefrontValidationResult = z.infer<typeof StorefrontValidationResultSchema>;

export function generateStorefrontHtml(
  storeName: string = "AURA LUXE",
  schemeClass: string = "scheme-1",
): string {
  const sanitizedName = storeName.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch] || ch),
  );

  return `<!DOCTYPE html>
<html lang="en" class="js ${schemeClass}" style="--scrollbarWidth: 10px;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitizedName} — Premium Luxury Fashion</title>
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

      <a href="/" class="text-2xl font-bold tracking-tight uppercase">${sanitizedName}</a>

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

  <!-- Hero Banner with Fine Editorial Typography -->
  <section class="relative min-h-[85vh] flex items-center justify-center text-center px-6 overflow-hidden">
    <div class="max-w-4xl mx-auto z-10 space-y-6">
      <span class="inline-block py-1 px-3 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-widest">Autumn / Winter 2026 Collection</span>
      <h1 class="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 leading-none">THE ARCHITECTURE OF SILENCE</h1>
      <p class="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium">Discover tailored silhouettes and sculpted knitwear engineered with Italian cashmere and bespoke wool blends.</p>
      <div class="pt-4 flex flex-wrap items-center justify-center gap-4">
        <a href="#collections" class="btn-primary">Explore Campaign</a>
        <a href="#lookbook" class="btn-secondary">View 3D Lookbook</a>
      </div>
    </div>
  </section>

  <!-- 3D Lookbook Carousel with Scroll Sync -->
  <section id="lookbook" class="py-24 px-6 max-w-7xl mx-auto">
    <div class="text-center max-w-xl mx-auto mb-16 space-y-3">
      <h2 class="text-3xl md:text-4xl font-bold">The Lookbook Gallery</h2>
      <p class="text-gray-500">Dual-track momentum carousel synchronized with linear scroll interpolation.</p>
    </div>
    <lookbook-carousel class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="lookbook-card group relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] bg-gray-100">
        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop" alt="Look 01" class="w-full h-full object-cover group-hover:scale-105 transition duration-700 ease-out" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
          <div class="text-white">
            <span class="text-xs uppercase tracking-widest opacity-80">Look 01</span>
            <h3 class="text-xl font-bold">Cashmere Cocoon Coat</h3>
          </div>
        </div>
      </div>
      <div class="lookbook-card group relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] bg-gray-100">
        <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop" alt="Look 02" class="w-full h-full object-cover group-hover:scale-105 transition duration-700 ease-out" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
          <div class="text-white">
            <span class="text-xs uppercase tracking-widest opacity-80">Look 02</span>
            <h3 class="text-xl font-bold">Sculpted Poplin Shirt</h3>
          </div>
        </div>
      </div>
      <div class="lookbook-card group relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] bg-gray-100">
        <img src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop" alt="Look 03" class="w-full h-full object-cover group-hover:scale-105 transition duration-700 ease-out" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
          <div class="text-white">
            <span class="text-xs uppercase tracking-widest opacity-80">Look 03</span>
            <h3 class="text-xl font-bold">Tailored Pleated Trouser</h3>
          </div>
        </div>
      </div>
    </lookbook-carousel>
  </section>

  <!-- Shop The Look Interactive Hotspots -->
  <section id="shop-the-look" class="py-20 bg-gray-50 border-y border-gray-200">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-xl mx-auto mb-12">
        <h2 class="text-3xl font-bold">Shop The Look</h2>
        <p class="text-gray-500 mt-2">Interactive hotspots with tactile pin focus.</p>
      </div>
      <div class="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
        <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop" alt="Shop the look scene" class="w-full h-[550px] object-cover" />
        <button class="absolute w-8 h-8 rounded-full bg-white/90 text-black shadow-lg flex items-center justify-center font-bold text-xs ring-4 ring-white/40 hover:scale-110 transition" style="top: 35%; left: 45%;" data-hotspot="true" data-product-id="coat" aria-label="View Coat Pin">+</button>
        <button class="absolute w-8 h-8 rounded-full bg-white/90 text-black shadow-lg flex items-center justify-center font-bold text-xs ring-4 ring-white/40 hover:scale-110 transition" style="top: 70%; left: 52%;" data-hotspot="true" data-product-id="pants" aria-label="View Trousers Pin">+</button>
      </div>
    </div>
  </section>

  <p id="hotspotStatus" role="status" aria-live="polite" class="sr-only"></p>

  <!-- Slide-out Cart Drawer (Accessible Dialog) -->
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

  <!-- Mobile Bottom Docker (Touch-Device Gated) -->
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
  return `const coarse=matchMedia('(pointer: coarse)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
let lenis=null,scrollFrame=0;
function initScroll(){if(!window.Lenis||coarse.matches||reduce.matches||innerWidth<768||lenis)return;
lenis=new window.Lenis({duration:1.2,smoothWheel:true});
const raf=t=>{if(!lenis)return;lenis.raf(t);scrollFrame=requestAnimationFrame(raf)};scrollFrame=requestAnimationFrame(raf)}
function endScroll(){lenis?.destroy();lenis=null;if(scrollFrame)cancelAnimationFrame(scrollFrame);scrollFrame=0}
initScroll();addEventListener('resize',()=>{if(coarse.matches||reduce.matches||innerWidth<768)endScroll();else initScroll()},{passive:true});
class BagDrawer extends HTMLElement {
connectedCallback(){this.inert=true;this.setAttribute('aria-hidden','true');this.keyHandler=this.onKeys.bind(this)}
focusable(){return [...this.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length)}
onKeys(e){if(e.key==='Escape'){e.preventDefault();this.close();return}if(e.key!=='Tab')return;
const els=this.focusable();if(!els.length)return;let first=els[0],last=els[els.length-1];
if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
open(){if(this.classList.contains('is-open'))return;this.opener=document.activeElement;this.lastOverflow=document.body.style.overflow;this.inert=false;this.classList.add('is-open');this.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.addEventListener('keydown',this.keyHandler);requestAnimationFrame(()=>this.focusable()[0]?.focus())}
close(){if(!this.classList.contains('is-open'))return;this.classList.remove('is-open');this.setAttribute('aria-hidden','true');this.inert=true;document.body.style.overflow=this.lastOverflow??'';document.removeEventListener('keydown',this.keyHandler);this.opener?.focus?.()}
disconnectedCallback(){document.removeEventListener('keydown',this.keyHandler);if(this.classList.contains('is-open'))document.body.style.overflow=this.lastOverflow??''}}
customElements.define('bag-drawer',BagDrawer);
class LookbookCarousel extends HTMLElement {
connectedCallback(){this.cards=[...this.querySelectorAll('.lookbook-card')];this.onScroll=this.onScroll.bind(this);this.observer=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);if(this.visible)this.onScroll()});this.observer.observe(this);addEventListener('scroll',this.onScroll,{passive:true});addEventListener('resize',this.onScroll,{passive:true})}
onScroll(){if(!this.visible||this.frame||reduce.matches||this.cards.length<2)return;
this.frame=requestAnimationFrame(()=>{this.frame=0;const r=this.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));this.cards.forEach((card,i)=>{const rank=i-(this.cards.length-1)/2;card.style.transform='translate3d(0,'+Math.round(Math.sin(p*Math.PI)*Math.abs(rank)*18)+'px,0) rotate('+(rank*(1-p)*2).toFixed(2)+'deg)'})})}
disconnectedCallback(){this.observer?.disconnect();removeEventListener('scroll',this.onScroll);removeEventListener('resize',this.onScroll);if(this.frame)cancelAnimationFrame(this.frame)}}
customElements.define('lookbook-carousel',LookbookCarousel);
const drawer=document.getElementById('cartDrawer');
document.getElementById('cartOpenBtn')?.addEventListener('click',()=>drawer?.open());
document.getElementById('cartCloseBtn')?.addEventListener('click',()=>drawer?.close());
document.getElementById('cartOverlay')?.addEventListener('click',()=>drawer?.close());
document.querySelector('mobile-docker button')?.addEventListener('click',()=>drawer?.open());
for(const pin of document.querySelectorAll('[data-hotspot]'))pin.addEventListener('click',()=>{
document.querySelectorAll('[data-hotspot]').forEach(el=>el.setAttribute('aria-pressed',String(el===pin)));
const status=document.getElementById('hotspotStatus');if(status)status.textContent='Selected look: '+(pin.getAttribute('data-product-id')||'item')});`;
}

export function validateStorefrontInvariants(input: {
  html: string;
  js?: string | undefined;
  markdownDoc?: string | undefined;
}): StorefrontValidationResult {
  const checks: StorefrontInvariantCheck[] = [];

  // Invariant 1: Semantic structure and header/nav
  const hasSemanticNav =
    /<header\b/i.test(input.html) && /<nav\b/i.test(input.html);
  checks.push({
    name: "Semantic header and navigation structure",
    passed: hasSemanticNav,
    details: hasSemanticNav ? undefined : "Missing semantic <header> or <nav>",
  });

  // Invariant 2: Accessible drawer and modal confinement
  const hasAccessibleDrawer =
    /<bag-drawer[^>]*role="dialog"[^>]*aria-modal="true"/i.test(input.html);
  checks.push({
    name: "Accessible bag-drawer with role=\"dialog\" and aria-modal=\"true\"",
    passed: hasAccessibleDrawer,
    details: hasAccessibleDrawer
      ? undefined
      : "bag-drawer must declare role=\"dialog\" and aria-modal=\"true\"",
  });

  // Invariant 3: Lookbook carousel and interactive hotspots
  const hasLookbookAndHotspots =
    /<lookbook-carousel\b/i.test(input.html) &&
    /data-hotspot="true"/i.test(input.html);
  checks.push({
    name: "3D Lookbook carousel and interactive hotspots",
    passed: hasLookbookAndHotspots,
    details: hasLookbookAndHotspots
      ? undefined
      : "Storefront must contain <lookbook-carousel> and data-hotspot pins",
  });

  // Invariant 4: JavaScript runtime motion physics & touch gating
  if (input.js) {
    const hasTouchGating =
      input.js.includes("pointer: coarse") &&
      input.js.includes("prefers-reduced-motion: reduce");
    checks.push({
      name: "Touch-momentum and reduced-motion gating (pointer: coarse)",
      passed: hasTouchGating,
      details: hasTouchGating
        ? undefined
        : "Smooth scroll and heavy animations must be gated against touch and reduced-motion",
    });

    const hasFocusConfinement =
      input.js.includes("disconnectedCallback") &&
      input.js.includes("onKeys") &&
      input.js.includes("Escape");
    checks.push({
      name: "Keyboard focus trap, Tab cycle, and Escape dismissal",
      passed: hasFocusConfinement,
      details: hasFocusConfinement
        ? undefined
        : "Drawers must manage keyboard events (Escape dismiss and focus trapping)",
    });
  }

  // Invariant 5: Markdown Mermaid diagram safety
  if (input.markdownDoc) {
    const mermaidSafe = !/flowchart TD\s*\n\s*[A-Za-z0-9_]+\s*\[[^"\]]+\]/.test(
      input.markdownDoc,
    );
    checks.push({
      name: "Mermaid diagram labels wrapped in double quotes",
      passed: mermaidSafe,
      details: mermaidSafe
        ? undefined
        : "Mermaid node labels containing text must be wrapped in quotes",
    });
  }

  const failedChecks = checks.filter((c) => !c.passed).length;
  return {
    passed: failedChecks === 0,
    totalChecks: checks.length,
    failedChecks,
    checks,
  };
}

export function generateStorefrontBundle(options: Partial<StorefrontGenerationOptions> = {}): {
  html: string;
  tokensCss: string;
  componentsCss: string;
  appJs: string;
  outDir: string;
} {
  const storeName = options.storeName || "AURA LUXE";
  const schemeClass = options.schemeClass || "scheme-1";
  const outDir = options.outDir || "./storefront-dist";

  const html = generateStorefrontHtml(storeName, schemeClass);
  const tokensCss = generateTokensCss();
  const componentsCss = `.lookbook-card { transition: transform 180ms linear; }
[data-hotspot][aria-pressed="true"] { outline: 3px solid #111; outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) { .lookbook-card { transition: none; } }
`;
  const appJs = generateStoreAppJs();

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  mkdirSync(join(outDir, "css"), { recursive: true });
  mkdirSync(join(outDir, "js"), { recursive: true });

  writeFileSync(join(outDir, "index.html"), html, "utf8");
  writeFileSync(join(outDir, "css/theme-tokens.css"), tokensCss, "utf8");
  writeFileSync(join(outDir, "css/theme-components.css"), componentsCss, "utf8");
  writeFileSync(join(outDir, "js/store-app.js"), appJs, "utf8");

  return { html, tokensCss, componentsCss, appJs, outDir };
}

/**
 * REA (Reverse Engineer Anything) Bridge Service.
 * Bridges REA web bundle, AST semantic tracing, and network analysis
 * into Mimera's evidence ledger and clean-room component reconstruction.
 */
export interface ReaAttributionMetadata {
  featureName: string;
  sourceTarget: string;
  evidenceDigest: string;
  binaryLocation?: string | undefined;
  notes?: string[] | undefined;
}

export class ReaBridgeService {
  /**
   * Generates a standard REA Evidence Header for reconstructed components.
   */
  generateAttributionHeader(meta: ReaAttributionMetadata): string {
    const lines = [
      "/**",
      ` * Feature Reconstruction: ${meta.featureName}`,
      ` * Reverse-Engineered from: ${meta.sourceTarget}`,
      ` * Evidence Digest: ${meta.evidenceDigest}`,
    ];
    if (meta.binaryLocation) {
      lines.push(` * Binary Location: ${meta.binaryLocation}`);
    }
    if (meta.notes && meta.notes.length > 0) {
      lines.push(" * Notes:");
      for (const note of meta.notes) {
        lines.push(` *   - ${note}`);
      }
    }
    lines.push(" */\n");
    return lines.join("\n");
  }

  /**
   * Formats evidence ledger for a reconstructed module.
   */
  createEvidenceDigest(sourceCode: string): string {
    return createHash("sha256").update(sourceCode).digest("hex");
  }
}
