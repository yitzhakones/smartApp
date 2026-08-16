import withPWAInit from '@ducanh2912/next-pwa'

// Runtime-caching overrides for content whose correctness depends on state
// that can change from one request to the next (a star just awarded, a daily
// set just generated, category_levels just set by placement completing).
// next-pwa's own defaults already use NetworkFirst for page/RSC navigations,
// which *should* fetch fresh data whenever the network is reachable — but
// NetworkFirst still means "cache is an acceptable answer" under conditions
// we can't fully control from here (a slow/flaky connection, an in-flight
// service-worker update, etc.). For this app specifically — real money,
// real per-child state, a "בואו נתחיל" tap that must land on whatever
// category_levels/daily_set look like RIGHT NOW — that's the wrong trade-off.
// NetworkOnly removes the ambiguity entirely: these paths never touch the
// cache, ever, in either direction.
//
// Declared here (not left to defaults) and placed first so they win over the
// broader default `pages`/`pages-rsc`/`apis` rules for the same paths;
// extendDefaultRuntimeCaching (below) still applies the sensible defaults —
// static asset caching, fonts, etc. — to everything else.
const NEVER_CACHE_RUNTIME_CACHING = [
  {
    // The entire child-facing app (app/p/[token]) — every response here is
    // specific to one child, one moment: today's daily set, current
    // stars/money, and whether placement has finished. A cached response is
    // never "a bit stale and still fine," it's just wrong.
    urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/p/'),
    handler: 'NetworkOnly',
  },
  {
    // Every API route (grading, placement, child stats) — same reasoning,
    // and stated explicitly rather than relying on the default caching
    // config's "apis" rule, which only ever matched GET requests anyway.
    // Workbox's registerRoute is per-method (defaults to GET if unspecified),
    // so this needs its own POST entry too — most of these routes
    // (placement, grading) are POST. A request Workbox has no route for
    // simply isn't intercepted at all (passthrough to the network, same
    // practical effect as NetworkOnly), but declaring both explicitly means
    // nothing here depends on that unstated fallback behavior.
    urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
    handler: 'NetworkOnly',
  },
  {
    urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
    method: 'POST',
    handler: 'NetworkOnly',
  },
]

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    // Both already default to true in this plugin — set explicitly so a
    // future plugin-version default change can't silently disable either:
    // clientsClaim makes an activated SW take over already-open tabs right
    // away (not just new ones); cleanUpOutdatedCaches purges precache
    // entries from a previous SW version on activation.
    clientsClaim: true,
    cleanupOutdatedCaches: true, // NOT cleanUpOutdatedCaches — that's the wrapper's own .d.ts
    // alias, but the underlying workbox-webpack-plugin schema rejects it at
    // build time and wants this exact (lowercase-u) spelling. Confirmed by
    // running an actual build, not by trusting the type definitions.
    // Bump this string whenever a cache-invalidating fix ships (like this
    // one). It prefixes every cache-storage name the service worker uses, so
    // a browser with an already-installed SW — including ones that have been
    // silently running stale cached content for a while — drops every old
    // cache entry the moment its next-visit update activates, rather than
    // needing a manual "unregister service worker."
    cacheId: 'trivia-rewards-v2',
    runtimeCaching: NEVER_CACHE_RUNTIME_CACHING,
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default withPWA(nextConfig)
