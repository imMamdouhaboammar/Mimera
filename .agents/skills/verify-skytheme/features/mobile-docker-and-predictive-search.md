# Feature: Mobile Docker & Predictive Search

## Sub-features
- Touch-friendly bottom bar on mobile viewports (<1024px)
- Dynamic CSS property `--mobileDockerHeight` calculation
- Predictive search drawer with typewriter running placeholder effect
- Search queries saved to `localStorage`

## How to get to it (user POV)
1. Resize window to mobile width (<768px).
2. See the persistent dock at the bottom of the screen.
3. Tap Search icon in dock or header: drawer slides down with typing placeholder ideas.

## Driving it with DOM API
```javascript
// Test Mobile Docker
const docker = document.querySelector("mobile-docker");
if (docker) {
  console.assert(docker.classList.contains("active"), "Docker should be active");
}

// Test Search Trigger
const searchTrigger = document.querySelector('[aria-controls="SearchDrawer"]');
if (searchTrigger) {
  searchTrigger.click();
  const searchDrawer = document.querySelector("search-drawer");
  console.assert(searchDrawer.hasAttribute("open"), "Search drawer should open");
}
```

## Gotchas
- The typewriter effect stops typing once the user clicks or types into the search input.
