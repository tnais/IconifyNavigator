import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

/**
 * Mock IntersectionObserver so all observed elements are treated as immediately
 * intersecting. This causes CollectionCardComponent's lazy-load logic to fire
 * right away in tests, making preview icons deterministic without needing a real
 * browser viewport.
 */
(global as unknown as Record<string, unknown>)['IntersectionObserver'] = jest
  .fn()
  .mockImplementation(
    (callback: (entries: Array<{ isIntersecting: boolean }>) => void) => ({
      observe: jest.fn().mockImplementation(() =>
        // Fire the callback synchronously as if the element is already visible.
        callback([{ isIntersecting: true }])
      ),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    })
  );
