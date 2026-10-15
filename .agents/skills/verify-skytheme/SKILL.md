---
name: verify-skytheme
description: "Drive and verify the SkyTheme luxury fashion storefront UI, smooth scrolling, cart drawer, lookbook carousel, and mobile navigation."
---

# Verify SkyTheme Storefront

Drive the real SkyTheme web application like a user: start local HTTP server, test interactive features with real DOM selectors, and capture proof evidence.

## 1. Launch

Start a local static HTTP server serving the storefront assets on port 8080:

```bash
# Launch background server with Bun:
bun -e "
  const server = Bun.serve({
    port: 8080,
    fetch(req) {
      const url = new URL(req.url);
      let filePath = '.' + decodeURIComponent(url.pathname);
      if (filePath === './' || filePath.endsWith('/')) filePath += 'index.html';
      const file = Bun.file(filePath);
      return file.exists().then(exists => exists ? new Response(file) : new Response('Not Found', { status: 404 }));
    }
  });
  console.log('SkyTheme server listening on http://localhost:8080');
" &
SERVER_PID=$!
```

Ready indicator: terminal outputs `SkyTheme server listening on http://localhost:8080` and `curl -s http://localhost:8080/ | grep -q "SKY Theme"`.

## 2. Doctor

Read-only health check answering "is this instance ready to test?":

```bash
curl -I http://localhost:8080/ | grep "200 OK" && \
curl -s http://localhost:8080/index.html | grep -q "bag-drawer" && \
echo "✅ Doctor: SkyTheme instance is healthy and serving assets."
```

## 3. Drive

Exercise user flows using verified CSS and custom element selectors:

- **Cart Drawer:**
  - Opener: `document.querySelector('[aria-controls="CartDrawer"]').click()`
  - Close button: `document.querySelector('#CartDrawer .drawer-close-btn').click()`
  - Free shipping indicator: `document.querySelector('[data-shipping-box]')`
- **Shop The Look Hotspots:**
  - Pins: `document.querySelectorAll('[data-hotspot="true"]')`
  - Click Pin 1: `document.querySelector('[data-hotspot="true"][data-index="1"]').click()`
- **Lookbook 3D Carousel:**
  - Main element: `document.querySelector('lookbook-carousel')`
  - Scroll travel: window scroll triggering rank update on `[data-lookbook-image]`
- **Mobile Bottom Docker:**
  - Container: `document.querySelector('mobile-docker')`
  - Check active state and `--mobileDockerHeight` CSS variable.
- **Predictive Search:**
  - Trigger: `document.querySelector('[aria-controls="SearchDrawer"]').click()`
  - Search input: `document.querySelector('input[type="search"]')`

## 4. Evidence

- Capture DOM element existence and attributes.
- Capture network requests to `/cart/change.js` and `/predictive_search`.
- Record console logs for zero runtime unhandled exceptions.

## 5. Cleanup

Kill the specific process started on port 8080:

```bash
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
```
