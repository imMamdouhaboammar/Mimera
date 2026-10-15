#!/usr/bin/env bun
/**
 * Minimal deployable-structure Shopify Online Store 2.0 starter.
 * Not a copy of Sky, not a ready-made parity recreation.
 * Every reference-sensitive section requires browser-based evidence.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertFreshOutput } from "./safe-output.ts";
import { parseArgs } from "node:util";

const files: Record<string, string> = {
  "layout/theme.liquid": String.raw`<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{ page_title | escape }}</title>
  {{ content_for_header }}
  {{ 'nearsky.css' | asset_url | stylesheet_tag }}
  <script src="{{ 'nearsky.js' | asset_url }}" defer></script>
</head>
<body>
  <a class="ns-skip" href="#MainContent">Skip to content</a>
  {% section 'header' %}
  <main id="MainContent" tabindex="-1">{{ content_for_layout }}</main>
  {% section 'footer' %}
</body>
</html>`,
  "sections/header.liquid": String.raw`<header class="ns-header" data-ns-header>
  <a class="ns-brand" href="{{ routes.root_url }}">{{ shop.name | escape }}</a>
  <nav aria-label="Main navigation" class="ns-header__nav">
    {% for link in section.settings.menu.links %}
      <a href="{{ link.url }}">{{ link.title | escape }}</a>
    {% endfor %}
  </nav>
  <div class="ns-header__actions">
    <a href="{{ routes.search_url }}">Search</a>
    <a href="{{ routes.cart_url }}">Cart ({{ cart.item_count }})</a>
  </div>
</header>
{% schema %}
{"name":"Header","settings":[{"type":"link_list","id":"menu","label":"Menu"}]}
{% endschema %}`,
  "sections/immersive-hero.liquid": String.raw`<section class="ns-hero" data-ns-motion id="ns-hero-{{ section.id }}">
  {% if section.settings.image != blank %}
    {{ section.settings.image | image_url: width: 2400 | image_tag: class: 'ns-hero__media', loading: 'eager', sizes: '100vw', widths: '750, 1100, 1500, 2000, 2400' }}
  {% else %}
    <div class="ns-hero__placeholder" role="img" aria-label="Select hero imagery in the theme editor"></div>
  {% endif %}
  <div class="ns-hero__content">
    <p class="ns-hero__eyebrow">{{ section.settings.eyebrow | escape }}</p>
    <h1>{{ section.settings.heading | escape }}</h1>
    {% if section.settings.cta_url != blank %}
      <a class="ns-button" href="{{ section.settings.cta_url }}">{{ section.settings.cta_label | escape }}</a>
    {% endif %}
  </div>
</section>
{% schema %}
{"name":"Immersive hero starter","settings":[
{"type":"image_picker","id":"image","label":"Licensed hero image"},
{"type":"text","id":"eyebrow","label":"Eyebrow","default":"New collection"},
{"type":"text","id":"heading","label":"Heading","default":"Discover the collection"},
{"type":"text","id":"cta_label","label":"CTA label","default":"Explore"},
{"type":"url","id":"cta_url","label":"CTA URL"}
],"presets":[{"name":"Immersive hero starter"}]}
{% endschema %}`,
  "sections/featured-collection.liquid": String.raw`<section class="ns-products">
  <div class="ns-section-heading"><h2>{{ section.settings.heading | escape }}</h2></div>
  {% assign featured = section.settings.collection %}
  {% if featured != blank %}
    <div class="ns-products__grid">
      {% for product in featured.products limit: section.settings.limit %}
        {% render 'product-card', product: product %}
      {% endfor %}
    </div>
  {% else %}
    <p>Choose a collection in the theme editor.</p>
  {% endif %}
</section>
{% schema %}
{"name":"Featured collection","settings":[
{"type":"text","id":"heading","label":"Heading","default":"Featured collection"},
{"type":"collection","id":"collection","label":"Collection"},
{"type":"range","id":"limit","label":"Products","min":2,"max":12,"step":1,"default":4}
],"presets":[{"name":"Featured collection"}]}
{% endschema %}`,
  "snippets/product-card.liquid": String.raw`<article class="ns-product-card">
  <a href="{{ product.url }}">
    {% if product.featured_image != blank %}
      {{ product.featured_image | image_url: width: 900 | image_tag: loading: 'lazy', widths: '350, 600, 900', sizes: '(min-width: 900px) 25vw, 50vw' }}
    {% endif %}
    <h3>{{ product.title | escape }}</h3>
    <p>{{ product.price | money }}</p>
  </a>
</article>`,
  "sections/main-product.liquid": String.raw`<section class="ns-pdp">
  <div class="ns-pdp__media">{% if product.featured_image != blank %}{{ product.featured_image | image_url: width: 1400 | image_tag: loading: 'eager' }}{% endif %}</div>
  <div><h1>{{ product.title | escape }}</h1>
    <p>{{ product.price | money }}</p>
    <div>{{ product.description }}</div>
    {% form 'product', product %}
      <label for="variant-id">Variant</label>
      <select id="variant-id" name="id">
        {% for variant in product.variants %}
          <option value="{{ variant.id }}" {% if variant == product.selected_or_first_available_variant %}selected{% endif %} {% unless variant.available %}disabled{% endunless %}>{{ variant.title | escape }} - {{ variant.price | money }}</option>
        {% endfor %}
      </select>
      <button class="ns-button" type="submit" {% unless product.available %}disabled{% endunless %}>Add to cart</button>
    {% endform %}
  </div>
</section>
{% schema %}{"name":"Main product","settings":[]}{% endschema %}`,
  "sections/main-collection.liquid": String.raw`<section class="ns-products">
  <h1>{{ collection.title | escape }}</h1>
  {% paginate collection.products by 24 %}
  <div class="ns-products__grid">
    {% for product in collection.products %}
      {% render 'product-card', product: product %}
    {% else %}<p>No products found.</p>
    {% endfor %}
  </div>
  {{ paginate | default_pagination }}
  {% endpaginate %}
</section>
{% schema %}{"name":"Main collection","settings":[]}{% endschema %}`,
  "sections/main-cart.liquid": String.raw`<section class="ns-products">
  <h1>Your cart</h1>
  {% if cart.item_count == 0 %}
    <p>Your cart is empty.</p>
  {% else %}
    <form action="{{ routes.cart_url }}" method="post">
      {% for item in cart.items %}
      <div class="ns-cart-line">
        <span>{{ item.product.title | escape }} · {{ item.variant.title | escape }}</span>
        <label>Quantity <input type="number" min="0" name="updates[]" value="{{ item.quantity }}"></label>
        <span>{{ item.final_line_price | money }}</span>
      </div>
      {% endfor %}
      <p>Subtotal: {{ cart.total_price | money }}</p>
      <button name="update" type="submit">Update cart</button>
      <button name="checkout" type="submit">Checkout</button>
    </form>
  {% endif %}
</section>
{% schema %}{"name":"Main cart","settings":[]}{% endschema %}`,
  "sections/main-search.liquid": String.raw`<section class="ns-products">
  <h1>Search</h1>
  <form action="{{ routes.search_url }}" method="get" role="search">
    <label for="search-query">Search products</label>
    <input id="search-query" type="search" name="q" value="{{ search.terms | escape }}">
    <button type="submit">Search</button>
  </form>
  {% if search.performed %}
    <div class="ns-products__grid">
      {% for result in search.results %}
        {% if result.object_type == 'product' %}{% render 'product-card', product: result %}{% endif %}
      {% endfor %}
    </div>
  {% endif %}
</section>
{% schema %}{"name":"Main search","settings":[]}{% endschema %}`,
  "sections/main-page.liquid": String.raw`<article class="ns-products"><h1>{{ page.title | escape }}</h1><div>{{ page.content }}</div></article>
{% schema %}{"name":"Main page","settings":[]}{% endschema %}`,
  "sections/footer.liquid": String.raw`<footer class="ns-footer"><p>&copy; {{ 'now' | date: '%Y' }} {{ shop.name | escape }}</p></footer>
{% schema %}{"name":"Footer","settings":[]}{% endschema %}`,
  "templates/index.json": JSON.stringify({sections:{hero:{type:"immersive-hero",settings:{}},featured:{type:"featured-collection",settings:{}}},order:["hero","featured"]},null,2),
  "templates/product.json": JSON.stringify({sections:{main:{type:"main-product",settings:{}}},order:["main"]},null,2),
  "templates/collection.json": JSON.stringify({sections:{main:{type:"main-collection",settings:{}}},order:["main"]},null,2),
  "templates/cart.json": JSON.stringify({sections:{main:{type:"main-cart",settings:{}}},order:["main"]},null,2),
  "templates/search.json": JSON.stringify({sections:{main:{type:"main-search",settings:{}}},order:["main"]},null,2),
  "templates/page.json": JSON.stringify({sections:{main:{type:"main-page",settings:{}}},order:["main"]},null,2),
  "config/settings_schema.json": JSON.stringify([
    {name:"theme_info",theme_name:"NearSky Starter",theme_author:"NearSky OSS contributors",theme_version:"0.1.0",theme_documentation_url:"https://github.com/imMamdouhaboammar/skytheme-storefront",theme_support_url:"https://github.com/imMamdouhaboammar/skytheme-storefront/issues"},
    {name:"Colors",settings:[{type:"color",id:"background",label:"Background",default:"#ffffff"},{type:"color",id:"foreground",label:"Foreground",default:"#171717"}]}
  ],null,2),
  "config/settings_data.json": JSON.stringify({current:{}},null,2),
  "locales/en.default.json": JSON.stringify({general:{accessibility:{skip_to_content:"Skip to content"}}},null,2),
  "assets/nearsky.css": String.raw`:root{color-scheme:light}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:#171717;font:16px/1.5 system-ui,sans-serif}img{max-width:100%;height:auto}.ns-skip{position:absolute;left:-999px}.ns-skip:focus{left:1rem;top:1rem;z-index:99;background:white}.ns-header{display:flex;align-items:center;justify-content:space-between;gap:2rem;padding:1.3rem 4vw;position:sticky;top:0;z-index:30;background:rgb(255 255 255 / .94)}.ns-brand{font:600 1.3rem Georgia,serif}.ns-header__nav,.ns-header__actions{display:flex;gap:1.4rem;flex-wrap:wrap}a{color:inherit}.ns-hero{min-height:min(850px,95svh);position:relative;overflow:hidden;display:grid;place-items:center;background:#252525;color:white}.ns-hero__media,.ns-hero__placeholder{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ns-hero__placeholder{background:linear-gradient(120deg,#3a3532,#857970)}.ns-hero:after{content:"";position:absolute;inset:0;background:#0006;pointer-events:none}.ns-hero__content{position:relative;z-index:1;text-align:center;padding:4rem 5vw;max-width:980px}.ns-hero h1{font:400 clamp(3.4rem,9vw,8rem)/.94 Georgia,serif;letter-spacing:-.05em;margin:1rem 0 2rem}.ns-hero__eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.8rem}.ns-button{display:inline-block;border:1px solid currentColor;border-radius:40px;padding:.8rem 1.5rem;background:white;color:black;text-decoration:none;cursor:pointer}.ns-products{padding:5rem 4vw}.ns-products__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.5rem}.ns-product-card img{width:100%;aspect-ratio:3/4;object-fit:cover}.ns-product-card a{text-decoration:none}.ns-product-card h3{font-size:1rem;font-weight:500}.ns-pdp{display:grid;grid-template-columns:1fr 1fr;gap:3rem;padding:5rem 4vw}.ns-footer{padding:3rem 4vw;background:#f1efed}.ns-cart-line{display:flex;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid #ddd}@media(max-width:767px){.ns-header{flex-wrap:wrap}.ns-header__nav{order:3;width:100%;overflow-x:auto}.ns-products__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ns-pdp{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}`,
  "assets/nearsky.js": String.raw`// Reference-sensitive motion is intentionally conservative until browser measurements exist.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const contexts = new Map();
function mount(root=document){
  root.querySelectorAll('[data-ns-motion]').forEach(section=>{
    if(contexts.has(section))return;
    let frame=0;
    const media=section.querySelector('.ns-hero__media');
    const onScroll=()=>{
      if(frame||reduced.matches||!media)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        const rect=section.getBoundingClientRect();
        const p=Math.max(-1,Math.min(1,rect.top/Math.max(innerHeight,1)));
        media.style.transform='translate3d(0,'+(p*20).toFixed(1)+'px,0)';
      });
    };
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('resize',onScroll,{passive:true});
    contexts.set(section,()=>{removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);if(frame)cancelAnimationFrame(frame)});
    onScroll();
  });
}
function unmount(root){for(const [node,dispose] of contexts){if(root===node||root.contains(node)){dispose();contexts.delete(node)}}}
mount();
document.addEventListener('shopify:section:load',e=>mount(e.target));
document.addEventListener('shopify:section:unload',e=>unmount(e.target));`,
};

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { out: {type:"string", default:"./shopify-theme-dist"} },
  strict: true,
});
const out = assertFreshOutput(values.out || "./shopify-theme-dist");
for (const [path, content] of Object.entries(files)) {
  const target=join(out,path);
  mkdirSync(join(target,".."),{recursive:true});
  writeFileSync(target,content+"\n");
}
console.log("Generated "+Object.keys(files).length+" Shopify OS2 starter files at "+out);
console.log("Not reference-certified. Run shopify theme check and Shopify dev-store integration tests before release.");
