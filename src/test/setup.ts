import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// framer-motion's useInView and Leaflet both probe these browser APIs, which
// jsdom does not implement. A no-op stub is enough: it lets components mount
// without throwing — the tests below assert on rendered content, not on
// scroll-triggered animation or map behavior.
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!window.IntersectionObserver) {
  // @ts-expect-error — minimal test polyfill, not a spec-complete implementation.
  window.IntersectionObserver = MockObserver;
}
if (!window.ResizeObserver) {
  window.ResizeObserver = MockObserver;
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  localStorage.clear();
});
